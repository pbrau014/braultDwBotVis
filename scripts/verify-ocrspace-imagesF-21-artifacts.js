'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const imageProcessor = require('../src/image-processor');

const FIELDS = ['result', 'player', 'map', 'mode', 'battleStart', 'credits', 'freeXp', 'damage', 'xp'];
const INVENTORY = 'complete-ground-truth-21';
const REQUIRED_READERS = ['tesseractjs', 'native'];

function sha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

function pngDimensions(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 24
        || buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a'
        || buffer.subarray(12, 16).toString('ascii') !== 'IHDR') return null;
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function safeArtifactPath(root, relative) {
    if (typeof relative !== 'string' || !relative || path.isAbsolute(relative)) return null;
    const base = path.resolve(root);
    const target = path.resolve(base, relative);
    const rel = path.relative(base, target);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
    return target;
}

async function extractPdfText(pdfPath, executable = process.env.GHOSTSCRIPT_BIN || 'gswin64c.exe', {
    timeoutMs = 30000, maxOutputBytes = 1024 * 1024
} = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(executable, ['-q', '-dBATCH', '-dNOPAUSE', '-sDEVICE=txtwrite', '-sOutputFile=-', pdfPath], {
            windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe']
        });
        const stdout = [];
        const stderr = [];
        let total = 0;
        let stderrBytes = 0;
        let settled = false;
        const finish = (error, value) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (error) reject(error); else resolve(value);
        };
        const timer = setTimeout(() => {
            child.kill();
            const error = new Error('Ghostscript searchable-PDF text extraction timed out.');
            error.code = 'OCRSPACE_PDF_TEXT_TIMEOUT';
            finish(error);
        }, timeoutMs);
        child.stdout.on('data', chunk => {
            total += chunk.length;
            if (total > maxOutputBytes) {
                child.kill();
                const error = new Error('Searchable-PDF text output exceeded its bounded limit.');
                error.code = 'OCRSPACE_PDF_TEXT_TOO_LARGE';
                finish(error);
                return;
            }
            stdout.push(chunk);
        });
        child.stderr.on('data', chunk => {
            if (stderrBytes < 16384) {
                const remaining = 16384 - stderrBytes;
                const kept = chunk.subarray(0, remaining);
                stderr.push(kept);
                stderrBytes += kept.length;
            }
        });
        child.on('error', error => finish(error));
        child.on('close', code => {
            if (code !== 0) {
                const error = new Error('Ghostscript txtwrite failed (exit ' + code + '): ' + Buffer.concat(stderr).toString('utf8').slice(0, 1000));
                error.code = 'OCRSPACE_PDF_TEXT_EXTRACTION_FAILED';
                finish(error);
                return;
            }
            finish(null, Buffer.concat(stdout, total).toString('utf8'));
        });
    });
}

async function listFiles(root) {
    const out = [];
    async function walk(dir) {
        for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
            const target = path.join(dir, entry.name);
            if (entry.isDirectory()) await walk(target);
            else if (entry.isFile()) out.push(target);
        }
    }
    await walk(root);
    return out;
}

async function secretScan(paths, apiKey) {
    if (!apiKey) return { status: 'NOT_VERIFIED', scannedFiles: 0 };
    let scannedFiles = 0;
    for (const file of paths) {
        const bytes = await fs.readFile(file);
        scannedFiles++;
        if (bytes.includes(Buffer.from(apiKey, 'utf8'))) {
            return { status: 'FAIL', scannedFiles, matchedFile: path.basename(file) };
        }
    }
    return { status: 'PASS', scannedFiles };
}

function selectGateB(gt) {
    if (!gt || gt.schemaVersion !== 2 || gt.records?.length !== 63 || JSON.stringify(gt.requiredFields) !== JSON.stringify(FIELDS)) {
        throw new Error('Ground-truth schema, corpus size, or nine-field contract mismatch.');
    }
    return gt.records.filter(row => row.recordStatus === 'COMPLETE_9_FIELD_TRANSCRIPTION'
        && FIELDS.every(field => row.fieldStatus?.[field]?.eligible_for_exact_match === true
            && String(row.expected?.[field] ?? '').trim() !== ''));
}

async function verifyArtifacts({ runReport, groundTruth, artifactRoot, networkLogPath,
    workflowSourceText = '', apiKey = process.env.OCRSPACE_API_KEY || '',
    renderPdf = imageProcessor.renderSearchablePdfPage,
    readMetadata = imageProcessor.metadata,
    readPdfText = extractPdfText,
    gateAReport = null }) {
    const runBytes = await fs.readFile(runReport);
    const gtBytes = await fs.readFile(groundTruth);
    const run = JSON.parse(runBytes.toString('utf8'));
    const gt = JSON.parse(gtBytes.toString('utf8'));
    const selected = selectGateB(gt);
    if (selected.length !== 21) throw new Error('Gate B selection is not exactly 21 complete nine-field records.');
    if (run.sourceArchiveSha256 !== gt.candidateArchive?.sha256) throw new Error('Run report archive fingerprint does not match the v6 ground truth.');
    const rows = new Map((run.results || []).map(row => [row.filename, row]));
    if (rows.size !== (run.results || []).length) throw new Error('Run report contains duplicate filenames.');
    const images = [];
    const all = {
        sourceImageHashes: true, pdfIntegrity: true, searchablePdfTextLayer: true,
        rasterIntegrity: true, pdfDerivedRasterProvenance: true, localReaders: true
    };
    for (const expected of selected) {
        const row = rows.get(expected.filename);
        const image = {
            filename: expected.filename,
            status: 'FAILED',
            sourceSha256: row?.sourceSha256 || null,
            sourceWidth: expected.sourceImage.width,
            sourceHeight: expected.sourceImage.height,
            pdfSha256: row?.pdfSha256 || null,
            rasterSha256: row?.rasterSha256 || null,
            rasterWidth: row?.rasterWidth || null,
            rasterHeight: row?.rasterHeight || null,
            checks: {}
        };
        if (!row) {
            image.failure = 'No corresponding OCR run row.';
            for (const key of Object.keys(all)) all[key] = false;
            images.push(image);
            continue;
        }
        const sourceOk = row.sourceSha256 === expected.sourceImage.sha256
            && row.sourceBytes === expected.sourceImage.bytes;
        image.checks.sourceImageHash = sourceOk ? 'PASS' : 'FAIL';
        if (!sourceOk) all.sourceImageHashes = false;

        const pdfPath = safeArtifactPath(artifactRoot, row.pdfPath);
        const rasterPath = safeArtifactPath(artifactRoot, row.rasterPath);
        let pdfBuffer = null, rasterBuffer = null;
        try {
            if (!pdfPath || !rasterPath) throw new Error('Unsafe or missing relative artifact path.');
            pdfBuffer = await fs.readFile(pdfPath);
            rasterBuffer = await fs.readFile(rasterPath);
            const pdfOk = pdfBuffer.length === row.pdfBytes
                && pdfBuffer.subarray(0, 5).toString('ascii') === '%PDF-'
                && sha256(pdfBuffer) === row.pdfSha256;
            image.checks.pdfIntegrity = pdfOk ? 'PASS' : 'FAIL';
            if (!pdfOk) all.pdfIntegrity = false;
            const dims = pngDimensions(rasterBuffer);
            const metadata = dims ? await readMetadata(rasterBuffer) : null;
            const rasterOk = Boolean(dims && metadata && rasterBuffer.length === row.rasterBytes
                && sha256(rasterBuffer) === row.rasterSha256
                && dims.width === row.rasterWidth && dims.height === row.rasterHeight
                && metadata.width === row.rasterWidth && metadata.height === row.rasterHeight);
            image.checks.rasterIntegrity = rasterOk ? 'PASS' : 'FAIL';
            if (!rasterOk) all.rasterIntegrity = false;
            if (pdfOk && rasterOk) {
                const rendered = await renderPdf(pdfBuffer);
                const derivedOk = Buffer.isBuffer(rendered) && sha256(rendered) === row.rasterSha256;
                image.checks.pdfDerivedRasterProvenance = derivedOk ? 'PASS' : 'FAIL';
                if (!derivedOk) all.pdfDerivedRasterProvenance = false;
            } else {
                image.checks.pdfDerivedRasterProvenance = 'FAIL';
                all.pdfDerivedRasterProvenance = false;
            }
            if (pdfOk) {
                const text = await readPdfText(pdfPath);
                const textOk = typeof text === 'string' && text.replace(/\s+/g, '').length > 0;
                image.checks.searchablePdfTextLayer = textOk ? 'PASS' : 'FAIL';
                if (!textOk) all.searchablePdfTextLayer = false;
            } else {
                image.checks.searchablePdfTextLayer = 'FAIL';
                all.searchablePdfTextLayer = false;
            }
        } catch (error) {
            image.failure = String(error.message || error).slice(0, 500);
            for (const key of ['pdfIntegrity', 'searchablePdfTextLayer', 'rasterIntegrity', 'pdfDerivedRasterProvenance']) all[key] = false;
        }
        const readers = new Set((row.localReaders || []).map(reader => reader.engine));
        const readerOk = REQUIRED_READERS.every(name => readers.has(name))
            && !(row.localReaderFailures || []).length;
        image.checks.localReaders = readerOk ? 'PASS' : 'FAIL';
        if (!readerOk) all.localReaders = false;
        image.status = Object.values(image.checks).every(value => value === 'PASS') ? 'VERIFIED' : 'FAILED';
        images.push(image);
    }
    const networkLog = networkLogPath ? await fs.readFile(networkLogPath, 'utf8').catch(() => null) : null;
    const networkAttempts = networkLog === null ? null : networkLog.split(/\r?\n/).filter(line => line.trim()).length;
    const workflowRestrictionOk = /OCR_NON_OCR_NETWORK_RESTRICTED:\s*['"]?1/.test(workflowSourceText)
        && /OCR_NON_OCR_NETWORK_LOG:/.test(workflowSourceText);
    const networkOk = networkAttempts === 0 && workflowRestrictionOk;
    const files = await listFiles(artifactRoot);
    const secret = await secretScan([...files, runReport, groundTruth], apiKey);
    const gateA = gateAReport ? {
        status: gateAReport.status || 'PENDING',
        reportSha256: gateAReport.reportSha256 || null,
        candidateFingerprint: gateAReport.candidateFingerprint || null,
        fingerprintLocked: gateAReport.fingerprintLocked === true,
        matchesGateBRunSource: gateAReport.matchesGateBRunSource === true,
        completeImages: gateAReport.completeImages ?? null,
        exactCompleteRecords: gateAReport.exactCompleteRecords ?? null,
        wronglyAcceptedMandatoryFieldValues: gateAReport.wronglyAcceptedMandatoryFieldValues ?? null,
        unresolvedMandatoryFieldValues: gateAReport.unresolvedMandatoryFieldValues ?? null,
        unauthorizedNetworkAttempts: gateAReport.unauthorizedNetworkAttempts ?? null,
        networkRestriction: gateAReport.networkRestriction || null
    } : { status: 'PENDING' };
    const checks = {
        sourceImageHashes: all.sourceImageHashes ? 'PASS' : 'FAIL',
        pdfIntegrity: all.pdfIntegrity ? 'PASS' : 'FAIL',
        searchablePdfTextLayer: all.searchablePdfTextLayer ? 'PASS' : 'FAIL',
        rasterIntegrity: all.rasterIntegrity ? 'PASS' : 'FAIL',
        pdfDerivedRasterProvenance: all.pdfDerivedRasterProvenance ? 'PASS' : 'FAIL',
        localReaders: all.localReaders ? 'PASS' : 'FAIL',
        networkRestriction: networkOk ? 'PASS' : 'FAIL',
        unauthorizedNetworkAttempts: networkAttempts,
        secretLeakScan: secret.status,
        originalScreenshotFallback: run.originalScreenshotFallback === false
    };
    const verifiedCount = images.filter(image => image.status === 'VERIFIED').length;
    const requiredChecks = ['sourceImageHashes', 'pdfIntegrity', 'searchablePdfTextLayer',
        'rasterIntegrity', 'pdfDerivedRasterProvenance', 'networkRestriction', 'secretLeakScan'];
    const status = verifiedCount === 21 && requiredChecks.every(key => checks[key] === 'PASS')
        && checks.unauthorizedNetworkAttempts === 0 && checks.originalScreenshotFallback === false
        ? 'VERIFIED' : 'FAILED';
    return {
        schemaVersion: 1, status, createdAt: new Date().toISOString(),
        inventorySelection: { id: INVENTORY, selectedImageCount: 21, verifiedImageCount: verifiedCount, allSelectedImagesVerified: verifiedCount === 21 },
        runReportSha256: sha256(runBytes), groundTruthSha256: sha256(gtBytes),
        sourceArchiveSha256: run.sourceArchiveSha256, gateA, checks, images,
        secretScan: { status: secret.status, scannedFiles: secret.scannedFiles },
        notes: [
            'This verifier performs no OCR.Space requests.',
            'PDF-derived raster provenance is checked by rerendering the PDF and comparing the raster SHA-256.',
            'Gate A is a separate prerequisite; this report does not certify Gate A or the v6 workbook.'
        ]
    };
}

async function main() {
    const args = process.argv.slice(2);
    const value = key => { const i = args.indexOf(key); return i >= 0 ? args[i + 1] : null; };
    const runReport = value('--run-report');
    const groundTruth = value('--ground-truth');
    const artifactRoot = value('--artifact-root');
    const networkLogPath = value('--network-log');
    const workflowFile = value('--workflow-file');
    const output = value('--output');
    if (![runReport, groundTruth, artifactRoot, networkLogPath, workflowFile, output].every(Boolean)) {
        throw new Error('Usage: node scripts/verify-ocrspace-imagesF-21-artifacts.js --run-report FILE --ground-truth FILE --artifact-root DIR --network-log FILE --workflow-file FILE --output FILE');
    }
    const workflowSourceText = await fs.readFile(workflowFile, 'utf8');
    const report = await verifyArtifacts({ runReport, groundTruth, artifactRoot, networkLogPath, workflowSourceText });
    await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n');
    console.log('[DWBOT-ARTIFACT-VERIFY] ' + report.status + '; verified=' + report.inventorySelection.verifiedImageCount + '/21; Gate A=' + report.gateA.status + '; network=' + report.checks.networkRestriction + '; secret scan=' + report.checks.secretLeakScan);
    if (report.status !== 'VERIFIED') process.exitCode = 1;
}

if (require.main === module) main().catch(error => {
    console.error('[DWBOT-ARTIFACT-VERIFY] FAILED:', String(error.message || error).slice(0, 1000));
    process.exitCode = 1;
});

module.exports = { verifyArtifacts, selectGateB, pngDimensions, safeArtifactPath, extractPdfText };

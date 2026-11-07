'use strict';

// Recover only failed/missing local-reader outputs from verified OCR.Space PDFs.
// This script has no OCR.Space client import and deliberately disables all
// provider/network access. It never resubmits an image to the paid provider.

const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

process.env.OCRSPACE_ENABLED = '0';
process.env.OCRSPACE_NETWORK_ALLOWLIST = '0';
process.env.OCR_NON_OCR_NETWORK_RESTRICTED = '1';
process.env.OCR_IMAGE_TIMEOUT_MS = process.env.OCR_IMAGE_TIMEOUT_MS || '180000';
process.env.OCR_SUPERVISED_TIMEOUT_MS = process.env.OCR_SUPERVISED_TIMEOUT_MS || '185000';
process.env.OCR_CV_ASSIST = '0';
process.env.PADDLEOCR_FIELD_FALLBACK = '0';
process.env.OCRSPACE_API_KEY = '';

require('./block-network');

const imageProcessor = require('../src/image-processor');
const bot = require('../src/bot');
const { runSupervisedProcess } = require('../src/ocr-process-supervisor');
const { extractPdfText } = require('./verify-ocrspace-imagesF-21-artifacts');
const { parseTextLayer } = require('./evaluate-ocrspace-pdf-text-layer');
const { planReaderRecovery } = require('../src/ocrspace-local-reader-recovery');

const FIELDS = ['result', 'player', 'map', 'mode', 'battleStart', 'credits', 'freeXp', 'damage', 'xp'];
const ENGINES = ['tesseractjs', 'native', 'paddleocr'];
const INVENTORY = 'complete-ground-truth-21';
const EXPECTED_PIPELINE = 'source screenshot -> OCR.Space Engine 2 searchable PDF -> validated PDF -> local PDF raster -> local readers';

function sha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

function safePath(root, relative) {
    if (typeof relative !== 'string' || !relative || path.isAbsolute(relative)) return null;
    const base = path.resolve(root);
    const target = path.resolve(base, relative);
    const rel = path.relative(base, target);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
    return target;
}

function selectedRecords(gt) {
    if (gt.schemaVersion !== 2 || gt.records?.length !== 63
        || JSON.stringify(gt.requiredFields) !== JSON.stringify(FIELDS)) {
        throw new Error('Ground-truth schema or nine-field contract mismatch.');
    }
    const selected = gt.records.filter(row => row.recordStatus === 'COMPLETE_9_FIELD_TRANSCRIPTION'
        && FIELDS.every(field => row.fieldStatus?.[field]?.eligible_for_exact_match === true
            && String(row.expected?.[field] ?? '').trim() !== ''));
    if (selected.length !== 21 || selected.some((row, index) => row !== gt.records[index])) {
        throw new Error('Expected the exact first 21 complete nine-field reference records.');
    }
    return selected;
}

async function extractLocalReader(rasterBuffer, engine, networkLogPath) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dwbot-parallel-reader-'));
    const outputPath = path.join(tempDir, 'reader-output.json');
    const projectRoot = path.resolve(__dirname, '..');
    const scriptPath = path.join(__dirname, engine === 'paddleocr' ? 'paddleocr-image-child.js' : 'ocr-image-child.js');
    const env = {
        ...process.env,
        OCRSPACE_ENABLED: '0',
        OCRSPACE_NETWORK_ALLOWLIST: '0',
        OCR_NON_OCR_NETWORK_RESTRICTED: '1',
        OCR_NON_OCR_NETWORK_LOG: networkLogPath,
        OCR_ENGINE: engine === 'paddleocr' ? 'tesseractjs' : engine,
        OCR_CV_ASSIST: '0',
        PADDLEOCR_FIELD_FALLBACK: engine === 'paddleocr' ? '1' : '0',
        OCRSPACE_API_KEY: ''
    };
    try {
        await runSupervisedProcess({
            command: process.execPath, args: [scriptPath, outputPath], cwd: projectRoot,
            env, inputBuffer: rasterBuffer,
            timeoutMs: Number(process.env.OCR_SUPERVISED_TIMEOUT_MS) || 185000,
            terminationTimeoutMs: 7000, maxOutputBytes: 10_000_000
        });
        const payload = JSON.parse(await fs.readFile(outputPath, 'utf8'));
        if (!payload.ok) {
            const error = new Error(payload.error || (engine + ' child failed.'));
            error.code = payload.code || 'PARALLEL_OCR_READER_FAILED';
            throw error;
        }
        if (engine === 'paddleocr') {
            if (!payload.output?.modelManifestSha256) {
                const error = new Error('PaddleOCR model manifest hash is missing.');
                error.code = 'PADDLEOCR_MODEL_MANIFEST_MISSING';
                throw error;
            }
            if (!payload.output?.available) {
                const detail = payload.output?.error || payload.output?.reason || payload.output?.helperStatus || 'no underlying diagnostic was returned';
                const error = new Error('PaddleOCR unavailable or incomplete: ' + String(payload.output?.status || 'unknown') + '; ' + String(detail).slice(0, 700));
                error.code = 'PADDLEOCR_READER_UNAVAILABLE';
                throw error;
            }
            return payload.output;
        }
        const output = payload.output || {};
        const attempt = output.attempts?.[output.attempts.length - 1] || output.attempts?.[0] || { text: '' };
        const validation = bot.validateWorldOfWarshipsScreenshot(attempt, output.fields || {});
        return {
            engine, status: 'complete', record: validation.record, missing: validation.missing,
            accepted: validation.accepted, textCharacters: String(attempt.text || '').length,
            confidence: validation.confidence, pageSegmentationMode: validation.pageSegmentationMode,
            ambiguities: validation.record?.ambiguities || {}
        };
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
}

async function main() {
    const args = process.argv.slice(2);
    const arg = name => {
        const index = args.indexOf(name);
        return index >= 0 ? args[index + 1] : null;
    };
    const runPath = arg('--run-report');
    const gtPath = arg('--ground-truth');
    const artifactRoot = arg('--artifact-root');
    const outputRunPath = arg('--output-run-report');
    const outputRecoveryPath = arg('--recovery-report');
    const networkLogPath = arg('--network-log');
    if (![runPath, gtPath, artifactRoot, outputRunPath, outputRecoveryPath, networkLogPath].every(Boolean)) {
        throw new Error('Missing required local recovery arguments.');
    }

    const runBytes = await fs.readFile(runPath);
    const gtBytes = await fs.readFile(gtPath);
    const run = JSON.parse(runBytes.toString('utf8'));
    const gt = JSON.parse(gtBytes.toString('utf8'));
    const selected = selectedRecords(gt);
    if (run.sourceArchiveSha256 !== gt.candidateArchive?.sha256 || run.imageCount !== 63
        || run.pipeline !== EXPECTED_PIPELINE) {
        throw new Error('Run source archive does not match the v6 reference corpus.');
    }

    await fs.mkdir(path.dirname(networkLogPath), { recursive: true });
    try { await fs.access(networkLogPath); }
    catch { await fs.writeFile(networkLogPath, '', { flag: 'wx' }); }

    const byName = new Map((run.results || []).map(row => [row.filename, row]));
    if (byName.size !== (run.results || []).length) throw new Error('Duplicate run rows are not eligible for recovery.');

    const recovery = {
        schemaVersion: 1,
        status: 'RUNNING_LOCAL_ONLY_RECOVERY',
        inventorySelection: { id: INVENTORY, selectedImageCount: selected.length },
        sourceRunReportSha256: sha256(runBytes),
        groundTruthSha256: sha256(gtBytes),
        sourceArchiveSha256: run.sourceArchiveSha256,
        sourcePipeline: run.pipeline,
        providerRequests: 0,
        provider: 'DISABLED',
        networkPolicy: 'ALL_NETWORK_DESTINATIONS_BLOCKED',
        localReaderTimeoutMs: Number(process.env.OCR_IMAGE_TIMEOUT_MS),
        startedAt: new Date().toISOString(),
        images: []
    };

    try {
        for (const expected of selected) {
            const row = byName.get(expected.filename);
            const image = { filename: expected.filename, recoveredEngines: [], preservedEngines: [], failures: [] };
            if (!row || row.sourceSha256 !== expected.sourceImage.sha256
                || row.sourceBytes !== expected.sourceImage.bytes) {
                image.failures.push({ code: 'SOURCE_ROW_MISMATCH', message: 'Run row does not match the v6 source fingerprint.' });
                recovery.images.push(image);
                continue;
            }

            const pdfPath = safePath(artifactRoot, row.pdfPath);
            const rasterPath = safePath(artifactRoot, row.rasterPath);
            if (!pdfPath || !rasterPath) {
                image.failures.push({ code: 'UNSAFE_ARTIFACT_PATH', message: 'PDF or raster path is missing or unsafe.' });
                recovery.images.push(image);
                continue;
            }

            let pdfBuffer, rasterBuffer;
            try {
                pdfBuffer = await fs.readFile(pdfPath);
                rasterBuffer = await fs.readFile(rasterPath);
                if (pdfBuffer.subarray(0, 5).toString('ascii') !== '%PDF-'
                    || pdfBuffer.length !== row.pdfBytes || sha256(pdfBuffer) !== row.pdfSha256
                    || rasterBuffer.length !== row.rasterBytes || sha256(rasterBuffer) !== row.rasterSha256) {
                    throw new Error('Saved PDF/raster does not match the original run-report size and SHA-256.');
                }
                const rendered = await imageProcessor.renderSearchablePdfPage(pdfBuffer);
                const toPixels = buffer => imageProcessor.__test.runImageMagick(
                    ['png:-', '-depth', '8', 'rgba:-'], buffer,
                    { timeoutMs: 60000, maxOutputBytes: 80_000_000 }
                );
                const [savedPixels, renderedPixels] = await Promise.all([toPixels(rasterBuffer), toPixels(rendered)]);
                if (!Buffer.isBuffer(savedPixels) || !Buffer.isBuffer(renderedPixels) || !savedPixels.equals(renderedPixels)) {
                    throw new Error('Saved raster is not pixel-identical to a fresh rendering of its saved PDF.');
                }
            } catch (error) {
                image.failures.push({ code: 'PDF_RASTER_VERIFICATION_FAILED', message: String(error.message || error).slice(0, 400) });
                recovery.images.push(image);
                continue;
            }

            const priorReaders = Array.isArray(row.localReaders) ? row.localReaders : [];
            row.priorLocalReaders = row.priorLocalReaders || priorReaders.map(item => ({ ...item }));
            row.priorLocalReaderFailures = row.priorLocalReaderFailures
                || (Array.isArray(row.localReaderFailures) ? row.localReaderFailures.map(item => ({ ...item })) : []);
            const recoveryPlan = planReaderRecovery(priorReaders, ENGINES);
            const preservedReaders = recoveryPlan.preserved.map(item => ({ ...item }));
            image.preservedEngines.push(...preservedReaders.map(item => item.engine));
            const startedAt = new Date().toISOString();
            const tasks = [
                ...recoveryPlan.pending.map(engine => ({ engine, run: () => extractLocalReader(rasterBuffer, engine, networkLogPath) })),
                { engine: 'pdf-text-layer', run: async () => {
                    const text = await extractPdfText(pdfPath);
                    if (!text.trim()) { const error = new Error('Searchable PDF text layer is empty.'); error.code = 'PDF_TEXT_LAYER_EMPTY'; throw error; }
                    return { engine: 'pdf-text-layer', status: 'complete', record: parseTextLayer(text),
                        textCharacters: text.length, textSha256: sha256(Buffer.from(text, 'utf8')) };
                } }
            ];
            const settled = await Promise.allSettled(tasks.map(task => task.run()));
            const localReaders = [...preservedReaders];
            const failures = [];
            let pdfTextLayer = null;
            for (let index = 0; index < tasks.length; index += 1) {
                const task = tasks[index];
                const outcome = settled[index];
                if (outcome.status === 'fulfilled') {
                    if (task.engine === 'pdf-text-layer') pdfTextLayer = outcome.value;
                    else { localReaders.push(outcome.value); image.recoveredEngines.push(task.engine); }
                } else {
                    const error = outcome.reason;
                    const failure = { engine: task.engine, code: error.code || 'PARALLEL_READER_FAILED',
                        message: String(error.message || error).slice(0, 400) };
                    failures.push(failure);
                    image.failures.push(failure);
                }
            }
            localReaders.sort((a, b) => ENGINES.indexOf(a.engine) - ENGINES.indexOf(b.engine));
            if (!pdfTextLayer) pdfTextLayer = { engine: 'pdf-text-layer', status: 'failed', record: {}, textCharacters: 0, textSha256: null };
            row.localReaders = localReaders;
            row.localReaderFailures = failures;
            row.parallelReaderMatrix = {
                schemaVersion: 1,
                mode: 'CONCURRENT_LOCAL_READERS_FROM_HASH_VERIFIED_PDF_DERIVED_RASTER',
                concurrency: 'Promise.allSettled; isolated child process per local OCR engine',
                sourcePdfSha256: row.pdfSha256,
                sourceRasterSha256: row.rasterSha256,
                startedAt,
                completedAt: new Date().toISOString(),
                enginesRequested: [...recoveryPlan.pending, 'pdf-text-layer'],
                enginesPreserved: preservedReaders.map(item => item.engine),
                enginesCompleted: localReaders.map(item => item.engine),
                pdfTextLayer, localReaders, failures,
                providerRequests: 0, originalScreenshotFallback: false
            };
            row.localReaderRecovery = {
                mode: 'PARALLEL_LOCAL_ONLY_READER_MATRIX_FROM_HASH_VERIFIED_PDF_DERIVED_RASTER',
                startedAt, completedAt: row.parallelReaderMatrix.completedAt,
                timeoutMs: Number(process.env.OCR_SUPERVISED_TIMEOUT_MS),
                providerRequests: 0, networkLogPath: path.basename(networkLogPath),
                enginesRequested: [...recoveryPlan.pending, 'pdf-text-layer'],
                enginesPreserved: preservedReaders.map(item => item.engine),
                status: failures.length ? 'PARTIAL' : 'COMPLETE'
            };
            image.parallelEngines = row.parallelReaderMatrix.enginesCompleted;
            image.pdfTextLayer = pdfTextLayer.status;
            recovery.images.push(image);
        }
    } finally {
        await bot.terminateOcrWorker().catch(() => {});
    }

    const networkLog = await fs.readFile(networkLogPath);
    recovery.networkBlockedAttempts = networkLog.toString('utf8').split(/\r?\n/).filter(line => line.trim()).length;
    recovery.networkLogSha256 = sha256(networkLog);
    recovery.completedAt = new Date().toISOString();
    const failedImages = recovery.images.filter(image => image.failures.length > 0).length;
    recovery.status = failedImages === 0 && recovery.networkBlockedAttempts === 0
        ? 'COMPLETED_LOCAL_ONLY_RECOVERY'
        : 'COMPLETED_WITH_LOCAL_RECOVERY_FAILURES';
    run.localReaderRecovery = {
        report: path.basename(outputRecoveryPath),
        reportSha256: null,
        sourceRunReportSha256: recovery.sourceRunReportSha256,
        providerRequests: 0,
        networkBlockedAttempts: recovery.networkBlockedAttempts,
        networkLogSha256: recovery.networkLogSha256
    };
    run.derivedFromRunReportSha256 = recovery.sourceRunReportSha256;
    run.updatedAt = new Date().toISOString();

    await fs.mkdir(path.dirname(outputRecoveryPath), { recursive: true });
    const recoveryPayload = JSON.stringify(recovery, null, 2) + '\n';
    await fs.writeFile(outputRecoveryPath, recoveryPayload);
    run.localReaderRecovery.reportSha256 = sha256(Buffer.from(recoveryPayload));
    const runPayload = JSON.stringify(run, null, 2) + '\n';
    await fs.mkdir(path.dirname(outputRunPath), { recursive: true });
    await fs.writeFile(outputRunPath, runPayload);
    await fs.writeFile(outputRunPath + '.sha256', sha256(Buffer.from(runPayload)) + '  ' + path.basename(outputRunPath) + '\n');
    console.log('[DWBOT-LOCAL-READER-RECOVERY] ' + recovery.status
        + '; recovered images=' + recovery.images.filter(image => image.recoveredEngines.length > 0).length
        + '; provider requests=0; network blocked attempts=' + recovery.networkBlockedAttempts);
    if (recovery.status !== 'COMPLETED_LOCAL_ONLY_RECOVERY') process.exitCode = 1;
}

if (require.main === module) {
    main().catch(async error => {
        await bot.terminateOcrWorker().catch(() => {});
        console.error('[DWBOT-LOCAL-READER-RECOVERY] FAILED:', String(error.message || error).slice(0, 1000));
        process.exitCode = 1;
    });
}
module.exports = { extractLocalReader, sha256, safePath };

'use strict';

// Authorized four-image PDF-first acceptance. Each original image is submitted
// once to OCR.Space Engine 2; local readers consume the raster rendered from the
// returned searchable PDF. Unrelated outbound traffic remains restricted.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { quoteRequireOption } = require('./node-options-path');

const root = path.resolve(__dirname, '..');
const sequencePath = path.join(__dirname, 'run-ocr-sequence.js');
const networkBlockPath = path.join(__dirname, 'block-network.js');
const reportPath = path.resolve(process.env.FOUR_SCREENSHOT_REPORT_PATH
    || path.join(root, 'testdata', 'four-screenshot-pipeline-results.json'));
const nonOcrLogPath = path.resolve(process.env.OCR_NON_OCR_NETWORK_LOG
    || path.join(path.dirname(reportPath), 'four-image-non-ocr-network-attempts.log'));
const artifactDir = path.resolve(process.env.OCRSPACE_ARTIFACT_DIR
    || path.join(path.dirname(reportPath), path.basename(reportPath, path.extname(reportPath)) + '-ocrspace-artifacts'));
const fixtures = [
    'hoffmann-victory.png',
    'asashio-defeat.jpg',
    'libertad-victory.jpg',
    'schlieffen-defeat.jpg',
];

function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function fail(message) {
    console.error(`[FOUR-IMAGE] FAIL: ${message}`);
    process.exitCode = 1;
}

async function auditArtifacts(report, selected, networkLogReconciliation) {
    const rows = [];
    for (const key of selected) {
        const result = (report?.results || []).find(item => item.fixtureKey === key);
        const sourceBytes = await fs.promises.readFile(path.join(root, 'fixtures', 'four-screenshots', key));
        const sourceSha256 = String(result?.imageSha256 || '').toLowerCase();
        const validSourceHash = /^[a-f0-9]{64}$/.test(sourceSha256) && sha256(sourceBytes) === sourceSha256;
        const pdfPath = validSourceHash ? path.join(artifactDir, sourceSha256 + '.ocrspace.pdf') : null;
        const rasterPath = validSourceHash ? path.join(artifactDir, sourceSha256 + '.ocrspace-page.png') : null;
        let pdf = null;
        let raster = null;
        try { if (pdfPath) pdf = await fs.promises.readFile(pdfPath); } catch {}
        try { if (rasterPath) raster = await fs.promises.readFile(rasterPath); } catch {}
        const pdfHeaderValid = Boolean(pdf && pdf.subarray(0, 5).toString('ascii') === '%PDF-');
        const pdfEofValid = Boolean(pdf && pdf.subarray(Math.max(0, pdf.length - 1024)).includes(Buffer.from('%%EOF')));
        const rasterSha256 = raster ? sha256(raster) : null;
        const rasterPngValid = Boolean(raster && raster.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
        rows.push({
            fixtureKey: key,
            sourceSha256,
            pdf: pdf ? { file: path.basename(pdfPath), bytes: pdf.length, sha256: sha256(pdf), headerValid: pdfHeaderValid, eofMarkerValid: pdfEofValid } : null,
            raster: raster ? { file: path.basename(rasterPath), bytes: raster.length, sha256: rasterSha256, pngSignatureValid: rasterPngValid } : null,
            providerEvidence: result?.ocrSpacePdfFirst || null,
            valid: validSourceHash && pdfHeaderValid && pdfEofValid && Boolean(raster?.length)
                && result?.ocrSpacePdfFirst?.status === 'complete'
                && result?.ocrSpacePdfFirst?.provider === 'ocr.space'
                && result?.ocrSpacePdfFirst?.engine === 2
                && result?.ocrSpacePdfFirst?.sourceSha256 === sourceSha256
                && result?.ocrSpacePdfFirst?.pdfSha256 === (pdf ? sha256(pdf) : null)
                && result?.ocrSpacePdfFirst?.rasterSha256 === rasterSha256 && rasterPngValid,
        });
    }
    const audit = {
        schemaVersion: 1,
        createdAt: new Date().toISOString(),
        provider: 'OCR.Space',
        providerEngine: 2,
        artifactDirectory: artifactDir,
        sourceCount: selected.length,
        verifiedPdfCount: rows.filter(row => row.valid).length,
        networkLogReconciliation,
        images: rows,
    };
    const auditPath = reportPath + '.pdf-audit.json';
    await fs.promises.writeFile(auditPath, JSON.stringify(audit, null, 2) + '\n');
    return { audit, auditPath, passed: rows.length === selected.length && rows.every(row => row.valid) };
}

async function main() {
    const requested = process.argv.slice(2);
    const selected = requested.length ? requested : fixtures;
    const unique = new Set(selected);
    const unknown = selected.filter(name => !fixtures.includes(name));
    if (unknown.length) throw new Error(`Unknown fixture(s): ${unknown.join(', ')}. Choose: ${fixtures.join(', ')}`);
    if (unique.size !== selected.length) throw new Error('Duplicate screenshot arguments are not allowed.');
    if (!selected.length) throw new Error('At least one screenshot fixture must be selected.');
    if (!String(process.env.OCRSPACE_API_KEY || '').trim()) throw new Error('OCRSPACE_API_KEY is required; four-image PDF-first acceptance is blocked.');
    const resumeFromPath = String(process.env.FOUR_SCREENSHOT_RESUME_FROM || '').trim()
        ? path.resolve(process.env.FOUR_SCREENSHOT_RESUME_FROM) : null;
    let priorProgress = null;
    let networkLogReconciliation = { status: 'NOT_APPLICABLE_FRESH_RUN', originalLogPresent: true, originalZeroAttemptsClaimed: true };
    if (resumeFromPath) {
        priorProgress = JSON.parse(await fs.promises.readFile(resumeFromPath, 'utf8'));
        const priorLogPath = String(priorProgress.networkDiagnosticLogPath || '').trim();
        if (!priorLogPath) {
            networkLogReconciliation = { status: 'MISSING_ORIGINAL_LOG_PATH', originalLogPresent: false, originalZeroAttemptsClaimed: false, originalBlockedAttemptCount: null };
        } else {
            try {
                const priorLog = await fs.promises.readFile(priorLogPath);
                networkLogReconciliation = {
                    status: 'ORIGINAL_LOG_PRESENT', originalLogPath: priorLogPath,
                    originalLogPresent: true, originalLogBytes: priorLog.length,
                    originalLogSha256: sha256(priorLog), originalZeroAttemptsClaimed: priorLog.length === 0,
                    originalBlockedAttemptCount: priorLog.length === 0 ? 0 : null,
                };
            } catch {
                networkLogReconciliation = { status: 'MISSING_ORIGINAL_LOG', originalLogPath: priorLogPath, originalLogPresent: false, originalZeroAttemptsClaimed: false, originalBlockedAttemptCount: null };
            }
        }
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const actualReportPath = resumeFromPath ? reportPath + '.resume-' + timestamp + '.json' : reportPath;
    const actualProgressPath = actualReportPath + '.progress.json';
    const actualNetworkLogPath = resumeFromPath ? nonOcrLogPath + '.resume-' + timestamp + '.log' : nonOcrLogPath;
    await fs.promises.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.promises.mkdir(artifactDir, { recursive: true });
    for (const existing of [actualReportPath, actualProgressPath, actualNetworkLogPath]) {
        try { await fs.promises.access(existing); throw new Error('Existing OCR evidence found at ' + existing + '; refusing to overwrite or duplicate provider requests.'); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    if (!resumeFromPath) {
        const existingArtifacts = await fs.promises.readdir(artifactDir);
        if (existingArtifacts.length) throw new Error('Existing OCR.Space artifacts are present without a resume token; refusing a duplicate provider batch.');
    }
    await fs.promises.writeFile(actualNetworkLogPath, '', { flag: 'wx' });

    const preload = quoteRequireOption(networkBlockPath);
    const env = {
        ...process.env,
        OCR_ENGINE: process.env.OCR_ENGINE || 'tesseractjs',
        OCRSPACE_ENABLED: '1',
        OCRSPACE_NETWORK_ALLOWLIST: '1',
        OCRSPACE_ARTIFACT_DIR: artifactDir,
        OCR_NON_OCR_NETWORK_RESTRICTED: '1',
        OCR_NON_OCR_NETWORK_LOG: actualNetworkLogPath,
        OCR_SEQUENCE_REPORT_PATH: actualReportPath,
        OCR_SEQUENCE_PROGRESS_PATH: actualProgressPath,
        OCR_SEQUENCE_RESUME_FROM: resumeFromPath || '',
        NODE_OPTIONS: [process.env.NODE_OPTIONS, preload].filter(Boolean).join(' '),
    };

    console.log(`[FOUR-IMAGE] Running ${selected.length} image(s) with OCR.Space Engine 2 PDF-first; unrelated egress restricted. ${resumeFromPath ? 'Resume from ' + resumeFromPath : 'Fresh batch'}.`);
    const child = spawn(process.execPath, [sequencePath, ...selected], {
        cwd: root, env, stdio: 'inherit', windowsHide: true, shell: false,
    });
    const exit = await new Promise((resolve, reject) => {
        child.once('error', reject);
        child.once('close', (code, signal) => resolve({ code, signal }));
    });

    let report;
    try { report = JSON.parse(await fs.promises.readFile(actualReportPath, 'utf8')); }
    catch (error) { throw new Error(`Sequence report was not written or is invalid: ${error.message}`); }
    const auditResult = await auditArtifacts(report, selected, networkLogReconciliation);
    const network = report.networkIsolation || {};
    const rowsExact = (report.results || []).length === selected.length
        && report.results.every(row => row.pipelineCompleted === true
            && row.allExpectedFieldsPass === true
            && row.allRequiredFieldsPass === true
            && Array.isArray(row.requiredMissing) && row.requiredMissing.length === 0);
    const checks = {
        imageCount: report.imageCount === selected.length,
        completedImages: report.completedImages === selected.length,
        exactMatches: report.exactMatches === selected.length,
        mandatoryExactMatches: report.mandatoryExactMatches === selected.length,
        requiredFieldsComplete: report.requiredFieldsComplete === selected.length,
        allNineFieldsExact: rowsExact,
        fixtureOrder: Array.isArray(report.fixtureOrder)
            && report.fixtureOrder.length === selected.length
            && report.fixtureOrder.every((key, index) => key === selected[index]),
        ocrSpaceEnabled: network.ocrSpaceEnabled === true,
        ocrSpaceNetworkAllowed: network.ocrSpaceNetworkAllowed === true,
        unrelatedEgressRestricted: network.nonOcrNetworkRestricted === true,
        noDeniedUnrelatedEgress: network.nonOcrDeniedAttemptsDetected === false,
        pdfAndRasterArtifactsVerified: auditResult.passed,
        childExitedZero: exit.code === 0 && !exit.signal,
        networkDiagnosticLogPresent: fs.existsSync(actualNetworkLogPath),
        originalNetworkDiagnosticLogPresent: !resumeFromPath || networkLogReconciliation.originalLogPresent === true,
        originalNetworkLogNoDeniedAttempts: !resumeFromPath || networkLogReconciliation.originalZeroAttemptsClaimed === true,
        noDeniedLogEntries: fs.existsSync(actualNetworkLogPath) && (await fs.promises.stat(actualNetworkLogPath)).size === 0
            && (!resumeFromPath || networkLogReconciliation.originalLogPresent === true && networkLogReconciliation.originalZeroAttemptsClaimed === true),
    };
    for (const [name, passed] of Object.entries(checks)) {
        console.log(`[FOUR-IMAGE] ${passed ? 'PASS' : 'FAIL'} ${name}`);
        if (!passed) fail(`${name} did not meet acceptance criteria`);
    }
    console.log(`[FOUR-IMAGE] Report: ${path.relative(root, actualReportPath)}`);
    console.log(`[FOUR-IMAGE] Progress: ${path.relative(root, actualProgressPath)}`);
    console.log(`[FOUR-IMAGE] PDF audit: ${path.relative(root, auditResult.auditPath)}`);
    if (process.exitCode !== 1) console.log(`[FOUR-IMAGE] PASS ${selected.length}/${selected.length} PDF-first images with exact nine-field records.`);
}

main().catch(error => {
    console.error(`[FOUR-IMAGE] Fatal: ${error.stack || error.message}`);
    process.exitCode = 1;
});

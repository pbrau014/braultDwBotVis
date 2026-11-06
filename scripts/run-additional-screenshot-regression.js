'use strict';

// Runs the approved 16-image corpus through OCR.Space Engine 2 PDF-first.
// Every local reader consumes the PDF-derived page raster, never the original.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { quoteRequireOption } = require('./node-options-path');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'testdata', 'additional-screenshot-ground-truth.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const reportPath = path.resolve(process.env.OCR_SEQUENCE_REPORT_PATH || path.join(root, 'testdata', 'additional-screenshot-regression-results.json'));
const nonOcrLogPath = path.resolve(process.env.OCR_NON_OCR_NETWORK_LOG || path.join(root, 'testdata', 'additional-screenshot-non-ocr-network-attempts.log'));
const artifactDir = path.resolve(process.env.OCRSPACE_ARTIFACT_DIR || path.join(path.dirname(reportPath), path.basename(reportPath, path.extname(reportPath)) + '-ocrspace-artifacts'));
if (!String(process.env.OCRSPACE_API_KEY || '').trim()) throw new Error('OCRSPACE_API_KEY is required; eligible original images must use OCR.Space PDF-first processing.');
if (!Array.isArray(manifest.records) || manifest.records.length !== 16) throw new Error('The approved additional screenshot manifest must contain exactly 16 records.');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.mkdirSync(artifactDir, { recursive: true });
const blockNetworkPath = path.join(__dirname, 'block-network.js');
const preload = quoteRequireOption(blockNetworkPath);

function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }

async function auditArtifacts(report) {
    const rows = [];
    for (const item of manifest.records) {
        const result = (report?.results || []).find(row => row.fixtureKey === item.key);
        const sourceSha256 = String(result?.imageSha256 || '').toLowerCase();
        const validSourceHash = /^[a-f0-9]{64}$/.test(sourceSha256);
        const pdfPath = validSourceHash ? path.join(artifactDir, sourceSha256 + '.ocrspace.pdf') : null;
        const rasterPath = validSourceHash ? path.join(artifactDir, sourceSha256 + '.ocrspace-page.png') : null;
        let pdf = null;
        let raster = null;
        try { if (pdfPath) pdf = await fs.promises.readFile(pdfPath); } catch {}
        try { if (rasterPath) raster = await fs.promises.readFile(rasterPath); } catch {}
        const pdfHeaderValid = Boolean(pdf && pdf.subarray(0, 5).toString('ascii') === '%PDF-');
        const pdfEofValid = Boolean(pdf && pdf.subarray(Math.max(0, pdf.length - 1024)).includes(Buffer.from('%%EOF')));
        rows.push({
            key: item.key,
            filename: item.filename,
            sourceSha256,
            pdf: pdf ? { file: path.basename(pdfPath), bytes: pdf.length, sha256: sha256(pdf), headerValid: pdfHeaderValid, eofMarkerValid: pdfEofValid } : null,
            raster: raster ? { file: path.basename(rasterPath), bytes: raster.length, sha256: sha256(raster) } : null,
            providerEvidence: result?.ocrSpacePdfFirst || null,
            valid: validSourceHash && pdfHeaderValid && pdfEofValid && Boolean(raster?.length)
                && result?.ocrSpacePdfFirst?.status === 'complete'
                && result?.ocrSpacePdfFirst?.provider === 'ocr.space'
                && result?.ocrSpacePdfFirst?.engine === 2
                && result?.ocrSpacePdfFirst?.sourceSha256 === sourceSha256
                && result?.ocrSpacePdfFirst?.pdfSha256 === (pdf ? sha256(pdf) : null),
            actual: result?.actual || null,
            expected: result?.expected || item.expected || null,
            comparison: result?.comparison || null,
            missing: result?.requiredMissing || null,
        });
    }
    const audit = {
        schemaVersion: 1,
        createdAt: new Date().toISOString(),
        provider: 'OCR.Space',
        providerEngine: 2,
        artifactDirectory: artifactDir,
        sourceCount: manifest.records.length,
        verifiedPdfCount: rows.filter(row => row.valid).length,
        images: rows,
    };
    const auditPath = reportPath + '.pdf-audit.json';
    await fs.promises.writeFile(auditPath, JSON.stringify(audit, null, 2) + '\n');
    return { audit, auditPath, passed: rows.length === 16 && rows.every(row => row.valid) };
}

const env = {
    ...process.env,
    OCR_ENGINE: String(process.env.OCR_ENGINE || 'tesseractjs').trim().toLowerCase(),
    OCR_SAVE_RAW_DIAGNOSTICS: process.env.OCR_SAVE_RAW_DIAGNOSTICS || '1',
    OCR_SEQUENCE_REPORT_PATH: reportPath,
    OCRSPACE_ENABLED: '1',
    OCRSPACE_NETWORK_ALLOWLIST: '1',
    OCR_NON_OCR_NETWORK_RESTRICTED: '1',
    OCR_NON_OCR_NETWORK_LOG: nonOcrLogPath,
    OCRSPACE_ARTIFACT_DIR: artifactDir,
    NODE_OPTIONS: [process.env.NODE_OPTIONS, preload].filter(Boolean).join(' '),
};
const keys = manifest.records.map(item => item.key);
const child = spawn(process.execPath, [path.join(__dirname, 'run-ocr-sequence.js'), ...keys], {
    cwd: root, env, stdio: 'inherit', windowsHide: true,
});

child.on('error', error => {
    console.error(`[ADDITIONAL-IMAGES] Could not launch sequence: ${error.message}`);
    process.exitCode = 1;
});
child.on('close', async (code, signal) => {
    let report = null;
    try { report = JSON.parse(fs.readFileSync(reportPath, 'utf8')); }
    catch (error) { console.error(`[ADDITIONAL-IMAGES] Report missing or invalid: ${error.message}`); }
    let auditResult = { passed: false, auditPath: reportPath + '.pdf-audit.json' };
    try { auditResult = await auditArtifacts(report); }
    catch (error) { console.error(`[ADDITIONAL-IMAGES] PDF audit failed: ${error.message}`); }
    const network = report?.networkIsolation || {};
    const blocked = fs.existsSync(nonOcrLogPath) && fs.statSync(nonOcrLogPath).size > 0;
    const networkPass = network.ocrSpaceEnabled === true
        && network.ocrSpaceNetworkAllowed === true
        && network.nonOcrNetworkRestricted === true
        && network.nonOcrDeniedAttemptsDetected === false;
    const reportPass = report
        && report.imageCount === 16
        && report.completedImages === 16
        && report.exactMatches === 16
        && report.mandatoryExactMatches === 16
        && report.requiredFieldsComplete === 16
        && report.results?.length === 16
        && report.results.every(row => row.pipelineCompleted === true
            && row.allExpectedFieldsPass === true
            && row.allRequiredFieldsPass === true
            && Array.isArray(row.requiredMissing) && row.requiredMissing.length === 0);
    if (!networkPass) console.error('[ADDITIONAL-IMAGES] FAIL: OCR.Space must be enabled/allowlisted and unrelated egress restricted.');
    if (blocked) console.error(`[ADDITIONAL-IMAGES] Unrelated network attempts were denied; see ${path.relative(root, nonOcrLogPath)}.`);
    if (!auditResult.passed) console.error(`[ADDITIONAL-IMAGES] FAIL: PDF/raster audit incomplete; see ${path.relative(root, auditResult.auditPath)}.`);
    if (!reportPass) console.error('[ADDITIONAL-IMAGES] FAIL: every image must complete, match all nine mandatory fields exactly, and have no missing required field, including XP.');
    if (signal) console.error(`[ADDITIONAL-IMAGES] sequence ended on signal ${signal}`);
    process.exitCode = code === 0 && reportPass && networkPass && auditResult.passed && !blocked ? 0 : 1;
});

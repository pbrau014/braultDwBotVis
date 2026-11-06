#!/usr/bin/env node
'use strict';

// Runs every user-added image via the same supervised OCR sequence as the
// established acceptance fixtures. Missing/ambiguous values or any exact
// mismatch are failures; there is no partial-credit mode.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { quoteRequireOption } = require('./node-options-path');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'testdata', 'additional-screenshot-ground-truth.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const reportPath = path.resolve(process.env.OCR_SEQUENCE_REPORT_PATH || path.join(root, 'testdata', 'additional-screenshot-regression-results.json'));
const nonOcrLogPath = path.resolve(process.env.OCR_NON_OCR_NETWORK_LOG || path.join(root, 'testdata', 'additional-screenshot-non-ocr-network-attempts.log'));
const artifactDir = path.resolve(process.env.OCRSPACE_ARTIFACT_DIR || path.join(path.dirname(reportPath), `${path.basename(reportPath, path.extname(reportPath))}-ocrspace-artifacts`));
if (!process.env.OCRSPACE_API_KEY) throw new Error('OCRSPACE_API_KEY is required; eligible original images must use OCR.Space PDF-first processing.');
fs.mkdirSync(artifactDir, { recursive: true });
const blockNetworkPath = path.join(__dirname, 'block-network.js');
const preload = quoteRequireOption(blockNetworkPath);
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
const keys = manifest.records.map((item) => item.key);
const child = spawn(process.execPath, [path.join(__dirname, 'run-ocr-sequence.js'), ...keys], {
    cwd: root, env, stdio: 'inherit', windowsHide: true,
});
child.on('error', (error) => {
    console.error(`[ADDITIONAL-IMAGES] Could not launch sequence: ${error.message}`);
    process.exitCode = 1;
});
child.on('exit', (code, signal) => {
    let report = null;
    try { report = JSON.parse(fs.readFileSync(reportPath, 'utf8')); }
    catch (error) { console.error(`[ADDITIONAL-IMAGES] Report missing or invalid: ${error.message}`); }
    const blocked = fs.existsSync(nonOcrLogPath) && fs.statSync(nonOcrLogPath).size > 0;
    const networkPass = report?.networkIsolation?.ocrSpaceEnabled === true
        && report.networkIsolation.ocrSpaceNetworkAllowed === true
        && report.networkIsolation.nonOcrNetworkRestricted === true
        && report.networkIsolation.nonOcrDeniedAttemptsDetected === false;
    const reportPass = report
        && report.imageCount === manifest.records.length
        && report.completedImages === manifest.records.length
        && report.mandatoryExactMatches === manifest.records.length
        && report.requiredFieldsComplete === manifest.records.length;
    if (!networkPass) console.error('[ADDITIONAL-IMAGES] FAIL: OCR.Space must be enabled/allowlisted and unrelated egress restricted.');
    if (blocked) console.error(`[ADDITIONAL-IMAGES] Unrelated network attempts were denied; see ${path.relative(root, nonOcrLogPath)}.`);
    if (!reportPass) console.error('[ADDITIONAL-IMAGES] FAIL: every image must complete, match all nine mandatory fields exactly, and have no missing required field, including XP.');
    if (signal) console.error(`[ADDITIONAL-IMAGES] sequence ended on signal ${signal}`);
    process.exitCode = code === 0 && reportPass && networkPass && !blocked ? 0 : 1;
});

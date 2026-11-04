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
const blockedLogPath = path.resolve(process.env.OCR_NETWORK_BLOCK_LOG || path.join(root, 'testdata', 'additional-screenshot-blocked-network-attempts.log'));
const blockNetworkPath = path.join(__dirname, 'block-network.js');
const preload = quoteRequireOption(blockNetworkPath);
const env = {
    ...process.env,
    OCR_ENGINE: String(process.env.OCR_ENGINE || 'tesseractjs').trim().toLowerCase(),
    OCR_SAVE_RAW_DIAGNOSTICS: process.env.OCR_SAVE_RAW_DIAGNOSTICS || '1',
    OCR_SEQUENCE_REPORT_PATH: reportPath,
    OCR_NETWORK_BLOCK_ENABLED: '1',
    OCR_NETWORK_BLOCK_LOG: blockedLogPath,
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
    const blocked = fs.existsSync(blockedLogPath) && fs.statSync(blockedLogPath).size > 0;
    const reportPass = report
        && report.imageCount === manifest.records.length
        && report.completedImages === manifest.records.length
        && report.mandatoryExactMatches === manifest.records.length
        && report.requiredFieldsComplete === manifest.records.length;
    if (blocked) console.error(`[ADDITIONAL-IMAGES] Network attempts were detected; see ${path.relative(root, blockedLogPath)}.`);
    if (!reportPass) console.error('[ADDITIONAL-IMAGES] FAIL: every image must complete, match all nine mandatory fields exactly, and have no missing required field, including XP.');
    if (signal) console.error(`[ADDITIONAL-IMAGES] sequence ended on signal ${signal}`);
    process.exitCode = code === 0 && reportPass && !blocked ? 0 : 1;
});

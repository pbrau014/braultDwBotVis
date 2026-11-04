#!/usr/bin/env node
'use strict';

// Compatibility entry point for the established four-image acceptance suite.
// All OCR work runs in the shared, isolated-child sequence runner so a native
// or Tesseract.js worker timeout is bounded and the parent waits for confirmed
// process closure before the next image starts. No external OCR service is used.

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { quoteRequireOption } = require('./node-options-path');

const root = path.resolve(__dirname, '..');
const sequencePath = path.join(__dirname, 'run-ocr-sequence.js');
const networkBlockPath = path.join(__dirname, 'block-network.js');
const reportPath = path.resolve(process.env.FOUR_SCREENSHOT_REPORT_PATH
    || path.join(root, 'testdata', 'four-screenshot-pipeline-results.json'));
const blockedLogPath = path.resolve(process.env.OCR_NETWORK_BLOCK_LOG
    || path.join(root, 'testdata', 'four-screenshot-blocked-network-attempts.log'));
const fixtures = [
    'hoffmann-victory.png',
    'asashio-defeat.jpg',
    'libertad-victory.jpg',
    'schlieffen-defeat.jpg',
];

function fail(message) {
    console.error(`[FOUR-IMAGE] FAIL: ${message}`);
    process.exitCode = 1;
}

async function main() {
    const requested = process.argv.slice(2);
    const selected = requested.length ? requested : fixtures;
    const unique = new Set(selected);
    const unknown = selected.filter(name => !fixtures.includes(name));
    if (unknown.length) throw new Error(`Unknown fixture(s): ${unknown.join(', ')}. Choose: ${fixtures.join(', ')}`);
    if (unique.size !== selected.length) throw new Error('Duplicate screenshot arguments are not allowed.');
    if (!selected.length) throw new Error('At least one screenshot fixture must be selected.');

    await fs.promises.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.promises.rm(reportPath, { force: true });
    await fs.promises.rm(blockedLogPath, { force: true });

    const preload = quoteRequireOption(networkBlockPath);
    const env = {
        ...process.env,
        OCR_ENGINE: process.env.OCR_ENGINE || 'tesseractjs',
        OCR_SEQUENCE_REPORT_PATH: reportPath,
        OCR_NETWORK_BLOCK_ENABLED: '1',
        OCR_NETWORK_BLOCK_LOG: blockedLogPath,
        NODE_OPTIONS: [process.env.NODE_OPTIONS, preload].filter(Boolean).join(' '),
    };

    console.log(`[FOUR-IMAGE] Running ${selected.length} image(s) using ${env.OCR_ENGINE}; network blocked.`);
    const child = spawn(process.execPath, [sequencePath, ...selected], {
        cwd: root,
        env,
        stdio: 'inherit',
        windowsHide: true,
        shell: false,
    });

    const exit = await new Promise((resolve, reject) => {
        child.once('error', reject);
        child.once('close', (code, signal) => resolve({ code, signal }));
    });

    let report;
    try {
        report = JSON.parse(await fs.promises.readFile(reportPath, 'utf8'));
    } catch (error) {
        throw new Error(`Sequence report was not written or is invalid: ${error.message}`);
    }

    const expectedCount = selected.length;
    const checks = {
        imageCount: report.imageCount === expectedCount,
        completedImages: report.completedImages === expectedCount,
        mandatoryExactMatches: report.mandatoryExactMatches === expectedCount,
        requiredFieldsComplete: report.requiredFieldsComplete === expectedCount,
        fixtureOrder: Array.isArray(report.fixtureOrder)
            && report.fixtureOrder.length === expectedCount
            && report.fixtureOrder.every((key, index) => key === selected[index]),
        networkBlocked: report.networkBlocked === true,
        childExitedZero: exit.code === 0 && !exit.signal,
        noNetworkAttempts: !fs.existsSync(blockedLogPath) || (await fs.promises.stat(blockedLogPath)).size === 0,
    };
    for (const [name, passed] of Object.entries(checks)) {
        console.log(`[FOUR-IMAGE] ${passed ? 'PASS' : 'FAIL'} ${name}`);
        if (!passed) fail(`${name} did not meet acceptance criteria`);
    }

    if (report.completedImages !== expectedCount) {
        const failed = (report.results || []).filter(row => !row.pipelineCompleted);
        for (const row of failed) console.error(`[FOUR-IMAGE] ${row.fixtureKey || row.filename}: ${row.error || 'incomplete'}`);
    }
    console.log(`[FOUR-IMAGE] Report: ${path.relative(root, reportPath)}`);
    if (process.exitCode === 1) return;
    console.log(`[FOUR-IMAGE] PASS ${expectedCount}/${expectedCount} images completed with exact nine-field records.`);
}

main().catch(error => {
    console.error(`[FOUR-IMAGE] Fatal: ${error.stack || error.message}`);
    process.exitCode = 1;
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('branch verification exposes the explicit coordinated online-provider smoke path only', () => {
    const workflow = fs.readFileSync('.github/workflows/dwbot-verification.yml', 'utf8');
    assert.match(workflow, /run_live_multi_provider_smoke/);
    assert.match(workflow, /DWBOT_MULTI_PROVIDER_ENABLED: '1'/);
    assert.match(workflow, /OCRSPACE_ENABLED: '1'/);
    assert.match(workflow, /AZURE_DOCUMENT_INTELLIGENCE_ENABLED: '1'/);
    assert.match(workflow, /scripts\/run-multi-provider-smoke\.js/);
    assert.doesNotMatch(workflow, /eligible-only 56-image archive/);
    assert.doesNotMatch(workflow, /run_legacy_56_provider_acceptance/);
});

test('parallel local OCR is independent from the legacy 56-image inventory workflow', () => {
    const bot = fs.readFileSync('src/bot.js', 'utf8');
    const local = fs.readFileSync('src/parallel-local-ocr.js', 'utf8');
    assert.match(bot, /parallelLocalReadersPromise = runParallelLocalReaders/);
    assert.match(local, /DWBOT_MULTI_PROVIDER_ENABLED: '0'/);
    assert.match(local, /OCRSPACE_ENABLED: '0'/);
    assert.match(local, /AZURE_DOCUMENT_INTELLIGENCE_ENABLED: '0'/);
    assert.match(local, /Promise\.all\(jobs\)/);
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const fallback = require('../src/paddleocr-field-fallback');
const { buildBattleRecord } = require('../src/battle-record');

const context = { sourceWidth: 1920, sourceHeight: 1080, preparedWidth: 2600, preparedHeight: 1463 };

function parsedCandidate(group, field, value, rawText = value, score = 0.999) {
    return fallback.parseCropCandidate(group, {
        rawText,
        lines: [{ text: rawText, score }],
        elapsedMs: 42,
    });
}

test('field-crop PaddleOCR fallback is disabled by default', async () => {
    const fields = {};
    const output = await fallback.applyFieldFallback({ fields, env: {} });
    assert.equal(output.paddleOcrFallback.status, 'disabled');
    assert.equal(output.paddleOcrFallback.enabled, false);
    assert.equal(fallback.enabled({}), false);
    assert.equal(fallback.enabled({ PADDLEOCR_FIELD_FALLBACK: '1' }), true);
});

test('field need selection triggers on unresolved, ambiguous, or contradictory evidence', () => {
    const fields = {
        identityCandidates: [
            { text: '[ABCD]PlayerOne', confidence: 92, source: 'tesseract-a' },
            { text: '[ABCD]Player0ne', confidence: 88, source: 'tesseract-b' },
        ],
        metadataCandidates: [
            { text: 'North - Random Battle\nBattle start time: 13.07.2025 14:17', confidence: 92, source: 'tesseract-a' },
            { text: 'North - Brawl\nBattle start time: 13.07.2025 14:17', confidence: 91, source: 'tesseract-b' },
        ],
        resultCandidates: [{ text: 'Victory!', confidence: 99 }],
        rewardCandidates: [
            { credits: '495530', xp: '6649', freeXp: '2350', confidence: 92, source: 'a' },
            { credits: '495530', xp: '6649', freeXp: '2358', confidence: 92, source: 'b' },
        ],
        damageCandidates: [{ value: '31160', confidence: 92, source: 'a' }],
    };
    const result = fallback.determineNeededFields('Victory! North Random Battle Battle start time: 13.07.2025 14:17', fields);
    const names = result.needed.map(item => item.field);
    assert.ok(names.includes('player'), 'player candidate conflict should trigger a field crop');
    assert.ok(names.includes('mode'), 'metadata conflict should trigger a field crop');
    assert.ok(names.includes('freeXp'), 'reward conflict should trigger a field crop');
    assert.ok(!names.includes('result'), 'stable result candidate should not trigger a field crop');
});

test('crop-specific helper errors are preserved in diagnostics rather than hidden as empty OCR', () => {
    const group = { id: 'metadata', fields: ['map'], rect: { left: 20, top: 100, width: 500, height: 100 } };
    const candidate = fallback.parseCropCandidate(group, { error: 'RuntimeError: local crop inference failed', rawText: '', lines: [], elapsedMs: 11 });
    assert.equal(candidate.status, 'failed');
    assert.match(candidate.reason, /local crop inference failed/);
});

test('invalid or non-finite proposed rectangles fail closed', () => {
    assert.equal(fallback.__test.clampRect({ left: NaN, top: 1, width: 20, height: 10 }, 100, 100), null);
    assert.equal(fallback.__test.clampRect({ left: 1, top: 1, width: Infinity, height: 10 }, 100, 100), null);
    assert.equal(fallback.__test.clampRect({ left: 1, top: 1, width: 0, height: 10 }, 100, 100), null);
});

test('fallback skips model startup when the image deadline is already exhausted', async () => {
    const fields = { identityCandidates: [{ text: '[CLAN]KnownPlayer', confidence: 91, source: 'tesseract' }] };
    const output = await fallback.applyFieldFallback({
        imageBuffer: Buffer.from('not-used-because-budget-is-exhausted'), rawText: 'some text', fields,
        sourceWidth: 1920, sourceHeight: 1080, preparedWidth: 1920, preparedHeight: 1080,
        timeoutMs: 0,
        env: { PADDLEOCR_FIELD_FALLBACK: '1', PADDLEOCR_PYTHON_BIN: 'python',
            PADDLEOCR_DET_MODEL_DIR: 'local-det', PADDLEOCR_REC_MODEL_DIR: 'local-rec' },
    });
    assert.equal(output.paddleOcrFallback.status, 'budget-exhausted');
    assert.equal(output.paddleOcrFallback.attemptedCrops.length, 0);
});

test('per-crop latency summary reports median, p95, mean, and total', () => {
    const summary = fallback.summarizeCropLatency([{ elapsedMs: 10 }, { elapsedMs: 20 }, { elapsedMs: 30 }, { elapsedMs: 40 }]);
    assert.deepEqual(summary, { count: 4, totalMs: 100, medianMs: 20, p95Ms: 40, meanMs: 25 });
    assert.equal(fallback.summarizeCropLatency([]).p95Ms, null);
});

test('helper-reported blocked network attempts fail closed and retain diagnostics', async (t) => {
    const python = process.platform === 'win32' ? 'python' : 'python3';
    const probe = spawnSync(python, ['--version'], { encoding: 'utf8', timeout: 10000 });
    if (probe.error || probe.status !== 0) { t.skip('Python interpreter not installed for helper protocol test'); return; }
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'paddle-helper-protocol-'));
    const helper = path.join(dir, 'fake-helper.py');
    try {
        await fs.writeFile(helper,
            `import json, os
print(json.dumps({'schemaVersion':1,'status':'complete','networkAttemptCount':0,'results':[],'encoding':os.environ.get('PYTHONIOENCODING')}))
`,
            'utf8');
        const output = await fallback.__test.runHelper(path.join(dir, 'unused.img'), [], {
            python, helperPath: helper, timeoutMs: 10000,
        });
        assert.equal(output.encoding, 'utf-8');
    } finally {
        await fs.rm(dir, { recursive: true, force: true });
    }
});

test('PaddleOCR fallback field request order preserves the canonical nine-field contract', () => {
    assert.deepEqual(fallback.__test.FIELDS, [
        'result', 'player', 'map', 'mode', 'battleStart', 'credits', 'freeXp', 'damage', 'xp',
    ]);
});

test('PaddleOCR JSON serializer escapes Unicode before writing to legacy Windows stdout', async (t) => {
    const python = process.platform === 'win32' ? 'python' : 'python3';
    const probe = spawnSync(python, ['--version'], { encoding: 'utf8', timeout: 10000 });
    if (probe.error || probe.status !== 0) { t.skip('Python interpreter not installed for helper serialization test'); return; }
    const script = [
        'import importlib.util, sys',
        'spec=importlib.util.spec_from_file_location("paddle_helper_test", sys.argv[1])',
        'module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)',
        'sys.stdout.reconfigure(encoding="cp1252", errors="strict")',
        'module.emit_json({"text": chr(0x2606)})',
    ].join('; ');
    const result = spawnSync(python, ['-c', script, fallback.__test.HELPER_PATH], {
        encoding: 'utf8', timeout: 10000,
        env: { ...process.env, PYTHONIOENCODING: 'cp1252' },
    });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    assert.ok([...Buffer.from(result.stdout, 'utf8')].every(byte => byte < 0x80), 'JSON transport must be ASCII-only');
    assert.deepEqual(JSON.parse(result.stdout.trim()), { text: '☆' });
});
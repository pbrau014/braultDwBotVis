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
        await fs.writeFile(helper, "import json; print(json.dumps({'schemaVersion':1,'status':'blocked','networkAttemptCount':1,'networkAttempts':['https://blocked.invalid'],'results':[]}))\n", 'utf8');
        await assert.rejects(fallback.__test.runHelper(path.join(dir, 'unused.img'), [], { python, helperPath: helper, timeoutMs: 10000 }), error => {
            assert.equal(error.code, 'PADDLEOCR_NETWORK_ATTEMPT_BLOCKED');
            assert.equal(error.networkAttemptCount, 1);
            assert.deepEqual(error.networkAttempts, ['https://blocked.invalid']);
            return true;
        });
    } finally {
        await fs.rm(dir, { recursive: true, force: true });
    }
});

test('PaddleOCR candidates without a usable score or below the conservative floor are rejected', () => {
    const group = { id: 'result', fields: ['result'], rect: { left: 20, top: 100, width: 500, height: 100 } };
    const scoreless = fallback.parseCropCandidate(group, { rawText: 'Victory!', lines: [{ text: 'Victory!', score: null }] });
    assert.equal(scoreless.status, 'rejected');
    assert.equal(scoreless.reason, 'ocr-confidence-unavailable');
    const lowScore = fallback.parseCropCandidate(group, { rawText: 'Victory!', lines: [{ text: 'Victory!', score: 0.35 }] });
    assert.equal(lowScore.status, 'rejected');
    assert.equal(lowScore.reason, 'ocr-confidence-below-candidate-floor');
});

test('PaddleOCR raw output cannot independently authorize a result', () => {
    const group = { id: 'result', fields: ['result'], rect: { left: 20, top: 100, width: 500, height: 100 } };
    const candidate = parsedCandidate(group, 'result', 'Victory!', 'Victory!');
    assert.equal(candidate.status, 'candidate');
    assert.equal(candidate.confidence, fallback.__test.SINGLE_READ_CONFIDENCE_CEILING);
    const fields = { resultCandidates: [] };
    fallback.addCandidatesToFields(fields, [candidate]);
    const record = buildBattleRecord('neutral text', fields);
    assert.equal(record.result, 'Not detected');
});

test('PaddleOCR may corroborate an identical Tesseract candidate through existing parser consensus', () => {
    const group = { id: 'identity', fields: ['player'], rect: { left: 20, top: 200, width: 600, height: 120 } };
    const paddleCandidate = parsedCandidate(group, 'player', '[CLAN]PlayerOne', '[CLAN]PlayerOne');
    const fields = { identityCandidates: [{ text: '[CLAN]PlayerOne', confidence: 66, source: 'tesseract-single-read' }] };
    fallback.addCandidatesToFields(fields, [paddleCandidate]);
    const record = buildBattleRecord('', fields);
    assert.equal(record.player, '[CLAN]PlayerOne');
});

test('player-only rescue cannot silently change optional ship identity from the same crop', () => {
    const group = { id: 'identity', fields: ['player'], rect: { left: 20, top: 200, width: 600, height: 120 } };
    const candidate = parsedCandidate(group, 'player', '[CLAN]PlayerOne', '[CLAN]PlayerOne X TESTSHIP');
    const fields = { identityCandidates: [] };
    fallback.addCandidatesToFields(fields, [candidate]);
    const record = buildBattleRecord('', fields);
    assert.equal(record.player, 'Not detected', 'one Paddle-only candidate must remain below single-read acceptance');
    assert.equal(record.ship, 'Not detected', 'ship is not part of this fallback request');
    assert.equal(fields.identityCandidates[0].text, '[CLAN]PlayerOne');
});

test('PaddleOCR O/0 identity conflict is preserved for human review, not rewritten', () => {
    const fields = { identityCandidates: [{ text: '[HO-FL]VeritechCEO', confidence: 92, source: 'tesseract' }] };
    const candidate = {
        fieldGroup: 'identity', status: 'candidate', rawText: '[HO-FL]VeritechCE0', confidence: 84,
        fields: { player: '[HO-FL]VeritechCE0' },
    };
    const decisions = fallback.addCandidatesToFields(fields, [candidate]);
    assert.match(fields.ambiguities.player, /OCR-confusable glyphs/);
    assert.equal(fields.identityCandidates.length, 1, 'confusable Paddle candidate must not enter identity winner selection');
    assert.equal(decisions[0].status, 'conflict-preserved-for-review');
    assert.equal(buildBattleRecord('', fields).player, 'Not detected');
});

test('merged adjacent reward numbers are rejected by the existing field parser', () => {
    const group = { id: 'xp', fields: ['xp'], rect: { left: 200, top: 250, width: 120, height: 80 } };
    const candidate = parsedCandidate(group, 'xp', '', '6649 2350');
    assert.equal(candidate.status, 'rejected');
    assert.equal(candidate.fields.xp, null);
    assert.equal(candidate.reason, 'existing-field-parser-rejected-raw-output');
});

test('field crop plan stays bounded and every crop fits the source image', () => {
    const needed = ['result', 'player', 'map', 'mode', 'battleStart', 'credits', 'xp', 'freeXp', 'damage']
        .map(field => ({ field, reasons: ['unresolved-or-invalid'] }));
    const plan = fallback.buildCropRequests(needed, {}, context, { PADDLEOCR_FIELD_FALLBACK_MAX_CROPS: '4' });
    assert.equal(plan.selected.length, 4);
    assert.equal(plan.skipped.length, 3);
    for (const item of plan.selected) {
        assert.ok(item.rect.left >= 0 && item.rect.top >= 0);
        assert.ok(item.rect.width >= 2 && item.rect.height >= 2);
        assert.ok(item.rect.left + item.rect.width <= context.sourceWidth);
        assert.ok(item.rect.top + item.rect.height <= context.sourceHeight);
        assert.ok(item.rect.width <= context.sourceWidth * 0.72);
        assert.ok(item.rect.height <= context.sourceHeight * 0.32);
    }
});

test('numeric PaddleOCR candidate only resolves when it agrees with a Tesseract candidate', () => {
    const group = { id: 'credits', fields: ['credits'], rect: { left: 100, top: 300, width: 180, height: 80 } };
    const candidate = parsedCandidate(group, 'credits', '495530', '495530');
    const onlyPaddleFields = { rewardCandidates: [] };
    fallback.addCandidatesToFields(onlyPaddleFields, [candidate]);
    assert.equal(buildBattleRecord('', onlyPaddleFields).credits, 'Not detected');

    const agreeingFields = { rewardCandidates: [{ credits: '495530', xp: '', freeXp: '', confidence: 52, source: 'tesseract-single-read' }] };
    fallback.addCandidatesToFields(agreeingFields, [candidate]);
    assert.equal(buildBattleRecord('', agreeingFields).credits, '495530');
});

test('PaddleOCR reward conflict is left unresolved rather than arbitrated by confidence', () => {
    const group = { id: 'freeXp', fields: ['freeXp'], rect: { left: 400, top: 300, width: 120, height: 80 } };
    const candidate = parsedCandidate(group, 'freeXp', '2358', '2358');
    const fields = { rewardCandidates: [{ credits: '', xp: '', freeXp: '2350', confidence: 97, source: 'tesseract-a' }] };
    fallback.addCandidatesToFields(fields, [candidate]);
    const record = buildBattleRecord('', fields);
    assert.equal(record.freeXp, 'Not detected');
    assert.match(record.ambiguities.freeXp, /disagreed/);
});

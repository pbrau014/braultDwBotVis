'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseTextLayer, consensus, score, selectRecords, GATE_B_19, ANALYSIS_21 } = require('../scripts/evaluate-ocrspace-pdf-text-layer');

test('searchable PDF text layer parses result, map, mode and battle start without remote player identity', () => {
    const text = [
        'Victory!',
        'Shards',
        'Random Battle',
        'Battle start time: 12.10.2026 19:33',
        '[CLAN]PlayerName X SHIP',
        'Received for the Battle',
        '638 409 6 531 3 376',
        'Battle performance',
        '184 879',
        'Damage',
    ].join('\n');
    const fields = parseTextLayer(text);
    assert.equal(fields.result, 'Victory');
    assert.equal(fields.map, 'Shards');
    assert.equal(fields.mode, 'Random Battle');
    assert.equal(fields.battleStart, '12.10.2026 19:33');
    assert.equal(Object.hasOwn(fields, 'player'), false);
});

test('PDF text-layer parser does not invent a field when the source text is missing or ambiguous', () => {
    const fields = parseTextLayer('PERSONAL SCORE\nTEAM SCORE\nDAMAGE');
    assert.equal(fields.result, undefined);
    assert.equal(fields.map, undefined);
    assert.equal(fields.mode, undefined);
    assert.equal(fields.battleStart, undefined);
    assert.equal(Object.hasOwn(fields, 'player'), false);
});

test('strict fusion requires two matching candidates and keeps conflicts unresolved', () => {
    assert.equal(consensus(['Victory', 'Victory', 'Defeat'], 'result'), 'Victory');
    assert.equal(consensus(['Victory', 'Defeat', 'Defeat'], 'result'), 'Defeat');
    assert.equal(consensus(['Victory', 'Defeat', null], 'result'), null);
    assert.equal(consensus(['123456', '123456', '123465'], 'credits'), '123456');
    assert.equal(consensus(['123456', '123456', '123465', '123465'], 'credits'), null, 'a tied 2–2 vote must remain unresolved');
    assert.equal(consensus(['123456', '123456', '123456', '123465'], 'credits', 3), '123456');
    assert.equal(consensus(['123456', '123465', '123465', '123466'], 'credits', 3), null);
});

test('fusion evaluation counts missing values as unresolved and never changes the input record', () => {
    const expected = { result: 'Victory', player: '[CLAN]Pilot' };
    const actual = { result: 'Victory' };
    const before = JSON.stringify(actual);
    const report = score(expected, actual, ['result', 'player']);
    assert.deepEqual(report.metrics, { eligible: 2, exact: 1, wrong: 0, unresolved: 1, exactMatchRate: 0.5 });
    assert.equal(JSON.stringify(actual), before);
});

test('Gate B and 21-image analysis use separate deterministic complete-record inventories', () => {
    const records = Array.from({ length: 63 }, (_, i) => ({
        corpusOrder: i + 1,
        filename: 'image-' + (i + 1),
        recordStatus: i < 21 ? 'COMPLETE_9_FIELD_TRANSCRIPTION' : 'PARTIAL_TRANSCRIPTION',
        expected: Object.fromEntries(['result','player','map','mode','battleStart','credits','freeXp','damage','xp'].map(f => [f, f + '-' + i])),
        fieldStatus: Object.fromEntries(['result','player','map','mode','battleStart','credits','freeXp','damage','xp'].map(f => [f, { eligible_for_exact_match: i < 21 }]))
    }));
    const gt = { records };
    assert.equal(selectRecords(gt, GATE_B_19).length, 19);
    assert.equal(selectRecords(gt, ANALYSIS_21).length, 21);
});


test('five-source consensus requires a strict majority and is independent of reader ordering', () => {
    const candidates = ['123456', '123456', '123456', '123465', null];
    assert.equal(consensus(candidates, 'credits', 3), '123456');
    assert.equal(consensus([...candidates].reverse(), 'credits', 3), '123456');
    assert.equal(consensus(['123456', '123456', '123465', '123465', null], 'credits', 3), null);
    assert.equal(consensus(['123456', '123456', '123465', '123465', '123465'], 'credits', 3), '123465');
});

'use strict';

process.env.NODE_ENV = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateWorldOfWarshipsScreenshot } = require('../src/bot');

function completeFields(overrides = {}) {
    return {
        identityCandidates: [{ text: '[WOLF1]PlayerName VIII YAMATO', confidence: 99, source: 'identity-crop' }],
        metadataCandidates: [{ text: 'Estuary Random Battle\nBattle Start Time: 06.11.2026 18:00', confidence: 99, source: 'metadata-crop' }],
        resultCandidates: [{ text: 'Victory', confidence: 99, source: 'result-crop' }],
        rewardCandidates: [{ credits: '123456', freeXp: '123', xp: '1234', confidence: 99 }],
        damageCandidates: [{ value: '123456', confidence: 99 }],
        ...overrides,
    };
}

test('complete nine-field record is accepted when no cross-reader conflict is present', () => {
    const validation = validateWorldOfWarshipsScreenshot({ text: 'Victory', confidence: 99 }, completeFields());
    assert.equal(validation.record.result, 'Victory');
    assert.equal(validation.record.player, '[WOLF1]PlayerName');
    assert.equal(validation.record.map, 'Estuary');
    assert.equal(validation.record.mode, 'Random Battle');
    assert.equal(validation.record.battleStart, '06.11.2026 18:00');
    assert.equal(validation.record.credits, '123456');
    assert.equal(validation.record.freeXp, '123');
    assert.equal(validation.record.damage, '123456');
    assert.equal(validation.record.xp, '1234');
    assert.equal(validation.accepted, true);
});

test('conflicting independent local reader prevents acceptance of a complete record', () => {
    const validation = validateWorldOfWarshipsScreenshot({ text: 'Victory', confidence: 99 }, completeFields({
        parallelLocalReaders: {
            status: 'complete',
            readers: {
                nativeTesseract: {
                    status: 'success',
                    sourceSha256: 'same-source',
                    output: { record: { map: 'Faulty Fjord' } },
                },
            },
        },
    }));
    assert.equal(validation.missing.length, 0);
    assert.equal(validation.accepted, false);
    assert.deepEqual(validation.unresolvedFields.map(item => item.field), ['map']);
    assert.equal(validation.checks.find(item => item.label === 'Map').passed, false);
});

test('remote provider disagreement is retained as unresolved rather than overridden by local completeness', () => {
    const validation = validateWorldOfWarshipsScreenshot({ text: 'Victory', confidence: 99 }, completeFields({
        ocrSpaceEvidence: {
            status: 'complete',
            evidence: [{ field: 'fullScreenshot', source: 'ocrspace-searchable-pdf', status: 'success',
                text: 'Defeat\nEstuary Random Battle\nBattle Start Time: 06.11.2026 18:00\nReceived for the battle\n123456 Credits\n123 Free XP\n1234 XP' }],
        },
    }));
    assert.equal(validation.missing.length, 0);
    assert.equal(validation.accepted, false);
    assert.ok(validation.unresolvedFields.some(item => item.field === 'result'));
});

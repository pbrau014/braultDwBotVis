'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { reconcileOcrSpaceEvidence } = require('../src/ocrspace-reconciliation');

const localRecord = {
    result: 'Victory', player: '[ABC]Player', map: 'Shards', mode: 'Random Battle',
    battleStart: '28.09.2024 17:04', credits: '123456', freeXp: '456',
    damage: '123456', xp: '6646',
};

test('OCR.Space text is parsed as a separate diagnostic cross-check for the nine fields', () => {
    const result = reconcileOcrSpaceEvidence({
        status: 'complete', requests: 4,
        evidence: [
            { field: 'result', source: 'opencv-result-title', status: 'success', text: 'Victory' },
            { field: 'battleMetadata', source: 'opencv-battle-metadata', status: 'success', text: 'Shards\nRandom Battle\nBattle Start Time: 28.09.2024 17:04' },
            { field: 'rewardBand', source: 'opencv-reward-band', status: 'success', text: '123456 6646 456' },
            { field: 'damage', source: 'opencv-damage', status: 'success', text: '123456' },
        ],
    }, localRecord);
    assert.equal(result.status, 'compared');
    assert.equal(result.diagnosticOnly, true);
    for (const key of ['result', 'map', 'mode', 'battleStart', 'credits', 'freeXp', 'damage', 'xp']) {
        assert.equal(result.fields[key].status, 'agreement', key);
    }
    assert.equal(result.fields.player.status, 'excluded_by_privacy_policy');
    assert.equal(result.fields.player.remoteCandidates.length, 0);
});

test('conflicting remote reads are flagged and never hidden by a local match', () => {
    const result = reconcileOcrSpaceEvidence({
        status: 'complete', requests: 2,
        evidence: [
            { field: 'xp', source: 'crop-a', status: 'success', text: '6646' },
            { field: 'xp', source: 'crop-b', status: 'success', text: '66465' },
        ],
    }, localRecord);
    assert.equal(result.fields.xp.status, 'remote_conflict');
    assert.equal(result.fields.xp.remoteCandidates.length, 2);
    assert.equal(result.fields.xp.remoteValue, undefined);
});

test('remote-only values remain unconfirmed and do not mutate or complete the local record', () => {
    const local = { ...localRecord, xp: 'Not detected' };
    const before = { ...local };
    const result = reconcileOcrSpaceEvidence({
        status: 'complete', requests: 1,
        evidence: [{ field: 'xp', source: 'opencv-reward-band', status: 'success', text: '6646' }],
    }, local);
    assert.equal(result.fields.xp.status, 'remote_only_unconfirmed');
    assert.equal(result.fields.xp.remoteValue, '6646');
    assert.deepEqual(local, before);
    assert.equal(result.diagnosticOnly, true);
});

test('full-screen OCR.Space and Azure text is parsed into separate remote candidates', () => {
    const text = [
        'Victory',
        'Shards',
        'Random Battle',
        'Battle Start Time: 28.09.2024 17:04',
        'Received for the Battle',
        '123456',
        '6646',
        '456',
        'Battle Performance',
        'Damage: 123456',
    ].join('\n');
    const result = reconcileOcrSpaceEvidence({
        status: 'complete', requests: 1,
        evidence: [{ field: 'fullScreenshot', source: 'azure-document-intelligence', status: 'success', text }],
    }, localRecord);
    assert.equal(result.status, 'compared');
    for (const key of ['result', 'map', 'mode', 'battleStart', 'credits', 'freeXp', 'damage', 'xp']) {
        assert.equal(result.fields[key].status, 'agreement', key);
    }
    assert.equal(result.fields.player.status, 'excluded_by_privacy_policy');
    assert.equal(result.fields.player.remoteCandidates.length, 0);
});

test('disabled or failed provider evidence produces no remote candidates', () => {
    const result = reconcileOcrSpaceEvidence({ status: 'disabled', requests: 0, evidence: [] }, localRecord);
    assert.equal(result.status, 'disabled');
    assert.equal(result.fields.xp.status, 'no_remote_candidate');
    assert.equal(result.fields.player.status, 'excluded_by_privacy_policy');
});

test('field reconciliation retains provider geometry and original/provider input identities', () => {
    const result = reconcileOcrSpaceEvidence({
        status: 'complete', originalScreenshotSha256: 'original-hash', providerInputSha256: 'upload-hash',
        evidence: [{
            field: 'xp', source: 'azure-document-intelligence-line', status: 'success', text: 'XP 6646',
            pageIndex: 0, pageNumber: 1, polygon: [1,2,20,2,20,10,1,10], geometryValid: true,
            pageWidth: 100, pageHeight: 80, pageUnit: 'pixel',
            words: [{ text: '6646', confidence: 0.9, polygon: [2,3,10,3,10,8,2,8] }],
            confidenceValues: [0.9], originalScreenshotSha256: 'original-hash', providerInputSha256: 'upload-hash',
        }],
    }, localRecord);
    const candidate = result.fields.xp.remoteCandidates[0];
    assert.equal(candidate.geometryValid, true);
    assert.deepEqual(candidate.polygon, [1,2,20,2,20,10,1,10]);
    assert.equal(candidate.originalScreenshotSha256, 'original-hash');
    assert.equal(candidate.providerInputSha256, 'upload-hash');
});

test('invalid Azure line geometry is retained only as raw evidence, not a field candidate', () => {
    const result = reconcileOcrSpaceEvidence({
        status: 'complete',
        evidence: [{
            field: 'xp', source: 'azure-document-intelligence-line', status: 'success',
            text: 'XP 999999', geometryValid: false, polygon: [], originalScreenshotSha256: 'same',
        }],
    }, localRecord);
    assert.equal(result.fields.xp.status, 'no_remote_candidate');
});

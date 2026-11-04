'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { summarize, exact, normalize } = require('../scripts/summarize-ocr-acceptance');

test('OCR benchmark metric definitions count unresolved fields as incorrect and wrong accepted values separately', () => {
    const manifest = {
        requiredComparedFields: ['player', 'credits'],
        records: [
            { key: 'a', expected: { player: 'Alpha', credits: 100 } },
            { key: 'b', expected: { player: 'Bravo', credits: 200 } },
        ],
    };
    const report = { results: [
        { fixtureKey: 'a', pipelineCompleted: true, elapsedMs: 10, actual: { player: 'Alpha', credits: 101 } },
        { fixtureKey: 'b', pipelineCompleted: true, elapsedMs: 20, actual: { player: null, credits: 999 } },
    ] };
    const metrics = summarize(report, manifest);
    assert.equal(metrics.summary.correctFieldObservations, 1);
    assert.equal(metrics.summary.totalFieldObservations, 4);
    assert.equal(metrics.summary.completeRecords, 0);
    assert.equal(metrics.summary.acceptedWrongFieldObservations, 2);
    assert.equal(metrics.summary.unresolvedFieldObservations, 1);
    assert.equal(metrics.summary.criticalFalseAcceptanceRate, 2 / 3);
    assert.equal(metrics.summary.unresolvedRate, 1 / 4);
});

test('missing rows are incomplete and ground truth comes from the approved manifest', () => {
    const manifest = { requiredComparedFields: ['result'], records: [
        { key: 'a', expected: { result: 'Victory' } }, { key: 'b', expected: { result: 'Defeat' } },
    ] };
    const report = { results: [{ fixtureKey: 'a', pipelineCompleted: true, expected: { result: 'Defeat' }, actual: { result: 'Victory' } }] };
    const metrics = summarize(report, manifest);
    assert.equal(metrics.summary.totalFieldObservations, 2);
    assert.equal(metrics.summary.correctFieldObservations, 1);
    assert.equal(metrics.summary.completeRecords, 1);
    assert.equal(metrics.summary.unresolvedFieldObservations, 1);
    assert.equal(metrics.recordFailures.length, 1);
    assert.equal(exact('credits', 1000000, '1e6'), false);
    assert.notEqual(normalize('credits', '1e6'), null);
});

test('XP is a mandatory field and an unresolved XP makes the record fail', () => {
    const manifest = {
        requiredComparedFields: ['result', 'xp'],
        optionalComparedFields: [],
        comparedFields: ['result', 'xp'],
        records: [{ key: 'optional.png', expected: { result: 'Victory', xp: 1234 } }],
    };
    const report = { results: [{ fixtureKey: 'optional.png', pipelineCompleted: true, elapsedMs: 12,
        requiredMissing: [], actual: { result: 'Victory', xp: null } }] };
    const metrics = summarize(report, manifest);
    assert.equal(metrics.summary.completeRecords, 0);
    assert.equal(metrics.summary.completeRecordAccuracy, 0);
    assert.equal(metrics.summary.totalFieldObservations, 2);
    assert.equal(metrics.summary.correctFieldObservations, 1);
    assert.equal(metrics.summary.acceptedWrongFieldObservations, 0);
    assert.equal(metrics.summary.unresolvedFieldObservations, 1);
    assert.equal(metrics.allCompared.completeRecords, 0);
    assert.equal(metrics.recordFailures.length, 1);
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { summarizePipeline } = require('../scripts/compare-paddleocr-integrated-acceptance');

test('comparison metrics report exactness, false acceptance, false rejection, review, and crop latency', () => {
    const manifest = {
        requiredComparedFields: ['player', 'credits'],
        records: [
            { key: 'a.png', sha256: 'a-hash', expected: { player: 'PlayerA', credits: '12345' } },
            { key: 'b.png', sha256: 'b-hash', expected: { player: 'PlayerB', credits: '67890' } },
        ],
    };
    const report = {
        results: [
            { fixtureKey: 'a.png', imageSha256: 'a-hash', elapsedMs: 120, actual: { player: 'PlayerA', credits: '99999' }, pipelineCompleted: true,
                paddleOcrFallback: { enabled: true, status: 'partial', elapsedMs: 12, networkAttemptCount: 0,
                    attemptedCrops: [{ id: 'credits' }], cropResults: [
                        { fieldGroup: 'credits', status: 'candidate', elapsedMs: 10 },
                        { fieldGroup: 'damage', status: 'failed', elapsedMs: 30 },
                    ] } },
            { fixtureKey: 'b.png', imageSha256: 'b-hash', elapsedMs: 150, actual: { player: 'Not detected', credits: '67890' }, pipelineCompleted: true,
                ambiguities: { player: 'O/0 ambiguity' }, paddleOcrFallback: { enabled: true, status: 'complete', elapsedMs: 20, networkAttemptCount: 0,
                    attemptedCrops: [{ id: 'identity' }], cropResults: [{ fieldGroup: 'identity', status: 'rejected', elapsedMs: 20 }] } },
        ],
    };
    const summary = summarizePipeline('test', report, manifest);
    assert.equal(summary.exactFields, 2);
    assert.equal(summary.totalFields, 4);
    assert.equal(summary.completeRecords, 0);
    assert.equal(summary.acceptedWrongFields, 1);
    assert.equal(summary.unresolvedFields, 1);
    assert.equal(summary.criticalFalseAcceptanceRate, 1 / 3);
    assert.equal(summary.falseRejectionRate, 1 / 4);
    assert.equal(summary.humanReviewRecords, 1);
    assert.equal(summary.humanReviewRate, 1 / 2);
    assert.equal(summary.fallback.attemptedImages, 2);
    assert.equal(summary.fallback.attemptedCrops, 2);
    assert.equal(summary.fallback.returnedCropResults, 3);
    assert.equal(summary.fallback.failedCropResults, 1);
    assert.deepEqual(summary.fallback.perCropLatency, { count: 3, medianMs: 20, p95Ms: 30, meanMs: 20 });
});

test('unresolved XP blocks mandatory completeness and requires human review', () => {
    const manifest = {
        requiredComparedFields: ['player', 'credits', 'xp'],
        optionalComparedFields: [],
        comparedFields: ['player', 'credits', 'xp'],
        records: [{ key: 'optional.png', sha256: 'optional-hash', expected: { player: 'PlayerA', credits: 12345, xp: 555 } }],
    };
    const report = { results: [{ fixtureKey: 'optional.png', imageSha256: 'optional-hash', elapsedMs: 125,
        pipelineCompleted: true, actual: { player: 'PlayerA', credits: 12345, xp: null },
        ambiguities: {}, paddleOcrFallback: { enabled: false, status: 'not-attempted', networkAttemptCount: 0 } }] };
    const summary = summarizePipeline('optional-test', report, manifest);
    assert.equal(summary.mandatory.completeRecords, 0);
    assert.equal(summary.mandatory.completeRecordAccuracy, 0);
    assert.equal(summary.optional.unresolvedFields, 0);
    assert.equal(summary.completeRecords, 0, 'the unresolved XP miss blocks complete-record acceptance');
    assert.equal(summary.humanReviewRecords, 1, 'unresolved XP requires human correction');
});

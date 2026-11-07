'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { REQUIRED_FIELDS, canonical, createAccuracyReport } = require('../src/ocr-accuracy-metrics');

const truth = {
    result: 'Victory', player: '[WOLF1]PlayerName', map: 'Estuary',
    mode: 'Random Battle', battleStart: '06.11.2026 18:00',
    credits: '123456', freeXp: '123', damage: '123456', xp: '1234',
};

test('accuracy metrics use the nine mandatory fields and preserve exact player identity', () => {
    assert.deepEqual(REQUIRED_FIELDS, ['result', 'player', 'map', 'mode', 'battleStart', 'credits', 'freeXp', 'damage', 'xp']);
    assert.equal(canonical('credits', '123,456'), '123456');
    assert.equal(canonical('player', '[WOLF1]PlayerName'), '[WOLF1]PlayerName');
    assert.notEqual(canonical('player', '[WOLF1]PlayerName'), canonical('player', '[WOLF1]PlayerNarne'));
});

test('accuracy report measures field and full-record exactness, false acceptance and unresolved fields', () => {
    const predictions = [{
        sourceSha256: 'image-a',
        accepted: true,
        record: { ...truth, xp: '1235' },
        unresolvedFields: [{ field: 'xp' }],
        providers: { ocrSpace: { status: 'success', httpRequestCount: 2 }, azure: { status: 'failed', httpRequestCount: 1 } },
    }, {
        sourceSha256: 'image-b',
        accepted: false,
        record: { ...truth },
        unresolvedFields: [],
    }];
    const groundTruth = [
        { sourceSha256: 'image-a', record: truth },
        { sourceSha256: 'image-b', record: truth },
    ];
    const report = createAccuracyReport({ predictions, groundTruth, createdAt: 'fixed' });
    assert.equal(report.sampleCounts.matchedImages, 2);
    assert.equal(report.metrics.fields.xp.wrongAccepted, 1);
    assert.equal(report.metrics.fields.xp.unresolved, 1);
    assert.deepEqual(report.metrics.wrongAcceptedValues, [{
        sourceSha256: 'image-a', field: 'xp', expectedValue: '1234', acceptedValue: '1235',
    }]);
    assert.equal(report.metrics.unresolvedFieldRecords.length, 1);
    assert.equal(report.metrics.acceptedRecords, 1);
    assert.equal(report.metrics.rejectedRecords, 1);
    assert.equal(report.metrics.fullNineFieldExactRecords, 1);
    assert.equal(report.metrics.fullNineFieldExactRecordRate, 0.5);
    assert.equal(report.metrics.falseAcceptanceRecords, 1);
    assert.equal(report.metrics.falseRejectionRecords, 1);
    assert.equal(report.metrics.totalProviderRequests, 3);
    assert.equal(report.metrics.providerAvailability.ocrSpace.success, 1);
});

test('accuracy report rejects duplicate ground-truth hashes and reports unmatched inputs', () => {
    assert.throws(() => createAccuracyReport({
        predictions: [],
        groundTruth: [{ sourceSha256: 'same', record: truth }, { sourceSha256: 'same', record: truth }],
    }), /Duplicate ground-truth/);
    const report = createAccuracyReport({
        predictions: [{ sourceSha256: 'not-labelled', record: truth }],
        groundTruth: [{ sourceSha256: 'labelled', record: truth }],
    });
    assert.equal(report.sampleCounts.matchedImages, 0);
    assert.equal(report.sampleCounts.unmatchedPredictions, 1);
    assert.equal(report.sampleCounts.unmatchedGroundTruth, 1);
    assert.equal(report.metrics.fullNineFieldExactRecordRate, null);
});

test('accuracy report does not infer rejection when prediction acceptance state is absent', () => {
    const report = createAccuracyReport({
        predictions: [{ sourceSha256: 'image-c', record: truth }],
        groundTruth: [{ sourceSha256: 'image-c', record: truth }],
    });
    assert.equal(report.metrics.predictionsWithoutAcceptanceState, 1);
    assert.equal(report.metrics.falseRejectionRecords, 0);
});

test('accuracy report rejects ground-truth entries without a source hash or record', () => {
    assert.throws(() => createAccuracyReport({
        predictions: [],
        groundTruth: [{ record: truth }],
    }), /must include sourceSha256/);
});

test('accuracy report measures source-region correctness only when labelled regions exist', () => {
    const report = createAccuracyReport({
        predictions: [{
            sourceSha256: 'region-image',
            accepted: true,
            elapsedMs: 120,
            record: truth,
            providers: { azure: { status: 'success', elapsedMs: 80, httpRequestCount: 2, quotaReservationStatus: 'submitted' } },
            recordReview: {
                azureReconciliation: {
                    fields: {
                        xp: { remoteCandidates: [{
                            geometryValid: true, originalCoordinateGeometryValid: true, coordinateSpace: 'original-screenshot-pixels',
                            originalScreenshotSha256: 'region-image', pageIndex: 0,
                            polygon: [10,10,30,10,30,20,10,20],
                        }] },
                    },
                },
            },
        }],
        groundTruth: [{
            sourceSha256: 'region-image',
            record: truth,
            fieldRegions: { xp: { x: 0, y: 0, width: 50, height: 50, pageIndex: 0 } },
        }],
    });
    assert.equal(report.metrics.sourceRegionCorrectness.expectedFields, 1);
    assert.equal(report.metrics.sourceRegionCorrectness.candidatesAssessed, 1);
    assert.equal(report.metrics.sourceRegionCorrectness.candidateAccuracy, 1);
    assert.equal(report.metrics.runtime.meanElapsedMs, 120);
    assert.equal(report.metrics.providerAvailability.azure.meanElapsedMs, 80);
    assert.equal(report.metrics.providerAvailability.azure.quotaReservationStates.submitted, 1);
});


test('accuracy report counts an accepted record with an unresolved mandatory field as a false acceptance', () => {
    const report = createAccuracyReport({
        predictions: [{
            sourceSha256: 'image-d', accepted: true, record: { ...truth },
            unresolvedFields: [{ field: 'xp', reason: 'reader conflict' }],
        }],
        groundTruth: [{ sourceSha256: 'image-d', record: truth }],
    });
    assert.equal(report.metrics.falseAcceptanceRecords, 1);
    assert.equal(report.metrics.wrongAcceptedValues.length, 0);
    assert.equal(report.metrics.unresolvedFieldRecords[0].explicitlyUnresolved, true);
});

test('accuracy report aggregates Node-process network restriction diagnostics without claiming OS isolation', () => {
    const report = createAccuracyReport({
        predictions: [{
            sourceSha256: 'image-e', accepted: true, record: truth,
            networkRestriction: {
                enabled: true, guardLoadedBeforeBot: false,
                ocrSpaceProviderEnabled: true, ocrSpaceExactHostAllowlistEnabled: true,
                azureProviderEnabled: false, azureExactHostAllowlistEnabled: false,
                log: { pathConfigured: true, present: true, blockedAttemptCount: 2 },
            },
        }],
        groundTruth: [{ sourceSha256: 'image-e', record: truth }],
    });
    assert.equal(report.metrics.networkDiagnostics.samples, 1);
    assert.equal(report.metrics.networkDiagnostics.restrictedSamples, 1);
    assert.equal(report.metrics.networkDiagnostics.guardActivationFailures, 1);
    assert.equal(report.metrics.networkDiagnostics.blockedAttemptCount, 2);
    assert.match(report.metrics.networkDiagnostics.scope, /not an OS-level egress sandbox/);
});

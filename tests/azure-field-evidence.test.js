'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildAzureFieldEvidence } = require('../src/azure-field-evidence');

test('Azure pixel polygons are scaled back into original screenshot coordinates', () => {
    const [evidence] = buildAzureFieldEvidence([{
        text: 'Victory', pageIndex: 0, pageNumber: 1,
        polygon: [10, 10, 30, 10, 30, 20, 10, 20],
        geometryValid: true, pageWidth: 100, pageHeight: 100, pageUnit: 'pixel',
        words: [],
    }], { sourceSha256: 'a'.repeat(64), sourceWidth: 200, sourceHeight: 300 });
    assert.deepEqual(evidence.providerPolygon, [10, 10, 30, 10, 30, 20, 10, 20]);
    assert.deepEqual(evidence.polygon, [20, 30, 60, 30, 60, 60, 20, 60]);
    assert.equal(evidence.coordinateSpace, 'original-screenshot-pixels');
    assert.equal(evidence.originalCoordinateGeometryValid, true);
    assert.deepEqual(evidence.transformToOriginalScreenshot, {
        scaleX: 2, scaleY: 3, offsetX: 0, offsetY: 0,
    });
});

test('Azure non-pixel or unbounded geometry is not claimed to be in original screenshot coordinates', () => {
    const [evidence] = buildAzureFieldEvidence([{
        text: 'Victory', pageIndex: 0, pageNumber: 1,
        polygon: [10, 10, 30, 10, 30, 20, 10, 20],
        geometryValid: true, pageWidth: 100, pageHeight: 100, pageUnit: 'inch',
        words: [],
    }], { sourceSha256: 'b'.repeat(64), sourceWidth: 200, sourceHeight: 300 });
    assert.equal(evidence.coordinateSpace, 'azure-page-units');
    assert.equal(evidence.originalCoordinateGeometryValid, false);
    assert.equal(evidence.transformToOriginalScreenshot, null);
});

test('Azure remote evidence never emits player identity candidates', () => {
    const evidence = buildAzureFieldEvidence([
        { text: '[CLAN]PlayerName VIII YAMATO', geometryValid: true, polygon: [1,1,2,1,2,2,1,2], pageUnit: 'pixel', pageWidth: 10, pageHeight: 10 },
        { text: 'Victory', geometryValid: true, polygon: [1,1,2,1,2,2,1,2], pageUnit: 'pixel', pageWidth: 10, pageHeight: 10 },
    ], { sourceWidth: 10, sourceHeight: 10 });
    assert.equal(evidence.some(item => item.field === 'player'), false);
});

test('Azure metadata joins a geometrically adjacent map line with its mode line', () => {
    const evidence = buildAzureFieldEvidence([
        {
            text: 'Shards', pageIndex: 0, pageNumber: 1,
            polygon: [10, 10, 80, 10, 80, 20, 10, 20],
            geometryValid: true, pageWidth: 200, pageHeight: 300, pageUnit: 'pixel', words: [],
        },
        {
            text: 'Random Battle', pageIndex: 0, pageNumber: 1,
            polygon: [10, 24, 80, 24, 80, 34, 10, 34],
            geometryValid: true, pageWidth: 200, pageHeight: 300, pageUnit: 'pixel', words: [],
        },
    ], { sourceSha256: 'c'.repeat(64), sourceWidth: 400, sourceHeight: 600 });
    const metadata = evidence.find(item => item.field === 'battleMetadata');
    assert.ok(metadata);
    assert.equal(metadata.text, 'Shards\nRandom Battle');
    assert.deepEqual(metadata.sourceLinePolygons, [
        [10, 10, 80, 10, 80, 20, 10, 20],
        [10, 24, 80, 24, 80, 34, 10, 34],
    ]);
    assert.equal(metadata.geometrySource, 'union-of-adjacent-azure-lines');
    assert.equal(metadata.originalCoordinateGeometryValid, true);
    assert.deepEqual(metadata.polygon, [20, 20, 160, 20, 160, 68, 20, 68]);
});

test('Azure metadata does not combine distant or non-metadata neighboring lines', () => {
    const evidence = buildAzureFieldEvidence([
        {
            text: 'Victory', pageIndex: 0,
            polygon: [10, 10, 80, 10, 80, 20, 10, 20],
            geometryValid: true, pageWidth: 200, pageHeight: 300, pageUnit: 'pixel',
        },
        {
            text: 'Credits 120000', pageIndex: 0,
            polygon: [10, 24, 80, 24, 80, 34, 10, 34],
            geometryValid: true, pageWidth: 200, pageHeight: 300, pageUnit: 'pixel',
        },
        {
            text: 'Random Battle', pageIndex: 0,
            polygon: [10, 100, 80, 100, 80, 110, 10, 110],
            geometryValid: true, pageWidth: 200, pageHeight: 300, pageUnit: 'pixel',
        },
    ], { sourceWidth: 400, sourceHeight: 600 });
    const metadata = evidence.find(item => item.field === 'battleMetadata');
    assert.ok(metadata);
    assert.equal(metadata.text, 'Random Battle');
    assert.equal(metadata.geometrySource, 'azure-provider-line');
});

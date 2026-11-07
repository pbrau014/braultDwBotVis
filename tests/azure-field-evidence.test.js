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

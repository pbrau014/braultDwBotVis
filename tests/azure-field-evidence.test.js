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

test('Azure emits separate map and mode candidates with each original line geometry', () => {
    const { parseEvidenceItem } = require('../src/ocrspace-reconciliation');
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
    const map = evidence.find(item => item.field === 'map');
    const mode = evidence.find(item => item.field === 'mode');
    assert.ok(map && mode);
    assert.equal(map.text, 'Shards\nRandom Battle');
    assert.equal(mode.text, 'Shards\nRandom Battle');
    assert.deepEqual(parseEvidenceItem(map), { map: 'Shards' });
    assert.deepEqual(parseEvidenceItem(mode), { mode: 'Random Battle' });
    assert.equal(map.geometrySource, 'azure-adjacent-map-line');
    assert.equal(mode.geometrySource, 'azure-mode-line');
    assert.equal(map.originalCoordinateGeometryValid, true);
    assert.equal(mode.originalCoordinateGeometryValid, true);
    assert.deepEqual(map.polygon, [20, 20, 160, 20, 160, 40, 20, 40]);
    assert.deepEqual(mode.polygon, [20, 48, 160, 48, 160, 68, 20, 68]);
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
    const mode = evidence.find(item => item.field === 'mode');
    assert.ok(mode);
    assert.equal(mode.text, 'Random Battle');
    assert.equal(mode.geometrySource, 'azure-provider-line');
});

test('Azure battle-start evidence is parsed only from its explicit label', () => {
    const { parseEvidenceItem } = require('../src/ocrspace-reconciliation');
    const [candidate] = buildAzureFieldEvidence([{
        text: 'Battle Start Time: 28.09.2024 17:04',
        pageIndex: 0, pageNumber: 1,
        polygon: [10, 10, 150, 10, 150, 25, 10, 25],
        geometryValid: true, pageWidth: 200, pageHeight: 300, pageUnit: 'pixel',
    }], { sourceWidth: 400, sourceHeight: 600 });
    assert.equal(candidate.field, 'battleStart');
    assert.deepEqual(parseEvidenceItem(candidate), { battleStart: '2024-09-28T17:04' });
});

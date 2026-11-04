'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { extractSpatialRibbons, tokenCount } = require('../src/ribbon-parser');

const box = (x0, y0, x1, y1) => ({ x0, y0, x1, y1 });
const line = (text, x0, y0, x1, y1, confidence = 90) => ({ text, bbox: box(x0, y0, x1, y1), confidence });
const word = (text, x0, y0, x1, y1, confidence = 90) => ({ text, bbox: box(x0, y0, x1, y1), confidence });

test('assigns spatial xN ribbon counts to the closest label, including x101', () => {
    const result = {
        lines: [
            line('Battle performance', 30, 80, 220, 105),
            line('Destroyed', 70, 220, 145, 242),
            line('Aircraft shot down', 180, 220, 300, 242),
            line('Target hits', 335, 220, 415, 242),
            line('Combat Missions', 25, 330, 180, 355),
        ],
        words: [
            word('x5', 108, 180, 128, 200),
            word('x101', 230, 180, 269, 200),
            word('×393', 355, 180, 395, 200),
        ],
    };
    const ribbons = extractSpatialRibbons(result, 1000, 500);
    assert.deepEqual(ribbons.map(({ label, count }) => ({ label, count })), [
        { label: 'Destroyed', count: '5' },
        { label: 'Aircraft shot down', count: '101' },
        { label: 'Target hits', count: '393' },
    ]);
});

test('supports x and number rendered as separate OCR tokens', () => {
    const counts = tokenCount([
        word('x', 120, 100, 132, 116),
        word('101', 134, 100, 160, 116),
    ], 600, 300);
    assert.deepEqual(counts.map((entry) => entry.count), ['101']);
});

test('missing or ambiguous ribbon counts stay blank; no ribbon data is treated as required-field failure', () => {
    const result = {
        lines: [
            line('Battle performance', 30, 80, 220, 105),
            line('Aircraft shot down', 180, 220, 300, 242),
            line('Combat Missions', 25, 330, 180, 355),
        ],
        words: [],
    };
    assert.deepEqual(extractSpatialRibbons(result, 1000, 500).map((ribbon) => ribbon.count), ['']);
    assert.deepEqual(extractSpatialRibbons({ lines: [], words: [] }, 1000, 500), []);
});

test('ignores count tokens outside the Battle Performance-to-missions strip', () => {
    const result = {
        lines: [line('Battle performance', 30, 80, 220, 105), line('Destroyed', 70, 220, 145, 242), line('Combat Missions', 25, 330, 180, 355)],
        words: [word('x2', 100, 50, 125, 70), word('x5', 108, 180, 128, 200), word('x99', 108, 340, 140, 360)],
    };
    assert.equal(extractSpatialRibbons(result, 1000, 500)[0].count, '5');
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { sanitizeAnalysis, validRect, scaleRect, analyze } = require('../src/opencv-field-isolation');

test('OpenCV geometry rectangles require finite in-bounds integer geometry', () => {
    assert.equal(validRect({ left: 0, top: 0, width: 8, height: 6 }, 100, 100), true);
    assert.equal(validRect({ left: -1, top: 0, width: 8, height: 6 }, 100, 100), false);
    assert.equal(validRect({ left: 95, top: 0, width: 8, height: 6 }, 100, 100), false);
    assert.equal(validRect({ left: 0.5, top: 0, width: 8, height: 6 }, 100, 100), false);
    assert.equal(validRect({ left: 0, top: 0, width: 1, height: 6 }, 100, 100), false);
});

test('OpenCV proposals are sanitized and invalid, unbounded or weak candidates are discarded', () => {
    const result = sanitizeAnalysis({
        schemaVersion: 1, status: 'ok', width: 100, height: 80, opencvVersion: 'test',
        regions: {
            identity: { rect: { left: 5, top: 10, width: 70, height: 12 }, score: 0.75, componentCount: 5, method: 'test' },
            invalid: { rect: { left: -2, top: 0, width: 20, height: 10 }, score: 1 },
            weak: { rect: { left: 5, top: 5, width: 20, height: 10 }, score: 2 },
        },
        preprocessing: ['gray', 'threshold'],
    });
    assert.deepEqual(Object.keys(result.regions), ['identity']);
    assert.equal(result.regions.identity.score, 0.75);
    assert.deepEqual(result.preprocessing, ['gray', 'threshold']);
    assert.throws(() => sanitizeAnalysis({ schemaVersion: 3 }), /malformed geometry/);
});

test('OpenCV geometry scaling maps source coordinates proportionally and preserves bounds', () => {
    const scaled = scaleRect({ left: 10, top: 20, width: 30, height: 40 }, 2, {
        sourceWidth: 100, sourceHeight: 100, width: 200, height: 200,
    });
    assert.deepEqual(scaled, { left: 20, top: 40, width: 60, height: 80 });
    assert.equal(scaleRect({ left: 90, top: 90, width: 20, height: 20 }, 2, {
        sourceWidth: 100, sourceHeight: 100, width: 200, height: 200,
    }), null);
});

test('OpenCV assist is disabled by default without spawning Python or requiring cv2', async () => {
    const previous = process.env.OCR_CV_ASSIST;
    delete process.env.OCR_CV_ASSIST;
    try {
        const result = await analyze(Buffer.from('not-an-image'));
        assert.equal(result.status, 'disabled');
        assert.deepEqual(result.regions, {});
        assert.match(result.acceptancePolicy, /disabled unless explicitly enabled/);
    } finally {
        if (previous !== undefined) process.env.OCR_CV_ASSIST = previous;
    }
});


test('OpenCV assist accepts only explicit opt-in value 1', async () => {
    const previous = process.env.OCR_CV_ASSIST;
    for (const value of ['', '0', 'false', 'true', 'yes']) {
        process.env.OCR_CV_ASSIST = value;
        const result = await analyze(Buffer.from('not-an-image'));
        assert.equal(result.status, 'disabled', `value ${JSON.stringify(value)} must remain disabled`);
    }
    process.env.OCR_CV_ASSIST = '1';
    try {
        const result = await analyze(Buffer.from('not-an-image'));
        assert.equal(result.status, 'unavailable');
        assert.deepEqual(result.regions, {});
        assert.match(result.reason, /image|OpenCV|Python/i);
    } finally {
        if (previous === undefined) delete process.env.OCR_CV_ASSIST;
        else process.env.OCR_CV_ASSIST = previous;
    }
});


test('local OpenCV helper proposes only bounded geometry on an approved screenshot when available', async (t) => {
    const previous = process.env.OCR_CV_ASSIST;
    process.env.OCR_CV_ASSIST = '1';
    const imagePath = path.join(__dirname, '..', 'fixtures', 'additional-screenshots', 'image.png');
    let result;
    try {
        result = await analyze(await fs.readFile(imagePath));
    } finally {
        if (previous === undefined) delete process.env.OCR_CV_ASSIST;
        else process.env.OCR_CV_ASSIST = previous;
    }
    if (result.status === 'unavailable') {
        t.skip(`Optional local Python/OpenCV unavailable: ${result.reason || 'not installed'}`);
        return;
    }
    assert.ok(['ok', 'no-reliable-regions', 'unsupported-dimensions'].includes(result.status));
    assert.equal(result.width > 0, true);
    assert.equal(result.height > 0, true);
    for (const proposal of Object.values(result.regions || {})) {
        assert.equal(validRect(proposal.rect, result.width, result.height), true);
        assert.ok(proposal.score >= 0 && proposal.score <= 1);
    }
    assert.ok(Object.keys(result.regions || {}).length > 0,
        'this approved result screenshot should yield at least one geometry proposal when OpenCV is available');
});

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSafeOcrSpacePrepassCropPlan } = require('../src/ocrspace-prepass');

const regions = {
    result: { rect: { left: 80, top: 140, width: 500, height: 120 } },
    identity: { rect: { left: 100, top: 210, width: 650, height: 100 } },
    metadata: { rect: { left: 1080, top: 120, width: 700, height: 140 } },
    rewardBand: { rect: { left: 90, top: 280, width: 900, height: 170 } },
    damage: { rect: { left: 40, top: 390, width: 300, height: 130 } },
};

test('OCR.Space prepass creates only bounded non-identifying crops and marks only reward table mode', () => {
    const plan = buildSafeOcrSpacePrepassCropPlan({ regions, width: 1920, height: 1080 });
    assert.deepEqual(plan.map(x => x.field), ['result', 'battleMetadata', 'rewardBand', 'damage']);
    for (const crop of plan) {
        assert.equal(crop.engine, 3);
        assert.equal(crop.scale, true);
        const r = crop.rect;
        assert.ok(r.left >= 0 && r.top >= 0 && r.left + r.width <= 1920 && r.top + r.height <= 1080);
        const overlaps = r.left < 750 && r.left + r.width > 100 && r.top < 310 && r.top + r.height > 210;
        assert.equal(overlaps, false, crop.field + ' overlaps the identity ROI');
    }
    assert.equal(plan.find(x => x.field === 'rewardBand').isTable, true);
    assert.equal(plan.filter(x => x.field !== 'rewardBand').every(x => x.isTable === false), true);
});

test('identity geometry that expands into reward or damage bands pushes crops below it or skips them', () => {
    const extended = {
        ...regions,
        identity: { rect: { left: 100, top: 210, width: 650, height: 250 } },
    };
    const plan = buildSafeOcrSpacePrepassCropPlan({ regions: extended, width: 1920, height: 1080 });
    for (const crop of plan) {
        const r = crop.rect;
        const overlaps = r.left < 750 && r.left + r.width > 100 && r.top < 460 && r.top + r.height > 210;
        assert.equal(overlaps, false, crop.field + ' overlaps the expanded identity ROI');
    }
});

test('invalid dimensions and invalid or undersized regions fail closed', () => {
    assert.deepEqual(buildSafeOcrSpacePrepassCropPlan({ regions, width: 200, height: 100 }), []);
    const invalid = buildSafeOcrSpacePrepassCropPlan({
        width: 1920, height: 1080,
        regions: { identity: { rect: { left: 'bad', top: 1, width: 10, height: 10 } },
            result: { rect: { left: 1, top: 1, width: 2, height: 2 } } },
    });
    assert.deepEqual(invalid, []);
});

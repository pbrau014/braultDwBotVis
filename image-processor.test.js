'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { assertDimensions } = require('../src/image-processor');

test('image dimension guard accepts ordinary WoWS screenshots', () => {
  assert.deepEqual(assertDimensions(2560, 1440), { width: 2560, height: 1440, pixels: 3686400 });
});

test('image dimension guard rejects invalid, oversized, and decompression-bomb dimensions', () => {
  assert.throws(() => assertDimensions(0, 1440), /valid image size/);
  assert.throws(() => assertDimensions(12001, 900), /dimensions are too large/);
  assert.throws(() => assertDimensions(8000, 6000), /dimensions are too large/);
});

test('image dimension limits can be configured explicitly', () => {
  assert.deepEqual(assertDimensions(3000, 2000, { maxDimension: 4000, maxPixels: 7000000 }), { width: 3000, height: 2000, pixels: 6000000 });
  assert.throws(() => assertDimensions(3000, 3000, { maxDimension: 4000, maxPixels: 7000000 }), /dimensions are too large/);
});

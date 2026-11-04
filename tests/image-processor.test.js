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

test('image crop rejects unsupported color-channel selections before invoking ImageMagick', async () => {
  const { cropResize } = require('../src/image-processor');
  await assert.rejects(
    cropResize(Buffer.alloc(0), { left: 0, top: 0, width: 1, height: 1 }, 1, { channel: 'X' }),
    /Image crop channel must be one of R, G, or B/,
  );
});

test('image crop supports red-channel isolation for low-contrast screenshot text', async (t) => {
  const { cropResize, metadata, imageMagick } = require('../src/image-processor');
  const fs = require('node:fs');
  const path = require('node:path');
  if (!imageMagick) return t.skip('ImageMagick is unavailable in this environment.');
  const screenshot = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'additional-screenshots', 'WTF.jpg'));
  const redChannelCrop = await cropResize(
    screenshot,
    { left: 76, top: 497, width: 1920, height: 346 },
    3000,
    { channel: 'R', contrastStretch: '0.5%x0.5%', sharpen: '0x1+1+0.04' },
  );
  const dimensions = await metadata(redChannelCrop);
  assert.equal(dimensions.width, 3000);
  assert.ok(dimensions.height >= 500 && dimensions.height <= 550);
});

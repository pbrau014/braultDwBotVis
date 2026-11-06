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

test('PDF page raster crop follows the exact source screenshot aspect ratio', () => {
  const { sourceAspectCropRect } = require('../src/image-processor');
  assert.deepEqual(sourceAspectCropRect(1818, 2573, 1920, 1080), {
    left: 0, top: 0, width: 1818, height: 1023,
  });
  assert.deepEqual(sourceAspectCropRect(1818, 2573, 1334, 627), {
    left: 0, top: 0, width: 1818, height: 855,
  });
  assert.deepEqual(sourceAspectCropRect(1818, 2573, 2880, 1800), {
    left: 0, top: 0, width: 1818, height: 1136,
  });
});

test('PDF page raster crop rejects invalid and unverified portrait layouts', () => {
  const { sourceAspectCropRect } = require('../src/image-processor');
  assert.throws(() => sourceAspectCropRect(1818, 2573, 0, 1080), { code: 'OCRSPACE_PDF_SOURCE_DIMENSIONS_INVALID' });
  assert.throws(() => sourceAspectCropRect(1818, 2573, 1080, 1920), { code: 'OCRSPACE_PDF_SOURCE_ASPECT_UNSUPPORTED' });
  assert.throws(() => sourceAspectCropRect(1818, 2573, 100, 100), { code: 'OCRSPACE_PDF_SOURCE_ASPECT_UNSUPPORTED' });
});

test('PDF page raster normalizer removes page whitespace but preserves the screenshot width', async (t) => {
  const { normalizeSearchablePdfPageRaster, metadata, imageMagick, __test } = require('../src/image-processor');
  if (!imageMagick) return t.skip('ImageMagick is unavailable in this environment.');
  const page = await __test.runImageMagick([
    '-size', '400x600', 'xc:white', '-fill', '#315f87', '-draw', 'rectangle 0,0 399,199', 'png:-',
  ], Buffer.alloc(0));
  const normalized = await normalizeSearchablePdfPageRaster(page, { sourceWidth: 2, sourceHeight: 1 });
  assert.deepEqual(await metadata(normalized.buffer), { width: 400, height: 200 });
  assert.equal(normalized.normalization.method, 'source-aspect-top-aligned-crop-v1');
  assert.deepEqual(normalized.normalization.cropRect, { left: 0, top: 0, width: 400, height: 200 });
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { normalizeInventory, safeResolve, compareRgbaPixels, SOURCE_SIMILARITY_LIMITS } = require('../scripts/normalize-ocrspace-imagesF-63-pdf-rasters');

const sha = value => crypto.createHash('sha256').update(value).digest('hex');

test('all-image PDF raster normalizer is source-bound, fail-closed, and provider-free', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dwbot-63-normalizer-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const sourceRoot = path.join(root, 'source');
  const artifactRoot = path.join(root, 'artifacts');
  await fs.mkdir(sourceRoot, { recursive: true });
  await fs.mkdir(artifactRoot, { recursive: true });
  const source = Buffer.from('original screenshot fixture');
  const pdf = Buffer.from('%PDF-1.7 fixture');
  const page = Buffer.from('full-page-raster-fixture');
  const normalized = Buffer.from('normalized-source-aspect-raster');
  await fs.writeFile(path.join(sourceRoot, 'screen.png'), source);
  await fs.writeFile(path.join(artifactRoot, 'screen.pdf'), pdf);
  await fs.writeFile(path.join(artifactRoot, 'screen-page.png'), page);
  const run = { results: [{
    index: 1, filename: 'screen.png', sourceBytes: source.length, sourceSha256: sha(source),
    pdfPath: 'screen.pdf', pdfBytes: pdf.length, pdfSha256: sha(pdf),
    rasterPath: 'screen-page.png', rasterBytes: page.length, rasterSha256: sha(page),
    rasterWidth: 1818, rasterHeight: 2573,
  }] };
  const gt = { records: [{ filename: 'screen.png', sourceImage: { sha256: sha(source), width: 1920, height: 1080 } }] };
  const report = await normalizeInventory({
    runReport: run, groundTruth: gt, sourceImageRoot: sourceRoot, artifactRoot,
    requiredImageCount: 1,
    readMetadata: async buffer => buffer.equals(source)
      ? { width: 1920, height: 1080 }
      : buffer.equals(page) ? { width: 1818, height: 2573 } : { width: 1818, height: 1023 },
    renderPdf: async () => page,
    resizeSource: async () => normalized,
    normalizeRaster: async (_buffer, dimensions) => ({
      buffer: normalized,
      normalization: {
        method: 'source-aspect-top-aligned-crop-v1',
        sourceWidth: dimensions.sourceWidth, sourceHeight: dimensions.sourceHeight,
        pageRasterWidth: 1818, pageRasterHeight: 2573,
        cropRect: { left: 0, top: 0, width: 1818, height: 1023 },
        normalizedWidth: 1818, normalizedHeight: 1023,
      },
    }),
    toRawRgba: async buffer => buffer,
  });
  assert.equal(report.status, 'PASS');
  assert.equal(report.verifiedCount, 1);
  assert.equal(report.providerRequests, 0);
  assert.equal(report.networkAccessRequired, false);
  assert.equal(report.images[0].checks.pdfPageProvenance, 'PASS');
  assert.equal(report.images[0].checks.sourceAspectNormalization, 'PASS');
  assert.equal(report.images[0].checks.sourceSimilarity, 'PASS');
  assert.equal(report.images[0].sourceSimilarity.meanAbsoluteError, 0);
  assert.equal(report.images[0].sourceSimilarity.rootMeanSquareError, 0);
  assert.equal(report.images[0].normalizedRaster.width, 1818);
  assert.equal(report.images[0].normalizedRaster.height, 1023);
});

test('all-image normalizer rejects unsafe artifact paths', () => {
  assert.equal(safeResolve('/tmp/artifacts', '../outside.pdf'), null);
  assert.equal(safeResolve('/tmp/artifacts', '/outside.pdf'), null);
  assert.equal(safeResolve('/tmp/artifacts', 'nested/file.pdf'), path.resolve('/tmp/artifacts/nested/file.pdf'));
});

test('source similarity metrics reject mismatched pixel buffers and expose bounded thresholds', () => {
  assert.deepEqual(SOURCE_SIMILARITY_LIMITS, { meanAbsoluteError: 3, rootMeanSquareError: 8 });
  assert.deepEqual(compareRgbaPixels(Buffer.from([0, 10, 20, 255]), Buffer.from([0, 12, 22, 255])), {
    pixelCount: 1, channelCount: 4, meanAbsoluteError: 1, rootMeanSquareError: Math.SQRT2,
  });
  assert.throws(() => compareRgbaPixels(Buffer.from([0, 1, 2]), Buffer.from([0, 1, 2])), /equal, non-empty RGBA/);
  assert.throws(() => compareRgbaPixels(Buffer.from([0, 1, 2, 3]), Buffer.from([0, 1, 2, 3, 4, 5, 6, 7])), /equal, non-empty RGBA/);
});

test('source similarity failure blocks normalized raster acceptance', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dwbot-63-normalizer-similarity-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const sourceRoot = path.join(root, 'source');
  const artifactRoot = path.join(root, 'artifacts');
  await fs.mkdir(sourceRoot, { recursive: true });
  await fs.mkdir(artifactRoot, { recursive: true });
  const source = Buffer.from('original');
  const pdf = Buffer.from('%PDF-1.7 fixture');
  const page = Buffer.from('full-page');
  const normalized = Buffer.from('normalized');
  const sourceResized = Buffer.from('resized-source');
  await fs.writeFile(path.join(sourceRoot, 'screen.png'), source);
  await fs.writeFile(path.join(artifactRoot, 'screen.pdf'), pdf);
  await fs.writeFile(path.join(artifactRoot, 'screen-page.png'), page);
  const run = { results: [{
    index: 1, filename: 'screen.png', sourceBytes: source.length, sourceSha256: sha(source),
    pdfPath: 'screen.pdf', pdfBytes: pdf.length, pdfSha256: sha(pdf),
    rasterPath: 'screen-page.png', rasterBytes: page.length, rasterSha256: sha(page),
    rasterWidth: 1818, rasterHeight: 2573,
  }] };
  const gt = { records: [{ filename: 'screen.png', sourceImage: { sha256: sha(source), width: 1920, height: 1080 } }] };
  const report = await normalizeInventory({
    runReport: run, groundTruth: gt, sourceImageRoot: sourceRoot, artifactRoot,
    requiredImageCount: 1,
    readMetadata: async buffer => buffer.equals(source)
      ? { width: 1920, height: 1080 }
      : buffer.equals(page) ? { width: 1818, height: 2573 } : { width: 1818, height: 1023 },
    renderPdf: async () => page,
    normalizeRaster: async (_buffer, dimensions) => ({
      buffer: normalized,
      normalization: {
        method: 'source-aspect-top-aligned-crop-v1',
        sourceWidth: dimensions.sourceWidth, sourceHeight: dimensions.sourceHeight,
        pageRasterWidth: 1818, pageRasterHeight: 2573,
        cropRect: { left: 0, top: 0, width: 1818, height: 1023 },
        normalizedWidth: 1818, normalizedHeight: 1023,
      },
    }),
    resizeSource: async () => sourceResized,
    toRawRgba: async buffer => {
      if (buffer.equals(page)) return Buffer.from([1, 2, 3, 255]);
      if (buffer.equals(normalized)) return Buffer.from([0, 0, 0, 255]);
      return Buffer.from([255, 255, 255, 255]);
    },
  });
  assert.equal(report.status, 'FAIL');
  assert.equal(report.verifiedCount, 0);
  assert.equal(report.failedCount, 1);
  assert.match(report.images[0].error, /does not sufficiently match the original screenshot/);
  await assert.rejects(fs.access(path.join(artifactRoot, 'normalized-63', '01-screen.png.pdf-content.png')));
});

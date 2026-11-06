'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

test('PDF-first matrix launches Tesseract.js, native Tesseract, PaddleOCR and PDF text extraction concurrently', () => {
    const recovery = read('scripts/recover-ocrspace-imagesF-21-local-readers.js');
    assert.match(recovery, /Promise\.allSettled/);
    assert.match(recovery, /CONCURRENT_LOCAL_READERS_FROM_HASH_VERIFIED_PDF_DERIVED_RASTER/);
    assert.match(recovery, /extractPdfText/);
    assert.match(recovery, /runSupervisedProcess/);
    for (const engine of ['tesseractjs', 'native', 'paddleocr']) assert.ok(recovery.includes(engine));
    assert.match(recovery, /OCRSPACE_ENABLED: '0'/);
    assert.match(recovery, /OCRSPACE_NETWORK_ALLOWLIST: '0'/);
    assert.match(recovery, /providerRequests: 0/);
});

test('PaddleOCR uses OpenCV crop geometry and explicit local-only models', () => {
    const child = read('scripts/paddleocr-image-child.js');
    const helper = read('scripts/paddleocr_field_crops.py');
    assert.match(child, /opencv\.analyze\(imageBuffer, \{ force: true/);
    assert.match(child, /paddle\.applyFieldFallback/);
    assert.match(child, /OCRSPACE_ENABLED = '0'/);
    assert.match(child, /OCRSPACE_NETWORK_ALLOWLIST = '0'/);
    assert.match(helper, /explicit local detection\/recognition model files are unavailable/);
    assert.match(helper, /socket\.socket\.connect = _blocked_network/);
    assert.match(helper, /socket\.create_connection = _blocked_network/);
    assert.match(child, /candidatesByField/);
    assert.match(child, /diagnostic candidates only/);
    assert.match(child, /modelManifestSha256/);
});

test('parallel outputs are source-PDF and source-raster hash bound while prior readers are preserved', () => {
    const recovery = read('scripts/recover-ocrspace-imagesF-21-local-readers.js');
    assert.match(recovery, /row\.priorLocalReaders = row\.priorLocalReaders \|\| priorReaders/);
    assert.match(recovery, /sourceRasterSha256: row\.rasterSha256/);
    assert.match(recovery, /sourcePdfSha256: row\.pdfSha256/);
    assert.match(recovery, /originalScreenshotFallback: false/);
});


test('Gate A parallel matrix reuses verified artifacts and never submits OCR.Space requests', () => {
    const matrix = read('scripts/run-gateA-parallel-reader-matrix.js');
    assert.match(matrix, /Promise\.allSettled/);
    assert.match(matrix, /noProviderRequests:true/);
    assert.match(matrix, /fourSourceMajority/);
    assert.match(matrix, /renderSearchablePdfPage/);
    assert.match(matrix, /provider requests=0/);
});

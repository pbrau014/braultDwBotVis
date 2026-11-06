'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('21-image local reader matrix is offline, source-bound, and never calls OCR.Space', () => {
    const script = read('scripts/recover-ocrspace-imagesF-21-local-readers.js');
    assert.ok(script.includes("OCRSPACE_ENABLED = '0'"));
    assert.ok(script.includes("OCRSPACE_NETWORK_ALLOWLIST = '0'"));
    assert.ok(script.includes("OCR_NON_OCR_NETWORK_RESTRICTED = '1'"));
    assert.ok(script.includes('OCR_SUPERVISED_TIMEOUT_MS'));
    assert.ok(script.includes('complete-ground-truth-21'));
    assert.ok(script.includes('row.sourceSha256 !== expected.sourceImage.sha256'));
    assert.ok(script.includes('sha256(pdfBuffer) !== row.pdfSha256'));
    assert.ok(script.includes('sha256(rasterBuffer) !== row.rasterSha256'));
    assert.ok(script.includes('renderSearchablePdfPage'));
    assert.ok(script.includes('savedPixels.equals(renderedPixels)'));
    assert.ok(script.includes('Promise.allSettled'));
    assert.ok(script.includes('row.priorLocalReaders'));
    assert.ok(script.includes('providerRequests: 0'));
    assert.ok(script.includes('await fs.access(networkLogPath)'));
    assert.equal(script.includes("fs.writeFile(networkLogPath, '', { flag: 'w' })"), false);
    assert.doesNotMatch(script, /createOcrSpacePdfFirst|recognizeCrop|OCRSPACE_API_KEY\s*=\s*process/);
});

test('parallel local readers preserve prior outputs and record every engine', () => {
    const script = read('scripts/recover-ocrspace-imagesF-21-local-readers.js');
    assert.ok(script.includes("const ENGINES = ['tesseractjs', 'native', 'paddleocr']"));
    assert.ok(script.includes('Promise.allSettled'));
    assert.ok(script.includes('runSupervisedProcess'));
    assert.ok(script.includes('extractPdfText'));
    assert.ok(script.includes('parallelReaderMatrix'));
    assert.ok(script.includes("enginesRequested: [...ENGINES, 'pdf-text-layer']"));
    assert.ok(script.includes('row.priorLocalReaders = row.priorLocalReaders || priorReaders'));
    assert.ok(script.includes('row.localReaderFailures = failures'));
    assert.ok(script.includes('sourcePdfSha256: row.pdfSha256'));
    assert.ok(script.includes('sourceRasterSha256: row.rasterSha256'));
    assert.ok(script.includes('originalScreenshotFallback: false'));
    assert.ok(script.includes('derivedFromRunReportSha256'));
    assert.ok(script.includes('COMPLETED_LOCAL_ONLY_RECOVERY'));
});

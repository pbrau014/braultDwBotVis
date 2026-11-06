'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('21-image parallel reader matrix is offline, source-bound, and never calls OCR.Space', () => {
    const script = read('scripts/recover-ocrspace-imagesF-21-local-readers.js');
    assert.match(script, /OCRSPACE_ENABLED = '0'/);
    assert.match(script, /OCRSPACE_NETWORK_ALLOWLIST = '0'/);
    assert.match(script, /OCR_NON_OCR_NETWORK_RESTRICTED = '1'/);
    assert.match(script, /OCR_IMAGE_TIMEOUT_MS/);
    assert.match(script, /complete-ground-truth-21/);
    assert.match(script, /row\.sourceSha256 !== expected\.sourceImage\.sha256/);
    assert.match(script, /sha256\(pdfBuffer\) !== row\.pdfSha256/);
    assert.match(script, /sha256\(rasterBuffer\) !== row\.rasterSha256/);
    assert.match(script, /renderSearchablePdfPage/);
    assert.match(script, /savedPixels\.equals\(renderedPixels\)/);
    assert.match(script, /priorFailureByEngine/);
    assert.match(script, /providerRequests: 0/);
    assert.match(script, /await fs\.access\(networkLogPath\)/);
    assert.doesNotMatch(script, /writeFile\\(networkLogPath, '', \\{ flag: 'w' \\}\\)/);
    assert.doesNotMatch(script, /createOcrSpacePdfFirst|recognizeCrop|OCRSPACE_API_KEY\s*=\s*process/);
});

test('local reader recovery preserves successful results and retries only failed or missing engines', () => {
    const script = read('scripts/recover-ocrspace-imagesF-21-local-readers.js');
    assert.match(script, /CONCURRENT_LOCAL_READERS_FROM_HASH_VERIFIED_PDF_DERIVED_RASTER/);
    assert.match(script, /priorLocalReaders/);
    assert.match(script, /Promise\.allSettled/);
    assert.match(script, /runSupervisedProcess/);
    assert.match(script, /extractPdfText/);
    assert.match(script, /parallelReaderMatrix/);
    assert.match(script, /'paddleocr'/);
    assert.match(script, /row\.localReaderFailures = failures/);
    assert.match(script, /derivedFromRunReportSha256/);
    assert.match(script, /COMPLETED_LOCAL_ONLY_RECOVERY/);
});

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

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


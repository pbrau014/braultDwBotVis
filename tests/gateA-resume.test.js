'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { samePreflight, pngInfo } = require('../scripts/prepare-gateA-16-resume');

test('Gate A resume compares substantive preflight identity, fixture order and hashes', () => {
    const a = { status:'PREFLIGHT_PASS_NO_PROVIDER_REQUESTS', candidateFingerprint:'a'.repeat(40),
        candidateFingerprintMatchesGateBSource:true, gateBSourceRunId:'42160979140',
        gateBSourceCommitSha:'a'.repeat(40), manifestSha256:'b'.repeat(64), corpusFingerprint:'c'.repeat(64),
        createdAt:'first timestamp', providerRequests:0, rows:[{filename:'one.jpg',sha256:'d'.repeat(64),bytes:123,fieldsPresent:9}] };
    const b = { ...a, createdAt:'second timestamp', providerRequests:0 };
    assert.equal(samePreflight(a,b),true);
    assert.equal(samePreflight(a,{...b,rows:[{...b.rows[0],sha256:'e'.repeat(64)}]}),false);
    assert.equal(samePreflight(a,{...b,manifestSha256:'f'.repeat(64)}),false);
});

test('Gate A resume validates PNG signature and dimensions before local OCR', () => {
    const png = Buffer.alloc(24);
    Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]).copy(png,0);
    Buffer.from('IHDR').copy(png,12);
    png.writeUInt32BE(1818,16); png.writeUInt32BE(2573,20);
    assert.deepEqual(pngInfo(png),{width:1818,height:2573});
    assert.equal(pngInfo(Buffer.from('not a png')),null);
});

test('Gate A resume preparation is local-only and cannot repeat the completed first provider submission', () => {
    const source = fs.readFileSync(require.resolve('../scripts/prepare-gateA-16-resume'),'utf8');
    assert.match(source,/42202563673/);
    assert.match(source,/13495008195/);
    assert.match(source,/OCRSPACE_ENABLED: '0'/);
    assert.match(source,/OCRSPACE_API_KEY: ''/);
    assert.match(source,/OCRSPACE_NETWORK_ALLOWLIST: '0'/);
    assert.match(source,/inputBuffer: raster/);
    assert.match(source,/READY_TO_RESUME_15_NO_DUPLICATE_PROVIDER_REQUEST/);
    assert.match(source,/providerRequests: 0/);
    assert.match(source,/originalNetworkLogStatus: 'MISSING_FROM_ORIGINAL_PARTIAL_ARTIFACT'/);
    assert.match(source,/checkpoint\.recordJobResult\(progress, row\)/);
});

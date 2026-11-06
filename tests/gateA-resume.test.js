'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { samePreflight, pngInfo, extractStartedFixtures, parseJsonUtf8, originalNetworkEvidenceAllowsProvider } = require('../scripts/prepare-gateA-16-resume');

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
    assert.match(source,/inputBuffer: normalizedRaster/);
    assert.match(source,/normalizeSearchablePdfPageRaster/);
    assert.match(source,/original-source-resized-to-normalized-raster-v1/);
    assert.match(source,/renderSearchablePdfPage\(pdf\)/);
    assert.match(source,/Preserved Gate A page raster is not pixel-identical/);
    assert.match(source,/originalNetworkEvidenceAllowsProvider\(recoveryReport\)/);
    assert.match(source,/READY_TO_RESUME_15_NO_DUPLICATE_PROVIDER_REQUEST/);
    assert.match(source,/providerRequests: 0/);
    assert.match(source,/originalNetworkLogStatus: 'MISSING_FROM_ORIGINAL_PARTIAL_ARTIFACT'/);
    assert.match(source,/localPayloadPath = path\.join/);
    assert.match(source,/ocr-image-child\.js.*localPayloadPath/);
    assert.match(source,/PADDLEOCR_FIELD_FALLBACK: '1'/);
    assert.match(source,/NODE_OPTIONS: '--require=\.\/scripts\/block-network\.js --require=\.\.\/scripts\/block-network\.js'/);
    assert.match(source,/parseJsonUtf8\(await fs\.readFile\(localPayloadPath\)\)/);
    assert.match(source,/BLOCKED_MISSING_ORIGINAL_NETWORK_LOG/);
    assert.match(source,/checkpoint\.recordJobResult\(progress, row\)/);
});


test('Gate A resume accepts only the single original first-image start marker', () => {
    const log = [
        '2026-11-06T10:27:19Z [OCR-SEQUENCE] 1/16 START Screenshot_16.jpg',
        '2026-11-06T10:28:04Z cancellation requested'
    ].join('\n');
    assert.deepEqual(extractStartedFixtures(log),[{index:1,fixtureKey:'Screenshot_16.jpg'}]);
    assert.equal(extractStartedFixtures(log + '\n[OCR-SEQUENCE] 2/16 START WTF.jpg').length,2);
});


test('Gate A resume parses BOM-prefixed JSON from the original uploaded artifact', () => {
    assert.deepEqual(parseJsonUtf8(Buffer.from('\uFEFF{"schemaVersion":1,"status":"FAIL"}', 'utf8')),
        { schemaVersion: 1, status: 'FAIL' });
    assert.deepEqual(parseJsonUtf8(Buffer.from('{"schemaVersion":1}', 'utf8')),
        { schemaVersion: 1 });
});


test('Gate A never resumes paid OCR.Space requests without original zero-attempt network evidence', () => {
    assert.equal(originalNetworkEvidenceAllowsProvider({
        originalNetworkLogStatus: 'PRESENT', originalNetworkAttemptCount: 0
    }), true);
    assert.equal(originalNetworkEvidenceAllowsProvider({
        originalNetworkLogStatus: 'MISSING_FROM_ORIGINAL_PARTIAL_ARTIFACT', originalNetworkAttemptCount: null
    }), false);
    assert.equal(originalNetworkEvidenceAllowsProvider({
        originalNetworkLogStatus: 'RECONSTRUCTED_LIMITED_EVIDENCE', originalNetworkAttemptCount: null
    }), false);
    assert.equal(originalNetworkEvidenceAllowsProvider({
        originalNetworkLogStatus: 'PRESENT', originalNetworkAttemptCount: 1
    }), false);
});

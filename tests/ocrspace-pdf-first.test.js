'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createOcrSpacePdfFirst, downloadSearchablePdf, readPdfBounded } = require('../src/ocrspace-pdf-first');

const pdf = Buffer.from('%PDF-1.7\\nmock-pdf-bytes\\n%%EOF');
function streamResponse(bytes, headers = {}) {
    let sent = false;
    return { headers: { get: name => headers[String(name).toLowerCase()] || null }, body: { getReader: () => ({
        async read() { if (sent) return { done: true }; sent = true; return { done: false, value: bytes }; },
        async cancel() {}, releaseLock() {}
    }) } };
}
const png = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,1,2,3]);

function fakeLedger() {
    const reservations = [];
    return { reservations, async reserve(value) { reservations.push(value); return { reserved: true }; } };
}

test('OCR.Space Engine 2 processes the source image first and local readers receive the PDF raster', async () => {
    const ledger = fakeLedger();
    let request;
    let downloaded;
    let rendered;
    const result = await createOcrSpacePdfFirst({
        imageBuffer: png, filename: 'source.png', env: { OCRSPACE_API_KEY: 'test-key' },
        quotaLedger: ledger,
        client: async options => { request = options; return { searchablePdfUrl: 'https://api.ocr.space/parse/image/temporary.pdf', parsedText: 'Victory\\nShards', exitCode: 1, processingTimeMs: 123 }; },
        downloadPdf: async url => { downloaded = url; return pdf; },
        renderPdf: async bytes => { rendered = bytes; return png; },
        readRasterMetadata: async () => ({ width: 1920, height: 1080 }),
    });
    assert.equal(request.engine, 2);
    assert.equal(request.createSearchablePdf, true);
    assert.equal(request.searchablePdfHideTextLayer, true);
    assert.equal(request.imageBuffer, png);
    assert.deepEqual(ledger.reservations, [{ engine: 2, now: ledger.reservations[0].now }]);
    assert.equal(downloaded, 'https://api.ocr.space/parse/image/temporary.pdf');
    assert.equal(rendered, pdf);
    assert.equal(result.status, 'complete');
    assert.equal(result.engine, 2);
    assert.equal(result.pdfSha256.length, 64);
    assert.equal(result.rasterSha256, crypto.createHash('sha256').update(png).digest('hex'));
    assert.equal(result.pdfBuffer, pdf);
    assert.equal(result.rasterBuffer, png);
    assert.equal(result.providerText, 'Victory\\nShards');
});

test('source images above the Free API cap are re-encoded before upload', async () => {
    const source = Buffer.alloc(1024 * 1024 + 10, 7);
    let prepared = false;
    let request;
    const result = await createOcrSpacePdfFirst({
        imageBuffer: source, env: { OCRSPACE_API_KEY: 'test-key' }, quotaLedger: fakeLedger(),
        prepareUpload: async (buffer, limit) => {
            prepared = true;
            assert.equal(buffer, source);
            assert.equal(limit, 1024 * 1024);
            return { buffer: Buffer.from('small-jpeg'), filename: 'normalized.jpg', mimeType: 'image/jpeg', resized: true, width: 1600, height: 900, quality: 74 };
        },
        client: async options => { request = options; return { searchablePdfUrl: 'https://ocr.space/result.pdf', exitCode: 1 }; },
        downloadPdf: async () => pdf,
        renderPdf: async () => png,
        readRasterMetadata: async () => ({ width: 1600, height: 900 }),
    });
    assert.equal(prepared, true);
    assert.equal(request.filename, 'normalized.jpg');
    assert.equal(request.mimeType, 'image/jpeg');
    assert.equal(request.imageBuffer.toString(), 'small-jpeg');
    assert.equal(result.uploadResized, true);
    assert.equal(result.uploadQuality, 74);
});

test('missing key is a blocked precondition and does not call the provider', async () => {
    let called = false;
    const result = await createOcrSpacePdfFirst({ imageBuffer: png, env: {}, client: async () => { called = true; } });
    assert.equal(result.status, 'blocked');
    assert.equal(result.requests, 0);
    assert.equal(called, false);
});

test('missing searchable PDF is a hard failure; source image is not substituted', async () => {
    await assert.rejects(createOcrSpacePdfFirst({
        imageBuffer: png, env: { OCRSPACE_API_KEY: 'test-key' }, quotaLedger: fakeLedger(),
        client: async () => ({ parsedText: 'some OCR text', searchablePdfUrl: null }),
    }), { code: 'OCRSPACE_SEARCHABLE_PDF_MISSING' });
});

test('PDF download rejects unapproved URLs, redirects and non-PDF payloads', async () => {
    await assert.rejects(downloadSearchablePdf('https://evil.example/a.pdf'), { code: 'OCRSPACE_PDF_URL_BLOCKED' });
    await assert.rejects(downloadSearchablePdf('https://api.ocr.space/a.pdf', {
        fetchImpl: async url => ({ ok: true, redirected: true, url: 'https://evil.example/a.pdf', arrayBuffer: async () => pdf }),
    }), { code: 'OCRSPACE_PDF_REDIRECT_BLOCKED' });
    await assert.rejects(downloadSearchablePdf('https://api.ocr.space/a.pdf', {
        fetchImpl: async url => ({ ok: true, redirected: false, url, ...streamResponse(Buffer.from('not-pdf')) }),
    }), { code: 'OCRSPACE_INVALID_PDF' });
});

test('bounded PDF reader enforces the byte cap', async () => {
    const bytes = Buffer.alloc(100, 1);
    await assert.rejects(readPdfBounded({ headers: { get: () => '100' }, body: { getReader: () => { throw new Error('must reject from declared size first'); } } }, 50), { code: 'OCRSPACE_PDF_TOO_LARGE' });
    await assert.rejects(readPdfBounded({ headers: { get: () => null }, arrayBuffer: async () => bytes }, 50), { code: 'OCRSPACE_PDF_STREAM_UNAVAILABLE' });
    let cancelled = false;
    const oversizedStream = { headers: { get: () => null }, body: { getReader: () => ({
        async read() { return { done: false, value: bytes }; },
        async cancel() { cancelled = true; }, releaseLock() {}
    }) } };
    await assert.rejects(readPdfBounded(oversizedStream, 50), { code: 'OCRSPACE_PDF_TOO_LARGE' });
    assert.equal(cancelled, true);
});


test('durable provider-start checkpoint completes before the OCR.Space request', async () => {
    const order = [];
    const result = await createOcrSpacePdfFirst({
        imageBuffer: png, filename: 'source.png', env: { OCRSPACE_API_KEY: 'test-key' },
        quotaLedger: fakeLedger(),
        onProviderRequestStarted: async detail => {
            order.push('checkpoint');
            assert.equal(detail.engine, 2);
            assert.equal(detail.sourceSha256.length, 64);
        },
        fetchImpl: async () => { order.push('network'); return { ok: true, status: 200 }; },
        client: async options => {
            await options.fetchImpl('https://api.ocr.space/parse/image', { method: 'POST' });
            return { searchablePdfUrl: 'https://api.ocr.space/result.pdf' };
        },
        downloadPdf: async (url, options) => {
            await options.fetchImpl(url, { method: 'GET' });
            return pdf;
        },
        renderPdf: async () => png,
        readRasterMetadata: async () => ({ width: 1920, height: 1080 }),
    });
    assert.deepEqual(order, ['checkpoint', 'network', 'checkpoint', 'network']);
    assert.equal(result.status, 'complete');
    assert.equal(result.requests, 2);
    assert.equal(result.httpRequestCount, 2);
});

test('failed durable provider-start checkpoint prevents any OCR.Space request', async () => {
    let providerCalled = false;
    await assert.rejects(createOcrSpacePdfFirst({
        imageBuffer: png, env: { OCRSPACE_API_KEY: 'test-key' }, quotaLedger: fakeLedger(),
        onProviderRequestStarted: async () => { throw new Error('checkpoint disk failure'); },
        client: async options => {
            await options.fetchImpl('https://api.ocr.space/parse/image', { method: 'POST' });
            providerCalled = true;
            return { searchablePdfUrl: 'https://api.ocr.space/result.pdf' };
        },
    }), /checkpoint disk failure/);
    assert.equal(providerCalled, false);
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
    safeEndpoint, safeOperationUrl, detectMime, flattenReadResult, recognizeImage,
    API_VERSION, MODEL_ID, MAX_FREE_FILE_BYTES,
} = require('../src/azure-document-intelligence-client');
const { AzureDocumentIntelligenceQuotaLedger, monthKey } = require('../src/azure-document-intelligence-quota-ledger');
const { getMultiProviderActivation, runMultiProviderOcr } = require('../src/multi-provider-ocr');

function png() { return Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]); }

test('Azure endpoint and operation URL are constrained to the configured HTTPS resource', () => {
    const endpoint = 'https://dwbot.cognitiveservices.azure.com';
    assert.equal(safeEndpoint(endpoint), endpoint);
    assert.equal(safeEndpoint('http://dwbot.cognitiveservices.azure.com'), null);
    assert.equal(safeEndpoint('https://evilcognitiveservices.azure.com'), null);
    assert.equal(safeEndpoint('https://dwbot.cognitiveservices.azure.com.attacker.test'), null);
    assert.equal(safeOperationUrl(endpoint + '/documentintelligence/documentModels/prebuilt-read/analyzeResults/abc?api-version=2024-11-30', endpoint) !== null, true);
    assert.equal(safeOperationUrl('https://attacker.test/documentintelligence/documentModels/prebuilt-read/analyzeResults/abc', endpoint), null);
});

test('Azure Read client posts original image bytes and preserves line and word geometry', async () => {
    const image = png();
    const calls = [];
    const requestSlots = [];
    const startedRequests = [];
    let poll = 0;
    const fetchImpl = async (url, options) => {
        calls.push({ url: String(url), method: options.method, body: options.body });
        if (options.method === 'POST') return {
            status: 202, ok: false, redirected: false,
            headers: { get: name => name.toLowerCase() === 'operation-location'
                ? 'https://dwbot.cognitiveservices.azure.com/documentintelligence/documentModels/prebuilt-read/analyzeResults/id?api-version=2024-11-30'
                : name.toLowerCase() === 'apim-request-id' ? 'post-id' : null },
        };
        poll++;
        const payload = { status: 'succeeded', analyzeResult: { content: 'Victory\\nDamage 123', pages: [{ lines: [
            { content: 'Victory', polygon: [1,2,3,2,3,4,1,4], words: [{ content: 'Victory', confidence: 0.98, polygon: [1,2,3,2,3,4,1,4] }] },
        ] }] } };
        const bytes = Buffer.from(JSON.stringify(payload));
        return { status: 200, ok: true, redirected: false, headers: { get: name =>
            name.toLowerCase() === 'apim-request-id' ? 'poll-id' :
                name.toLowerCase() === 'content-length' ? String(bytes.length) : null },
            body: new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close(); } }) };
    };
    const result = await recognizeImage({ imageBuffer: image, endpoint: 'https://dwbot.cognitiveservices.azure.com', apiKey: 'not-a-real-key', fetchImpl, pollIntervalMs: 1000,
        beforeRequest: async details => { requestSlots.push(details.method); return { waitMs: 0 }; },
        onRequestStarted: async details => { startedRequests.push({ method: details.method, requestIndex: details.requestIndex, provider: details.provider }); },
    });
    assert.equal(result.status, 'success');
    assert.equal(result.text, 'Victory\\nDamage 123');
    assert.equal(result.lines[0].words[0].confidence, 0.98);
    assert.equal(calls[0].body, image);
    assert.equal(result.apiVersion, API_VERSION);
    assert.equal(result.model, MODEL_ID);
    assert.equal(poll, 1);
    assert.equal(result.httpRequestCount, 2);
    assert.deepEqual(result.providerRequestIds, ['post-id', 'poll-id']);
    assert.equal(result.operationId, 'id');
    assert.equal(result.originalScreenshotSha256, result.sourceSha256);
    assert.ok(result.startedAt);
    assert.ok(result.completedAt);
    assert.deepEqual(requestSlots, ['POST', 'GET']);
    assert.deepEqual(startedRequests, [
        { method: 'POST', requestIndex: 1, provider: 'azure-document-intelligence' },
        { method: 'GET', requestIndex: 2, provider: 'azure-document-intelligence' },
    ]);
});

test('Azure request hook failure prevents network access and preserves exact request count', async () => {
    let calls = 0;
    await assert.rejects(() => recognizeImage({
        imageBuffer: png(), endpoint: 'https://dwbot.cognitiveservices.azure.com', apiKey: 'x',
        fetchImpl: async () => { calls++; throw new Error('should not be reached'); },
        beforeRequest: async () => { throw Object.assign(new Error('scheduler unavailable'), { code: 'SCHEDULER_FAILED' }); },
    }), error => error.code === 'SCHEDULER_FAILED' && error.httpRequestCount === 0);
    assert.equal(calls, 0);
});

test('Azure network failures report every fetch invocation', async () => {
    let calls = 0;
    await assert.rejects(() => recognizeImage({
        imageBuffer: png(), endpoint: 'https://dwbot.cognitiveservices.azure.com', apiKey: 'x',
        fetchImpl: async () => { calls++; throw new Error('network down'); },
    }), error => error.code === 'AZURE_OCR_NETWORK_ERROR' && error.httpRequestCount === 1);
    assert.equal(calls, 1);
});

test('Azure 429 responses are not retried and report exact POST and poll counts', async () => {
    let postCalls = 0;
    await assert.rejects(() => recognizeImage({
        imageBuffer: png(), endpoint: 'https://dwbot.cognitiveservices.azure.com', apiKey: 'x',
        fetchImpl: async () => { postCalls++; return { status: 429, ok: false, redirected: false, headers: { get: () => null } }; },
    }), error => error.code === 'AZURE_OCR_RATE_LIMIT' && error.httpRequestCount === 1);
    assert.equal(postCalls, 1);

    let calls = 0;
    await assert.rejects(() => recognizeImage({
        imageBuffer: png(), endpoint: 'https://dwbot.cognitiveservices.azure.com', apiKey: 'x',
        pollIntervalMs: 1000,
        fetchImpl: async (url, options) => {
            calls++;
            if (options.method === 'POST') return {
                status: 202, ok: false, redirected: false,
                headers: { get: name => name.toLowerCase() === 'operation-location'
                    ? 'https://dwbot.cognitiveservices.azure.com/documentintelligence/documentModels/prebuilt-read/analyzeResults/id'
                    : null },
            };
            return { status: 429, ok: false, redirected: false, headers: { get: () => null } };
        },
    }), error => error.code === 'AZURE_OCR_RATE_LIMIT' && error.httpRequestCount === 2);
    assert.equal(calls, 2);
});

test('Azure Read rejects over-limit images and invalid endpoints before network access', async () => {
    let calls = 0;
    const fetchImpl = async () => { calls++; throw new Error('unexpected'); };
    await assert.rejects(() => recognizeImage({ imageBuffer: Buffer.alloc(MAX_FREE_FILE_BYTES + 1), endpoint: 'https://dwbot.cognitiveservices.azure.com', apiKey: 'x', fetchImpl }), { code: 'AZURE_OCR_FILE_TOO_LARGE' });
    await assert.rejects(() => recognizeImage({ imageBuffer: png(), endpoint: 'http://dwbot.cognitiveservices.azure.com', apiKey: 'x', fetchImpl }), { code: 'AZURE_OCR_ENDPOINT_INVALID' });
    assert.equal(calls, 0);
    assert.equal(detectMime(png()), 'image/png');
});

test('Azure result parser keeps raw line and word evidence', () => {
    const parsed = flattenReadResult({ analyzeResult: { content: 'one', pages: [{ lines: [{ content: 'one', polygon: [1,2], words: [{ content: 'one', confidence: 0.5, polygon: [1,2] }] }] }] } });
    assert.equal(parsed.text, 'one');
    assert.equal(parsed.lines[0].words[0].text, 'one');
});

test('Azure field evidence retains geometry and does not guess player identity', () => {
    const { buildAzureFieldEvidence } = require('../src/azure-field-evidence');
    const evidence = buildAzureFieldEvidence([
        { text: 'Victory', pageIndex: 0, pageNumber: 1, polygon: [1,2,20,2,20,10,1,10], geometryValid: true,
            pageWidth: 100, pageHeight: 80, pageUnit: 'pixel', words: [{ text: 'Victory', confidence: 0.9, polygon: [1,2,20,2,20,10,1,10] }] },
        { text: 'Estuary Random Battle', pageIndex: 0, pageUnit: 'pixel', polygon: [2,3,40,3,40,10,2,10], geometryValid: true, words: [] },
        { text: 'Free XP 123', pageIndex: 0, pageUnit: 'pixel', polygon: [], geometryValid: false, words: [] },
        { text: '[WOLF1]PlayerName VIII YAMATO', pageIndex: 0, pageUnit: 'pixel', polygon: [], geometryValid: false, words: [] },
    ], { sourceSha256: 'original-hash', sourceWidth: 100, sourceHeight: 80 });
    assert.deepEqual(evidence.map(item => item.field), ['result', 'battleMetadata', 'freeXp']);
    assert.equal(evidence[0].coordinateSpace, 'original-screenshot-pixels');
    assert.equal(evidence[0].transformToOriginalScreenshot.scaleX, 1);\n    assert.equal(evidence[0].transformToOriginalScreenshot.scaleY, 1);
    assert.equal(evidence[0].originalScreenshotSha256, 'original-hash');
});

test('Azure geometry carries page coordinates and rejects malformed or out-of-bounds polygons', () => {
    const parsed = flattenReadResult({ analyzeResult: { content: 'line', pages: [{
        pageNumber: 1, width: 100, height: 80, unit: 'pixel', lines: [
            { content: 'valid', polygon: [1,2,20,2,20,10,1,10], words: [
                { content: 'valid', confidence: 0.8, polygon: [1,2,10,2,10,8,1,8] },
                { content: 'bad', confidence: 1.5, polygon: [1,2,200,2,200,10,1,10] },
            ] },
            { content: 'malformed', polygon: [1,2,3], words: [] },
        ],
    }] } });
    assert.equal(parsed.pages[0].unit, 'pixel');
    assert.equal(parsed.lines[0].pageIndex, 0);
    assert.equal(parsed.lines[0].geometryValid, true);
    assert.equal(parsed.lines[0].words[0].geometryValid, true);
    assert.equal(parsed.lines[0].words[1].geometryValid, false);
    assert.equal(parsed.lines[0].words[1].confidence, null);
    assert.equal(parsed.lines[1].geometryValid, false);
});

test('Azure monthly quota ledger reserves within a hard sub-free-tier ceiling and fails closed', async t => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dwbot-azure-quota-'));
    t.after(() => fs.rm(dir, { recursive: true, force: true }));
    const ledger = new AzureDocumentIntelligenceQuotaLedger({ filePath: path.join(dir, 'quota.json'), maxPerMonth: 500 });
    assert.equal(ledger.maxPerMonth, 450);
    const result = await ledger.reserve({ pages: 1, now: new Date('2026-11-06T00:00:00Z') });
    assert.equal(result.used, 1);
    assert.equal(monthKey('2026-11-06'), '2026-11');
    await fs.writeFile(path.join(dir, 'quota.json'), '{broken');
    await assert.rejects(() => ledger.reserve({ pages: 1, now: new Date('2026-11-06T00:00:00Z') }), { code: 'AZURE_OCR_QUOTA_LEDGER_CORRUPT' });
});


test('Azure quota ledger recovers only stale locks owned by a dead local process', async t => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dwbot-azure-stale-lock-'));
    t.after(() => fs.rm(dir, { recursive: true, force: true }));
    const ledger = new AzureDocumentIntelligenceQuotaLedger({ filePath: path.join(dir, 'quota.json') });
    const lockPath = ledger.filePath + '.lock';
    const deadOwner = { pid: 2147483647, hostname: require('node:os').hostname(), token: 'dead-owner' };
    await fs.writeFile(lockPath, JSON.stringify(deadOwner));
    const old = new Date(Date.now() - 60_000);
    await fs.utimes(lockPath, old, old);
    assert.equal(await ledger.recoverStaleLock(lockPath), true);
    const liveOwner = { pid: process.pid, hostname: require('node:os').hostname(), token: 'live-owner' };
    await fs.writeFile(lockPath, JSON.stringify(liveOwner));
    await fs.utimes(lockPath, old, old);
    assert.equal(await ledger.recoverStaleLock(lockPath), false);
});

test('Azure quota ledger records reservation lifecycle and releases only unsent pages', async t => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dwbot-azure-reservation-'));
    t.after(() => fs.rm(dir, { recursive: true, force: true }));
    const ledger = new AzureDocumentIntelligenceQuotaLedger({ filePath: path.join(dir, 'quota.json') });
    const reservation = await ledger.reserve({ pages: 1, now: new Date('2026-11-06T00:00:00Z') });
    assert.equal(reservation.status, 'reserved');
    assert.equal((await ledger.release({ reservationId: reservation.reservationId })).released, true);
    assert.equal((await ledger.reserve({ pages: 1, now: new Date('2026-11-06T00:00:00Z') })).used, 1);
    const submitted = await ledger.reserve({ pages: 1, now: new Date('2026-11-06T00:00:00Z') });
    await ledger.markSubmitted({ reservationId: submitted.reservationId });
    assert.deepEqual(await ledger.release({ reservationId: submitted.reservationId }), {
        released: false, reason: 'already_submitted', status: 'submitted',
    });
});

test('Azure F0 request slots serialize concurrent callers at a conservative 1.5-second interval', async t => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dwbot-azure-rate-'));
    t.after(() => fs.rm(dir, { recursive: true, force: true }));
    const { MIN_REQUEST_INTERVAL_MS } = require('../src/azure-document-intelligence-quota-ledger');
    const ledger = new AzureDocumentIntelligenceQuotaLedger({ filePath: path.join(dir, 'quota.json') });
    const slots = await Promise.all([
        ledger.reserveRequestSlot({ now: 10000 }),
        ledger.reserveRequestSlot({ now: 10000 }),
        ledger.reserveRequestSlot({ now: 10000 }),
    ]);
    assert.equal(MIN_REQUEST_INTERVAL_MS, 1500);
    assert.deepEqual(slots.map(slot => slot.waitMs).sort((a, b) => a - b), [0, 1500, 3000]);
});

test('multi-provider activation requires explicit run and provider flags plus both credentials', () => {
    const env = {
        DWBOT_MULTI_PROVIDER_ENABLED: '1', OCRSPACE_ENABLED: '1', OCRSPACE_API_KEY: 'x',
        AZURE_DOCUMENT_INTELLIGENCE_ENABLED: '1', AZURE_DOCUMENT_INTELLIGENCE_KEY: 'y',
        AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: 'https://dwbot.cognitiveservices.azure.com', AZURE_DOCUMENT_INTELLIGENCE_TIER: 'F0', AZURE_DOCUMENT_INTELLIGENCE_TIER: 'F0',
    };
    assert.equal(getMultiProviderActivation(env).enabled, true);
    assert.equal(getMultiProviderActivation({ ...env, AZURE_DOCUMENT_INTELLIGENCE_KEY: '' }).enabled, false);
    assert.equal(getMultiProviderActivation({ ...env, DWBOT_MULTI_PROVIDER_ENABLED: '0' }).requested, false);
});

test('requested multi-provider run sends identical original bytes to both providers and marks missing provider incomplete', async () => {
    const image = png();
    const seen = [];
    const env = {
        DWBOT_MULTI_PROVIDER_ENABLED: '1', OCRSPACE_ENABLED: '1', OCRSPACE_API_KEY: 'x',
        AZURE_DOCUMENT_INTELLIGENCE_ENABLED: '1', AZURE_DOCUMENT_INTELLIGENCE_KEY: 'y',
        AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: 'https://dwbot.cognitiveservices.azure.com', AZURE_DOCUMENT_INTELLIGENCE_TIER: 'F0', AZURE_DOCUMENT_INTELLIGENCE_TIER: 'F0',
    };
    const result = await runMultiProviderOcr({
        imageBuffer: image, env, azureQuotaLedger: { reserve: async () => ({ reserved: 1 }), reserveRequestSlot: async () => ({ waitMs: 0 }) },
        ocrSpaceRunner: async args => { seen.push(args.imageBuffer); return { status: 'complete', sourceSha256: 'same', providerText: 'text', requests: 1 }; },
        azureRunner: async args => { seen.push(args.imageBuffer); await args.beforeRequest({ method: 'POST' }); await args.onRequestStarted({ method: 'POST' }); await args.beforeRequest({ method: 'GET' }); await args.onRequestStarted({ method: 'GET' }); return { provider: 'azure-document-intelligence', status: 'success', sourceSha256: 'same', inputSha256: 'same', httpRequestCount: 2, text: 'text' }; },
    });
    assert.equal(result.status, 'complete');
    assert.equal(seen.length, 2);
    assert.equal(seen[0], image);
    assert.equal(seen[1], image);\n    assert.equal(result.providers.azure.requestCount, 2);\n    assert.equal(result.providers.azure.httpRequestCount, 2);
    const blocked = await runMultiProviderOcr({ imageBuffer: image, env: { ...env, AZURE_DOCUMENT_INTELLIGENCE_KEY: '' },
        ocrSpaceRunner: async () => ({ status: 'complete', requests: 1, providerText: 'x' }) });
    assert.equal(blocked.status, 'incomplete');
    assert.equal(blocked.providers.azure.status, 'blocked');
});

test('multi-provider releases an Azure quota reservation when request-start logging fails before submission', async t => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dwbot-azure-unsent-'));
    t.after(() => fs.rm(dir, { recursive: true, force: true }));
    const ledger = new AzureDocumentIntelligenceQuotaLedger({ filePath: path.join(dir, 'quota.json') });
    const image = png();
    const env = {
        DWBOT_MULTI_PROVIDER_ENABLED: '1', OCRSPACE_ENABLED: '1', OCRSPACE_API_KEY: 'x',
        AZURE_DOCUMENT_INTELLIGENCE_ENABLED: '1', AZURE_DOCUMENT_INTELLIGENCE_KEY: 'y',
        AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: 'https://dwbot.cognitiveservices.azure.com', AZURE_DOCUMENT_INTELLIGENCE_TIER: 'F0',
    };
    const result = await runMultiProviderOcr({
        imageBuffer: image, env, azureQuotaLedger: ledger,
        ocrSpaceRunner: async () => ({ status: 'complete', requests: 0, providerText: 'text' }),
        azureRunner: async args => {
            await args.onRequestStarted({ method: 'POST', requestIndex: 1 });
            throw new Error('request should not proceed after logging failure');
        },
        onProviderRequestStarted: async () => { throw new Error('event log unavailable'); },
    });
    assert.equal(result.providers.azure.status, 'failed');
    const state = JSON.parse(await fs.readFile(path.join(dir, 'quota.json'), 'utf8'));
    assert.equal(state.monthly['2026-11'], 0);
    assert.equal(Object.values(state.reservations)[0].status, 'released');
});

test('Azure provider failures are retained and never presented as participation', async () => {
    const image = png();
    const env = {
        DWBOT_MULTI_PROVIDER_ENABLED: '1', OCRSPACE_ENABLED: '1', OCRSPACE_API_KEY: 'x',
        AZURE_DOCUMENT_INTELLIGENCE_ENABLED: '1', AZURE_DOCUMENT_INTELLIGENCE_KEY: 'y',
        AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: 'https://dwbot.cognitiveservices.azure.com', AZURE_DOCUMENT_INTELLIGENCE_TIER: 'F0', AZURE_DOCUMENT_INTELLIGENCE_TIER: 'F0',
    };
    const result = await runMultiProviderOcr({ imageBuffer: image, env,
        azureQuotaLedger: { reserve: async () => ({ reserved: 1 }), reserveRequestSlot: async () => ({ waitMs: 0 }) },
        ocrSpaceRunner: async () => ({ status: 'complete', requests: 1 }),
        azureRunner: async () => { throw Object.assign(new Error('quota'), { code: 'AZURE_OCR_QUOTA_EXHAUSTED' }); },
    });
    assert.equal(result.status, 'incomplete');
    assert.equal(result.providers.azure.status, 'failed');
    assert.equal(result.providers.azure.errorCode, 'AZURE_OCR_QUOTA_EXHAUSTED');
});

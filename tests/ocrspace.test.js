'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { recognizeCrop, API_URL, MAX_FREE_FILE_BYTES, MAX_RESPONSE_BYTES } = require('../src/ocrspace-client');
const { OcrSpaceQuotaLedger, PROVIDER_LIMITS } = require('../src/ocrspace-quota-ledger');
const { collectOcrSpaceFieldEvidence, parseCropCap } = require('../src/ocrspace-field-evidence');

function payload(text = '43110', engine = 2) {
    return { OCRExitCode: 1, IsErroredOnProcessing: false, ProcessingTimeInMilliseconds: '143',
        ParsedResults: [{ FileParseExitCode: 1, ParsedText: text, TextOverlay: engine === 2
            ? { Lines: [{ Words: [{ WordText: text, Left: 3, Top: 4, Width: 40, Height: 12 }] }] } : null }] };
}
function reply(data, status = 200, headers = {}) {
    return { ok: status >= 200 && status < 300, status,
        headers: { get: name => headers[String(name).toLowerCase()] || null }, json: async () => data };
}
function args() { return { apiKey: 'not-a-real-key-value', imageBuffer: Buffer.from('png-data'), fetchImpl: async () => reply(payload()) }; }

test('Engine 2 uses HTTPS multipart, apikey header, auto language and word overlay', async () => {
    let request;
    const result = await recognizeCrop({ ...args(), fetchImpl: async (url, options) => { request = { url, options }; return reply(payload()); } });
    assert.equal(request.url, API_URL);
    assert.equal(request.options.method, 'POST');
    assert.equal(request.options.redirect, 'error');
    assert.equal(request.options.headers.apikey, 'not-a-real-key-value');
    assert.ok(request.options.body instanceof FormData);
    assert.equal(request.options.body.get('OCREngine'), '2');
    assert.equal(request.options.body.get('language'), 'auto');
    assert.equal(request.options.body.get('isOverlayRequired'), 'true');
    assert.equal(result.parsedText, '43110');
    assert.equal(result.providerConfidence, null);
    assert.deepEqual(result.overlay[0], { text: '43110', left: 3, top: 4, width: 40, height: 12 });
});

test('Engine 3 defaults overlay off and returns no fabricated confidence', async () => {
    let form;
    const result = await recognizeCrop({ ...args(), engine: 3, fetchImpl: async (_url, options) => { form = options.body; return reply(payload('player text', 3)); } });
    assert.equal(form.get('OCREngine'), '3');
    assert.equal(form.get('isOverlayRequired'), 'false');
    assert.equal(result.providerConfidence, null);
    assert.deepEqual(result.overlay, []);
});

test('client rejects missing key, invalid buffer, unsupported MIME, retired Engine 1 and oversized input before fetch', async () => {
    let calls = 0;
    const fetchImpl = async () => { calls++; return reply(payload()); };
    await assert.rejects(recognizeCrop({ ...args(), apiKey: '', fetchImpl }), { code: 'OCRSPACE_KEY_MISSING' });
    await assert.rejects(recognizeCrop({ ...args(), imageBuffer: Buffer.alloc(0), fetchImpl }), { code: 'OCRSPACE_INVALID_IMAGE' });
    await assert.rejects(recognizeCrop({ ...args(), mimeType: 'application/pdf', fetchImpl }), { code: 'OCRSPACE_UNSUPPORTED_MIME' });
    await assert.rejects(recognizeCrop({ ...args(), mimeType: 'image/webp', fetchImpl }), { code: 'OCRSPACE_UNSUPPORTED_MIME' });
    await assert.rejects(recognizeCrop({ ...args(), engine: 1, fetchImpl }), { code: 'OCRSPACE_INVALID_ENGINE' });
    await assert.rejects(recognizeCrop({ ...args(), imageBuffer: Buffer.alloc(MAX_FREE_FILE_BYTES + 1), fetchImpl }), { code: 'OCRSPACE_FILE_TOO_LARGE' });
    assert.equal(calls, 0);
});

test('429 is classified with Retry-After and is never retried by this client', async () => {
    let calls = 0;
    await assert.rejects(recognizeCrop({ ...args(), fetchImpl: async () => { calls++; return reply({}, 429, { 'retry-after': '3.5' }); } }), error => {
        assert.equal(error.code, 'OCRSPACE_RATE_LIMIT');
        assert.equal(error.retryAfterSeconds, 3.5);
        return true;
    });
    assert.equal(calls, 1);
});

test('HTTP, authentication, malformed JSON, provider errors and parse failures are classified', async () => {
    await assert.rejects(recognizeCrop({ ...args(), fetchImpl: async () => reply({}, 401) }), { code: 'OCRSPACE_AUTH_ERROR' });
    await assert.rejects(recognizeCrop({ ...args(), fetchImpl: async () => reply({}, 503) }), { code: 'OCRSPACE_HTTP_ERROR' });
    await assert.rejects(recognizeCrop({ ...args(), fetchImpl: async () => ({ ok: true, status: 200, json: async () => { throw new Error('bad json'); } }) }), { code: 'OCRSPACE_INVALID_RESPONSE' });
    await assert.rejects(recognizeCrop({ ...args(), fetchImpl: async () => reply({ IsErroredOnProcessing: true, ErrorMessage: 'provider error', ParsedResults: [] }) }), { code: 'OCRSPACE_PROCESSING_ERROR' });
    await assert.rejects(recognizeCrop({ ...args(), fetchImpl: async () => reply({ OCRExitCode: 3, ParsedResults: [] }) }), { code: 'OCRSPACE_PARSE_FAILED' });
});

test('partial OCR parse returns only successfully parsed result text', async () => {
    const data = payload('partial text'); data.OCRExitCode = 2; data.ParsedResults.push({ FileParseExitCode: -20, ParsedText: null });
    const result = await recognizeCrop({ ...args(), fetchImpl: async () => reply(data) });
    assert.equal(result.partial, true);
    assert.equal(result.parsedText, 'partial text');
});

test('timeout is classified without exposing the API key', async () => {
    await assert.rejects(recognizeCrop({ ...args(), timeoutMs: 1000, fetchImpl: async (_url, options) =>
        new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(Object.assign(new Error('abort'), { name: 'AbortError' })))) }), error => {
        assert.equal(error.code, 'OCRSPACE_TIMEOUT');
        assert.equal(error.message.includes('not-a-real-key-value'), false);
        return true;
    });
});

test('redirects away from the fixed provider endpoint are rejected', async () => {
    const response = Object.assign(reply(payload()), { redirected: true, url: 'https://example.invalid/collect' });
    await assert.rejects(recognizeCrop({ ...args(), fetchImpl: async (_url, options) => {
        assert.equal(options.redirect, 'error'); return response;
    } }), { code: 'OCRSPACE_REDIRECT_BLOCKED' });
});

test('oversized provider response bodies are rejected', async () => {
    const large = { OCRExitCode: 1, ParsedResults: [], diagnostic: 'x'.repeat(MAX_RESPONSE_BYTES) };
    await assert.rejects(recognizeCrop({ ...args(), fetchImpl: async () => reply(large) }), { code: 'OCRSPACE_RESPONSE_TOO_LARGE' });
});

test('streamed provider response bodies are bounded before JSON parsing', async () => {
    const bodyText = JSON.stringify(payload());
    const stream = new ReadableStream({
        start(controller) { controller.enqueue(new TextEncoder().encode(bodyText)); controller.close(); },
    });
    const response = { ok: true, status: 200, headers: { get: () => String(MAX_RESPONSE_BYTES + 1) }, body,
        json: async () => payload() };
    await assert.rejects(recognizeCrop({ ...args(), fetchImpl: async () => response }), { code: 'OCRSPACE_RESPONSE_TOO_LARGE' });
});

test('timeout remains active while the response body is being parsed', async () => {
    await assert.rejects(recognizeCrop({ ...args(), timeoutMs: 1000, fetchImpl: async () => ({
        ok: true, status: 200, headers: { get: () => null },
        json: async () => new Promise(() => {}),
    }) }), { code: 'OCRSPACE_TIMEOUT' });
});

test('local quotas remain below current provider-published free limits', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ocrspace-limits-'));
    try {
        const ledger = new OcrSpaceQuotaLedger({ filePath: path.join(dir, 'quota.json') });
        assert.deepEqual(PROVIDER_LIMITS, { daily: 500, monthly: 25000, engine3Monthly: 1000 });
        assert.equal(ledger.maxPerDay, 450);
        assert.equal(ledger.maxPerMonth, 22000);
        assert.equal(ledger.maxEngine3PerMonth, 900);
    } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('quota reservations serialize concurrent callers and enforce all quota buckets', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ocrspace-quota-'));
    try {
        const filePath = path.join(dir, 'quota.json');
        const ledger = new OcrSpaceQuotaLedger({ filePath, maxPerDay: 2, maxPerMonth: 3, maxEngine3PerMonth: 1 });
        const date = new Date('2026-11-04T12:00:00Z');
        const reserved = await Promise.all([ledger.reserve({ engine: 2, now: date }), ledger.reserve({ engine: 2, now: date })]);
        assert.deepEqual(reserved.map(x => x.daily).sort(), [1, 2]);
        await assert.rejects(ledger.reserve({ engine: 2, now: date }), { code: 'OCRSPACE_QUOTA_EXHAUSTED' });
        await ledger.reserve({ engine: 3, now: new Date('2026-11-05T12:00:00Z') });
        await assert.rejects(ledger.reserve({ engine: 3, now: new Date('2026-11-05T12:00:00Z') }), { code: 'OCRSPACE_QUOTA_EXHAUSTED' });
        const state = JSON.parse(await fs.readFile(filePath, 'utf8'));
        assert.equal(state.daily['2026-11-04'], 2);
        assert.equal(state.monthly['2026-11'], 3);
        assert.equal(state.engine3Monthly['2026-11'], 1);
    } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('corrupt quota ledger fails closed', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ocrspace-corrupt-'));
    try {
        const filePath = path.join(dir, 'quota.json'); await fs.writeFile(filePath, '{broken');
        await assert.rejects(new OcrSpaceQuotaLedger({ filePath }).reserve({ engine: 2 }), { code: 'OCRSPACE_QUOTA_LEDGER_CORRUPT' });
    } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('provider requires explicit OCRSPACE_ENABLED=1 and a configured key', async () => {
    let builds = 0, network = 0;
    const cropPlan = [{ field: 'xp', source: 'localized-reward-column', engine: 2, rect: { left: 1, top: 2, width: 10, height: 8 } }];
    const buildCrop = async () => { builds++; return Buffer.from('crop'); };
    const keyOnly = await collectOcrSpaceFieldEvidence({ env: { OCRSPACE_API_KEY: 'key' }, cropPlan, buildCrop, client: async () => { network++; } });
    const explicitlyOff = await collectOcrSpaceFieldEvidence({ env: { OCRSPACE_ENABLED: '0', OCRSPACE_API_KEY: 'key' }, cropPlan, buildCrop, client: async () => { network++; } });
    const noKey = await collectOcrSpaceFieldEvidence({ env: { OCRSPACE_ENABLED: '1' }, cropPlan, buildCrop, client: async () => { network++; } });
    const explicitOn = await collectOcrSpaceFieldEvidence({ env: { OCRSPACE_ENABLED: '1', OCRSPACE_API_KEY: 'key' }, cropPlan,
        quotaLedger: { reserve: async () => ({ reserved: true }) },
        client: async () => { network++; return { engine: 2, parsedText: '451', overlay: [], partial: false, processingTimeMs: 5 }; },
        buildCrop });
    assertest('field evidence rejects identity/unknown crops and submits allowlisted crops sequentially', async () => {
    const events = [];
    const quotaLedger = { reserve: async ({ engine }) => { events.push('reserve:' + engine); } };
    const client = async ({ imageBuffer, engine }) => { events.push('client:' + engine + ':' + imageBuffer.toString()); return { engine, parsedText: '451', overlay: [], partial: false, processingTimeMs: 5 }; };
    const cropPlan = [
        { field: 'player', source: 'localized-player-identity', engine: 3, rect: { left: 1, top: 1, width: 20, height: 6 } },
        { field: 'unknown', source: 'localized-reward-column', engine: 2, rect: { left: 1, top: 1, width: 20, height: 6 } },
        { field: 'xp', source: 'localized-reward-column', engine: 2, rect: { left: 2, top: 2, width: 20, height: 8 } },
        { field: 'freeXp', source: 'localized-reward-column', engine: 2, rect: { left: 3, top: 3, width: 20, height: 8 } },
    ];
    const result = await collectOcrSpaceFieldEvidence({ env: { OCRSPACE_ENABLED: '1', OCRSPACE_API_KEY: 'key', OCRSPACE_MAX_CROPS: '2' },
        cropPlan, quotaLedger, client, buildCrop: async spec => { events.push('build:' + spec.field); return Buffer.from(spec.field); } });
    assert.equal(result.requests, 2);
    assert.deepEqual(result.evidence.map(x => x.field), ['xp', 'freeXp']);
    assert.deepEqual(events, ['build:xp', 'reserve:2', 'client:2:xp', 'build:freeXp', 'reserve:2', 'client:2:freeXp']);
    assert.equal(result.evidence[0].providerConfidence, null);
    assert.match(result.disclaimer, /cannot accept or change mandatory fields/);
});
test('oversized crop is rejected before quota reservation and external request', async () => {
    let reserve = 0, calls = 0;
    const result = await collectOcrSpaceFieldEvidence({ env: { OCRSPACE_ENABLED: '1', OCRSPACE_API_KEY: 'key' },
        cropPlan: [{ field: 'xp', engine: 2, rect: { left: 0, top: 0, width: 1, height: 1 } }],
        quotaLedger: { reserve: async () => { reserve++; } }, client: async () => { calls++; },
        buildCrop: async () => Buffer.alloc(MAX_FREE_FILE_BYTES + 1) });
    assert.equal(reserve, 0); assert.equal(calls, 0);
    assert.equal(result.evidence[0].code, 'OCRSPACE_FILE_TOO_LARGE');
});

test('quota exhaustion stops further provider calls', async () => {
    let calls = 0;
    const result = await collectOcrSpaceFieldEvidence({ env: { OCRSPACE_ENABLED: '1', OCRSPACE_API_KEY: 'key' },
        cropPlan: [
            { field: 'xp', engine: 2, rect: { left: 0, top: 0, width: 10, height: 10 } },
            { field: 'freeXp', engine: 2, rect: { left: 0, top: 0, width: 10, height: 10 } },
        ],
        quotaLedger: { reserve: async () => { const e = new Error('limit'); e.code = 'OCRSPACE_QUOTA_EXHAUSTED'; throw e; } },
        client: async () => { calls++; }, buildCrop: async () => Buffer.from('crop') });
    assert.equal(calls, 0);
    assert.equal(result.reason, 'OCRSPACE_QUOTA_EXHAUSTED');
});

test('crop cap parser is bounded to seven', () => {
    assert.equal(parseCropCap(undefined), 2);
    assert.equal(parseCropCap('5'), 5);
    assert.equal(parseCropCap('99'), 7);
});

test('bot runs OCR.space only after local Paddle fallback and never builds player identity crops', async () => {
    const bot = await fs.readFile(path.join(__dirname, '..', 'src', 'bot.js'), 'utf8');
    assert.ok(bot.indexOf('await paddleOcrFieldFallback.applyFieldFallback') < bot.lastIndexOf('collectOcrSpaceFieldEvidence'));
    assert.ok(bot.includes("process.env.OCRSPACE_ENABLED === '1'"));
    assert.equal(bot.includes("addCrop('player'"), false);
    assert.equal(bot.includes("'localized-player-identity'"), false);
});

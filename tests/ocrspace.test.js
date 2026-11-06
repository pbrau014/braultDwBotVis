'use strict';
const { spawn } = require('node:child_process');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { recognizeCrop, API_URL, MAX_FREE_FILE_BYTES, MAX_RESPONSE_BYTES } = require('../src/ocrspace-client');
const { OcrSpaceQuotaLedger, PROVIDER_LIMITS } = require('../src/ocrspace-quota-ledger');
const { collectOcrSpaceFieldEvidence, parseCropCap, isEligibleCrop } = require('../src/ocrspace-field-evidence');

function payload(text = '43110', engine = 2) {
    return { OCRExitCode: 1, IsErroredOnProcessing: false, ProcessingTimeInMilliseconds: '143',
        SearchablePDFURL: 'https://api.ocr.space/download/mock.pdf',
        ParsedResults: [{ FileParseExitCode: 1, ParsedText: text, TextOverlay: engine === 2
            ? { Lines: [{ Words: [{ WordText: text, Left: 3, Top: 4, Width: 40, Height: 12 }] }] } : null }] };
}
function reply(data, status = 200, headers = {}) {
    return { ok: status >= 200 && status < 300, status,
        headers: { get: name => headers[String(name).toLowerCase()] || null }, json: async () => data };
}
function args() { return { apiKey: 'not-a-real-key-value', imageBuffer: Buffer.from('png-data'), fetchImpl: async () => reply(payload()) }; }

test('Engine 2 is the default PDF-first profile with hidden searchable text layer', async () => {
    let request;
    const result = await recognizeCrop({ ...args(), fetchImpl: async (url, options) => { request = { url, options }; return reply(payload('43110', 2)); } });
    assert.equal(request.url, API_URL);
    assert.equal(request.options.method, 'POST');
    assert.equal(request.options.redirect, 'error');
    assert.equal(request.options.headers.apikey, 'not-a-real-key-value');
    assert.ok(request.options.body instanceof FormData);
    assert.equal(request.options.body.get('OCREngine'), '2');
    assert.equal(request.options.body.get('language'), 'auto');
    assert.equal(request.options.body.get('isOverlayRequired'), null);
    assert.equal(request.options.body.get('detectOrientation'), 'true');
    assert.equal(request.options.body.get('isTable'), 'false');
    assert.equal(request.options.body.get('scale'), 'true');
    assert.equal(request.options.body.get('isCreateSearchablePdf'), 'true');
    assert.equal(request.options.body.get('isSearchablePdfHideTextLayer'), 'true');
    assert.equal(result.parsedText, '43110');
    assert.equal(result.providerConfidence, null);
    assert.deepEqual(result.overlay, []);
    assert.equal(result.searchablePdfUrl, 'https://api.ocr.space/download/mock.pdf');
});

test('Engine 2 is used only as a searchable-PDF fallback when Engine 3 returns no PDF URL', async () => {
    const calls = [];
    const quotaLedger = { reserve: async ({ engine }) => { calls.push('reserve:' + engine); } };
    const client = async ({ engine, createSearchablePdf, searchablePdfHideTextLayer }) => {
        calls.push('client:' + engine + ':' + createSearchablePdf + ':' + searchablePdfHideTextLayer);
        return engine === 3
            ? { engine: 3, parsedText: 'remote-first-text', overlay: [], partial: false, searchablePdfUrl: null }
            : { engine: 2, parsedText: 'do-not-use-this-text', overlay: [], partial: false, searchablePdfUrl: 'https://api.ocr.space/download/fallback.pdf' };
    };
    const result = await collectOcrSpaceFieldEvidence({
        env: { OCRSPACE_ENABLED: '1', OCRSPACE_API_KEY: 'key' },
        cropPlan: [{ field: 'rewardBand', source: 'opencv-reward-band', engine: 3, isTable: true, identityBoundaryVerified: true,
            rect: { left: 10, top: 40, width: 300, height: 50 } }],
        quotaLedger, client, buildCrop: async () => Buffer.from('safe-crop'),
    });
    assert.equal(result.requests, 2);
    assert.equal(result.evidence[0].text, 'remote-first-text');
    assert.equal(result.evidence[0].searchablePdfUrl, 'https://api.ocr.space/download/fallback.pdf');
    assert.equal(result.evidence[0].searchablePdfStatus, 'created-by-engine2-pdf-fallback');
    assert.deepEqual(calls, ['reserve:3', 'client:3:true:false', 'reserve:2', 'client:2:true:false']);
});

test('Legacy Engine 3 non-PDF OCR does not request optional TextOverlay data', async () => {
    let form;
    const result = await recognizeCrop({ ...args(), engine: 3, createSearchablePdf: false, searchablePdfHideTextLayer: false, fetchImpl: async (_url, options) => { form = options.body; return reply(payload('player text', 3)); } });
    assert.equal(form.get('OCREngine'), '3');
    assert.equal(form.get('isOverlayRequired'), 'false');
    assert.equal(form.get('isCreateSearchablePdf'), 'false');
    assert.equal(form.get('isSearchablePdfHideTextLayer'), 'false');
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
    const bodyText = JSON.stringify({ ...payload(), diagnostic: 'x'.repeat(MAX_RESPONSE_BYTES) });
    const stream = new ReadableStream({
        start(controller) { controller.enqueue(new TextEncoder().encode(bodyText)); controller.close(); },
    });
    const response = { ok: true, status: 200, headers: { get: () => null }, body: stream };
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

test('OCR.Space requires explicit enablement and a local key; unset, 0 and invalid settings fail closed', async () => {
    let builds = 0, network = 0;
    const cropPlan = [{ field: 'xp', source: 'localized-reward-column', engine: 3, identityBoundaryVerified: true, rect: { left: 1, top: 2, width: 10, height: 8 } }];
    const buildCrop = async () => { builds++; return Buffer.from('crop'); };
    const quotaLedger = { reserve: async () => ({ reserved: true }) };
    const client = async () => { network++; return { engine: 3, parsedText: '451', overlay: [], partial: false,
        searchablePdfUrl: 'https://api.ocr.space/download/mock.pdf', processingTimeMs: 5 }; };
    const unset = await collectOcrSpaceFieldEvidence({ env: { OCRSPACE_API_KEY: 'key' }, cropPlan, buildCrop, quotaLedger, client });
    const zero = await collectOcrSpaceFieldEvidence({ env: { OCRSPACE_ENABLED: '0', OCRSPACE_API_KEY: 'key' }, cropPlan, buildCrop, quotaLedger, client });
    const noKey = await collectOcrSpaceFieldEvidence({ env: { OCRSPACE_ENABLED: '1' }, cropPlan, buildCrop, quotaLedger, client });
    const invalidSetting = await collectOcrSpaceFieldEvidence({ env: { OCRSPACE_ENABLED: 'true', OCRSPACE_API_KEY: 'key' }, cropPlan, buildCrop, quotaLedger, client });
    const explicitOn = await collectOcrSpaceFieldEvidence({ env: { OCRSPACE_ENABLED: '1', OCRSPACE_API_KEY: 'key' }, cropPlan, buildCrop, quotaLedger, client });
    assert.equal(unset.status, 'disabled');
    assert.equal(unset.activation.defaultEnabled, false);
    assert.equal(unset.activation.explicitlyEnabled, false);
    assert.equal(zero.status, 'disabled');
    assert.equal(zero.activation.reason, 'OCRSPACE_ENABLED must be explicitly set to 1');
    assert.equal(noKey.status, 'disabled');
    assert.equal(invalidSetting.status, 'disabled');
    assert.equal(explicitOn.status, 'complete');
    assert.equal(unset.requests, 0);
    assert.equal(explicitOn.requests, 1);
    assert.equal(explicitOn.evidence[0].text, '451');
    assert.equal(builds, 1);
    assert.equal(network, 1);
});

test('field evidence rejects identity/unknown crops and submits allowlisted crops sequentially', async () => {
    const events = [];
    const quotaLedger = { reserve: async ({ engine }) => { events.push('reserve:' + engine); } };
    const client = async ({ imageBuffer, engine }) => { events.push('client:' + engine + ':' + imageBuffer.toString()); return { engine, parsedText: '451', overlay: [], partial: false, searchablePdfUrl: 'https://api.ocr.space/download/mock.pdf', processingTimeMs: 5 }; };
    const cropPlan = [
        { field: 'player', source: 'localized-player-identity', engine: 3, rect: { left: 1, top: 1, width: 20, height: 6 } },
        { field: 'unknown', source: 'localized-reward-column', engine: 2, rect: { left: 1, top: 1, width: 20, height: 6 } },
        { field: 'xp', source: 'localized-reward-column', engine: 3, identityBoundaryVerified: true, rect: { left: 2, top: 2, width: 20, height: 8 } },
        { field: 'freeXp', source: 'localized-reward-column', engine: 3, identityBoundaryVerified: true, rect: { left: 3, top: 3, width: 20, height: 8 } },
    ];
    const result = await collectOcrSpaceFieldEvidence({ env: { OCRSPACE_ENABLED: '1', OCRSPACE_API_KEY: 'key', OCRSPACE_MAX_CROPS: '2' },
        cropPlan, quotaLedger, client, buildCrop: async spec => { events.push('build:' + spec.field); return Buffer.from(spec.field); } });
    assert.equal(result.requests, 2);
    assert.deepEqual(result.evidence.map(x => x.field), ['xp', 'freeXp']);
    assert.deepEqual(events, ['build:xp', 'reserve:3', 'client:3:xp', 'build:freeXp', 'reserve:3', 'client:3:freeXp']);
    assert.equal(result.evidence[0].providerConfidence, null);
    assert.match(result.disclaimer, /cannot accept or change mandatory fields/);
});
test('field evidence rejects otherwise-allowlisted crops without a verified identity boundary', async () => {
    let builds = 0, calls = 0;
    const result = await collectOcrSpaceFieldEvidence({
        env: { OCRSPACE_ENABLED: '1', OCRSPACE_API_KEY: 'key' },
        cropPlan: [{ field: 'xp', source: 'localized-reward-column', engine: 3,
            rect: { left: 10, top: 10, width: 80, height: 20 } }],
        quotaLedger: { reserve: async () => { throw new Error('must not reserve quota'); } },
        client: async () => { calls++; },
        buildCrop: async () => { builds++; return Buffer.from('crop'); },
    });
    assert.equal(isEligibleCrop({ field: 'xp', source: 'localized-reward-column', engine: 3,
        rect: { left: 10, top: 10, width: 80, height: 20 } }), false);
    assert.equal(result.status, 'skipped');
    assert.equal(result.requests, 0);
    assert.equal(builds, 0);
    assert.equal(calls, 0);
});

test('oversized crop is rejected before quota reservation and external request', async () => {
    let reserve = 0, calls = 0;
    const result = await collectOcrSpaceFieldEvidence({ env: { OCRSPACE_ENABLED: '1', OCRSPACE_API_KEY: 'key' },
        cropPlan: [{ field: 'xp', source: 'localized-reward-column', engine: 3, identityBoundaryVerified: true, rect: { left: 0, top: 0, width: 8, height: 6 } }],
        quotaLedger: { reserve: async () => { reserve++; } }, client: async () => { calls++; },
        buildCrop: async () => Buffer.alloc(MAX_FREE_FILE_BYTES + 1) });
    assert.equal(reserve, 0); assert.equal(calls, 0);
    assert.equal(result.evidence[0].code, 'OCRSPACE_FILE_TOO_LARGE');
});

test('quota exhaustion stops further provider calls', async () => {
    let calls = 0;
    const result = await collectOcrSpaceFieldEvidence({ env: { OCRSPACE_ENABLED: '1', OCRSPACE_API_KEY: 'key' },
        cropPlan: [
            { field: 'xp', source: 'localized-reward-column', engine: 3, identityBoundaryVerified: true, rect: { left: 0, top: 0, width: 10, height: 10 } },
            { field: 'freeXp', source: 'localized-reward-column', engine: 3, identityBoundaryVerified: true, rect: { left: 0, top: 0, width: 10, height: 10 } },
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

test('bot runs OCR.Space Engine 2 PDF-first before local readers and retains PDF-derived artifacts', async () => {
    const bot = await fs.readFile(path.join(__dirname, '..', 'src', 'bot.js'), 'utf8');
    const pdfFirst = bot.indexOf('const pdfFirst = await createOcrSpacePdfFirst');
    const rasterHandoff = bot.indexOf('imageBuffer = rasterBuffer', pdfFirst);
    const worker = bot.indexOf('const worker = await getOcrWorker()');
    assert.ok(pdfFirst >= 0 && rasterHandoff > pdfFirst && rasterHandoff < worker);
    assert.ok(bot.includes('const ocrSpaceConfigured = ocrSpaceActivation.enabled'));
    assert.ok(bot.includes("source: 'ocrspace-searchable-pdf'"));
    assert.ok(bot.includes('OCR.Space is the required primary text-extraction stage.'));
    assert.ok(bot.includes('OCRSPACE_ENABLED=1'));
    assert.ok(bot.includes("const pdfPath = path.join(artifactDir, stem + '.ocrspace.pdf')"));
    assert.ok(bot.includes("const rasterPath = path.join(artifactDir, stem + '.ocrspace-page.png')"));
});

test('quota ledger serializes independent Windows/Node processes and atomically replaces the existing state', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ocrspace-cross-process-'));
    try {
        const filePath = path.join(dir, 'quota.json');
        const modulePath = path.join(__dirname, '..', 'src', 'ocrspace-quota-ledger.js');
        const childScript = `
            const { OcrSpaceQuotaLedger } = require(process.argv[1]);
            (async () => {
                try {
                    const ledger = new OcrSpaceQuotaLedger({
                        filePath: process.argv[2], maxPerDay: 2, maxPerMonth: 2,
                        maxEngine3PerMonth: 2, lockWaitMs: 5000, staleLockMs: 30000,
                    });
                    const reservation = await ledger.reserve({
                        engine: 3, now: new Date('2026-11-05T12:00:00.000Z'),
                    });
                    process.stdout.write(JSON.stringify({ ok: true, reservation }));
                } catch (error) {
                    if (error.code === 'OCRSPACE_QUOTA_EXHAUSTED') {
                        process.stdout.write(JSON.stringify({ ok: false, code: error.code }));
                    } else {
                        process.stderr.write(String(error && error.stack || error));
                        process.exitCode = 1;
                    }
                }
            })();
        `;
        const runChild = () => new Promise((resolve, reject) => {
            const child = spawn(process.execPath, ['-e', childScript, modulePath, filePath], {
                stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
            });
            let stdout = '', stderr = '';
            child.stdout.setEncoding('utf8');
            child.stderr.setEncoding('utf8');
            child.stdout.on('data', chunk => { stdout += chunk; });
            child.stderr.on('data', chunk => { stderr += chunk; });
            child.once('error', reject);
            child.once('close', (code, signal) => {
                if (code !== 0) return reject(new Error(`Quota child failed (code=${code}, signal=${signal}): ${stderr}`));
                try { resolve(JSON.parse(stdout)); }
                catch (error) { reject(new Error(`Quota child returned invalid JSON: ${stdout}; ${error.message}`)); }
            });
        });
        const outcomes = await Promise.all([runChild(), runChild(), runChild()]);
        assert.equal(outcomes.filter(item => item.ok).length, 2);
        assert.equal(outcomes.filter(item => item.code === 'OCRSPACE_QUOTA_EXHAUSTED').length, 1);
        assert.deepEqual(outcomes.filter(item => item.ok).map(item => item.reservation.daily).sort(), [1, 2]);
        const state = JSON.parse(await fs.readFile(filePath, 'utf8'));
        assert.equal(state.daily['2026-11-05'], 2);
        assert.equal(state.monthly['2026-11'], 2);
        assert.equal(state.engine3Monthly['2026-11'], 2);
        await assert.rejects(fs.stat(filePath + '.lock'), { code: 'ENOENT' });
        assert.deepEqual((await fs.readdir(dir)).sort(), ['quota.json']);
    } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('quota ledger reclaims a stale lock before reserving', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ocrspace-stale-lock-'));
    try {
        const filePath = path.join(dir, 'quota.json');
        const lockPath = filePath + '.lock';
        await fs.writeFile(lockPath, JSON.stringify({ pid: -1, createdAt: 'stale' }));
        const stale = new Date(Date.now() - 7000);
        await fs.utimes(lockPath, stale, stale);
        const ledger = new OcrSpaceQuotaLedger({ filePath, lockWaitMs: 500, staleLockMs: 5000 });
        const reservation = await ledger.reserve({ engine: 3, now: new Date('2026-11-05T12:00:00.000Z') });
        assert.equal(reservation.reserved, true);
        assert.equal(reservation.daily, 1);
        await assert.rejects(fs.stat(lockPath), { code: 'ENOENT' });
    } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

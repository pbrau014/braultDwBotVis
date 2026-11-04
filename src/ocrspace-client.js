'use strict';
const API_URL = 'https://api.ocr.space/parse/image';
const MAX_FREE_FILE_BYTES = 1024 * 1024;
const SUPPORTED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/bmp']);
function fail(message, code, extra = {}) { const e = new Error(message); e.code = code; Object.assign(e, extra); return e; }
function compactOverlay(results, maxWords = 500) {
    const out = []; let left = maxWords;
    for (const result of results || []) for (const line of (result && result.TextOverlay && result.TextOverlay.Lines) || []) {
        for (const word of line.Words || []) {
            if (left <= 0) return out;
            const text = String(word.WordText || '').slice(0, 120);
            const vals = [Number(word.Left), Number(word.Top), Number(word.Width), Number(word.Height)];
            if (!text || !vals.every(Number.isFinite) || vals.some(n => n < 0)) continue;
            out.push({ text, left: vals[0], top: vals[1], width: vals[2], height: vals[3] }); left--;
        }
    }
    return out;
}
/** Returns OCR.space evidence only; callers must not use it to accept or rewrite DWBOT fields. */
async function recognizeCrop({ apiKey, imageBuffer, filename = 'dwbot-field-crop.png', mimeType = 'image/png', engine = 2, overlayRequired = Number(engine) === 2, timeoutMs = 15000, fetchImpl = globalThis.fetch }) {
    const key = String(apiKey || '').trim();
    if (!key) throw fail('OCR.space API key is not configured.', 'OCRSPACE_KEY_MISSING');
    if (!Buffer.isBuffer(imageBuffer) || !imageBuffer.length) throw fail('OCR.space input crop is empty or invalid.', 'OCRSPACE_INVALID_IMAGE');
    if (imageBuffer.length > MAX_FREE_FILE_BYTES) throw fail('OCR.space Free API crop exceeds the 1 MB limit.', 'OCRSPACE_FILE_TOO_LARGE');
    if (!SUPPORTED_MIME_TYPES.has(String(mimeType).toLowerCase())) throw fail('Unsupported OCR.space image MIME type.', 'OCRSPACE_UNSUPPORTED_MIME');
    const selectedEngine = Number(engine);
    if (![2, 3].includes(selectedEngine)) throw fail('OCR.space Engine 2 or 3 is required; Engine 1 is retired.', 'OCRSPACE_INVALID_ENGINE');
    if (typeof fetchImpl !== 'function') throw fail('Node fetch() is unavailable.', 'OCRSPACE_FETCH_UNAVAILABLE');
    const form = new FormData();
    form.append('file', new Blob([imageBuffer], { type: mimeType }), String(filename).slice(0, 120));
    form.append('OCREngine', String(selectedEngine));
    form.append('isOverlayRequired', overlayRequired ? 'true' : 'false');
    form.append('language', 'auto');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.max(1000, Number(timeoutMs) || 15000));
    let response;
    try {
        response = await fetchImpl(API_URL, { method: 'POST', headers: { apikey: key }, body: form, signal: controller.signal });
    } catch (error) {
        if (error && error.name === 'AbortError') throw fail('OCR.space request timed out.', 'OCRSPACE_TIMEOUT');
        throw fail('OCR.space request failed: ' + String(error && error.message || error).slice(0, 240), 'OCRSPACE_NETWORK_ERROR');
    } finally { clearTimeout(timer); }
    if (response.status === 429) {
        const retry = Number(response.headers && response.headers.get && response.headers.get('retry-after'));
        throw fail('OCR.space rate limit reached; no automatic retry was attempted.', 'OCRSPACE_RATE_LIMIT', { retryAfterSeconds: Number.isFinite(retry) ? retry : null });
    }
    if (!response.ok) throw fail('OCR.space returned HTTP ' + response.status + '.', response.status === 401 || response.status === 403 ? 'OCRSPACE_AUTH_ERROR' : 'OCRSPACE_HTTP_ERROR', { httpStatus: response.status });
    let payload;
    try { payload = await response.json(); } catch { throw fail('OCR.space returned invalid JSON.', 'OCRSPACE_INVALID_RESPONSE'); }
    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.ParsedResults)) throw fail('OCR.space response did not contain ParsedResults.', 'OCRSPACE_INVALID_RESPONSE');
    if (payload.IsErroredOnProcessing) throw fail('OCR.space processing error: ' + String(payload.ErrorMessage || payload.ErrorDetails || 'unknown provider error').slice(0, 260), 'OCRSPACE_PROCESSING_ERROR');
    const exitCode = Number(payload.OCRExitCode);
    if (![1, 2].includes(exitCode)) throw fail('OCR.space parse failed with OCRExitCode ' + payload.OCRExitCode, 'OCRSPACE_PARSE_FAILED', { providerExitCode: exitCode });
    const ok = payload.ParsedResults.filter(x => Number(x && x.FileParseExitCode) === 1);
    if (!ok.length) throw fail('OCR.space returned no successfully parsed crop.', 'OCRSPACE_PARSE_FAILED', { providerExitCode: exitCode });
    return {
        provider: 'ocr.space', engine: selectedEngine, exitCode, partial: exitCode === 2,
        parsedText: ok.map(x => String(x.ParsedText || '')).join('\n').slice(0, 12000),
        overlay: overlayRequired ? compactOverlay(ok) : [],
        providerConfidence: null,
        processingTimeMs: Number(payload.ProcessingTimeInMilliseconds) || null,
    };
}
module.exports = { API_URL, MAX_FREE_FILE_BYTES, SUPPORTED_MIME_TYPES, recognizeCrop, __test: { compactOverlay } };

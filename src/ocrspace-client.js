'use strict';
const API_URL = 'https://api.ocr.space/parse/image';
const MAX_FREE_FILE_BYTES = 1024 * 1024;
const MAX_RESPONSE_BYTES = 256 * 1024;
const SUPPORTED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/bmp']);
function fail(message, code, extra = {}) { const e = new Error(message); e.code = code; Object.assign(e, extra); return e; }
function safeSearchablePdfUrl(value) {
    try { const url = new URL(String(value || '')); return url.protocol === 'https:' && ['api.ocr.space', 'ocr.space'].includes(url.hostname) ? url.toString() : null; }
    catch { return null; }
}
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
async function readJsonBounded(response, maxBytes = MAX_RESPONSE_BYTES) {
    const declared = Number(response.headers && response.headers.get && response.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > maxBytes) throw fail('OCR.space response exceeds the configured size limit.', 'OCRSPACE_RESPONSE_TOO_LARGE');
    if (response.body && typeof response.body.getReader === 'function') {
        const reader = response.body.getReader();
        const chunks = []; let total = 0;
        try {
            while (true) {
                const part = await reader.read();
                if (part.done) break;
                const chunk = Buffer.from(part.value);
                total += chunk.length;
                if (total > maxBytes) {
                    try { await reader.cancel(); } catch {}
                    throw fail('OCR.space response exceeds the configured size limit.', 'OCRSPACE_RESPONSE_TOO_LARGE');
                }
                chunks.push(chunk);
            }
        } finally { try { reader.releaseLock(); } catch {} }
        return JSON.parse(Buffer.concat(chunks, total).toString('utf8'));
    }
    if (typeof response.arrayBuffer === 'function') {
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.length > maxBytes) throw fail('OCR.space response exceeds the configured size limit.', 'OCRSPACE_RESPONSE_TOO_LARGE');
        return JSON.parse(bytes.toString('utf8'));
    }
    if (typeof response.text === 'function') {
        const body = await response.text();
        if (Buffer.byteLength(body, 'utf8') > maxBytes) throw fail('OCR.space response exceeds the configured size limit.', 'OCRSPACE_RESPONSE_TOO_LARGE');
        return JSON.parse(body);
    }
    if (typeof response.json === 'function') {
        const payload = await response.json();
        if (Buffer.byteLength(JSON.stringify(payload), 'utf8') > maxBytes) throw fail('OCR.space response exceeds the configured size limit.', 'OCRSPACE_RESPONSE_TOO_LARGE');
        return payload;
    }
    throw fail('OCR.space response body is unavailable.', 'OCRSPACE_INVALID_RESPONSE');
}
/** Returns OCR.space evidence only; callers must not use it to accept or rewrite DWBOT fields. */
async function recognizeCrop({ apiKey, imageBuffer, filename = 'dwbot-field-crop.png', mimeType = 'image/png', engine = 3, overlayRequired = false, detectOrientation = true, isTable = false, scale = true, createSearchablePdf = true, searchablePdfHideTextLayer = false, timeoutMs = 15000, fetchImpl = globalThis.fetch }) {
    const key = String(apiKey || '').trim();
    if (!key) throw fail('OCR.space API key is not configured.', 'OCRSPACE_KEY_MISSING');
    if (!Buffer.isBuffer(imageBuffer) || !imageBuffer.length) throw fail('OCR.space input crop is empty or invalid.', 'OCRSPACE_INVALID_IMAGE');
    if (imageBuffer.length > MAX_FREE_FILE_BYTES) throw fail('OCR.space Free API crop exceeds the 1 MB limit.', 'OCRSPACE_FILE_TOO_LARGE');
    const selectedMime = String(mimeType).toLowerCase();
    if (!SUPPORTED_MIME_TYPES.has(selectedMime)) throw fail('Unsupported OCR.space image MIME type.', 'OCRSPACE_UNSUPPORTED_MIME');
    const selectedEngine = Number(engine);
    if (![2, 3].includes(selectedEngine)) throw fail('OCR.space Engine 2 or 3 is required; Engine 1 is retired.', 'OCRSPACE_INVALID_ENGINE');
    if (typeof fetchImpl !== 'function') throw fail('Node fetch() is unavailable.', 'OCRSPACE_FETCH_UNAVAILABLE');
    const form = new FormData();
    form.append('file', new Blob([imageBuffer], { type: selectedMime }), String(filename).slice(0, 120));
    form.append('OCREngine', String(selectedEngine));
    const effectiveOverlayRequired = overlayRequired || createSearchablePdf;
    form.append('isOverlayRequired', effectiveOverlayRequired ? 'true' : 'false');
    form.append('language', 'auto');
    form.append('detectOrientation', detectOrientation ? 'true' : 'false');
    form.append('isTable', isTable ? 'true' : 'false');
    form.append('scale', scale ? 'true' : 'false');
    form.append('isCreateSearchablePdf', createSearchablePdf ? 'true' : 'false');
    form.append('isSearchablePdfHideTextLayer', searchablePdfHideTextLayer ? 'true' : 'false');
    const controller = new AbortController();
    let rejectTimeout;
    const timeoutPromise = new Promise((_, reject) => { rejectTimeout = reject; });
    const timer = setTimeout(() => {
        controller.abort();
        rejectTimeout(fail('OCR.space request timed out.', 'OCRSPACE_TIMEOUT'));
    }, Math.max(1000, Number(timeoutMs) || 15000));
    try {
        const response = await Promise.race([fetchImpl(API_URL, {
            method: 'POST', headers: { apikey: key }, body: form, signal: controller.signal, redirect: 'error',
        }), timeoutPromise]);
        if (response.redirected === true || (response.url && response.url !== API_URL)) {
            throw fail('OCR.space redirected away from the approved endpoint; request rejected.', 'OCRSPACE_REDIRECT_BLOCKED');
        }
        if (response.status === 429) {
            const retry = Number(response.headers && response.headers.get && response.headers.get('retry-after'));
            throw fail('OCR.space rate limit reached; no automatic retry was attempted.', 'OCRSPACE_RATE_LIMIT', { retryAfterSeconds: Number.isFinite(retry) ? retry : null });
        }
        if (!response.ok) throw fail('OCR.space returned HTTP ' + response.status + '.', response.status === 401 || response.status === 403 ? 'OCRSPACE_AUTH_ERROR' : 'OCRSPACE_HTTP_ERROR', { httpStatus: response.status });
        let payload;
        try { payload = await Promise.race([readJsonBounded(response), timeoutPromise]); }
        catch (error) {
            if (error && error.code) throw error;
            if (controller.signal.aborted || (error && error.name === 'AbortError')) {
                throw fail('OCR.space request timed out.', 'OCRSPACE_TIMEOUT');
            }
            throw fail('OCR.space returned invalid JSON.', 'OCRSPACE_INVALID_RESPONSE');
        }
        if (!payload || typeof payload !== 'object' || !Array.isArray(payload.ParsedResults)) throw fail('OCR.space response did not contain ParsedResults.', 'OCRSPACE_INVALID_RESPONSE');
        if (payload.IsErroredOnProcessing) throw fail('OCR.space processing error: ' + String(payload.ErrorMessage || payload.ErrorDetails || 'unknown provider error').slice(0, 260), 'OCRSPACE_PROCESSING_ERROR');
        const exitCode = Number(payload.OCRExitCode);
        if (![1, 2].includes(exitCode)) throw fail('OCR.space parse failed with OCRExitCode ' + payload.OCRExitCode, 'OCRSPACE_PARSE_FAILED', { providerExitCode: exitCode });
        const ok = payload.ParsedResults.filter(x => Number(x && x.FileParseExitCode) === 1);
        if (!ok.length) throw fail('OCR.space returned no successfully parsed crop.', 'OCRSPACE_PARSE_FAILED', { providerExitCode: exitCode });
        return {
            provider: 'ocr.space', engine: selectedEngine, exitCode, partial: exitCode === 2,
            parsedText: ok.map(x => String(x.ParsedText || '')).join('\n').slice(0, 12000),
            overlay: effectiveOverlayRequired ? compactOverlay(ok) : [],
            providerConfidence: null,
            searchablePdfUrl: createSearchablePdf ? safeSearchablePdfUrl(payload.SearchablePDFURL) : null,
            processingTimeMs: Number(payload.ProcessingTimeInMilliseconds) || null,
        };
    } catch (error) {
        if (error && error.code) throw error;
        if (controller.signal.aborted || (error && error.name === 'AbortError')) throw fail('OCR.space request timed out.', 'OCRSPACE_TIMEOUT');
        throw fail('OCR.space request failed: ' + String(error && error.message || error).slice(0, 240), 'OCRSPACE_NETWORK_ERROR');
    } finally { clearTimeout(timer); }
}
module.exports = { API_URL, MAX_FREE_FILE_BYTES, MAX_RESPONSE_BYTES, SUPPORTED_MIME_TYPES, recognizeCrop, readJsonBounded, safeSearchablePdfUrl, __test: { compactOverlay } };

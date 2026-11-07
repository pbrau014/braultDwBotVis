'use strict';

const crypto = require('node:crypto');

const API_VERSION = '2024-11-30';
const MODEL_ID = 'prebuilt-read';
const MAX_FREE_FILE_BYTES = 4 * 1024 * 1024;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_PAGES = 2;
const MAX_LINES = 10000;
const MAX_WORDS_PER_LINE = 500;
const DEFAULT_MONTHLY_LIMIT = 450;

function fail(message, code, extra = {}) {
    const error = new Error(message);
    error.code = code;
    Object.assign(error, extra);
    return error;
}

function safeEndpoint(value) {
    try {
        const url = new URL(String(value || '').trim());
        if (url.protocol !== 'https:' || url.username || url.password || url.port ||
            !url.hostname.endsWith('.cognitiveservices.azure.com') ||
            url.pathname !== '/' || url.search || url.hash) return null;
        return url.origin;
    } catch { return null; }
}

function safeOperationUrl(value, endpoint) {
    try {
        const url = new URL(String(value || ''));
        const base = new URL(endpoint);
        if (url.protocol !== 'https:' || url.origin !== base.origin ||
            url.hostname !== base.hostname || url.username || url.password ||
            !url.pathname.startsWith('/documentintelligence/documentModels/prebuilt-read/analyzeResults/')) return null;
        return url.toString();
    } catch { return null; }
}

function detectMime(buffer) {
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
    if (buffer.length >= 2 && buffer.subarray(0, 2).toString('ascii') === 'BM') return 'image/bmp';
    if (buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === 'II*\0') return 'image/tiff';
    if (buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === 'MM\0*') return 'image/tiff';
    return null;
}

async function readJsonBounded(response, maxBytes = MAX_RESPONSE_BYTES) {
    const declared = Number(response.headers?.get?.('content-length'));
    if (Number.isFinite(declared) && declared > maxBytes) throw fail('Azure response exceeds the configured size limit.', 'AZURE_OCR_RESPONSE_TOO_LARGE');
    if (!response.body?.getReader) throw fail('Azure response does not support bounded streaming.', 'AZURE_OCR_RESPONSE_STREAM_UNAVAILABLE');
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    try {
        while (true) {
            const part = await reader.read();
            if (part.done) break;
            const chunk = Buffer.from(part.value);
            total += chunk.length;
            if (total > maxBytes) {
                try { await reader.cancel(); } catch {}
                throw fail('Azure response exceeds the configured size limit.', 'AZURE_OCR_RESPONSE_TOO_LARGE');
            }
            chunks.push(chunk);
        }
    } finally { try { reader.releaseLock(); } catch {} }
    return JSON.parse(Buffer.concat(chunks, total).toString('utf8'));
}

function normalizePolygon(value, pageWidth = null, pageHeight = null) {
    if (!Array.isArray(value) || value.length < 8 || value.length % 2 !== 0) {
        return { polygon: [], geometryValid: false, geometryIssue: 'polygon_must_contain_at_least_four_xy_pairs' };
    }
    const polygon = value.map(Number);
    if (!polygon.every(Number.isFinite)) {
        return { polygon: [], geometryValid: false, geometryIssue: 'polygon_contains_non_finite_coordinate' };
    }
    if (polygon.some(value => value < 0)) {
        return { polygon, geometryValid: false, geometryIssue: 'polygon_contains_negative_coordinate' };
    }
    if (Number.isFinite(pageWidth) && Number.isFinite(pageHeight) &&
        polygon.some((value, index) => value > (index % 2 === 0 ? pageWidth : pageHeight))) {
        return { polygon, geometryValid: false, geometryIssue: 'polygon_exceeds_page_dimensions' };
    }
    return { polygon, geometryValid: true, geometryIssue: null };
}

function flattenReadResult(payload) {
    const result = payload?.analyzeResult;
    if (!result || typeof result !== 'object') throw fail('Azure result omitted analyzeResult.', 'AZURE_OCR_INVALID_RESPONSE');
    const lines = [];
    const pages = Array.isArray(result.pages) ? result.pages : [];
    if (pages.length > MAX_PAGES) throw fail('Azure result exceeds the configured page count limit.', 'AZURE_OCR_RESPONSE_TOO_COMPLEX');
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        const page = pages[pageIndex];
        const pageWidth = Number.isFinite(Number(page.width)) && page.width !== null ? Number(page.width) : null;
        const pageHeight = Number.isFinite(Number(page.height)) && page.height !== null ? Number(page.height) : null;
        for (const line of Array.isArray(page.lines) ? page.lines : []) {
            const lineGeometry = normalizePolygon(line.polygon, pageWidth, pageHeight);
            const words = (Array.isArray(line.words) ? line.words : []).slice(0, MAX_WORDS_PER_LINE).map(word => {
                const geometry = normalizePolygon(word.polygon, pageWidth, pageHeight);
                const confidence = word.confidence === null || word.confidence === undefined
                    ? null : Number(word.confidence);
                return {
                    text: String(word.content || '').slice(0, 300),
                    confidence: Number.isFinite(confidence) && confidence >= 0 && confidence <= 1 ? confidence : null,
                    ...geometry,
                    pageIndex,
                };
            });
            lines.push({
                text: String(line.content || '').slice(0, 2000),
                ...lineGeometry,
                words,
                pageIndex,
                pageNumber: Number(page.pageNumber) || pageIndex + 1,
                pageWidth,
                pageHeight,
                pageUnit: String(page.unit || ''),
            });
            if (lines.length > MAX_LINES) throw fail('Azure result exceeds the configured line count limit.', 'AZURE_OCR_RESPONSE_TOO_COMPLEX');
        }
    }
    const text = typeof result.content === 'string'
        ? result.content.slice(0, 100000)
        : lines.map(line => line.text).join('\n').slice(0, 100000);
    return {
        text, lines, pageCount: pages.length,
        pages: pages.slice(0, MAX_PAGES).map((page, pageIndex) => ({
            pageIndex, pageNumber: Number(page.pageNumber) || pageIndex + 1,
            width: Number.isFinite(Number(page.width)) && page.width !== null ? Number(page.width) : null,
            height: Number.isFinite(Number(page.height)) && page.height !== null ? Number(page.height) : null,
            unit: String(page.unit || ''),
        })),
    };
}

async function recognizeImage({
    imageBuffer,
    endpoint,
    apiKey,
    fetchImpl = globalThis.fetch,
    timeoutMs = 45000,
    pollIntervalMs = 1100,
    maxPolls = 35,
    onRequestStarted = null,
    beforeRequest = null,
}) {
    const normalizedEndpoint = safeEndpoint(endpoint);
    const key = String(apiKey || '').trim();
    if (!normalizedEndpoint) throw fail('Azure Document Intelligence endpoint is missing or not an approved HTTPS resource endpoint.', 'AZURE_OCR_ENDPOINT_INVALID');
    if (!key) throw fail('Azure Document Intelligence key is not configured.', 'AZURE_OCR_KEY_MISSING');
    if (!Buffer.isBuffer(imageBuffer) || !imageBuffer.length) throw fail('Azure input image is empty or invalid.', 'AZURE_OCR_INVALID_IMAGE');
    if (imageBuffer.length > MAX_FREE_FILE_BYTES) throw fail('Azure F0 document exceeds the 4 MiB request limit.', 'AZURE_OCR_FILE_TOO_LARGE');
    const mimeType = detectMime(imageBuffer);
    if (!mimeType || !['image/png', 'image/jpeg', 'image/bmp', 'image/tiff'].includes(mimeType)) {
        throw fail('Azure Read accepts only PNG, JPEG, BMP or TIFF image input.', 'AZURE_OCR_UNSUPPORTED_MIME');
    }
    if (typeof fetchImpl !== 'function') throw fail('Fetch is unavailable.', 'AZURE_OCR_FETCH_UNAVAILABLE');

    const sourceSha256 = crypto.createHash('sha256').update(imageBuffer).digest('hex');
    const analyzeUrl = normalizedEndpoint + '/documentintelligence/documentModels/' + MODEL_ID +
        ':analyze?api-version=' + API_VERSION;
    const controller = new AbortController();
    const startedAt = Date.now();
    const deadline = startedAt + Math.max(5000, Math.min(90000, Number(timeoutMs) || 45000));
    let httpRequestCount = 0;
    const providerRequestIds = [];
    let operationId = null;
    const request = async (url, options) => {
        const method = String(options?.method || 'GET').toUpperCase();
        const requestIndex = httpRequestCount + 1;
        const details = {
            provider: 'azure-document-intelligence',
            method,
            url: String(url),
            requestIndex,
            model: MODEL_ID,
            apiVersion: API_VERSION,
            sourceSha256,
        };
        // Reserve the shared F0 request slot before crossing the network boundary.
        // A callback failure deliberately prevents the request from being sent.
        if (typeof beforeRequest === 'function') await beforeRequest(details);
        if (typeof onRequestStarted === 'function') await onRequestStarted(details);
        httpRequestCount++;
        const response = await fetchImpl(url, { ...options, signal: controller.signal, redirect: 'error' });
        if (response.redirected) throw fail('Azure redirected the request; rejected.', 'AZURE_OCR_REDIRECT_BLOCKED');
        const requestId = response.headers?.get?.('apim-request-id') ||
            response.headers?.get?.('x-ms-request-id') || response.headers?.get?.('request-id');
        if (requestId) providerRequestIds.push(String(requestId).slice(0, 200));
        return response;
    };
    const timer = setTimeout(() => controller.abort(), Math.max(5000, Math.min(90000, Number(timeoutMs) || 45000)));
    try {
        const response = await request(analyzeUrl, {
            method: 'POST',
            headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': mimeType },
            body: imageBuffer,
        });
        if (response.status === 429) throw fail('Azure F0 rate limit reached; no automatic retry was attempted.', 'AZURE_OCR_RATE_LIMIT');
        if (response.status !== 202) throw fail('Azure analyze request returned HTTP ' + response.status + '.', 'AZURE_OCR_HTTP_ERROR', { httpStatus: response.status });
        const operationUrl = safeOperationUrl(response.headers?.get?.('operation-location'), normalizedEndpoint);
        if (!operationUrl) throw fail('Azure returned a missing or unapproved Operation-Location URL.', 'AZURE_OCR_OPERATION_URL_BLOCKED');
        operationId = new URL(operationUrl).pathname.split('/').filter(Boolean).pop() || null;

        let payload = null;
        let polls = 0;
        while (polls < Math.max(1, Math.min(60, Number(maxPolls) || 35)) && Date.now() < deadline) {
            const retryAfter = Number(response.headers?.get?.('retry-after'));
            const waitMs = Math.max(1000, Math.min(5000, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : Number(pollIntervalMs) || 1100));
            await new Promise(resolve => setTimeout(resolve, waitMs));
            if (Date.now() >= deadline) break;
            const poll = await request(operationUrl, { method: 'GET', headers: { 'Ocp-Apim-Subscription-Key': key } });
            if (poll.status === 429) throw fail('Azure result polling was rate limited; no automatic retry was attempted.', 'AZURE_OCR_RATE_LIMIT');
            if (!poll.ok) throw fail('Azure result poll returned HTTP ' + poll.status + '.', 'AZURE_OCR_HTTP_ERROR', { httpStatus: poll.status });
            payload = await readJsonBounded(poll);
            polls++;
            const status = String(payload?.status || '').toLowerCase();
            if (status === 'succeeded') {
                const parsed = flattenReadResult(payload);
                return {
                    provider: 'azure-document-intelligence',
                    model: MODEL_ID,
                    apiVersion: API_VERSION,
                    status: 'success',
                    sourceSha256,
                    originalScreenshotSha256: sourceSha256,
                    inputSha256: sourceSha256,
                    providerInputSha256: sourceSha256,
                    mimeType,
                    inputBytes: imageBuffer.length,
                    text: parsed.text,
                    lines: parsed.lines,
                    pages: parsed.pages,
                    pageCount: parsed.pageCount,
                    pollCount: polls,
                    httpRequestCount,
                    providerRequestIds,
                    operationId,
                    startedAt: new Date(startedAt).toISOString(),
                    completedAt: new Date().toISOString(),
                    elapsedMs: Date.now() - startedAt,
                };
            }
            if (status === 'failed' || status === 'canceled') {
                throw fail('Azure analysis finished with status ' + status + '.', 'AZURE_OCR_ANALYSIS_FAILED');
            }
        }
        throw fail('Azure analysis did not complete within the configured polling budget.', 'AZURE_OCR_TIMEOUT');
    } catch (error) {
        const wrapped = error?.code ? error : controller.signal.aborted || error?.name === 'AbortError'
            ? fail('Azure analysis timed out.', 'AZURE_OCR_TIMEOUT')
            : fail('Azure request failed: ' + String(error?.message || error).slice(0, 220), 'AZURE_OCR_NETWORK_ERROR');
        wrapped.httpRequestCount = httpRequestCount;
        wrapped.providerRequestIds = providerRequestIds;
        wrapped.operationId = operationId;
        throw wrapped;
    } finally { clearTimeout(timer); }
}

module.exports = {
    API_VERSION, MODEL_ID, MAX_FREE_FILE_BYTES, DEFAULT_MONTHLY_LIMIT,
    safeEndpoint, safeOperationUrl, detectMime, readJsonBounded, normalizePolygon, flattenReadResult, recognizeImage,
};

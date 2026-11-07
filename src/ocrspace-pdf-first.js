'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const { recognizeCrop, MAX_FREE_FILE_BYTES, safeSearchablePdfUrl } = require('./ocrspace-client');
const { OcrSpaceQuotaLedger } = require('./ocrspace-quota-ledger');
const imageProcessor = require('./image-processor');

const MAX_SEARCHABLE_PDF_BYTES = 25 * 1024 * 1024;
const APPROVED_PDF_HOSTS = new Set(['api.ocr.space', 'ocr.space']);

function fail(message, code) {
    const error = new Error(message);
    error.code = code;
    return error;
}

async function readPdfBounded(response, maxBytes = MAX_SEARCHABLE_PDF_BYTES) {
    const declared = Number(response.headers?.get?.('content-length'));
    if (Number.isFinite(declared) && declared > maxBytes) throw fail('OCR.Space PDF exceeds the download size limit.', 'OCRSPACE_PDF_TOO_LARGE');
    if (response.body?.getReader) {
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
                    throw fail('OCR.Space PDF exceeds the download size limit.', 'OCRSPACE_PDF_TOO_LARGE');
                }
                chunks.push(chunk);
            }
        } finally { try { reader.releaseLock(); } catch {} }
        return Buffer.concat(chunks, total);
    }
    throw fail('OCR.Space PDF response does not support bounded streaming; refusing an unbounded body read.', 'OCRSPACE_PDF_STREAM_UNAVAILABLE');
}

async function downloadSearchablePdf(url, { fetchImpl = globalThis.fetch, timeoutMs = 45000 } = {}) {
    const safeUrl = safeSearchablePdfUrl(url);
    if (!safeUrl) throw fail('OCR.Space returned an unapproved searchable-PDF URL.', 'OCRSPACE_PDF_URL_BLOCKED');
    if (!APPROVED_PDF_HOSTS.has(new URL(safeUrl).hostname)) throw fail('OCR.Space PDF host is not allowlisted.', 'OCRSPACE_PDF_URL_BLOCKED');
    if (typeof fetchImpl !== 'function') throw fail('Fetch is unavailable for OCR.Space PDF download.', 'OCRSPACE_FETCH_UNAVAILABLE');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.max(1000, Math.min(60000, Number(timeoutMs) || 45000)));
    try {
        const response = await fetchImpl(safeUrl, { method: 'GET', redirect: 'error', signal: controller.signal });
        if (response.redirected || (response.url && response.url !== safeUrl)) throw fail('OCR.Space PDF download redirected; rejected.', 'OCRSPACE_PDF_REDIRECT_BLOCKED');
        if (!response.ok) throw fail(`OCR.Space PDF download failed with HTTP ${response.status}.`, 'OCRSPACE_PDF_DOWNLOAD_FAILED');
        const pdf = await readPdfBounded(response);
        if (pdf.subarray(0, 5).toString('ascii') !== '%PDF-') throw fail('OCR.Space PDF response did not contain a PDF document.', 'OCRSPACE_INVALID_PDF');
        return pdf;
    } catch (error) {
        if (error?.code) throw error;
        if (controller.signal.aborted || error?.name === 'AbortError') throw fail('OCR.Space PDF download timed out.', 'OCRSPACE_PDF_TIMEOUT');
        throw fail('OCR.Space PDF download failed: ' + String(error?.message || error).slice(0, 200), 'OCRSPACE_PDF_DOWNLOAD_FAILED');
    } finally { clearTimeout(timer); }
}

/**
 * OCR.Space Engine 2 produces a searchable-PDF derivative from the original
 * screenshot. The PDF/raster is retained as separate evidence; Azure and every
 * local reader must still receive the same original screenshot bytes. Never
 * substitute this derivative for the original source identity.
 */
async function createOcrSpacePdfFirst({ imageBuffer, filename = 'wows-battle.png', env = process.env,
    fetchImpl = globalThis.fetch, client = recognizeCrop, quotaLedger = null,
    prepareUpload = imageProcessor.prepareOcrSpaceUpload,
    downloadPdf = downloadSearchablePdf, renderPdf = imageProcessor.renderSearchablePdfPage,
    readRasterMetadata = imageProcessor.metadata, onProviderRequestStarted = null, now = () => new Date() } = {}) {
    const apiKey = String(env.OCRSPACE_API_KEY || '').trim();
    if (!apiKey) return { status: 'blocked', reason: 'OCRSPACE_API_KEY is not configured', requests: 0 };
    if (!Buffer.isBuffer(imageBuffer) || !imageBuffer.length) throw fail('Source screenshot is empty.', 'OCRSPACE_INVALID_IMAGE');
    const png = imageBuffer.length >= 8 && imageBuffer[0] === 0x89 && imageBuffer.subarray(1, 4).toString('ascii') === 'PNG';
    const jpeg = imageBuffer.length >= 3 && imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8 && imageBuffer[2] === 0xff;
    const bmp = imageBuffer.length >= 2 && imageBuffer.subarray(0, 2).toString('ascii') === 'BM';
    const supported = png || jpeg || bmp;
    const upload = imageBuffer.length <= MAX_FREE_FILE_BYTES && supported
        ? { buffer: imageBuffer, filename, mimeType: png ? 'image/png' : jpeg ? 'image/jpeg' : 'image/bmp',
            bytes: imageBuffer.length, resized: false }
        : await prepareUpload(imageBuffer, MAX_FREE_FILE_BYTES);
    if (!Buffer.isBuffer(upload.buffer) || !upload.buffer.length || upload.buffer.length > MAX_FREE_FILE_BYTES) {
        throw fail('Prepared OCR.Space source is invalid or exceeds the Free API 1 MiB limit.', 'OCRSPACE_FILE_TOO_LARGE');
    }
    const ledger = quotaLedger || new OcrSpaceQuotaLedger({
        filePath: env.OCRSPACE_QUOTA_PATH || path.join(process.cwd(), 'data', 'ocrspace-quota.json'),
        maxPerDay: env.OCRSPACE_MAX_PER_DAY, maxPerMonth: env.OCRSPACE_MAX_PER_MONTH,
        maxEngine3PerMonth: env.OCRSPACE_MAX_ENGINE3_PER_MONTH,
    });
    const reservation = await ledger.reserve({ engine: 2, now: now() });
    let reservationSubmitted = false;
    if (onProviderRequestStarted !== null && typeof onProviderRequestStarted !== 'function') {
        throw fail('Provider-start checkpoint must be a function.', 'OCRSPACE_INVALID_CHECKPOINT_CALLBACK');
    }
    const sourceSha256 = crypto.createHash('sha256').update(imageBuffer).digest('hex');
    const uploadSha256 = crypto.createHash('sha256').update(upload.buffer).digest('hex');
    let requestCount = 0;
    const providerFetch = async (url, options = {}) => {
        let safeUrl = '[invalid-url]';
        try {
            const parsedUrl = new URL(String(url));
            safeUrl = parsedUrl.origin + parsedUrl.pathname;
        } catch {}
        const details = {
            provider: 'ocr.space', engine: 2,
            method: String(options.method || 'GET').toUpperCase(),
            url: safeUrl, requestIndex: requestCount + 1,
            sourceSha256, originalScreenshotSha256: sourceSha256,
            uploadSha256, providerInputSha256: uploadSha256,
            uploadBytes: upload.buffer.length,
        };
        // This is the actual fetch boundary for both the OCR POST and PDF GET.
        await onProviderRequestStarted?.(details);
        if (!reservationSubmitted && reservation?.reservationId && typeof ledger.markSubmitted === 'function') {
            await ledger.markSubmitted({ reservationId: reservation.reservationId });
            reservationSubmitted = true;
        }
        requestCount++;
        return fetchImpl(url, { ...options, redirect: 'error' });
    };
    try {
    const response = await client({
        apiKey, imageBuffer: upload.buffer, filename: upload.filename || filename,
        mimeType: upload.mimeType || 'image/jpeg', engine: 2, overlayRequired: false,
        detectOrientation: true, isTable: false, scale: true,
        createSearchablePdf: true, searchablePdfHideTextLayer: true,
        timeoutMs: Math.max(1000, Math.min(60000, Number(env.OCRSPACE_PDF_FIRST_TIMEOUT_MS) || 45000)),
        fetchImpl: providerFetch,
    });
    const pdfUrl = safeSearchablePdfUrl(response.searchablePdfUrl);
    if (!pdfUrl) throw fail('OCR.Space Engine 2 did not return SearchablePDFURL; local OCR from the original screenshot is not substituted.', 'OCRSPACE_SEARCHABLE_PDF_MISSING');
    const pdfBuffer = await downloadPdf(pdfUrl, { fetchImpl: providerFetch });
    const rasterBuffer = await renderPdf(pdfBuffer);
    const rasterMetadata = await readRasterMetadata(rasterBuffer);
    if (!reservationSubmitted && reservation?.reservationId && typeof ledger.release === 'function') {
        await ledger.release({ reservationId: reservation.reservationId, reason: 'no_http_request_invoked' });
    }
    return {
        status: 'complete', provider: 'ocr.space', engine: 2,
        quotaReservationStatus: reservationSubmitted ? 'submitted' : reservation?.reservationId ? 'released_no_request' : 'untracked',
        sourceSha256, originalScreenshotSha256: sourceSha256,
        uploadSha256, providerInputSha256: uploadSha256,
        uploadBytes: upload.buffer.length, mimeType: upload.mimeType || 'image/jpeg',
        requests: requestCount, httpRequestCount: requestCount,
        elapsedMs: Number(response.processingTimeMs) || null,
        uploadWidth: upload.width || null, uploadHeight: upload.height || null,
        uploadResized: upload.resized === true, uploadQuality: upload.quality || null,
        pdfBytes: pdfBuffer.length, pdfSha256: crypto.createHash('sha256').update(pdfBuffer).digest('hex'),
        rasterBytes: rasterBuffer.length, rasterSha256: crypto.createHash('sha256').update(rasterBuffer).digest('hex'),
        rasterWidth: rasterMetadata.width, rasterHeight: rasterMetadata.height,
        searchablePdfUrlHost: new URL(pdfUrl).hostname,
        processingTimeMs: Number(response.processingTimeMs) || null,
        providerExitCode: response.exitCode, partial: response.partial === true,
        providerText: String(response.parsedText || '').slice(0, 12000),
        rasterBuffer, pdfBuffer,
    };
    } catch (error) {
        if (!requestCount && !reservationSubmitted && reservation?.reservationId && typeof ledger.release === 'function') {
            await ledger.release({ reservationId: reservation.reservationId, reason: error.code || 'request_not_submitted' }).catch(() => {});
        }
        if (error && typeof error === 'object') {
            error.httpRequestCount = requestCount;
            error.requestCount = requestCount;
            error.quotaReservationStatus = reservationSubmitted ? 'submitted_or_unknown' : reservation?.reservationId ? 'released_or_unreserved' : 'untracked';
        }
        throw error;
    }
}

module.exports = { createOcrSpacePdfFirst, downloadSearchablePdf, readPdfBounded, MAX_SEARCHABLE_PDF_BYTES };

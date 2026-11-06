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
 * OCR.Space Engine 2 is the first OCR operation because the provider's current
 * engine matrix marks searchable-PDF output unsupported for Engine 3.
 * Tesseract/Paddle readers must consume the rasterized PDF page returned here,
 * never the original source image when this stage is configured.
 */
async function createOcrSpacePdfFirst({ imageBuffer, filename = 'wows-battle.png', env = process.env,
    fetchImpl = globalThis.fetch, client = recognizeCrop, quotaLedger = null,
    prepareUpload = imageProcessor.prepareOcrSpaceUpload,
    downloadPdf = downloadSearchablePdf, renderPdf = imageProcessor.renderSearchablePdfPage,
    readRasterMetadata = imageProcessor.metadata, normalizeRaster = imageProcessor.normalizeSearchablePdfPageRaster,
    sourceDimensions = null, onProviderRequestStarted = null, now = () => new Date() } = {}) {
    const apiKey = String(env.OCRSPACE_API_KEY || '').trim();
    if (!apiKey) return { status: 'blocked', reason: 'OCRSPACE_API_KEY is not configured', requests: 0 };
    if (!Buffer.isBuffer(imageBuffer) || !imageBuffer.length) throw fail('Source screenshot is empty.', 'OCRSPACE_INVALID_IMAGE');
    const sourceMetadata = sourceDimensions || await readRasterMetadata(imageBuffer);
    if (!Number.isSafeInteger(Number(sourceMetadata?.width)) || !Number.isSafeInteger(Number(sourceMetadata?.height))
        || Number(sourceMetadata.width) < 1 || Number(sourceMetadata.height) < 1) {
        throw fail('Source screenshot dimensions are unavailable for safe PDF-raster normalization.', 'OCRSPACE_SOURCE_DIMENSIONS_INVALID');
    }
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
    await ledger.reserve({ engine: 2, now: now() });
    // The caller can durably checkpoint the request boundary before any provider
    // bytes are sent. If that checkpoint fails, the provider is not contacted.
    if (onProviderRequestStarted !== null) {
        if (typeof onProviderRequestStarted !== 'function') throw fail('Provider-start checkpoint must be a function.', 'OCRSPACE_INVALID_CHECKPOINT_CALLBACK');
        await onProviderRequestStarted({ engine: 2,
            sourceSha256: crypto.createHash('sha256').update(imageBuffer).digest('hex'),
            uploadSha256: crypto.createHash('sha256').update(upload.buffer).digest('hex'),
            uploadBytes: upload.buffer.length });
    }
    const response = await client({
        apiKey, imageBuffer: upload.buffer, filename: upload.filename || filename,
        mimeType: upload.mimeType || 'image/jpeg', engine: 2, overlayRequired: false,
        detectOrientation: true, isTable: false, scale: true,
        createSearchablePdf: true, searchablePdfHideTextLayer: true,
        timeoutMs: Math.max(1000, Math.min(60000, Number(env.OCRSPACE_PDF_FIRST_TIMEOUT_MS) || 45000)),
        fetchImpl,
    });
    const pdfUrl = safeSearchablePdfUrl(response.searchablePdfUrl);
    if (!pdfUrl) throw fail('OCR.Space Engine 2 did not return SearchablePDFURL; local OCR from the original screenshot is not substituted.', 'OCRSPACE_SEARCHABLE_PDF_MISSING');
    const pdfBuffer = await downloadPdf(pdfUrl, { fetchImpl });
    const pageRasterBuffer = await renderPdf(pdfBuffer);
    const pageRasterMetadata = await readRasterMetadata(pageRasterBuffer);
    const normalized = await normalizeRaster(pageRasterBuffer, {
        sourceWidth: Number(sourceMetadata.width), sourceHeight: Number(sourceMetadata.height), sourceImageBuffer: imageBuffer,
    });
    if (!Buffer.isBuffer(normalized?.buffer) || !normalized.buffer.length
        || normalized.normalization?.method !== 'source-aspect-top-aligned-crop-v1') {
        throw fail('Searchable-PDF raster normalization did not return verified source-aspect metadata.', 'OCRSPACE_PDF_RASTER_NORMALIZATION_FAILED');
    }
    const rasterBuffer = normalized.buffer;
    const rasterMetadata = await readRasterMetadata(rasterBuffer);
    return {
        status: 'complete', provider: 'ocr.space', engine: 2,
        sourceSha256: crypto.createHash('sha256').update(imageBuffer).digest('hex'),
        uploadSha256: crypto.createHash('sha256').update(upload.buffer).digest('hex'),
        uploadBytes: upload.buffer.length, uploadWidth: upload.width || null, uploadHeight: upload.height || null,
        uploadResized: upload.resized === true, uploadQuality: upload.quality || null,
        sourceWidth: Number(sourceMetadata.width), sourceHeight: Number(sourceMetadata.height),
        pdfBytes: pdfBuffer.length, pdfSha256: crypto.createHash('sha256').update(pdfBuffer).digest('hex'),
        pageRasterBytes: pageRasterBuffer.length, pageRasterSha256: crypto.createHash('sha256').update(pageRasterBuffer).digest('hex'),
        pageRasterWidth: pageRasterMetadata.width, pageRasterHeight: pageRasterMetadata.height,
        rasterBytes: rasterBuffer.length, rasterSha256: crypto.createHash('sha256').update(rasterBuffer).digest('hex'),
        rasterWidth: rasterMetadata.width, rasterHeight: rasterMetadata.height,
        rasterNormalization: normalized.normalization, rasterSourceSimilarity: normalized.similarity,
        searchablePdfUrlHost: new URL(pdfUrl).hostname,
        processingTimeMs: Number(response.processingTimeMs) || null,
        providerExitCode: response.exitCode, partial: response.partial === true,
        providerText: String(response.parsedText || '').slice(0, 12000),
        rasterBuffer, pdfBuffer,
    };
}

module.exports = { createOcrSpacePdfFirst, downloadSearchablePdf, readPdfBounded, MAX_SEARCHABLE_PDF_BYTES };

'use strict';
const path = require('node:path');
const { recognizeCrop, MAX_FREE_FILE_BYTES } = require('./ocrspace-client');
const { OcrSpaceQuotaLedger } = require('./ocrspace-quota-ledger');
function isEnabled(v) { return String(v || '').trim() === '1'; }
function parseCropCap(v) { const n = Number(v); return Number.isFinite(n) ? Math.max(1, Math.min(7, Math.floor(n))) : 2; }
/** Sends only pre-localized crops. Returned text stays separate from all exact-value candidate lists. */
async function collectOcrSpaceFieldEvidence({ env = process.env, cropPlan = [], buildCrop, fetchImpl = globalThis.fetch,
    quotaLedger = null, client = recognizeCrop, now = () => new Date() }) {
    if (!isEnabled(env.OCRSPACE_ENABLED)) return { status: 'disabled', reason: 'OCRSPACE_ENABLED is not 1', requests: 0, evidence: [] };
    const apiKey = String(env.OCRSPACE_API_KEY || '').trim();
    if (!apiKey) return { status: 'disabled', reason: 'OCRSPACE_API_KEY is not configured', requests: 0, evidence: [] };
    if (typeof buildCrop !== 'function') return { status: 'skipped', reason: 'crop builder unavailable', requests: 0, evidence: [] };
    const max = parseCropCap(env.OCRSPACE_MAX_CROPS);
    const budget = Math.max(1000, Math.min(30000, Number(env.OCRSPACE_STAGE_BUDGET_MS) || 20000));
    const started = Date.now();
    const ledger = quotaLedger || new OcrSpaceQuotaLedger({
        filePath: env.OCRSPACE_QUOTA_PATH || path.join(process.cwd(), 'data', 'ocrspace-quota.json'),
        maxPerDay: env.OCRSPACE_MAX_PER_DAY, maxPerMonth: env.OCRSPACE_MAX_PER_MONTH,
        maxEngine3PerMonth: env.OCRSPACE_MAX_ENGINE3_PER_MONTH,
    });
    const evidence = []; let requests = 0; let stoppedReason = null;
    for (const spec of (Array.isArray(cropPlan) ? cropPlan : []).slice(0, max)) {
        if (Date.now() - started >= budget) { stoppedReason = 'stage time budget exhausted'; break; }
        if (!spec || !spec.field || ![2, 3].includes(Number(spec.engine || 2)) || !spec.rect) continue;
        let cropBytes = null;
        try {
            const image = await buildCrop(spec);
            if (!Buffer.isBuffer(image) || !image.length) throw Object.assign(new Error('Crop builder returned no image.'), { code: 'OCRSPACE_INVALID_CROP' });
            cropBytes = image.length;
            if (image.length > MAX_FREE_FILE_BYTES) throw Object.assign(new Error('Localized crop exceeds OCR.space Free API 1 MB limit.'), { code: 'OCRSPACE_FILE_TOO_LARGE' });
            await ledger.reserve({ engine: Number(spec.engine || 2), now: now() });
            requests += 1;
            const result = await client({ apiKey, imageBuffer: image, filename: String(spec.field).replace(/[^a-z0-9_-]/gi, '_') + '.png',
                mimeType: 'image/png', engine: Number(spec.engine || 2), overlayRequired: Number(spec.engine || 2) === 2,
                timeoutMs: Math.min(15000, Math.max(1000, budget - (Date.now() - started))), fetchImpl });
            evidence.push({ field: String(spec.field), source: String(spec.source || 'localized-crop'), engine: result.engine,
                status: 'success', text: result.parsedText, overlay: result.overlay, partial: result.partial,
                providerConfidence: null, processingTimeMs: result.processingTimeMs, cropBytes, rect: { ...spec.rect } });
        } catch (error) {
            evidence.push({ field: String(spec.field || 'unknown'), source: String(spec.source || 'localized-crop'),
                engine: Number(spec.engine || 2), status: 'error', code: String(error && error.code || 'OCRSPACE_UNKNOWN_ERROR'),
                message: String(error && error.message || error).slice(0, 300), providerConfidence: null, cropBytes,
                rect: spec.rect ? { ...spec.rect } : null });
            if (['OCRSPACE_QUOTA_EXHAUSTED', 'OCRSPACE_QUOTA_LOCKED', 'OCRSPACE_QUOTA_LEDGER_CORRUPT'].includes(error && error.code)) {
                stoppedReason = error.code; break;
            }
        }
    }
    return { status: evidence.some(x => x.status === 'success') ? 'complete' : evidence.length ? 'failed' : 'skipped',
        reason: stoppedReason, enabled: true, requests, evidence,
        disclaimer: 'OCR.space text and overlays are isolated diagnostic evidence only; they are not merged into Tesseract/Paddle candidates and cannot accept or change mandatory fields.' };
}
module.exports = { collectOcrSpaceFieldEvidence, parseCropCap };

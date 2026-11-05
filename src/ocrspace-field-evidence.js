'use strict';
const path = require('node:path');
const { recognizeCrop, MAX_FREE_FILE_BYTES } = require('./ocrspace-client');
const { OcrSpaceQuotaLedger } = require('./ocrspace-quota-ledger');
const ALLOWED_REMOTE_FIELDS = new Set(['xp', 'freeXp', 'credits', 'damage', 'result', 'battleMetadata', 'rewardBand']);
const ALLOWED_REMOTE_SOURCES = new Set(['localized-reward-column', 'localized-damage-column', 'localized-result-title', 'localized-battle-metadata', 'opencv-result-title', 'opencv-battle-metadata', 'opencv-reward-band', 'opencv-damage']);
function getOcrSpaceActivation(env = {}) {
    const setting = String(env.OCRSPACE_ENABLED ?? '').trim();
    const apiKeyConfigured = Boolean(String(env.OCRSPACE_API_KEY || '').trim());
    const validSetting = setting === '' || setting === '1' || setting === '0';
    const enabled = validSetting && setting !== '0' && apiKeyConfigured;
    const reason = !validSetting ? 'OCRSPACE_ENABLED must be 0 or 1 when explicitly set'
        : setting === '0' ? 'OCRSPACE_ENABLED is explicitly disabled'
            : !apiKeyConfigured ? 'OCRSPACE_API_KEY is not configured' : null;
    return {
        enabled, defaultEnabled: true, setting: setting || 'default-on',
        explicitlyEnabled: setting === '1', explicitlyDisabled: setting === '0',
        apiKeyConfigured, reason,
    };
}
function isEnabled(v, apiKey) {
    return getOcrSpaceActivation({ OCRSPACE_ENABLED: v, OCRSPACE_API_KEY: apiKey }).enabled;
}
function parseCropCap(v) { const n = Number(v); return Number.isFinite(n) ? Math.max(1, Math.min(7, Math.floor(n))) : 2; }
function isEligibleCrop(spec) {
    if (!spec || !ALLOWED_REMOTE_FIELDS.has(String(spec.field || ''))) return false;
    if (!ALLOWED_REMOTE_SOURCES.has(String(spec.source || ''))) return false;
    if (Number(spec.engine || 3) !== 3) return false;
    const r = spec.rect;
    return Boolean(r && Number.isFinite(Number(r.left)) && Number.isFinite(Number(r.top)) &&
        Number.isFinite(Number(r.width)) && Number.isFinite(Number(r.height)) &&
        Number(r.left) >= 0 && Number(r.top) >= 0 && Number(r.width) >= 8 && Number(r.height) >= 6);
}
/** Sends only allowlisted, pre-localized, non-identifying crops. Evidence never joins accepted candidates. */
async function collectOcrSpaceFieldEvidence({ env = process.env, cropPlan = [], buildCrop, fetchImpl = globalThis.fetch,
    quotaLedger = null, client = recognizeCrop, now = () => new Date() }) {
    const apiKey = String(env.OCRSPACE_API_KEY || '').trim();
    const activation = getOcrSpaceActivation(env);
    if (!activation.enabled) {
        return { status: 'disabled', reason: activation.reason, enabled: false, activation, requests: 0, evidence: [] };
    }
    if (typeof buildCrop !== 'function') return { status: 'skipped', reason: 'crop builder unavailable', requests: 0, evidence: [] };
    const max = parseCropCap(env.OCRSPACE_MAX_CROPS);
    const eligiblePlan = (Array.isArray(cropPlan) ? cropPlan : []).filter(isEligibleCrop).slice(0, max);
    if (!eligiblePlan.length) return { status: 'skipped', reason: 'no allowlisted non-identifying field crops remain unresolved', enabled: true, requests: 0, evidence: [] };
    const budget = Math.max(1000, Math.min(30000, Number(env.OCRSPACE_STAGE_BUDGET_MS) || 20000));
    const started = Date.now();
    const ledger = quotaLedger || new OcrSpaceQuotaLedger({
        filePath: env.OCRSPACE_QUOTA_PATH || path.join(process.cwd(), 'data', 'ocrspace-quota.json'),
        maxPerDay: env.OCRSPACE_MAX_PER_DAY, maxPerMonth: env.OCRSPACE_MAX_PER_MONTH,
        maxEngine3PerMonth: env.OCRSPACE_MAX_ENGINE3_PER_MONTH,
    });
    const evidence = []; let requests = 0; let stoppedReason = null;
    for (const spec of eligiblePlan) {
        if (Date.now() - started >= budget) { stoppedReason = 'stage time budget exhausted'; break; }
        let cropBytes = null;
        try {
            const image = await buildCrop(spec);
            if (!Buffer.isBuffer(image) || !image.length) throw Object.assign(new Error('Crop builder returned no image.'), { code: 'OCRSPACE_INVALID_CROP' });
            cropBytes = image.length;
            if (image.length > MAX_FREE_FILE_BYTES) throw Object.assign(new Error('Localized crop exceeds OCR.space Free API 1 MB limit.'), { code: 'OCRSPACE_FILE_TOO_LARGE' });
            await ledger.reserve({ engine: 3, now: now() });
            requests += 1;
            const requestOptions = { apiKey, imageBuffer: image, filename: String(spec.field).replace(/[^a-z0-9_-]/gi, '_') + '.png',
                mimeType: 'image/png', engine: 3, overlayRequired: false, detectOrientation: true,
                isTable: spec.isTable === true, scale: spec.scale !== false,
                createSearchablePdf: true, searchablePdfHideTextLayer: false,
                timeoutMs: Math.min(20000, Math.max(1000, budget - (Date.now() - started))), fetchImpl };
            const result = await client(requestOptions);
            let searchablePdfUrl = result.searchablePdfUrl || null;
            let pdfStatus = searchablePdfUrl ? 'created-by-engine3' : 'engine3-did-not-return-pdf';
            let pdfError = null;
            if (!searchablePdfUrl) {
                try {
                    await ledger.reserve({ engine: 2, now: now() });
                    requests += 1;
                    const pdfResult = await client({ ...requestOptions, engine: 2, overlayRequired: false,
                        timeoutMs: Math.min(10000, Math.max(1000, budget - (Date.now() - started))) });
                    searchablePdfUrl = pdfResult.searchablePdfUrl || null;
                    pdfStatus = searchablePdfUrl ? 'created-by-engine2-pdf-fallback' : 'provider-returned-no-pdf-url';
                } catch (error) {
                    pdfStatus = 'pdf-generation-failed';
                    pdfError = { code: String(error && error.code || 'OCRSPACE_PDF_ERROR'),
                        message: String(error && error.message || error).slice(0, 240) };
                    if (['OCRSPACE_QUOTA_EXHAUSTED', 'OCRSPACE_QUOTA_LOCKED', 'OCRSPACE_QUOTA_LEDGER_CORRUPT'].includes(error && error.code)) stoppedReason = error.code;
                }
            }
            evidence.push({ field: String(spec.field), source: String(spec.source), engine: result.engine || 3,
                status: 'success', text: result.parsedText, overlay: result.overlay, partial: result.partial,
                providerConfidence: null, processingTimeMs: result.processingTimeMs, cropBytes, rect: { ...spec.rect },
                requestProfile: { detectOrientation: true, isTable: spec.isTable === true, scale: spec.scale !== false,
                    searchablePdf: true, visibleTextLayer: true, engine: 3 },
                searchablePdfUrl, searchablePdfStatus: pdfStatus, ...(pdfError ? { searchablePdfError: pdfError } : {}) });
            if (stoppedReason) break;
        } catch (error) {
            evidence.push({ field: String(spec.field), source: String(spec.source), engine: 3, status: 'error',
                code: String(error && error.code || 'OCRSPACE_UNKNOWN_ERROR'),
                message: String(error && error.message || error).slice(0, 300), providerConfidence: null, cropBytes,
                rect: { ...spec.rect } });
            if (['OCRSPACE_QUOTA_EXHAUSTED', 'OCRSPACE_QUOTA_LOCKED', 'OCRSPACE_QUOTA_LEDGER_CORRUPT'].includes(error && error.code)) {
                stoppedReason = error.code; break;
            }
        }
    }
    return { status: evidence.some(x => x.status === 'success') ? 'complete' : evidence.length ? 'failed' : 'skipped',
        reason: stoppedReason, enabled: true, activation, requests, evidence,
        disclaimer: 'OCR.space text and overlays are isolated diagnostic evidence only; they are not merged into Tesseract/Paddle candidates and cannot accept or change mandatory fields.' };
}
module.exports = { collectOcrSpaceFieldEvidence, parseCropCap, isEnabled, getOcrSpaceActivation, isEligibleCrop, ALLOWED_REMOTE_FIELDS, ALLOWED_REMOTE_SOURCES };

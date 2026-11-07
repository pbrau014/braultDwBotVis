'use strict';

const crypto = require('node:crypto');
const path = require('node:path');
const { createOcrSpacePdfFirst } = require('./ocrspace-pdf-first');
const { AzureDocumentIntelligenceQuotaLedger } = require('./azure-document-intelligence-quota-ledger');
const { recognizeImage } = require('./azure-document-intelligence-client');

function enabled(value) { return String(value ?? '').trim() === '1'; }

function getMultiProviderActivation(env = process.env) {
    const multiProviderExplicit = enabled(env.DWBOT_MULTI_PROVIDER_ENABLED);
    const requested = multiProviderExplicit;
    const ocrSpaceKeyConfigured = Boolean(String(env.OCRSPACE_API_KEY || '').trim());
    const ocrSpaceExplicit = enabled(env.OCRSPACE_ENABLED);
    const azureKeyConfigured = Boolean(String(env.AZURE_DOCUMENT_INTELLIGENCE_KEY || '').trim());
    const azureEndpointConfigured = Boolean(String(env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT || '').trim());
    const azureExplicit = enabled(env.AZURE_DOCUMENT_INTELLIGENCE_ENABLED);
    const azureFreeTierAttested = String(env.AZURE_DOCUMENT_INTELLIGENCE_TIER || '').trim().toUpperCase() === 'F0';
    const providers = {
        ocrSpace: { requested: requested && ocrSpaceExplicit, enabled: multiProviderExplicit && ocrSpaceExplicit && ocrSpaceKeyConfigured,
            reason: !multiProviderExplicit ? 'DWBOT_MULTI_PROVIDER_ENABLED must be 1' : !ocrSpaceExplicit ? 'OCRSPACE_ENABLED must be 1' : !ocrSpaceKeyConfigured ? 'OCRSPACE_API_KEY is missing' : null },
        azure: { requested: requested && azureExplicit, enabled: multiProviderExplicit && azureExplicit && azureKeyConfigured && azureEndpointConfigured && azureFreeTierAttested,
            reason: !multiProviderExplicit ? 'DWBOT_MULTI_PROVIDER_ENABLED must be 1' : !azureExplicit ? 'AZURE_DOCUMENT_INTELLIGENCE_ENABLED must be 1' : !azureKeyConfigured ? 'AZURE_DOCUMENT_INTELLIGENCE_KEY is missing' : !azureEndpointConfigured ? 'AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT is missing' : !azureFreeTierAttested ? 'AZURE_DOCUMENT_INTELLIGENCE_TIER must explicitly attest F0; verify the resource SKU in Azure before enabling' : null },
    };
    return { requested, enabled: requested && providers.ocrSpace.enabled && providers.azure.enabled, multiProviderExplicit, providers };
}

async function runMultiProviderOcr({
    imageBuffer,
    filename = 'wows-battle-source.png',
    env = process.env,
    fetchImpl = globalThis.fetch,
    ocrSpaceRunner = createOcrSpacePdfFirst,
    azureRunner = recognizeImage,
    azureQuotaLedger = null,
    onProviderRequestStarted = null,
    now = () => new Date(),
} = {}) {
    if (!Buffer.isBuffer(imageBuffer) || !imageBuffer.length) throw new Error('Multi-provider OCR requires the original screenshot bytes.');
    const sourceSha256 = crypto.createHash('sha256').update(imageBuffer).digest('hex');
    const activation = getMultiProviderActivation(env);
    const providerState = {};
    const jobs = [];

    if (!activation.requested) {
        return { status: 'not_requested', requested: false, sourceSha256, activation, providers: {
            ocrSpace: { status: 'not_requested', requests: 0 },
            azure: { status: 'not_requested', requests: 0 },
        } };
    }

    if (activation.providers.ocrSpace.enabled) {
        let requestStarted = false;
        let requestCount = 0;
        jobs.push((async () => {
            const value = await ocrSpaceRunner({
                imageBuffer, filename, env, fetchImpl,
                onProviderRequestStarted: async details => {
                    await onProviderRequestStarted?.({ ...details, provider: 'ocr.space' });
                    requestCount = Number(details.requestIndex) || (requestCount + 1);
                    requestStarted = true;
                },
                now,
            });
            if (value?.status !== 'complete') throw Object.assign(new Error(value?.reason || 'OCR.Space did not complete.'), { code: 'OCRSPACE_MULTI_PROVIDER_INCOMPLETE' });
            return {
                provider: 'ocr.space', status: 'success',
                sourceSha256, originalScreenshotSha256: sourceSha256,
                // OCR.Space receives the prepared upload, not necessarily the
                // original screenshot. Keep those identities separate.
                inputSha256: value.uploadSha256 || null,
                providerInputSha256: value.uploadSha256 || null,
                uploadSha256: value.uploadSha256 || null,
                engine: value.engine || 2,
                text: String(value.providerText || ''),
                searchablePdfSha256: value.pdfSha256 || null,
                rasterSha256: value.rasterSha256 || null,
                uploadBytes: Number(value.uploadBytes) || null,
                pdfBytes: Number(value.pdfBytes) || null,
                rasterBytes: Number(value.rasterBytes) || null,
                mimeType: value.mimeType || null,
                requestCount: Number(value.requestCount ?? value.requests) || requestCount,
                httpRequestCount: Number(value.httpRequestCount ?? value.requests) || requestCount,
                elapsedMs: Number(value.elapsedMs) || null,
                raw: value,
            };
        })().then(value => { providerState.ocrSpace = value; }).catch(error => {
            providerState.ocrSpace = {
                provider: 'ocr.space', status: 'failed', sourceSha256,
                requestCount: Number(error.requestCount ?? error.httpRequestCount) || requestCount,
                httpRequestCount: Number(error.httpRequestCount) || requestCount,
                errorCode: error.code || 'OCRSPACE_ERROR', error: String(error.message || error).slice(0, 300),
            };
        }));
    } else {
        providerState.ocrSpace = { provider: 'ocr.space', status: 'blocked', sourceSha256, requestCount: 0, reason: activation.providers.ocrSpace.reason };
    }

    if (activation.providers.azure.enabled) {
        let requestStarted = false;
        let ledger = azureQuotaLedger || null;
        let reservation = null;
        jobs.push((async () => {
            ledger = ledger || new AzureDocumentIntelligenceQuotaLedger({
                filePath: env.AZURE_DOCUMENT_INTELLIGENCE_QUOTA_PATH || path.join(process.cwd(), 'data', 'azure-document-intelligence-quota.json'),
                maxPerMonth: env.AZURE_DOCUMENT_INTELLIGENCE_MAX_PER_MONTH,
            });
            reservation = await ledger.reserve({ pages: 1, now: now() });
            const value = await azureRunner({
                imageBuffer, endpoint: env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT,
                apiKey: env.AZURE_DOCUMENT_INTELLIGENCE_KEY, fetchImpl,
                timeoutMs: env.AZURE_DOCUMENT_INTELLIGENCE_TIMEOUT_MS,
                onRequestStarted: async details => {
                    await onProviderRequestStarted?.(details);
                    if (reservation?.reservationId && typeof ledger.markSubmitted === 'function') {
                        await ledger.markSubmitted({ reservationId: reservation.reservationId });
                    }
                    requestStarted = true;
                },
                beforeRequest: async details => {
                    const slot = await ledger.reserveRequestSlot();
                    if (slot.waitMs > 0) await new Promise(resolve => setTimeout(resolve, slot.waitMs));
                    return slot;
                },
            });
            providerState.azure = {
                ...value,
                originalScreenshotSha256: sourceSha256,
                providerInputSha256: value.inputSha256 || sourceSha256,
                requestCount: Number(value.httpRequestCount) || 0,
            };
        })().catch(async error => {
            if (reservation?.reservationId && !requestStarted && typeof ledger?.release === 'function') {
                await ledger.release({ reservationId: reservation.reservationId, reason: error.code || 'request_not_submitted' }).catch(() => {});
            }
            providerState.azure = {
                provider: 'azure-document-intelligence', status: 'failed', sourceSha256,
                requestCount: Number(error.httpRequestCount) || (requestStarted ? 1 : 0),
                httpRequestCount: Number(error.httpRequestCount) || (requestStarted ? 1 : 0),
                quotaReservationStatus: requestStarted ? 'submitted_or_unknown' : 'released_or_unreserved',
                errorCode: error.code || 'AZURE_OCR_ERROR', error: String(error.message || error).slice(0, 300),
            };
        }));
    } else {
        providerState.azure = { provider: 'azure-document-intelligence', status: 'blocked', sourceSha256, requestCount: 0, reason: activation.providers.azure.reason };
    }

    await Promise.all(jobs);
    const complete = ['ocrSpace', 'azure'].every(key => providerState[key]?.status === 'success');
    return {
        status: complete ? 'complete' : 'incomplete',
        requested: true,
        sourceSha256,
        activation,
        providers: providerState,
        disclaimer: 'Provider OCR is independent evidence, not ground truth. Remote candidates never directly authorize a battle-record field.',
    };
}

module.exports = { getMultiProviderActivation, runMultiProviderOcr };

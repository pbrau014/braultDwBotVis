'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

// Load local environment before installing the guard. The guard must be active
// before bot/provider modules are loaded so their first network request is gated.
require('dotenv').config();
if (process.env.OCR_NON_OCR_NETWORK_RESTRICTED === '1') {
    require('./block-network');
}
const bot = require('../src/bot');

async function main() {
    const root = path.resolve(__dirname, '..');
    const relativeImage = String(process.env.DWBOT_MULTI_PROVIDER_IMAGE_PATH || 'fixtures/four-screenshots/asashio-defeat.jpg').trim();
    const imagePath = path.resolve(root, relativeImage);
    if (imagePath !== root && !imagePath.startsWith(root + path.sep)) {
        throw new Error('Live provider smoke test image must be inside the checked-out repository.');
    }
    const imageBuffer = await fs.readFile(imagePath);
    const sourceSha256 = crypto.createHash('sha256').update(imageBuffer).digest('hex');
    let output;
    try {
        output = await bot.extractText(imageBuffer);
    } finally {
        await bot.terminateOcrWorker().catch(() => {});
    }
    const result = output?.fields?.multiProviderOcr || { status: 'missing-provider-evidence', requested: false, providers: {} };
    const validationAttempt = output?.attempts?.[output.attempts.length - 1] || { text: '' };
    const validation = bot.validateWorldOfWarshipsScreenshot(validationAttempt, output?.fields || {});
    const local = output?.fields?.parallelLocalReaders || { status: 'missing-local-reader-evidence', readers: {} };
    const providers = {};
    for (const [key, value] of Object.entries(result.providers || {})) {
        providers[key] = {
            provider: value.provider || key,
            status: value.status,
            requestCount: value.requestCount ?? value.requests ?? 0,
            httpRequestCount: value.httpRequestCount ?? 0,
            quotaReservationStatus: value.quotaReservationStatus || null,
            model: value.model || null,
            apiVersion: value.apiVersion || null,
            rawText: String(value.text || value.raw?.providerText || '').slice(0, 12000),
            providerNativeLines: Array.isArray(value.lines) ? value.lines.slice(0, 10000) : [],
            engine: value.engine || null,
            sourceSha256: value.originalScreenshotSha256 || value.sourceSha256 || sourceSha256,
            originalScreenshotSha256: value.originalScreenshotSha256 || value.sourceSha256 || sourceSha256,
            inputSha256: value.providerInputSha256 || value.inputSha256 || null,
            providerInputSha256: value.providerInputSha256 || value.inputSha256 || null,
            searchablePdfSha256: value.searchablePdfSha256 || value.pdfSha256 || null,
            rasterSha256: value.rasterSha256 || null,
            uploadSha256: value.uploadSha256 || null,
            uploadBytes: value.uploadBytes || null,
            pdfBytes: value.pdfBytes || null,
            rasterBytes: value.rasterBytes || null,
            mimeType: value.mimeType || null,
            pageCount: value.pageCount || null,
            elapsedMs: value.elapsedMs || null,
            errorCode: value.errorCode || null,
            error: value.error || null,
            reason: value.reason || null,
        };
    }
    const localReaders = {};
    for (const [key, value] of Object.entries(local.readers || {})) {
        const readerOutput = value.output || {};
        localReaders[key] = {
            engine: value.engine || key,
            status: value.status,
            sourceSha256: value.sourceSha256 || sourceSha256,
            attempts: Array.isArray(readerOutput.attempts) ? readerOutput.attempts.length : null,
            textCharacters: Array.isArray(readerOutput.attempts)
                ? readerOutput.attempts.reduce((sum, attempt) => sum + String(attempt.text || '').length, 0)
                : null,
            rawText: Array.isArray(readerOutput.attempts)
                ? readerOutput.attempts.map(attempt => String(attempt.text || '').slice(0, 12000))
                : [],
            modelManifestSha256: readerOutput.modelManifestSha256 || null,
            errorCode: value.errorCode || null,
            error: value.error || null,
            reason: value.reason || null,
        };
    }
    const report = {
        schemaVersion: 1,
        createdAt: new Date().toISOString(),
        source: { path: path.relative(root, imagePath).replaceAll(path.sep, '/'), bytes: imageBuffer.length, sha256: sourceSha256 },
        status: result.status,
        requested: result.requested,
        activation: result.activation,
        requestEvents: output?.fields?.multiProviderRequestEvents || [],
        providers,
        localReaders: { status: local.status, requested: local.requested || [], readers: localReaders },
        recordReview: {
            acceptedByCurrentApplicationValidator: validation.accepted,
            missingFields: (validation.missing || []).map(item => ({ key: item.key, label: item.label, reason: item.reason })),
            remoteReconciliation: validation.multiProviderReconciliation || null,
            localReaderReconciliation: validation.localReaderReconciliation || null,
            unresolvedFields: validation.unresolvedFields || [],
            checks: validation.checks || [],
            fullRecord: validation.record || null,
        },
        disclaimer: 'Connectivity and evidence-capture smoke test only. Provider participation does not establish OCR accuracy or release acceptance. Restricted egress is enforced at the Node process level only; it is not an OS-level sandbox.',
        networkRestriction: {
            enabled: process.env.OCR_NON_OCR_NETWORK_RESTRICTED === '1',
            guardLoadedBeforeBot: process.env.OCR_NON_OCR_NETWORK_RESTRICTED === '1',
            azureExactHostAllowlistEnabled: process.env.AZURE_DOCUMENT_INTELLIGENCE_NETWORK_ALLOWLIST === '1',
            ocrSpaceExactHostAllowlistEnabled: process.env.OCRSPACE_NETWORK_ALLOWLIST === '1',
        },
    };
    const outDir = path.join(root, 'testdata', 'multi-provider-smoke');
    await fs.mkdir(outDir, { recursive: true });
    const reportPath = path.join(outDir, new Date().toISOString().replace(/[:.]/g, '-') + '-' + sourceSha256.slice(0, 12) + '.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
    process.stdout.write(JSON.stringify({ status: report.status, sourceSha256, providers, reportPath: path.relative(root, reportPath) }, null, 2) + '\n');
    if (result.status !== 'complete' || local.status !== 'complete') process.exitCode = 2;
}

main().catch(error => {
    process.stderr.write(String(error?.stack || error).slice(0, 3000) + '\n');
    process.exitCode = 1;
});

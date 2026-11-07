'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { runMultiProviderOcr } = require('../src/multi-provider-ocr');

async function main() {
    const root = path.resolve(__dirname, '..');
    const relativeImage = String(process.env.DWBOT_MULTI_PROVIDER_IMAGE_PATH || 'fixtures/four-screenshots/asashio-defeat.jpg').trim();
    const imagePath = path.resolve(root, relativeImage);
    if (imagePath !== root && !imagePath.startsWith(root + path.sep)) {
        throw new Error('Live provider smoke test image must be inside the checked-out repository.');
    }
    const imageBuffer = await fs.readFile(imagePath);
    const sourceSha256 = crypto.createHash('sha256').update(imageBuffer).digest('hex');
    const events = [];
    const result = await runMultiProviderOcr({
        imageBuffer,
        filename: path.basename(imagePath),
        onProviderRequestStarted: details => {
            events.push({
                event: 'provider_request_started',
                provider: details.provider,
                model: details.model || null,
                apiVersion: details.apiVersion || null,
                engine: details.engine || null,
                sourceSha256: details.sourceSha256 || sourceSha256,
                uploadSha256: details.uploadSha256 || null,
                inputBytes: details.inputBytes || details.uploadBytes || imageBuffer.length,
                at: new Date().toISOString(),
            });
        },
    });
    const providers = {};
    for (const [key, value] of Object.entries(result.providers || {})) {
        providers[key] = {
            provider: value.provider || key,
            status: value.status,
            requestCount: value.requestCount ?? value.requests ?? 0,
            model: value.model || null,
            apiVersion: value.apiVersion || null,
            engine: value.engine || null,
            sourceSha256: value.sourceSha256 || sourceSha256,
            inputSha256: value.inputSha256 || null,
            searchablePdfSha256: value.searchablePdfSha256 || value.pdfSha256 || null,
            rasterSha256: value.rasterSha256 || null,
            elapsedMs: value.elapsedMs || null,
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
        requestEvents: events,
        providers,
        disclaimer: 'Connectivity smoke test only. Provider participation does not establish OCR accuracy or release acceptance.',
    };
    const outDir = path.join(root, 'testdata', 'multi-provider-smoke');
    await fs.mkdir(outDir, { recursive: true });
    const reportPath = path.join(outDir, new Date().toISOString().replace(/[:.]/g, '-') + '-' + sourceSha256.slice(0, 12) + '.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
    process.stdout.write(JSON.stringify({ status: report.status, sourceSha256, providers, reportPath: path.relative(root, reportPath) }, null, 2) + '\n');
    if (result.status !== 'complete') process.exitCode = 2;
}

main().catch(error => {
    process.stderr.write(String(error?.stack || error).slice(0, 3000) + '\n');
    process.exitCode = 1;
});

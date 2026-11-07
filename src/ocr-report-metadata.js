'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { getOcrSpaceActivation } = require('./ocrspace-field-evidence');
const { getMultiProviderActivation } = require('./multi-provider-ocr');
const { MAX_FREE_FILE_BYTES } = require('./ocrspace-client');

function sha256File(filePath) {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function describeOcrConfiguration(env = process.env) {
    const positiveInteger = (value, fallback) => {
        const parsed = Number(value);
        return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
    };
    const bounded = (value, fallback, ceiling) => Math.max(1, Math.min(ceiling, positiveInteger(value, fallback)));
    const standaloneOcrSpaceActivation = getOcrSpaceActivation(env);
    const activation = getMultiProviderActivation(env);
    const ocrSpace = activation.providers.ocrSpace;
    const azure = activation.providers.azure;
    const ocrSpaceKeyConfigured = standaloneOcrSpaceActivation.apiKeyConfigured;
    const ocrSpaceExplicit = String(env.OCRSPACE_ENABLED || '').trim() === '1';
    const ocrSpaceExplicitlyDisabled = String(env.OCRSPACE_ENABLED || '').trim() === '0';
    const azureKeyConfigured = Boolean(String(env.AZURE_DOCUMENT_INTELLIGENCE_KEY || '').trim());
    const azureEndpointConfigured = Boolean(String(env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT || '').trim());
    const ocrSpaceNetworkEnabled = ocrSpace.enabled && String(env.OCRSPACE_NETWORK_ALLOWLIST || '').trim() === '1';
    const azureNetworkEnabled = azure.enabled && String(env.AZURE_DOCUMENT_INTELLIGENCE_NETWORK_ALLOWLIST || '').trim() === '1';
    const nonOcrNetworkRestricted = String(env.OCR_NON_OCR_NETWORK_RESTRICTED || '').trim() === '1';
    const ocrSequence = ['original-screenshot-input', 'parallel-local-readers-original-image'];
    if (ocrSpace.enabled) ocrSequence.push('ocrspace-engine2-original-screenshot');
    if (azure.enabled) ocrSequence.push('azure-prebuilt-read-original-screenshot');
    if (ocrSpace.enabled) ocrSequence.push('searchable-pdf-download-derivative', 'pdf-page-raster-derivative');
    ocrSequence.push('field-level-reconciliation');
    const networkPolicy = !activation.requested
        ? 'No online providers requested; local readers use the original screenshot'
        : 'Only explicitly enabled providers and exact HTTPS allowlists may access OCR.Space or the configured Azure resource; Node-process guard is not an OS sandbox';
    return {
        engine: String(env.OCR_ENGINE || 'auto').trim().toLowerCase(),
        opencvAssistEnabled: String(env.OCR_CV_ASSIST || '').trim() === '1',
        paddleOcrFieldFallbackEnabled: String(env.PADDLEOCR_FIELD_FALLBACK || '').trim() === '1',
        multiProvider: {
            requested: activation.requested,
            enabled: activation.enabled,
            providers: {
                ocrSpace: { requested: ocrSpace.requested, enabled: ocrSpace.enabled, reason: ocrSpace.reason },
                azure: { requested: azure.requested, enabled: azure.enabled, reason: azure.reason },
            },
        },
        ocrSpaceNetworkEnabled,
        azureNetworkEnabled,
        nonOcrNetworkRestricted,
        networkPolicy,
        imageTimeoutMs: positiveInteger(env.OCR_IMAGE_TIMEOUT_MS, 90_000),
        operationTimeoutMs: positiveInteger(env.OCR_OPERATION_TIMEOUT_MS, 15_000),
        ocrSequence,
        ocrSpace: {
            requested: ocrSpace.requested,
            enabled: ocrSpace.enabled,
            defaultEnabled: false,
            explicitlyEnabled: ocrSpaceExplicit,
            explicitlyDisabled: ocrSpaceExplicitlyDisabled,
            activationReason: standaloneOcrSpaceActivation.reason || ocrSpace.reason,
            apiKeyConfigured: ocrSpaceKeyConfigured,
            networkEnabled: ocrSpaceNetworkEnabled,
            unrelatedEgressRestricted: nonOcrNetworkRestricted,
            allowedHttpsHosts: ocrSpaceNetworkEnabled ? ['api.ocr.space', 'ocr.space'] : [],
            engine: 2,
            requestProfile: {
                detectOrientation: true,
                scale: true,
                tableMode: false,
                searchablePdf: true,
                searchablePdfHideTextLayer: true,
                oneRequestPerImage: true,
                sourceImageFirst: true,
                localReadersUseOriginalScreenshot: true,
                localReadersUsePdfRaster: false,
            },
            limits: {
                maxUploadBytes: MAX_FREE_FILE_BYTES,
                maxPdfBytes: 25 * 1024 * 1024,
                maxPdfPages: 3,
                maxPerDay: bounded(env.OCRSPACE_MAX_PER_DAY, 450, 499),
                maxPerMonth: bounded(env.OCRSPACE_MAX_PER_MONTH, 22_000, 24_999),
            },
        },
        azure: {
            requested: azure.requested,
            enabled: azure.enabled,
            activationReason: azure.reason,
            keyConfigured: azureKeyConfigured,
            endpointConfigured: azureEndpointConfigured,
            networkEnabled: azureNetworkEnabled,
            exactHostAllowlistEnabled: azureNetworkEnabled,
            tierAttested: String(env.AZURE_DOCUMENT_INTELLIGENCE_TIER || '').trim().toUpperCase() === 'F0',
        },
    };
}

function createOcrReportMetadata(root) {
    const packageInfo = require(path.join(root, 'package.json'));
    const { version: tesseractJsVersion } = require(path.join(root, 'node_modules', 'tesseract.js', 'package.json'));
    const { version: tesseractCoreVersion } = require(path.join(root, 'node_modules', 'tesseract.js-core', 'package.json'));
    const { resolveLocalTesseractAssets } = require(path.join(root, 'src', 'ocr-worker'));
    const assets = resolveLocalTesseractAssets('eng');
    const modelPath = path.join(assets.langPath, 'eng.traineddata');
    const sourceFiles = [];
    const walk = relativeDir => {
        const absoluteDir = path.join(root, relativeDir);
        for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
            const relative = path.posix.join(relativeDir.replaceAll(path.sep, '/'), entry.name);
            if (entry.isDirectory()) walk(relative);
            else if (entry.isFile() && !relative.endsWith('.bak')) sourceFiles.push(relative);
        }
    };
    for (const dir of ['src', 'scripts', 'tests']) if (fs.existsSync(path.join(root, dir))) walk(dir);
    sourceFiles.push('package.json', 'package-lock.json');
    const uniqueFiles = [...new Set(sourceFiles)].sort();
    const sourceHash = crypto.createHash('sha256');
    for (const relative of uniqueFiles) {
        sourceHash.update(relative).update('\0').update(fs.readFileSync(path.join(root, relative))).update('\0');
    }
    const assetPaths = [
        { role: 'language-model', path: modelPath },
        { role: 'worker-script', path: assets.workerPath },
        ...['tesseract-core.wasm.js', 'tesseract-core-simd.wasm.js', 'tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js']
            .map(name => ({ role: 'wasm-core', path: path.join(assets.corePath, name) })),
    ];
    return {
        package: { name: packageInfo.name, version: packageInfo.version, engines: packageInfo.engines },
        sourceBuild: { sha256: sourceHash.digest('hex'), files: uniqueFiles.length },
        runtime: { node: process.version, platform: process.platform, arch: process.arch },
        ocrConfiguration: describeOcrConfiguration(),
        engineVersions: { tesseractJs: tesseractJsVersion, tesseractJsCore: tesseractCoreVersion },
        languageModel: fs.existsSync(modelPath) ? { language: 'eng', source: path.relative(root, modelPath), sizeBytes: fs.statSync(modelPath).size, sha256: sha256File(modelPath) } : { language: 'eng', source: path.relative(root, modelPath), exists: false },
        localAssets: assetPaths.map(asset => ({ role: asset.role, path: path.relative(root, asset.path), exists: fs.existsSync(asset.path), ...(fs.existsSync(asset.path) ? { sizeBytes: fs.statSync(asset.path).size, sha256: sha256File(asset.path) } : {}) })),
    };
}

module.exports = { createOcrReportMetadata, describeOcrConfiguration };

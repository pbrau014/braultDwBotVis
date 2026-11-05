'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function sha256File(filePath) {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function describeOcrConfiguration(env = process.env) {
    const positiveInteger = (value, fallback) => {
        const parsed = Number(value);
        return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
    };
    const bounded = (value, fallback, ceiling) => Math.max(1, Math.min(ceiling, positiveInteger(value, fallback)));
    const ocrSpaceKeyConfigured = Boolean(String(env.OCRSPACE_API_KEY || '').trim());
    const ocrSpaceExplicitlyEnabled = String(env.OCRSPACE_ENABLED || '').trim() === '1';
    const ocrSpaceEnabled = ocrSpaceExplicitlyEnabled && ocrSpaceKeyConfigured;
    return {
        engine: String(env.OCR_ENGINE || 'auto').trim().toLowerCase(),
        opencvAssistEnabled: String(env.OCR_CV_ASSIST || '').trim() === '1',
        paddleOcrFieldFallbackEnabled: String(env.PADDLEOCR_FIELD_FALLBACK || '').trim() === '1',
        networkBlockingEnabled: String(env.OCR_NETWORK_BLOCK_ENABLED || '').trim() === '1',
        imageTimeoutMs: positiveInteger(env.OCR_IMAGE_TIMEOUT_MS, 90_000),
        operationTimeoutMs: positiveInteger(env.OCR_OPERATION_TIMEOUT_MS, 15_000),
        ocrSequence: ocrSpaceEnabled
            ? ['opencv-geometry', 'ocrspace-engine3', 'tesseractjs-local', 'ocrspace-diagnostic-reconciliation']
            : ['tesseractjs-local'],
        ocrSpace: {
            enabled: ocrSpaceEnabled,
            explicitlyEnabled: ocrSpaceExplicitlyEnabled,
            apiKeyConfigured: ocrSpaceKeyConfigured,
            engine: 3,
            requestProfile: {
                detectOrientation: true,
                scale: true,
                tableMode: 'rewardBand-only',
                searchablePdf: true,
                searchablePdfHideTextLayer: false,
                explicitTextOverlayResponse: false,
                pdfFallbackEngine: 2,
            },
            limits: {
                maxCrops: bounded(env.OCRSPACE_MAX_CROPS, 2, 7),
                stageBudgetMs: Math.max(1000, Math.min(30_000, positiveInteger(env.OCRSPACE_STAGE_BUDGET_MS, 20_000))),
                maxPerDay: bounded(env.OCRSPACE_MAX_PER_DAY, 450, 499),
                maxPerMonth: bounded(env.OCRSPACE_MAX_PER_MONTH, 22_000, 24_999),
                maxEngine3PerMonth: bounded(env.OCRSPACE_MAX_ENGINE3_PER_MONTH, 900, 999),
            },
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

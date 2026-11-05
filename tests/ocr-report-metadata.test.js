'use strict';
const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createOcrReportMetadata, describeOcrConfiguration } = require('../src/ocr-report-metadata');

test('Windows OCR acceptance wrapper captures native npm stderr without PowerShell error-stream promotion', () => {
    const script = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'run-windows-ocr-acceptance.ps1'), 'utf8');
    assert.match(script, /\$CommandLine='""'\+\$Npm\.Source/);
    assert.match(script, /\$Npm=Get-Command npm\.cmd -ErrorAction Stop/);
    assert.match(script, /Start-Process -FilePath \$env:ComSpec -ArgumentList @\('\/d','\/s','\/c',\$CommandLine\) -Wait -PassThru -NoNewWindow -RedirectStandardOutput \$OutputLog -RedirectStandardError \$ErrorLog/);
    assert.doesNotMatch(script, /& npm\.cmd @Arguments 2> \$ErrorLog \| Tee-Object -FilePath \$OutputLog/);
    assert.match(script, /Get-Content -LiteralPath \$ErrorLog -Raw/);
    assert.match(script, /Remove-Item -LiteralPath \$OutputLog,\$ErrorLog/);
});


test('OCR reports include reproducible build, engine, language-model and local asset identity', () => {
    const metadata = createOcrReportMetadata(path.join(__dirname, '..'));
    assert.equal(metadata.package.version, require('../package.json').version);
    assert.match(metadata.sourceBuild.sha256, /^[a-f0-9]{64}$/);
    assert.ok(metadata.sourceBuild.files > 0);
    assert.equal(metadata.engineVersions.tesseractJs, require('tesseract.js/package.json').version);
    assert.equal(metadata.engineVersions.tesseractJsCore, require('tesseract.js-core/package.json').version);
    assert.equal(metadata.languageModel.language, 'eng');
    assert.match(metadata.languageModel.sha256, /^[a-f0-9]{64}$/);
    assert.ok(metadata.localAssets.length >= 2);
    assert.ok(metadata.localAssets.every(asset => asset.exists && /^[a-f0-9]{64}$/.test(asset.sha256)));
});


test('OCR configuration metadata makes optional engine and network feature flags explicit', () => {
    const defaults = describeOcrConfiguration({});
    assert.equal(defaults.engine, 'auto');
    assert.equal(defaults.opencvAssistEnabled, false);
    assert.equal(defaults.paddleOcrFieldFallbackEnabled, false);
    assert.equal(defaults.networkBlockingEnabled, false);
    assert.equal(defaults.imageTimeoutMs, 90000);
    assert.equal(defaults.operationTimeoutMs, 15000);

    const enabled = describeOcrConfiguration({
        OCR_ENGINE: 'TESSERACTJS',
        OCR_CV_ASSIST: '1',
        PADDLEOCR_FIELD_FALLBACK: '1',
        OCR_NETWORK_BLOCK_ENABLED: '1',
        OCR_IMAGE_TIMEOUT_MS: '120000',
        OCR_OPERATION_TIMEOUT_MS: '9000',
    });
    assert.deepEqual(enabled, {
        engine: 'tesseractjs',
        opencvAssistEnabled: true,
        paddleOcrFieldFallbackEnabled: true,
        networkBlockingEnabled: true,
        imageTimeoutMs: 120000,
        operationTimeoutMs: 9000,
        ocrSequence: ['tesseractjs-local'],
        ocrSpace: {
            enabled: false,
            defaultEnabled: true,
            explicitlyEnabled: false,
            explicitlyDisabled: false,
            activationReason: 'OCRSPACE_API_KEY is not configured',
            apiKeyConfigured: false,
            engine: 3,
            requestProfile: {
                detectOrientation: true, scale: true, tableMode: 'rewardBand-only',
                searchablePdf: true, searchablePdfHideTextLayer: false,
                explicitTextOverlayResponse: false, pdfFallbackEngine: 2,
            },
            limits: { maxCrops: 2, stageBudgetMs: 20000, maxPerDay: 450, maxPerMonth: 22000, maxEngine3PerMonth: 900 },
        },
    });
    assert.equal(describeOcrConfiguration({ OCR_CV_ASSIST: 'true', PADDLEOCR_FIELD_FALLBACK: 'yes' }).opencvAssistEnabled, false);
    assert.equal(describeOcrConfiguration({ OCR_CV_ASSIST: 'true', PADDLEOCR_FIELD_FALLBACK: 'yes' }).paddleOcrFieldFallbackEnabled, false);
});


test('OCR.Space report metadata records the configured request profile without exposing the key', () => {
    const defaults = describeOcrConfiguration({});
    assert.equal(defaults.ocrSpace.enabled, false);
    assert.equal(defaults.ocrSpace.defaultEnabled, true);
    assert.equal(defaults.ocrSpace.explicitlyEnabled, false);
    assert.equal(defaults.ocrSpace.explicitlyDisabled, false);
    assert.equal(defaults.ocrSpace.activationReason, 'OCRSPACE_API_KEY is not configured');
    assert.equal(defaults.ocrSpace.apiKeyConfigured, false);
    assert.equal(defaults.ocrSequence.includes('ocrspace-engine3'), false);

    const keyOnlyDefault = describeOcrConfiguration({ OCRSPACE_API_KEY: 'local-key' });
    assert.equal(keyOnlyDefault.ocrSpace.enabled, true);
    assert.equal(keyOnlyDefault.ocrSpace.defaultEnabled, true);
    assert.equal(keyOnlyDefault.ocrSpace.explicitlyEnabled, false);
    assert.deepEqual(keyOnlyDefault.ocrSequence, ['opencv-geometry', 'ocrspace-engine3', 'tesseractjs-local', 'ocrspace-diagnostic-reconciliation']);
    const explicitlyOff = describeOcrConfiguration({ OCRSPACE_ENABLED: '0', OCRSPACE_API_KEY: 'local-key' });
    assert.equal(explicitlyOff.ocrSpace.enabled, false);
    assert.equal(explicitlyOff.ocrSpace.explicitlyDisabled, true);
    assert.equal(explicitlyOff.ocrSequence.includes('ocrspace-engine3'), false);

    const enabled = describeOcrConfiguration({
        OCRSPACE_ENABLED: '1',
        OCRSPACE_API_KEY: 'never-log-this-secret',
        OCRSPACE_MAX_CROPS: '4',
        OCRSPACE_STAGE_BUDGET_MS: '18000',
    });
    assert.equal(enabled.ocrSpace.enabled, true);
    assert.equal(enabled.ocrSpace.apiKeyConfigured, true);
    assert.deepEqual(enabled.ocrSequence, ['opencv-geometry', 'ocrspace-engine3', 'tesseractjs-local', 'ocrspace-diagnostic-reconciliation']);
    assert.equal(enabled.ocrSpace.engine, 3);
    assert.deepEqual(enabled.ocrSpace.requestProfile, {
        detectOrientation: true, scale: true, tableMode: 'rewardBand-only',
        searchablePdf: true, searchablePdfHideTextLayer: false,
        explicitTextOverlayResponse: false, pdfFallbackEngine: 2,
    });
    assert.equal(enabled.ocrSpace.limits.maxCrops, 4);
    assert.equal(enabled.ocrSpace.limits.stageBudgetMs, 18000);
    assert.equal(JSON.stringify(enabled).includes('never-log-this-secret'), false);
    const bounded = describeOcrConfiguration({ OCRSPACE_ENABLED: '1', OCRSPACE_API_KEY: 'key',
        OCRSPACE_MAX_CROPS: '999', OCRSPACE_STAGE_BUDGET_MS: '999999', OCRSPACE_MAX_PER_DAY: '9999',
        OCRSPACE_MAX_PER_MONTH: '999999', OCRSPACE_MAX_ENGINE3_PER_MONTH: '9999' });
    assert.deepEqual(bounded.ocrSpace.limits, { maxCrops: 7, stageBudgetMs: 30000,
        maxPerDay: 499, maxPerMonth: 24999, maxEngine3PerMonth: 999 });
});

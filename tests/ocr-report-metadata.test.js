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


test('OCR configuration metadata reports explicit primary activation and provider network access', () => {
    const defaults = describeOcrConfiguration({});
    assert.equal(defaults.engine, 'auto');
    assert.equal(defaults.opencvAssistEnabled, false);
    assert.equal(defaults.paddleOcrFieldFallbackEnabled, false);
    assert.equal(defaults.ocrSpaceNetworkEnabled, false);
    assert.equal(defaults.nonOcrNetworkRestricted, false);
    assert.equal(defaults.ocrSpace.enabled, false);
    assert.equal(defaults.ocrSpace.defaultEnabled, false);
    assert.equal(defaults.ocrSpace.explicitlyEnabled, false);
    assert.equal(defaults.ocrSpace.activationReason, 'OCRSPACE_ENABLED must be explicitly set to 1');
    assert.deepEqual(defaults.ocrSequence, ['ocrspace-required-but-blocked-until-explicit-enable-and-key']);

    const enabled = describeOcrConfiguration({
        OCR_ENGINE: 'TESSERACTJS',
        OCR_CV_ASSIST: '1',
        PADDLEOCR_FIELD_FALLBACK: '1',
        OCRSPACE_ENABLED: '1',
        OCRSPACE_API_KEY: 'never-log-this-secret',
        OCRSPACE_NETWORK_ALLOWLIST: '1',
        OCR_NON_OCR_NETWORK_RESTRICTED: '1',
        OCR_IMAGE_TIMEOUT_MS: '120000',
        OCR_OPERATION_TIMEOUT_MS: '9000',
    });
    assert.equal(enabled.engine, 'tesseractjs');
    assert.equal(enabled.ocrSpace.enabled, true);
    assert.equal(enabled.ocrSpace.explicitlyEnabled, true);
    assert.equal(enabled.ocrSpace.networkEnabled, true);
    assert.equal(enabled.ocrSpace.unrelatedEgressRestricted, true);
    assert.equal(enabled.ocrSpaceNetworkEnabled, true);
    assert.equal(enabled.nonOcrNetworkRestricted, true);
    assert.deepEqual(enabled.ocrSequence, ['ocrspace-engine2-source-image', 'searchable-pdf-download', 'pdf-page-raster', 'local-ocr-readers', 'field-validation']);
    assert.deepEqual(enabled.ocrSpace.allowedHttpsHosts, ['api.ocr.space', 'ocr.space']);
    assert.equal(enabled.imageTimeoutMs, 120000);
    assert.equal(enabled.operationTimeoutMs, 9000);
    assert.equal(JSON.stringify(enabled).includes('never-log-this-secret'), false);

    const zero = describeOcrConfiguration({ OCRSPACE_ENABLED: '0', OCRSPACE_API_KEY: 'local-key' });
    assert.equal(zero.ocrSpace.enabled, false);
    assert.equal(zero.ocrSpace.explicitlyDisabled, false);
    assert.equal(zero.ocrSpace.activationReason, 'OCRSPACE_ENABLED must be explicitly set to 1');
    assert.deepEqual(zero.ocrSequence, ['ocrspace-required-but-blocked-until-explicit-enable-and-key']);
});

test('OCR.Space report metadata keeps the required PDF-first request profile', () => {
    const enabled = describeOcrConfiguration({
        OCRSPACE_ENABLED: '1',
        OCRSPACE_API_KEY: 'key',
        OCRSPACE_NETWORK_ALLOWLIST: '1',
        OCR_NON_OCR_NETWORK_RESTRICTED: '1',
        OCRSPACE_MAX_PER_DAY: '400',
        OCRSPACE_MAX_PER_MONTH: '21000',
    });
    assert.deepEqual(enabled.ocrSpace.requestProfile, {
        detectOrientation: true, scale: true, tableMode: false,
        searchablePdf: true, searchablePdfHideTextLayer: true,
        oneRequestPerImage: true, sourceImageFirst: true, localReadersUsePdfRaster: true,
    });
    assert.equal(enabled.ocrSpace.engine, 2);
    assert.equal(enabled.ocrSpace.limits.maxPerDay, 400);
    assert.equal(enabled.ocrSpace.limits.maxPerMonth, 21000);
    const bounded = describeOcrConfiguration({ OCRSPACE_ENABLED: '1', OCRSPACE_API_KEY: 'key',
        OCRSPACE_NETWORK_ALLOWLIST: '1', OCRSPACE_MAX_PER_DAY: '9999', OCRSPACE_MAX_PER_MONTH: '999999' });
    assert.deepEqual(bounded.ocrSpace.limits, { maxUploadBytes: 1048576, maxPdfBytes: 25 * 1024 * 1024,
        maxPdfPages: 3, maxPerDay: 499, maxPerMonth: 24999 });
});

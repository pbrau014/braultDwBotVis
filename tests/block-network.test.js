'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

function evaluateAllowlist(env, urls) {
    const script = [
        "const guard = require(" + JSON.stringify(path.resolve(__dirname, '../scripts/block-network.js')) + ");",
        "process.stdout.write(JSON.stringify(" + JSON.stringify(urls) + ".map(url => guard.providerAllowed(url))));",
    ].join('\n');
    const result = spawnSync(process.execPath, ['-e', script], {
        encoding: 'utf8',
        env: { ...process.env, OCR_NON_OCR_NETWORK_RESTRICTED: '1',
            OCR_NON_OCR_NETWORK_LOG: path.join(require('node:os').tmpdir(), 'dwbot-network-guard-test.log'),
            ...env },
    });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
}

test('network guard allows only explicitly enabled OCR.Space HTTPS hosts', () => {
    assert.deepEqual(evaluateAllowlist({ OCRSPACE_NETWORK_ALLOWLIST: '1' }, [
        'https://api.ocr.space/parse/image', 'https://ocr.space/',
        'http://api.ocr.space/', 'https://api.ocr.space.attacker.test/',
    ]), [true, true, false, false]);
});

test('network guard allows only the exact configured Azure resource endpoint', () => {
    assert.deepEqual(evaluateAllowlist({
        AZURE_DOCUMENT_INTELLIGENCE_NETWORK_ALLOWLIST: '1',
        AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: 'https://dwbot.cognitiveservices.azure.com',
    }, [
        'https://dwbot.cognitiveservices.azure.com/documentintelligence/documentModels/prebuilt-read:analyze',
        'https://other.cognitiveservices.azure.com/',
        'https://dwbot.cognitiveservices.azure.com.attacker.test/',
        'http://dwbot.cognitiveservices.azure.com/',
    ]), [true, false, false, false]);
});

test('network guard denies all OCR providers unless their allowlists are explicitly enabled', () => {
    assert.deepEqual(evaluateAllowlist({}, [
        'https://api.ocr.space/', 'https://dwbot.cognitiveservices.azure.com/',
    ]), [false, false]);
});

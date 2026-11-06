'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const guardPath = path.join(__dirname, '..', 'scripts', 'block-network.js');

function runGuard(restrictNonOcrNetwork, logPath = '') {
    const script = `
        const calls = [];
        globalThis.fetch = async input => {
            calls.push(String(input));
            return { ok: true, url: String(input), redirected: false };
        };
        require(${JSON.stringify(guardPath)});
        (async () => {
            const api = await fetch('https://api.ocr.space/parse/image');
            const pdf = await fetch('https://ocr.space/temp/result.pdf');
            let unrelatedDenied = false;
            try { await fetch('https://example.invalid/collect'); }
            catch (error) { unrelatedDenied = error.code === 'OCR_NETWORK_BLOCKED'; }
            let httpDenied = false;
            try { await fetch('http://api.ocr.space/parse/image'); }
            catch (error) { httpDenied = error.code === 'OCR_NETWORK_BLOCKED'; }
            process.stdout.write(JSON.stringify({ api: api.ok, pdf: pdf.ok, calls, unrelatedDenied, httpDenied }));
        })().catch(error => { process.stderr.write(String(error)); process.exitCode = 1; });
    `;
    const child = spawnSync(process.execPath, ['-e', script], {
        encoding: 'utf8',
        env: {
            ...process.env,
            OCRSPACE_NETWORK_ALLOWLIST: '1',
            OCR_NON_OCR_NETWORK_RESTRICTED: restrictNonOcrNetwork ? '1' : '0',
            OCR_NON_OCR_NETWORK_LOG: logPath,
        },
        timeout: 10000,
    });
    assert.equal(child.status, 0, child.stderr || child.error?.message);
    return JSON.parse(child.stdout);
}

test('OCR.Space HTTPS API and searchable-PDF hosts remain reachable while unrelated egress is restricted', () => {
    const logPath = path.join(os.tmpdir(), `dwbot-network-policy-${process.pid}.log`);
    fs.rmSync(logPath, { force: true });
    const result = runGuard(true, logPath);
    assert.equal(result.api, true);
    assert.equal(result.pdf, true);
    assert.deepEqual(result.calls, ['https://api.ocr.space/parse/image', 'https://ocr.space/temp/result.pdf']);
    assert.equal(result.unrelatedDenied, true);
    assert.equal(result.httpDenied, true);
    const log = fs.readFileSync(logPath, 'utf8');
    assert.ok(log.includes('denied fetch https://example.invalid/collect'));
    assert.ok(log.includes('denied fetch http://api.ocr.space/parse/image'));
    assert.equal(log.trim().split(/\r?\n/).length, 2);
    fs.rmSync(logPath, { force: true });
});

test('the guard does not impose blanket network blocking when unrelated-egress restriction is disabled', () => {
    const result = runGuard(false);
    assert.equal(result.api, true);
    assert.equal(result.pdf, true);
    assert.deepEqual(result.calls, [
        'https://api.ocr.space/parse/image',
        'https://ocr.space/temp/result.pdf',
        'https://example.invalid/collect',
        'http://api.ocr.space/parse/image',
    ]);
    assert.equal(result.unrelatedDenied, false);
    assert.equal(result.httpDenied, false);
});


test('restricted mode refuses to start without a writable diagnostic log', () => {
    const child = spawnSync(process.execPath, ['-e', `require(${JSON.stringify(guardPath)})`], {
        encoding: 'utf8',
        env: { ...process.env, OCRSPACE_NETWORK_ALLOWLIST: '1',
            OCR_NON_OCR_NETWORK_RESTRICTED: '1', OCR_NON_OCR_NETWORK_LOG: '' },
        timeout: 10000,
    });
    assert.notEqual(child.status, 0);
    assert.match(child.stderr, /OCR_NON_OCR_NETWORK_LOG is required/);
});

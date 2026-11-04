'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

test('PaddleOCR benchmark fails closed without local dependencies/models and never tries network', async (t) => {
    const python = process.env.PADDLEOCR_PYTHON_BIN || process.env.OPENCV_PYTHON_BIN || process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
    const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'paddleocr-offline-test-'));
    const output = path.join(temp, 'blocked.json');
    try {
        const exitCode = await new Promise((resolve, reject) => {
            const child = spawn(python, [path.join(__dirname, '..', 'scripts', 'benchmark_paddleocr_local.py'),
                '--manifest', path.join(__dirname, '..', 'testdata', 'additional-screenshot-ground-truth.json'),
                '--images-dir', path.join(__dirname, '..', 'fixtures', 'additional-screenshots'), '--output', output], {
                cwd: path.join(__dirname, '..'),
                env: { ...process.env, PADDLEOCR_DET_MODEL_DIR: path.join(temp, 'no-det-model'), PADDLEOCR_REC_MODEL_DIR: path.join(temp, 'no-rec-model') },
                stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, shell: false,
            });
            let stderr = '';
            child.stderr.on('data', chunk => { stderr += chunk.toString(); });
            child.once('error', reject);
            child.once('close', code => resolve({ code, stderr }));
        });
        assert.equal(exitCode.code, 3, `expected blocked status, stderr: ${exitCode.stderr}`);
        const report = JSON.parse(await fs.readFile(output, 'utf8'));
        assert.equal(report.status, 'blocked');
        assert.equal(report.networkAttemptCount, 0);
        assert.match(report.networkPolicy, /socket connections blocked/);
        assert.equal(report.metrics, null);
    } catch (error) {
        if (error.code === 'ENOENT') t.skip(`Local Python interpreter not available (${python}).`);
        else throw error;
    } finally {
        await fs.rm(temp, { recursive: true, force: true });
    }
});

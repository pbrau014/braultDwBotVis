'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { runSupervisedProcess } = require('./ocr-process-supervisor');

const ENGINES = ['tesseractjs', 'native', 'paddleocr'];
const sha256 = buffer => crypto.createHash('sha256').update(buffer).digest('hex');

async function executeReader({ imageBuffer, engine, env, timeoutMs = 90000 }) {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dwbot-parallel-local-'));
    const outputPath = path.join(tempDir, 'reader-output.json');
    const root = path.resolve(__dirname, '..');
    const scriptPath = path.join(root, 'scripts', engine === 'paddleocr' ? 'paddleocr-image-child.js' : 'ocr-image-child.js');
    const networkLogPath = path.join(tempDir, 'blocked-network-attempts.log');
    const childEnv = {
        ...env,
        DWBOT_MULTI_PROVIDER_ENABLED: '0',
        OCRSPACE_ENABLED: '0',
        OCRSPACE_NETWORK_ALLOWLIST: '0',
        OCRSPACE_API_KEY: '',
        AZURE_DOCUMENT_INTELLIGENCE_ENABLED: '0',
        AZURE_DOCUMENT_INTELLIGENCE_NETWORK_ALLOWLIST: '0',
        AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: '',
        AZURE_DOCUMENT_INTELLIGENCE_KEY: '',
        OCR_NON_OCR_NETWORK_RESTRICTED: '1',
        OCR_NON_OCR_NETWORK_LOG: networkLogPath,
        OCR_CV_ASSIST: '0',
        OCR_IMAGE_TIMEOUT_MS: '45000',
        OCR_SUPERVISED_TIMEOUT_MS: '50000',
        OCR_ENGINE: engine === 'paddleocr' ? 'tesseractjs' : engine,
        PADDLEOCR_FIELD_FALLBACK: engine === 'paddleocr' ? '1' : '0',
    };
    try {
        await runSupervisedProcess({
            command: process.execPath,
            args: [scriptPath, outputPath],
            cwd: root,
            env: childEnv,
            inputBuffer: imageBuffer,
            timeoutMs: Math.max(10000, Math.min(180000, Number(timeoutMs) || 90000)),
            terminationTimeoutMs: 7000,
            maxOutputBytes: 12_000_000,
        });
        const payload = JSON.parse(await fs.readFile(outputPath, 'utf8'));
        if (!payload.ok) {
            const error = new Error(String(payload.error || engine + ' reader failed.').slice(0, 700));
            error.code = payload.code || 'PARALLEL_LOCAL_READER_FAILED';
            throw error;
        }
        if (engine === 'paddleocr' && payload.output?.available !== true) {
            const error = new Error(String(payload.output?.error || payload.output?.reason || payload.output?.helperStatus || 'PaddleOCR did not complete a valid local read.').slice(0, 700));
            error.code = 'PADDLEOCR_READER_UNAVAILABLE';
            throw error;
        }
        return {
            engine,
            status: 'success',
            sourceSha256: sha256(imageBuffer),
            output: payload.output || null,
            networkLogSha256: await fs.readFile(networkLogPath).then(bytes => sha256(bytes)).catch(() => null),
        };
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
}

async function runParallelLocalReaders({
    imageBuffer,
    env = process.env,
    readerRunner = executeReader,
    timeoutMs = 90000,
} = {}) {
    if (!Buffer.isBuffer(imageBuffer) || !imageBuffer.length) throw new Error('Parallel local OCR requires original screenshot bytes.');
    const sourceSha256 = sha256(imageBuffer);
    const requested = ENGINES.slice();
    const readers = {};
    const jobs = [];
    for (const engine of requested) {
        if (engine === 'paddleocr' && !String(env.PADDLEOCR_MODEL_MANIFEST || '').trim()) {
            readers[engine] = { engine, status: 'blocked', sourceSha256, reason: 'PADDLEOCR_MODEL_MANIFEST is not configured.' };
            continue;
        }
        jobs.push(Promise.resolve().then(() => readerRunner({
            imageBuffer, engine, env: { ...env }, timeoutMs,
        })).then(result => {
            readers[engine] = { ...result, engine, status: result?.status || 'success', sourceSha256 };
        }).catch(error => {
            readers[engine] = {
                engine, status: 'failed', sourceSha256,
                errorCode: error.code || 'PARALLEL_LOCAL_READER_FAILED',
                error: String(error.message || error).slice(0, 500),
            };
        }));
    }
    await Promise.all(jobs);
    const complete = ENGINES.every(engine => readers[engine]?.status === 'success');
    const participating = ENGINES.filter(engine => readers[engine]?.status === 'success');
    return {
        status: complete ? 'complete' : participating.length ? 'partial' : 'unavailable',
        requested,
        sourceSha256,
        readers,
        disclaimer: 'Independent local OCR evidence; provider outputs and local candidates are not ground truth.',
    };
}

module.exports = { ENGINES, runParallelLocalReaders, executeReader };

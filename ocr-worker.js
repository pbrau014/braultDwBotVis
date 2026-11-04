'use strict';

// In auto mode prefer native Tesseract when available because it is the engine
// used for the screenshot regression fixtures. Tesseract.js is the fallback when
// the native CLI is not installed; both return the same line/word/bounding-box shape.
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { createWatchedWorker } = require('./ocr-watchdog');
let tesseractJs = null;
try {
    tesseractJs = require('tesseract.js');
} catch {
    // Optional at runtime only: native Tesseract is a compatible OCR fallback.
}

function findPosixTimeout() {
    if (process.platform === 'win32') return null;
    const result = spawnSync('timeout', ['--version'], { stdio: 'ignore' });
    return !result.error && result.status === 0 ? 'timeout' : null;
}
const POSIX_TIMEOUT_BIN = findPosixTimeout();

function nativeTesseractAvailable() {
    const result = spawnSync(process.env.TESSERACT_BIN || 'tesseract', ['--version'], { stdio: 'ignore' });
    return !result.error && result.status === 0;
}

function runNativeTesseract(buffer, language, psm, charWhitelist = '', signal = null, testOptions = null) {
    return new Promise((resolve, reject) => {
        const executable = testOptions?.command || process.env.TESSERACT_BIN || 'tesseract';
        // Native Tesseract uses its installed tessdata directory, including
        // its version-matched configs. The bundled raw model is for Tesseract.js;
        // forcing --tessdata-dir to the project root would hide native configs/tsv.
        const args = ['stdin', 'stdout', '-l', language, '--psm', String(psm)];
        if (charWhitelist) args.push('-c', `tessedit_char_whitelist=${charWhitelist}`);
        args.push('tsv');
        const timeoutMs = Math.max(100, Number(testOptions?.timeoutMs ?? process.env.OCR_PROCESS_TIMEOUT_MS) || 20000);
        const maxOutputBytes = Math.max(1_000_000, Number(process.env.MAX_OCR_OUTPUT_BYTES) || 20_000_000);
        // On POSIX, GNU timeout is an independent watchdog even if the Node event
        // loop is temporarily starved by unusually verbose OCR output. Node timers
        // remain the fallback on Windows or systems without GNU timeout.
        const usePosixTimeout = testOptions?.usePosixTimeout ?? !testOptions?.command;
        const command = usePosixTimeout && POSIX_TIMEOUT_BIN ? POSIX_TIMEOUT_BIN : executable;
        const baseArgs = [...(testOptions?.argsPrefix || []), ...args];
        const commandArgs = usePosixTimeout && POSIX_TIMEOUT_BIN
            ? ['--signal=TERM', '--kill-after=2s', `${Math.ceil(timeoutMs / 1000)}s`, executable, ...baseArgs]
            : baseArgs;
        const child = spawn(command, commandArgs, { stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
        const stdout = [];
        const stderr = [];
        let outputBytes = 0;
        let stderrBytes = 0;
        let settled = false;
        let failure = null;
        let timer;
        let terminationTimer;
        const cleanupListenersAndTimers = () => {
            clearTimeout(timer);
            clearTimeout(terminationTimer);
            signal?.removeEventListener('abort', abortListener);
        };
        const killTree = () => {
            // Do not report cancellation complete until `close` confirms the child
            // has exited. Keep stdout/stderr draining so process closure is observed.
            try {
                if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGKILL');
                else child.kill('SIGKILL');
            } catch {}
            try { child.stdin?.destroy(); } catch {}
        };
        const fail = (error) => {
            if (settled || failure) return;
            failure = error;
            clearTimeout(timer);
            signal?.removeEventListener('abort', abortListener);
            killTree();
            // A SIGKILL should close the process promptly. If the OS/child
            // process cannot be observed closing, surface a fatal queue error so
            // the caller refuses to start another OCR job beside it.
            terminationTimer = setTimeout(() => {
                if (settled) return;
                settled = true;
                cleanupListenersAndTimers();
                const unconfirmed = new Error(`${error.message} Native Tesseract did not confirm process exit after termination.`);
                unconfirmed.code = 'SERIAL_TASK_UNSETTLED';
                unconfirmed.cause = error;
                reject(unconfirmed);
            }, 3000);
        };
        const abortListener = () => fail(new Error('Native Tesseract was aborted after the OCR job timed out or was cancelled.'));
        timer = setTimeout(() => {
            const error = new Error(`Native Tesseract exceeded its ${timeoutMs} ms processing timeout.`);
            error.code = 'SERIAL_TASK_TIMEOUT';
            error.timeoutMs = timeoutMs;
            fail(error);
        }, timeoutMs);
        child.stdout.on('data', (chunk) => {
            if (failure || settled) return;
            outputBytes += chunk.length;
            if (outputBytes > maxOutputBytes) {
                fail(new Error(`Native Tesseract output exceeded the ${maxOutputBytes.toLocaleString()} byte safety limit.`));
                return;
            }
            stdout.push(chunk);
        });
        child.stderr.on('data', (chunk) => {
            if (failure || settled || stderrBytes >= 100_000) return;
            const kept = chunk.subarray(0, Math.max(0, 100_000 - stderrBytes));
            stderr.push(kept);
            stderrBytes += kept.length;
        });
        child.on('error', (error) => fail(new Error(`Could not start native Tesseract: ${error.message}`, { cause: error })));
        child.on('close', (code) => {
            if (settled) return;
            settled = true;
            cleanupListenersAndTimers();
            if (failure) {
                reject(failure);
                return;
            }
            if (code !== 0) {
                reject(new Error(`Native Tesseract failed (${code}): ${Buffer.concat(stderr).toString('utf8').trim().slice(0, 500)}`));
                return;
            }
            try { resolve(parseTsv(Buffer.concat(stdout).toString('utf8'))); }
            catch (error) { reject(error); }
        });
        child.stdin.on('error', (error) => { if (error.code !== 'EPIPE') fail(error); });
        if (signal) {
            signal.addEventListener('abort', abortListener, { once: true });
            if (signal.aborted) {
                abortListener();
                return;
            }
        }
        child.stdin.end(buffer);
    });
}

function parseTsv(tsv) {
    const rows = tsv.split(/\r?\n/);
    const words = [];
    for (const row of rows.slice(1)) {
        if (!row.trim()) continue;
        const columns = row.split('\t');
        if (columns.length < 12 || columns[0] !== '5') continue;
        const text = columns.slice(11).join('\t').trim();
        if (!text) continue;
        const confidence = Number(columns[10]);
        const left = Number(columns[6]);
        const top = Number(columns[7]);
        const width = Number(columns[8]);
        const height = Number(columns[9]);
        if (![left, top, width, height].every(Number.isFinite)) continue;
        words.push({
            text,
            confidence: Number.isFinite(confidence) ? confidence : 0,
            bbox: { x0: left, y0: top, x1: left + width, y1: top + height },
            key: columns.slice(1, 5).join(':'),
            order: Number(columns[5]) || 0,
        });
    }

    const grouped = new Map();
    for (const word of words) {
        const key = word.key;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(word);
    }
    const lines = [...grouped.values()].map((lineWords) => {
        lineWords.sort((a, b) => a.order - b.order || a.bbox.x0 - b.bbox.x0);
        const bbox = {
            x0: Math.min(...lineWords.map((word) => word.bbox.x0)),
            y0: Math.min(...lineWords.map((word) => word.bbox.y0)),
            x1: Math.max(...lineWords.map((word) => word.bbox.x1)),
            y1: Math.max(...lineWords.map((word) => word.bbox.y1)),
        };
        return {
            text: lineWords.map((word) => word.text).join(' '),
            confidence: lineWords.reduce((sum, word) => sum + word.confidence, 0) / Math.max(1, lineWords.length),
            bbox,
            words: lineWords.map(({ text, confidence, bbox: box }) => ({ text, confidence, bbox: box })),
        };
    }).sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);
    const blocks = [{ paragraphs: [{ lines }] }];
    const confidenceValues = words.map((word) => word.confidence).filter((value) => value >= 0);
    return {
        text: lines.map((line) => line.text).join('\n'),
        confidence: confidenceValues.length
            ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
            : 0,
        lines,
        words: words.map(({ text, confidence, bbox }) => ({ text, confidence, bbox })),
        blocks,
    };
}

function packageRoot(entry, packageName) {
    let current = path.dirname(entry);
    while (true) {
        try {
            const manifest = JSON.parse(fs.readFileSync(path.join(current, 'package.json'), 'utf8'));
            if (manifest.name === packageName) return current;
        } catch {}
        const parent = path.dirname(current);
        if (parent === current) break;
        current = parent;
    }
    throw new Error(`Could not locate the installed ${packageName} package root.`);
}

function resolveLocalTesseractAssets(language = 'eng') {
    const langPath = path.resolve(process.env.TESSERACT_LANG_PATH || path.join(__dirname, '..'));
    const languageFile = path.join(langPath, `${language}.traineddata`);
    if (!fs.existsSync(languageFile)) {
        throw new Error(`Tesseract.js local language model not found at ${languageFile}. Set TESSERACT_LANG_PATH to a directory containing ${language}.traineddata, or install native Tesseract with that language model.`);
    }

    const workerCandidates = [process.env.TESSERACT_WORKER_PATH].filter(Boolean).map(candidate => path.resolve(candidate));
    if (!workerCandidates.length) {
        const tesseractEntry = require.resolve('tesseract.js');
        const tesseractRoot = packageRoot(tesseractEntry, 'tesseract.js');
        workerCandidates.push(path.join(tesseractRoot, 'src', 'worker-script', 'node', 'index.js'));
    }
    const workerPath = workerCandidates.find(candidate => fs.existsSync(candidate));
    if (!workerPath) {
        throw new Error(`The local Tesseract.js Node worker was not found. Checked: ${workerCandidates.join(', ')}. Reinstall dependencies with npm ci.`);
    }

    const coreFiles = [
        'tesseract-core.wasm.js',
        'tesseract-core-simd.wasm.js',
        'tesseract-core-lstm.wasm.js',
        'tesseract-core-simd-lstm.wasm.js',
    ];
    let coreCandidates = [];
    if (process.env.TESSERACT_CORE_PATH) coreCandidates.push(path.resolve(process.env.TESSERACT_CORE_PATH));
    try {
        const coreEntry = require.resolve('tesseract.js-core');
        const coreRoot = packageRoot(coreEntry, 'tesseract.js-core');
        coreCandidates.push(coreRoot, path.join(coreRoot, 'dist'));
    } catch (error) {
        if (process.env.TESSERACT_CORE_PATH) {
            // An explicit local override is enough for isolated/portable installs.
        } else {
            throw new Error(`The local tesseract.js-core package could not be resolved: ${error.message}. Reinstall dependencies with npm ci.`);
        }
    }
    const corePath = coreCandidates.find(candidate => coreFiles.every(file => fs.existsSync(path.join(candidate, file))));
    if (!corePath) {
        throw new Error(`Local Tesseract.js core assets are incomplete. Expected ${coreFiles.join(', ')} in one of: ${coreCandidates.join(', ') || '(no local candidates)'}. Reinstall dependencies with npm ci or set TESSERACT_CORE_PATH to the local assets directory.`);
    }
    return { langPath, workerPath, corePath };
}

async function createWorker(language = 'eng') {
    const engine = String(process.env.OCR_ENGINE || 'auto').trim().toLowerCase();
    if (!['auto', 'native', 'tesseractjs'].includes(engine)) {
        throw new Error(`Unsupported OCR_ENGINE=${engine}. Choose auto, native, or tesseractjs.`);
    }

    const nativeAvailable = nativeTesseractAvailable();
    const useNative = engine === 'native' || (engine === 'auto' && nativeAvailable);
    if (useNative) {
        if (!nativeAvailable) throw new Error('OCR_ENGINE=native was selected, but the Tesseract CLI is not available.');
        let psm = 3;
        let charWhitelist = '';
        let activeController = null;
        let activeRecognition = null;
        return {
            async setParameters(parameters = {}) {
                if (parameters.tessedit_pageseg_mode !== undefined) psm = Number(parameters.tessedit_pageseg_mode) || 3;
                if (parameters.tessedit_char_whitelist !== undefined) charWhitelist = String(parameters.tessedit_char_whitelist || '');
            },
            async recognize(buffer) {
                const controller = new AbortController();
                activeController = controller;
                const recognition = runNativeTesseract(buffer, language, psm, charWhitelist, controller.signal);
                activeRecognition = recognition;
                try {
                    const data = await recognition;
                    return { data };
                } finally {
                    if (activeController === controller) activeController = null;
                    if (activeRecognition === recognition) activeRecognition = null;
                }
            },
            async terminate() {
                // Abort and wait for the process-close-confirmed recognition promise.
                // A failed close confirmation propagates SERIAL_TASK_UNSETTLED so the
                // serial queue refuses to start another native OCR process.
                const controller = activeController;
                const recognition = activeRecognition;
                controller?.abort();
                activeController = null;
                if (recognition) {
                    try { await recognition; }
                    catch (error) {
                        if (error?.code === 'SERIAL_TASK_UNSETTLED') throw error;
                        // Expected abort/rejection after the child has closed.
                    }
                }
            },
        };
    }

    if (engine === 'tesseractjs' && !tesseractJs) {
        throw new Error('OCR_ENGINE=tesseractjs was selected, but tesseract.js is not installed. Run npm ci and retry.');
    }
    if (tesseractJs) {
        // Explicit local worker/core/model paths prevent the fallback from
        // depending on CDN availability. Raw eng.traineddata is paired with gzip:false.
        const assets = resolveLocalTesseractAssets(language);
        const operationTimeoutMs = Math.max(100, Number(process.env.OCR_OPERATION_TIMEOUT_MS) || 15_000);
        const terminationTimeoutMs = Math.max(100, Number(process.env.OCR_WORKER_TERMINATION_TIMEOUT_MS) || 3_000);
        return createWatchedWorker(() => tesseractJs.createWorker(language, 1, {
            ...assets,
            gzip: false,
            logger: (progress) => {
                if (progress.status === 'recognizing text' && progress.progress >= 0.99) {
                    if (process.env.OCR_DEBUG_TIMINGS === '1') console.log('[OCR] Tesseract.js recognition nearing completion.');
                }
            },
        }), {
            operationTimeoutMs,
            terminationTimeoutMs,
            logger: process.env.OCR_DEBUG_TIMINGS === '1'
                ? (event) => console.log(`[OCR-WORKER] ${JSON.stringify(event)}`)
                : undefined,
        });
    }
    throw new Error('Neither native Tesseract nor the tesseract.js fallback is available. Install the Tesseract CLI or run npm ci to install tesseract.js.');
}

module.exports = { createWorker, parseTsv, resolveLocalTesseractAssets, nativeTesseractAvailable, __test: { runNativeTesseract } };

'use strict';

// Optional local-only OpenCV geometry stage. This module never calls a remote
// service and never returns a recognized value; it proposes crop coordinates
// that the existing OCR engine and field validators may evaluate.
const { spawn } = require('node:child_process');
const path = require('node:path');

const HELPER_PATH = path.join(__dirname, '..', 'scripts', 'opencv_field_isolation.py');
const DEFAULT_TIMEOUT_MS = 3500;
const MAX_STDOUT_BYTES = 1_000_000;
const MAX_STDERR_BYTES = 24_000;

function validRect(rect, width, height) {
    if (!rect || typeof rect !== 'object') return false;
    const values = ['left', 'top', 'width', 'height'].map(key => Number(rect[key]));
    if (!values.every(Number.isFinite)) return false;
    const [left, top, w, h] = values;
    return Number.isInteger(left) && Number.isInteger(top) && Number.isInteger(w) && Number.isInteger(h) &&
        left >= 0 && top >= 0 && w >= 2 && h >= 2 && left + w <= width && top + h <= height;
}

function sanitizeAnalysis(value) {
    if (!value || typeof value !== 'object' || value.schemaVersion !== 1 ||
        !Number.isInteger(value.width) || !Number.isInteger(value.height) ||
        value.width < 1 || value.height < 1 || !value.regions || typeof value.regions !== 'object') {
        throw new Error('OpenCV helper returned a malformed geometry result.');
    }
    const regions = {};
    for (const [name, proposal] of Object.entries(value.regions)) {
        if (!proposal || !validRect(proposal.rect, value.width, value.height)) continue;
        const score = Number(proposal.score);
        if (!Number.isFinite(score) || score < 0 || score > 1) continue;
        regions[name] = {
            rect: Object.fromEntries(['left', 'top', 'width', 'height'].map(k => [k, Number(proposal.rect[k])])),
            score,
            componentCount: Math.max(0, Number.isInteger(proposal.componentCount) ? proposal.componentCount : 0),
            method: String(proposal.method || 'unknown'),
            ...(proposal.isolatedFromAdjacentUi === true ? { isolatedFromAdjacentUi: true } : {}),
        };
    }
    return {
        schemaVersion: 1,
        status: String(value.status || (Object.keys(regions).length ? 'ok' : 'no-reliable-regions')),
        width: value.width,
        height: value.height,
        opencvVersion: String(value.opencvVersion || 'unknown'),
        regions,
        componentCountsBySeed: value.componentCountsBySeed && typeof value.componentCountsBySeed === 'object'
            ? value.componentCountsBySeed : {},
        preprocessing: Array.isArray(value.preprocessing) ? value.preprocessing.map(String) : [],
        acceptancePolicy: String(value.acceptancePolicy || 'geometry proposals only'),
    };
}

function scaleRect(rect, scale, bounds) {
    if (!validRect(rect, bounds.sourceWidth, bounds.sourceHeight) || !Number.isFinite(scale) || scale <= 0) return null;
    const left = Math.max(0, Math.round(rect.left * scale));
    const top = Math.max(0, Math.round(rect.top * scale));
    const right = Math.min(bounds.width, Math.round((rect.left + rect.width) * scale));
    const bottom = Math.min(bounds.height, Math.round((rect.top + rect.height) * scale));
    if (right <= left || bottom <= top) return null;
    return { left, top, width: right - left, height: bottom - top };
}

function runLocalPython(imageBuffer, options = {}) {
    const python = options.python || process.env.OPENCV_PYTHON_BIN || process.env.PYTHON ||
        (process.platform === 'win32' ? 'python' : 'python3');
    const helper = options.helperPath || HELPER_PATH;
    const timeoutMs = Math.max(100, Number(options.timeoutMs) || DEFAULT_TIMEOUT_MS);
    return new Promise((resolve, reject) => {
        const child = spawn(python, [helper], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, shell: false });
        let stdoutBytes = 0;
        let stderrBytes = 0;
        const stdout = [];
        const stderr = [];
        let finished = false;
        let timer = null;
        const finish = (error, value) => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            if (error) reject(error); else resolve(value);
        };
        const terminate = () => {
            try { child.kill('SIGKILL'); } catch {}
            try { child.stdin.destroy(); } catch {}
        };
        timer = setTimeout(() => {
            const error = new Error(`Local OpenCV geometry helper exceeded ${timeoutMs} ms.`);
            error.code = 'OPENCV_HELPER_TIMEOUT';
            terminate();
            // Wait for close so the caller does not treat kill request as process termination.
            const closeFallback = setTimeout(() => finish(error), 1000);
            closeFallback.unref?.();
        }, timeoutMs);
        child.stdout.on('data', chunk => {
            stdoutBytes += chunk.length;
            if (stdoutBytes > MAX_STDOUT_BYTES) {
                const error = new Error('Local OpenCV geometry output exceeded the size limit.');
                error.code = 'OPENCV_OUTPUT_LIMIT';
                terminate();
                finish(error);
                return;
            }
            stdout.push(chunk);
        });
        child.stderr.on('data', chunk => {
            if (stderrBytes >= MAX_STDERR_BYTES) return;
            const keep = chunk.subarray(0, MAX_STDERR_BYTES - stderrBytes);
            stderr.push(keep); stderrBytes += keep.length;
        });
        child.once('error', error => finish(new Error(`Could not start local OpenCV helper: ${error.message}`, { cause: error })));
        child.once('close', (code, signal) => {
            if (finished) return;
            if (code !== 0) {
                const detail = Buffer.concat(stderr).toString('utf8').trim().slice(0, 500);
                const error = new Error(`Local OpenCV helper exited (${code}${signal ? `/${signal}` : ''})${detail ? `: ${detail}` : ''}`);
                error.code = 'OPENCV_HELPER_UNAVAILABLE';
                finish(error);
                return;
            }
            try { finish(null, sanitizeAnalysis(JSON.parse(Buffer.concat(stdout).toString('utf8')))); }
            catch (error) { finish(new Error(`Invalid local OpenCV response: ${error.message}`, { cause: error })); }
        });
        child.stdin.once('error', error => {
            if (error.code !== 'EPIPE') finish(new Error(`Could not pass image to local OpenCV helper: ${error.message}`, { cause: error }));
        });
        child.stdin.end(imageBuffer);
    });
}

async function analyze(imageBuffer, options = {}) {
    // CV proposals can influence which OCR crops are considered, so keep the
    // feature opt-in until same-input accuracy/false-acceptance benchmarks
    // demonstrate a benefit. Exact-value validation remains authoritative.
    if (options.force !== true && String(process.env.OCR_CV_ASSIST || '').trim() !== '1') {
        return { schemaVersion: 1, status: 'disabled', regions: {}, preprocessing: [], acceptancePolicy: 'disabled unless explicitly enabled for controlled evaluation' };
    }
    try {
        return await runLocalPython(imageBuffer, options);
    } catch (error) {
        // CV is assistive, not a hard dependency: all existing OCR paths remain available.
        if (process.env.OCR_CV_DEBUG === '1') console.warn(`[OCR-CV] ${error.message}; continuing with existing OCR geometry.`);
        return {
            schemaVersion: 1, status: 'unavailable', regions: {}, preprocessing: [],
            reason: String(error.message || error), acceptancePolicy: 'fallback to existing OCR geometry; no CV proposal accepted',
        };
    }
}

module.exports = { analyze, sanitizeAnalysis, validRect, scaleRect, runLocalPython, __test: { HELPER_PATH } };

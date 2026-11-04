'use strict';

const { spawn } = require('node:child_process');

function withDeadline(promise, timeoutMs, message) {
    let timer;
    return Promise.race([
        Promise.resolve(promise),
        new Promise((_, reject) => {
            timer = setTimeout(() => {
                const error = new Error(message);
                error.code = 'SERIAL_TASK_UNSETTLED';
                reject(error);
            }, timeoutMs);
        }),
    ]).finally(() => clearTimeout(timer));
}

async function killProcessTree(child, options = {}) {
    if (!child || !child.pid) return;
    if (options.platform === 'win32') {
        // taskkill /T is the Windows equivalent of killing a POSIX process group.
        // Keep a direct-child fallback in case taskkill is unavailable or fails.
        let killer;
        try {
            killer = spawn(options.taskkillCommand || 'taskkill', ['/PID', String(child.pid), '/T', '/F'], {
                stdio: 'ignore', windowsHide: true,
            });
            await withDeadline(new Promise(resolve => {
                killer.once('error', resolve);
                killer.once('close', resolve);
            }), options.killCommandTimeoutMs || 2500, 'Windows taskkill did not settle.');
        } catch {
            // Fall through to the direct child kill below.
        }
        try { child.kill('SIGKILL'); } catch {}
        return;
    }
    try { process.kill(-child.pid, 'SIGKILL'); }
    catch { try { child.kill('SIGKILL'); } catch {} }
}

/**
 * Run a per-image child with an independent parent-process deadline. Rejects a
 * timeout only after the child's `close` event confirms exit; if close cannot be
 * observed within the cleanup grace period, it raises SERIAL_TASK_UNSETTLED so a
 * serial queue can fail closed. No shell is used.
 */
function runSupervisedProcess(options = {}) {
    const command = options.command || process.execPath;
    const args = Array.isArray(options.args) ? options.args : [];
    const timeoutMs = Math.max(100, Math.floor(Number(options.timeoutMs) || 95_000));
    const terminationTimeoutMs = Math.max(100, Math.floor(Number(options.terminationTimeoutMs) || 5_000));
    const maxOutputBytes = Math.max(1024, Math.floor(Number(options.maxOutputBytes) || 10 * 1024 * 1024));
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd: options.cwd,
            env: options.env || process.env,
            stdio: ['pipe', 'pipe', 'pipe'],
            detached: (options.platform || process.platform) !== 'win32',
            windowsHide: true,
            shell: false,
        });
        const stdout = [];
        const stderr = [];
        let stdoutBytes = 0;
        let stderrBytes = 0;
        let failure = null;
        let settled = false;
        let deadlineTimer;
        let terminationTimer;
        const log = typeof options.onOutput === 'function' ? options.onOutput : null;

        const debug = (message) => { if (process.env.OCR_DEBUG_TIMINGS === '1') console.error(`[OCR-SUPERVISOR] ${message}`); };
        const kill = () => {
            debug(`sending termination to pid=${child.pid}`);
            killProcessTree(child, {
                platform: options.platform || process.platform,
                taskkillCommand: options.taskkillCommand,
                killCommandTimeoutMs: options.killCommandTimeoutMs,
            }).catch(() => {});
        };
        const failAndKill = error => {
            if (settled || failure) return;
            failure = error;
            clearTimeout(deadlineTimer);
            kill();
            terminationTimer = setTimeout(() => {
                if (settled) return;
                settled = true;
                debug(`termination not confirmed for pid=${child.pid} after ${terminationTimeoutMs}ms`);
                const unconfirmed = new Error(`${error.message} The child process did not confirm closure within ${terminationTimeoutMs} ms.`, { cause: error });
                unconfirmed.code = 'SERIAL_TASK_UNSETTLED';
                unconfirmed.timeoutMs = timeoutMs;
                reject(unconfirmed);
            }, terminationTimeoutMs);
        };

        deadlineTimer = setTimeout(() => {
            debug(`deadline ${timeoutMs}ms hit for pid=${child.pid}`);
            const error = new Error(`Supervised OCR child exceeded its ${timeoutMs} ms deadline.`);
            error.code = 'SUPERVISED_OCR_TIMEOUT';
            error.timeoutMs = timeoutMs;
            failAndKill(error);
        }, timeoutMs);

        child.stdout.on('data', chunk => {
            if (settled) return;
            stdoutBytes += chunk.length;
            if (stdoutBytes + stderrBytes > maxOutputBytes) {
                const error = new Error(`Supervised OCR child exceeded the ${maxOutputBytes} byte output limit.`);
                error.code = 'SUPERVISED_OCR_OUTPUT_LIMIT';
                failAndKill(error);
                return;
            }
            stdout.push(chunk);
            log?.('stdout', chunk);
        });
        child.stderr.on('data', chunk => {
            if (settled) return;
            stderrBytes += chunk.length;
            if (stdoutBytes + stderrBytes > maxOutputBytes) {
                const error = new Error(`Supervised OCR child exceeded the ${maxOutputBytes} byte output limit.`);
                error.code = 'SUPERVISED_OCR_OUTPUT_LIMIT';
                failAndKill(error);
                return;
            }
            stderr.push(chunk);
            log?.('stderr', chunk);
        });
        child.on('error', error => failAndKill(new Error(`Could not start supervised OCR child: ${error.message}`, { cause: error })));
        child.on('close', (code, signal) => {
            debug(`child pid=${child.pid} close code=${code} signal=${signal || ''}`);
            if (settled) return;
            settled = true;
            clearTimeout(deadlineTimer);
            clearTimeout(terminationTimer);
            if (failure) {
                failure.closeConfirmed = true;
                failure.exitCode = code;
                failure.signal = signal;
                reject(failure);
                return;
            }
            if (code !== 0) {
                const error = new Error(`Supervised OCR child exited with code ${code}${signal ? ` (${signal})` : ''}.`);
                error.code = 'SUPERVISED_OCR_CHILD_EXIT';
                error.exitCode = code;
                error.signal = signal;
                error.stdout = Buffer.concat(stdout).toString('utf8');
                error.stderr = Buffer.concat(stderr).toString('utf8');
                error.closeConfirmed = true;
                reject(error);
                return;
            }
            resolve({ code, signal, stdout: Buffer.concat(stdout).toString('utf8'), stderr: Buffer.concat(stderr).toString('utf8'), closeConfirmed: true });
        });
        child.stdin.on('error', error => {
            if (error.code !== 'EPIPE') failAndKill(new Error(`Could not pass screenshot to supervised OCR child: ${error.message}`, { cause: error }));
        });
        if (options.inputBuffer !== undefined) child.stdin.end(options.inputBuffer);
        else child.stdin.end();
    });
}

module.exports = { runSupervisedProcess, killProcessTree };

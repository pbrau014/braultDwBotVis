'use strict';

function deadline(promise, timeoutMs, message, code = 'SERIAL_TASK_UNSETTLED') {
    let timer;
    return Promise.race([
        Promise.resolve(promise),
        new Promise((_, reject) => {
            timer = setTimeout(() => {
                const error = new Error(message);
                error.code = code;
                reject(error);
            }, timeoutMs);
        }),
    ]).finally(() => clearTimeout(timer));
}

/**
 * Adds operation deadlines to a Tesseract.js Node worker. On an operation timeout,
 * kill the underlying Node Worker and await Worker.terminate() before allowing a
 * later operation to create a replacement. This is intentionally pinned to the
 * installed Tesseract.js 6.x Node adapter, whose public wrapper's terminate()
 * resolves before the underlying Worker.terminate() promise has settled.
 */
function createWatchedWorker(createRawWorker, options = {}) {
    const operationTimeoutMs = Math.max(100, Math.floor(Number(options.operationTimeoutMs) || 15_000));
    const terminationTimeoutMs = Math.max(100, Math.floor(Number(options.terminationTimeoutMs) || 3_000));
    const logger = typeof options.logger === 'function' ? options.logger : () => {};
    let rawWorker = null;
    let creatingWorker = null;
    let generation = 0;
    let closed = false;
    let fatalError = null;

    async function terminateRaw(raw) {
        if (!raw) return { confirmed: true, exitCode: null };
        const thread = raw.worker;
        if (thread && typeof thread.terminate === 'function') {
            const exitCode = await deadline(
                Promise.resolve().then(() => thread.terminate()),
                terminationTimeoutMs,
                `The underlying Tesseract.js worker did not confirm termination within ${terminationTimeoutMs} ms.`,
            );
            if (!Number.isInteger(exitCode)) {
                throw new Error('The underlying Tesseract.js worker termination did not return a confirmed exit code.');
            }
            // Clear the Tesseract.js wrapper's internal reference as well. Its
            // terminate() call is deliberately not relied upon as exit proof.
            try { await raw.terminate?.(); } catch {}
            logger({ event: 'worker-terminated', confirmed: true, exitCode });
            return { confirmed: true, exitCode };
        }
        if (typeof raw.terminate === 'function') {
            await deadline(
                Promise.resolve().then(() => raw.terminate()),
                terminationTimeoutMs,
                `The OCR worker did not confirm termination within ${terminationTimeoutMs} ms.`,
            );
            logger({ event: 'worker-terminated', confirmed: true, exitCode: null });
            return { confirmed: true, exitCode: null };
        }
        throw new Error('The OCR worker exposes no terminator that can be awaited.');
    }

    async function getRawWorker() {
        if (fatalError) throw fatalError;
        if (closed) throw new Error('The OCR worker has been closed.');
        if (rawWorker) return rawWorker;
        if (creatingWorker) return creatingWorker;
        const myGeneration = ++generation;
        const createPromise = Promise.resolve().then(createRawWorker).then(async (created) => {
            if (closed || myGeneration !== generation) {
                await terminateRaw(created);
                throw new Error('OCR worker initialization was cancelled before publication.');
            }
            rawWorker = created;
            logger({ event: 'worker-initialized' });
            return created;
        });
        creatingWorker = createPromise;
        try {
            return await createPromise;
        } catch (error) {
            if (error?.code === 'SERIAL_TASK_UNSETTLED') fatalError = error;
            throw error;
        } finally {
            if (creatingWorker === createPromise) creatingWorker = null;
        }
    }

    async function operation(name, args) {
        const raw = await getRawWorker();
        const startedAt = Date.now();
        logger({ event: 'operation-start', operation: name });
        try {
            const result = await deadline(
                Promise.resolve().then(() => {
                    if (typeof raw[name] !== 'function') throw new Error(`OCR worker does not implement ${name}().`);
                    return raw[name](...args);
                }),
                operationTimeoutMs,
                `Tesseract.js ${name} exceeded its ${operationTimeoutMs} ms operation deadline.`,
                'OCR_OPERATION_TIMEOUT',
            );
            logger({ event: 'operation-complete', operation: name, elapsedMs: Date.now() - startedAt });
            return result;
        } catch (error) {
            if (error?.code !== 'OCR_OPERATION_TIMEOUT') throw error;
            logger({ event: 'operation-timeout', operation: name, elapsedMs: Date.now() - startedAt });
            if (rawWorker === raw) rawWorker = null;
            try {
                await terminateRaw(raw);
            } catch (terminationError) {
                fatalError = new Error(`${error.message} Worker termination could not be confirmed; OCR queue must stop.`, { cause: terminationError });
                fatalError.code = 'SERIAL_TASK_UNSETTLED';
                throw fatalError;
            }
            // The failed image is rejected. A later queued image gets a fresh
            // worker; it cannot overlap the killed worker because termination was
            // confirmed above.
            throw error;
        }
    }

    return {
        setParameters(parameters = {}) { return operation('setParameters', [parameters]); },
        recognize(...args) { return operation('recognize', args); },
        async terminate() {
            if (closed) return;
            closed = true;
            generation += 1;
            const raw = rawWorker;
            rawWorker = null;
            if (raw) await terminateRaw(raw);
            if (creatingWorker) {
                try {
                    const created = await deadline(
                        creatingWorker,
                        terminationTimeoutMs,
                        `OCR worker initialization did not settle within ${terminationTimeoutMs} ms during shutdown.`,
                    );
                    if (created && created !== raw) await terminateRaw(created);
                } catch (error) {
                    if (error?.code === 'SERIAL_TASK_UNSETTLED') {
                        fatalError = error;
                        throw error;
                    }
                }
            }
        },
    };
}

module.exports = { createWatchedWorker, deadline };

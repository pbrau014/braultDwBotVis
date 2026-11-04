'use strict';

class SerialQueueFullError extends Error {
    constructor(maxPending) {
        super(`The processing queue is full (${maxPending} outstanding jobs).`);
        this.name = 'SerialQueueFullError';
        this.code = 'SERIAL_QUEUE_FULL';
    }
}

class SerialQueueClosedError extends Error {
    constructor(message = 'The processing queue is closed.') {
        super(message);
        this.name = 'SerialQueueClosedError';
        this.code = 'SERIAL_QUEUE_CLOSED';
    }
}

class SerialTaskTimeoutError extends Error {
    constructor(timeoutMs) {
        super(`The task exceeded its ${Math.ceil(timeoutMs / 1000)} second processing timeout.`);
        this.name = 'SerialTaskTimeoutError';
        this.code = 'SERIAL_TASK_TIMEOUT';
        this.timeoutMs = timeoutMs;
    }
}

class SerialTaskUnsettledError extends Error {
    constructor(timeoutMs, settleTimeoutMs) {
        super(`The timed-out task did not stop within ${Math.ceil(settleTimeoutMs / 1000)} seconds after cleanup; the queue was halted to prevent overlapping work. Restart the bot after investigating the OCR engine.`);
        this.name = 'SerialTaskUnsettledError';
        this.code = 'SERIAL_TASK_UNSETTLED';
        this.timeoutMs = timeoutMs;
        this.settleTimeoutMs = settleTimeoutMs;
    }
}

/**
 * A bounded single-consumer queue. On timeout, onTimeout must cancel/terminate
 * the resource owned by the task. The queue waits briefly for the task promise
 * to settle after cleanup. If it does not, the queue fails closed instead of
 * starting another task while the previous operation may still be running.
 */
function createSerialTaskQueue(options = {}) {
    const maxPending = Math.max(1, Math.floor(Number(options.maxPending) || 8));
    const timeoutMs = Math.max(1, Math.floor(Number(options.timeoutMs) || 90_000));
    const settleTimeoutMs = Math.max(50, Math.floor(Number(options.settleTimeoutMs) || 5_000));
    const onTimeout = typeof options.onTimeout === 'function' ? options.onTimeout : null;
    let tail = Promise.resolve();
    let outstanding = 0;
    let active = 0;
    let closed = false;
    let haltError = null;

    function run(task) {
        if (typeof task !== 'function') return Promise.reject(new TypeError('Queued task must be a function.'));
        if (haltError) return Promise.reject(haltError);
        if (closed) return Promise.reject(new SerialQueueClosedError());
        if (outstanding >= maxPending) return Promise.reject(new SerialQueueFullError(maxPending));
        outstanding += 1;

        const operation = tail.then(async () => {
            // A task may have been accepted before a preceding timeout proved
            // unsafe. Reject it and release its pending-slot accounting.
            if (haltError) {
                outstanding -= 1;
                throw haltError;
            }
            active += 1;
            let timer;
            let settleTimer;
            let cleanupTimer;
            let timedOut = false;
            const work = Promise.resolve().then(task);
            try {
                const deadline = new Promise((_, reject) => {
                    timer = setTimeout(() => {
                        timedOut = true;
                        reject(new SerialTaskTimeoutError(timeoutMs));
                    }, timeoutMs);
                });
                return await Promise.race([work, deadline]);
            } catch (error) {
                // A task can discover that its OS subprocess did not confirm exit
                // after a kill. This is fatal even if the queue-level task timer did
                // not fire; never start the next OCR job in that process state.
                if (error?.code === 'SERIAL_TASK_UNSETTLED') {
                    haltError = error;
                    closed = true;
                }
                if (timedOut) {
                    if (onTimeout) {
                        let cleanupOkay = true;
                        // Cleanup can itself stall (for example, a worker's terminate()
                        // promise may never resolve). Bound cleanup too; if it does not
                        // finish, halt the queue rather than leaving an unobservable
                        // half-cleaned worker and accepting more work.
                        const cleanupSettled = await Promise.race([
                            Promise.resolve().then(() => onTimeout(error)).then(
                                () => true,
                                (cleanupError) => {
                                    cleanupOkay = false;
                                    console.error('[serial-queue] Timeout cleanup failed:', cleanupError?.message || cleanupError);
                                    return true;
                                },
                            ),
                            new Promise(resolve => { cleanupTimer = setTimeout(() => resolve(false), settleTimeoutMs); }),
                        ]);
                        if (!cleanupSettled || !cleanupOkay) {
                            haltError = new SerialTaskUnsettledError(timeoutMs, settleTimeoutMs);
                            closed = true;
                            throw haltError;
                        }
                    }
                    // A Promise.race timeout does not cancel its work promise.
                    // Do not release the serial lane until cancellation is proven.
                    const settled = await Promise.race([
                        work.then(() => true, () => true),
                        new Promise(resolve => { settleTimer = setTimeout(() => resolve(false), settleTimeoutMs); }),
                    ]);
                    if (!settled) {
                        haltError = new SerialTaskUnsettledError(timeoutMs, settleTimeoutMs);
                        closed = true;
                        throw haltError;
                    }
                }
                throw error;
            } finally {
                clearTimeout(timer);
                clearTimeout(settleTimer);
                clearTimeout(cleanupTimer);
                active -= 1;
                outstanding -= 1;
            }
        });
        // A rejected task must not poison the promise chain, but a fatal timeout
        // state is checked at the top of each already-queued operation.
        tail = operation.catch(() => {});
        return operation;
    }

    async function drain() { await tail; }
    function close() { closed = true; }
    function stats() { return { active, outstanding, queued: Math.max(0, outstanding - active), maxPending, closed, halted: Boolean(haltError) }; }

    return { run, drain, close, stats };
}

module.exports = {
    createSerialTaskQueue,
    SerialQueueFullError,
    SerialQueueClosedError,
    SerialTaskTimeoutError,
    SerialTaskUnsettledError,
};

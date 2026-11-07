'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const MIN_REQUEST_INTERVAL_MS = 1500;

function monthKey(date = new Date()) {
    const value = date instanceof Date ? date : new Date(date);
    if (!Number.isFinite(value.getTime())) throw new Error('Invalid Azure quota date.');
    return value.getUTCFullYear() + '-' + String(value.getUTCMonth() + 1).padStart(2, '0');
}

function timestamp(value) {
    const result = value instanceof Date ? value.getTime() : Number(value);
    if (!Number.isFinite(result) || result < 0) throw new Error('Invalid Azure quota timestamp.');
    return result;
}

class AzureDocumentIntelligenceQuotaLedger {
    constructor({ filePath = path.join(process.cwd(), 'data', 'azure-document-intelligence-quota.json'), maxPerMonth = 450 } = {}) {
        this.filePath = path.resolve(filePath);
        const requested = Number(maxPerMonth);
        this.maxPerMonth = Number.isSafeInteger(requested) && requested > 0 ? Math.min(450, requested) : 450;
    }

    async withLock(operation) {
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        const lockPath = this.filePath + '.lock';
        let handle;
        for (let attempt = 0; attempt < 100; attempt++) {
            try {
                handle = await fs.open(lockPath, 'wx', 0o600);
                break;
            } catch (error) {
                if (error.code !== 'EEXIST') {
                    const wrapped = new Error('Azure quota ledger lock could not be acquired.');
                    wrapped.code = 'AZURE_OCR_QUOTA_LEDGER_ERROR';
                    throw wrapped;
                }
                if (attempt === 99) {
                    const wrapped = new Error('Azure quota ledger remained locked; request was not sent.');
                    wrapped.code = 'AZURE_OCR_QUOTA_LOCKED';
                    throw wrapped;
                }
                await new Promise(resolve => setTimeout(resolve, 20));
            }
        }
        try {
            let state;
            try {
                state = JSON.parse(await fs.readFile(this.filePath, 'utf8'));
                if (!state || state.version !== 1 || !state.monthly || typeof state.monthly !== 'object' || Array.isArray(state.monthly)) {
                    throw new Error('Unexpected ledger structure.');
                }
                if (state.rateLimit !== undefined && (!state.rateLimit || typeof state.rateLimit !== 'object' || Array.isArray(state.rateLimit))) {
                    throw new Error('Unexpected rate-limit structure.');
                }
            } catch (error) {
                if (error.code === 'ENOENT') state = { version: 1, monthly: {}, rateLimit: { lastRequestAt: 0 } };
                else {
                    const wrapped = new Error('Azure quota ledger is unreadable; failing closed.');
                    wrapped.code = 'AZURE_OCR_QUOTA_LEDGER_CORRUPT';
                    throw wrapped;
                }
            }
            state.rateLimit = state.rateLimit || { lastRequestAt: 0 };
            const result = await operation(state);
            const temp = this.filePath + '.' + process.pid + '.' + Math.random().toString(16).slice(2) + '.tmp';
            await fs.writeFile(temp, JSON.stringify(state, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
            await fs.rename(temp, this.filePath);
            return result;
        } finally {
            try { await handle.close(); } finally { await fs.rm(lockPath, { force: true }); }
        }
    }

    async reserve({ pages = 1, now = new Date() } = {}) {
        const count = Number(pages);
        if (!Number.isSafeInteger(count) || count < 1 || count > 2) throw new Error('Azure F0 reservation must be one or two pages.');
        const key = monthKey(now);
        return this.withLock(async state => {
            const used = Number(state.monthly[key]) || 0;
            if (used + count > this.maxPerMonth) {
                const error = new Error('Azure local F0 safety quota exhausted; request was not sent.');
                error.code = 'AZURE_OCR_QUOTA_EXHAUSTED';
                error.usage = { used, requested: count, limit: this.maxPerMonth };
                throw error;
            }
            state.monthly[key] = used + count;
            return { reserved: count, used: used + count, limit: this.maxPerMonth, month: key };
        });
    }

    async reserveRequestSlot({ now = Date.now() } = {}) {
        const current = timestamp(now);
        return this.withLock(async state => {
            const previous = Number(state.rateLimit.lastRequestAt) || 0;
            const scheduledAt = Math.max(current, previous + MIN_REQUEST_INTERVAL_MS);
            state.rateLimit.lastRequestAt = scheduledAt;
            return {
                scheduledAt,
                waitMs: Math.max(0, scheduledAt - current),
                minimumIntervalMs: MIN_REQUEST_INTERVAL_MS,
            };
        });
    }
}

module.exports = { AzureDocumentIntelligenceQuotaLedger, monthKey, MIN_REQUEST_INTERVAL_MS };

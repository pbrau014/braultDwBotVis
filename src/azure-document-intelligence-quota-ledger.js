'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

function monthKey(date = new Date()) {
    const value = date instanceof Date ? date : new Date(date);
    if (!Number.isFinite(value.getTime())) throw new Error('Invalid Azure quota date.');
    return value.getUTCFullYear() + '-' + String(value.getUTCMonth() + 1).padStart(2, '0');
}

class AzureDocumentIntelligenceQuotaLedger {
    constructor({ filePath = path.join(process.cwd(), 'data', 'azure-document-intelligence-quota.json'), maxPerMonth = 450 } = {}) {
        this.filePath = path.resolve(filePath);
        const requested = Number(maxPerMonth);
        this.maxPerMonth = Number.isSafeInteger(requested) && requested > 0 ? Math.min(450, requested) : 450;
    }

    async reserve({ pages = 1, now = new Date() } = {}) {
        const count = Number(pages);
        if (!Number.isSafeInteger(count) || count < 1 || count > 2) throw new Error('Azure F0 reservation must be one or two pages.');
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        const lockPath = this.filePath + '.lock';
        let handle;
        try {
            handle = await fs.open(lockPath, 'wx', 0o600);
        } catch (error) {
            const wrapped = new Error('Azure quota ledger is locked; request was not sent.');
            wrapped.code = error.code === 'EEXIST' ? 'AZURE_OCR_QUOTA_LOCKED' : 'AZURE_OCR_QUOTA_LEDGER_ERROR';
            throw wrapped;
        }
        try {
            const key = monthKey(now);
            let state;
            try {
                state = JSON.parse(await fs.readFile(this.filePath, 'utf8'));
                if (!state || state.version !== 1 || !state.monthly || typeof state.monthly !== 'object' || Array.isArray(state.monthly)) throw new Error('Unexpected ledger structure.');
            } catch (error) {
                if (error.code === 'ENOENT') state = { version: 1, monthly: {} };
                else {
                    const wrapped = new Error('Azure quota ledger is unreadable; failing closed.');
                    wrapped.code = 'AZURE_OCR_QUOTA_LEDGER_CORRUPT';
                    throw wrapped;
                }
            }
            const used = Number(state.monthly[key]) || 0;
            if (used + count > this.maxPerMonth) {
                const error = new Error('Azure local F0 safety quota exhausted; request was not sent.');
                error.code = 'AZURE_OCR_QUOTA_EXHAUSTED';
                error.usage = { used, requested: count, limit: this.maxPerMonth };
                throw error;
            }
            state.monthly[key] = used + count;
            const temp = this.filePath + '.' + process.pid + '.tmp';
            await fs.writeFile(temp, JSON.stringify(state, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
            await fs.rename(temp, this.filePath);
            return { reserved: count, used: used + count, limit: this.maxPerMonth, month: key };
        } finally {
            try { await handle.close(); } finally { await fs.rm(lockPath, { force: true }); }
        }
    }
}

module.exports = { AzureDocumentIntelligenceQuotaLedger, monthKey };

'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const MIN_REQUEST_INTERVAL_MS = 1500;
const STALE_LOCK_MIN_AGE_MS = 30_000;

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

    async recoverStaleLock(lockPath) {
        let firstStat;
        let owner;
        try {
            firstStat = await fs.stat(lockPath);
            owner = JSON.parse(await fs.readFile(lockPath, 'utf8'));
        } catch { return false; }
        const ageMs = Date.now() - firstStat.mtimeMs;
        if (ageMs < STALE_LOCK_MIN_AGE_MS || owner?.hostname !== os.hostname() ||
            !Number.isSafeInteger(owner?.pid) || owner.pid <= 0 || typeof owner.token !== 'string') return false;
        let alive = true;
        try { process.kill(owner.pid, 0); }
        catch (error) { alive = error.code === 'EPERM'; }
        if (alive) return false;
        try {
            const secondStat = await fs.stat(lockPath);
            const secondOwner = JSON.parse(await fs.readFile(lockPath, 'utf8'));
            if (secondStat.ino !== firstStat.ino || secondStat.mtimeMs !== firstStat.mtimeMs ||
                secondOwner.token !== owner.token || secondOwner.pid !== owner.pid) return false;
            await fs.rm(lockPath);
            return true;
        } catch { return false; }
    }

    async withLock(operation) {
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        const lockPath = this.filePath + '.lock';
        let handle;
        const owner = { pid: process.pid, hostname: os.hostname(), createdAt: new Date().toISOString(), token: crypto.randomUUID() };
        for (let attempt = 0; attempt < 100; attempt++) {
            try {
                handle = await fs.open(lockPath, 'wx', 0o600);
                await handle.writeFile(JSON.stringify(owner) + '\n', 'utf8');
                await handle.sync();
                break;
            } catch (error) {
                if (handle) { await handle.close().catch(() => {}); handle = null; }
                if (error.code !== 'EEXIST') {
                    const wrapped = new Error('Azure quota ledger lock could not be acquired.');
                    wrapped.code = 'AZURE_OCR_QUOTA_LEDGER_ERROR';
                    throw wrapped;
                }
                if (await this.recoverStaleLock(lockPath)) continue;
                if (attempt === 99) {
                    const wrapped = new Error('Azure quota ledger remained locked or its owner could not be safely identified; request was not sent.');
                    wrapped.code = 'AZURE_OCR_QUOTA_LOCKED';
                    throw wrapped;
                }
                await new Promise(resolve => setTimeout(resolve, 20));
            }
        }
        let tempPath = null;
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
            tempPath = this.filePath + '.' + process.pid + '.' + owner.token + '.tmp';
            await fs.writeFile(tempPath, JSON.stringify(state, null, 2) + '\n', { encoding: 'utf8', mode: 0o600, flag: 'wx' });
            await fs.rename(tempPath, this.filePath);
            tempPath = null;
            return result;
        } finally {
            if (tempPath) await fs.rm(tempPath, { force: true }).catch(() => {});
            try { await handle.close(); } finally {
                try {
                    const current = JSON.parse(await fs.readFile(lockPath, 'utf8'));
                    if (current.token === owner.token) await fs.rm(lockPath, { force: true });
                } catch {}
            }
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

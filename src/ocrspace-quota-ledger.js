'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const PROVIDER_LIMITS = Object.freeze({ daily: 500, monthly: 25000, engine3Monthly: 1000 });
function boundedLimit(value, fallback, ceiling) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(1, Math.min(ceiling - 1, Math.floor(n))) : fallback;
}
function periodKeys(date) {
    const d = date instanceof Date ? date : new Date(date);
    if (!Number.isFinite(d.getTime())) throw new Error('Invalid quota date.');
    return { day: d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'),
        month: d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') };
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
class OcrSpaceQuotaLedger {
    constructor({ filePath = path.join(process.cwd(), 'data', 'ocrspace-quota.json'), maxPerDay = 450, maxPerMonth = 22000, maxEngine3PerMonth = 900, lockWaitMs = 3000, staleLockMs = 30000 } = {}) {
        this.filePath = path.resolve(filePath); this.lockPath = this.filePath + '.lock';
        this.maxPerDay = boundedLimit(maxPerDay, 450, PROVIDER_LIMITS.daily);
        this.maxPerMonth = boundedLimit(maxPerMonth, 22000, PROVIDER_LIMITS.monthly);
        this.maxEngine3PerMonth = boundedLimit(maxEngine3PerMonth, 900, PROVIDER_LIMITS.engine3Monthly);
        this.lockWaitMs = Math.max(100, Number(lockWaitMs) || 3000); this.staleLockMs = Math.max(5000, Number(staleLockMs) || 30000);
    }
    async acquireLock() {
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        const started = Date.now();
        while (Date.now() - started <= this.lockWaitMs) {
            try {
                const handle = await fs.open(this.lockPath, 'wx', 0o600);
                await handle.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
                return async () => { try { await handle.close(); } finally { await fs.rm(this.lockPath, { force: true }); } };
            } catch (error) {
                if (error.code !== 'EEXIST') throw error;
                try { const stat = await fs.stat(this.lockPath); if (Date.now() - stat.mtimeMs > this.staleLockMs) { await fs.rm(this.lockPath, { force: true }); continue; } }
                catch (statError) { if (statError.code === 'ENOENT') continue; throw statError; }
                await sleep(20);
            }
        }
        const error = new Error('OCR.space quota ledger is locked; request was not sent.'); error.code = 'OCRSPACE_QUOTA_LOCKED'; throw error;
    }
    async readState() {
        try {
            const data = JSON.parse(await fs.readFile(this.filePath, 'utf8'));
            if (!data || data.version !== 1 || !data.daily || !data.monthly || !data.engine3Monthly ||
                Array.isArray(data.daily) || Array.isArray(data.monthly) || Array.isArray(data.engine3Monthly)) throw new Error('Unexpected ledger structure.');
            return data;
        } catch (error) {
            if (error.code === 'ENOENT') return { version: 1, daily: {}, monthly: {}, engine3Monthly: {} };
            const wrapped = new Error('OCR.space quota ledger is unreadable; failing closed: ' + error.message);
            wrapped.code = 'OCRSPACE_QUOTA_LEDGER_CORRUPT'; throw wrapped;
        }
    }
    async writeState(state) {
        const temp = this.filePath + '.' + process.pid + '.' + crypto.randomBytes(6).toString('hex') + '.tmp';
        let handle;
        try {
            handle = await fs.open(temp, 'wx', 0o600); await handle.writeFile(JSON.stringify(state, null, 2) + '\n', 'utf8');
            await handle.sync(); await handle.close(); handle = null; await fs.rename(temp, this.filePath);
        } catch (error) {
            try { if (handle) await handle.close(); } catch {}
            await fs.rm(temp, { force: true }).catch(() => {}); throw error;
        }
    }
    async reserve({ engine = 2, now = new Date() } = {}) {
        const selected = Number(engine);
        if (![2, 3].includes(selected)) throw new Error('OCR.space quota ledger supports Engine 2 or 3 only.');
        const keys = periodKeys(now), release = await this.acquireLock();
        try {
            const state = await this.readState();
            const daily = Number(state.daily[keys.day]) || 0, monthly = Number(state.monthly[keys.month]) || 0;
            const e3 = Number(state.engine3Monthly[keys.month]) || 0;
            if (daily >= this.maxPerDay || monthly >= this.maxPerMonth || (selected === 3 && e3 >= this.maxEngine3PerMonth)) {
                const error = new Error('OCR.space internal safety quota exhausted; request was not sent.');
                error.code = 'OCRSPACE_QUOTA_EXHAUSTED';
                error.usage = { daily, monthly, engine3: e3, limits: { daily: this.maxPerDay, monthly: this.maxPerMonth, engine3Monthly: this.maxEngine3PerMonth } };
                throw error;
            }
            state.daily[keys.day] = daily + 1; state.monthly[keys.month] = monthly + 1;
            if (selected === 3) state.engine3Monthly[keys.month] = e3 + 1;
            for (const key of Object.keys(state.daily)) if (key < keys.day.slice(0, 8) + '01') delete state.daily[key];
            for (const key of Object.keys(state.monthly)) if (key < keys.month) delete state.monthly[key];
            for (const key of Object.keys(state.engine3Monthly)) if (key < keys.month) delete state.engine3Monthly[key];
            await this.writeState(state);
            return { reserved: true, daily: daily + 1, monthly: monthly + 1, engine3Monthly: selected === 3 ? e3 + 1 : e3,
                limits: { daily: this.maxPerDay, monthly: this.maxPerMonth, engine3Monthly: this.maxEngine3PerMonth } };
        } finally { await release(); }
    }
}
module.exports = { OcrSpaceQuotaLedger, PROVIDER_LIMITS, periodKeys, boundedLimit };

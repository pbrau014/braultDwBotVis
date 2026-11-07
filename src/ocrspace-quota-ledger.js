'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
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
    async recoverStaleLock() {
        let firstStat;
        let owner;
        try {
            firstStat = await fs.stat(this.lockPath);
            owner = JSON.parse(await fs.readFile(this.lockPath, 'utf8'));
        } catch { return false; }
        if (Date.now() - firstStat.mtimeMs < this.staleLockMs ||
            owner?.hostname !== os.hostname() || !Number.isSafeInteger(owner?.pid) ||
            owner.pid <= 0 || typeof owner.token !== 'string') return false;
        let alive = true;
        try { process.kill(owner.pid, 0); }
        catch (error) { alive = error.code === 'EPERM'; }
        if (alive) return false;
        try {
            const secondStat = await fs.stat(this.lockPath);
            const secondOwner = JSON.parse(await fs.readFile(this.lockPath, 'utf8'));
            if (secondStat.ino !== firstStat.ino || secondStat.mtimeMs !== firstStat.mtimeMs ||
                secondOwner.token !== owner.token || secondOwner.pid !== owner.pid) return false;
            await fs.rm(this.lockPath);
            return true;
        } catch { return false; }
    }
    async acquireLock() {
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        const started = Date.now();
        const owner = { pid: process.pid, hostname: os.hostname(), createdAt: new Date().toISOString(), token: crypto.randomUUID() };
        while (Date.now() - started <= this.lockWaitMs) {
            let handle;
            try {
                handle = await fs.open(this.lockPath, 'wx', 0o600);
                await handle.writeFile(JSON.stringify(owner) + '\n', 'utf8');
                await handle.sync();
                return async () => {
                    try { await handle.close(); } finally {
                        try {
                            const current = JSON.parse(await fs.readFile(this.lockPath, 'utf8'));
                            if (current.token === owner.token) await fs.rm(this.lockPath, { force: true });
                        } catch {}
                    }
                };
            } catch (error) {
                if (handle) {
                    await handle.close().catch(() => {});
                    await fs.rm(this.lockPath, { force: true }).catch(() => {});
                }
                if (error.code !== 'EEXIST') throw error;
                if (await this.recoverStaleLock()) continue;
                await sleep(20);
            }
        }
        const error = new Error('OCR.Space quota ledger is locked or its owner cannot be safely identified; request was not sent.');
        error.code = 'OCRSPACE_QUOTA_LOCKED';
        throw error;
    }
    async readState() {
        try {
            const data = JSON.parse(await fs.readFile(this.filePath, 'utf8'));
            if (!data || data.version !== 1 || !data.daily || !data.monthly || !data.engine3Monthly ||
                Array.isArray(data.daily) || Array.isArray(data.monthly) || Array.isArray(data.engine3Monthly)) throw new Error('Unexpected ledger structure.');
            if (data.reservations !== undefined && (!data.reservations || typeof data.reservations !== 'object' || Array.isArray(data.reservations))) {
                throw new Error('Unexpected reservation structure.');
            }
            data.reservations = data.reservations || {};
            return data;
        } catch (error) {
            if (error.code === 'ENOENT') return { version: 1, daily: {}, monthly: {}, engine3Monthly: {}, reservations: {} };
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
            const reservationId = crypto.randomUUID();
            state.reservations = state.reservations || {};
            state.reservations[reservationId] = {
                day: keys.day, month: keys.month, engine: selected,
                status: 'reserved', createdAt: new Date(now).toISOString(),
            };
            await this.writeState(state);
            return { reservationId, status: 'reserved', reserved: true, daily: daily + 1, monthly: monthly + 1,
                engine3Monthly: selected === 3 ? e3 + 1 : e3,
                limits: { daily: this.maxPerDay, monthly: this.maxPerMonth, engine3Monthly: this.maxEngine3PerMonth } };
        } finally { await release(); }
    }
    async markSubmitted({ reservationId } = {}) {
        if (!reservationId) throw new Error('OCR.Space quota reservation ID is required.');
        const release = await this.acquireLock();
        try {
            const state = await this.readState();
            const reservation = state.reservations?.[reservationId];
            if (!reservation) { const error = new Error('OCR.Space quota reservation was not found.'); error.code = 'OCRSPACE_RESERVATION_NOT_FOUND'; throw error; }
            if (reservation.status === 'reserved') {
                reservation.status = 'submitted';
                reservation.submittedAt = new Date().toISOString();
                await this.writeState(state);
            }
            return { reservationId, status: reservation.status };
        } finally { await release(); }
    }
    async release({ reservationId, reason = 'not_submitted' } = {}) {
        if (!reservationId) throw new Error('OCR.Space quota reservation ID is required.');
        const release = await this.acquireLock();
        try {
            const state = await this.readState();
            const reservation = state.reservations?.[reservationId];
            if (!reservation) return { released: false, reason: 'not_found' };
            if (reservation.status !== 'reserved') return { released: false, reason: 'already_submitted', status: reservation.status };
            state.daily[reservation.day] = Math.max(0, (Number(state.daily[reservation.day]) || 0) - 1);
            state.monthly[reservation.month] = Math.max(0, (Number(state.monthly[reservation.month]) || 0) - 1);
            if (reservation.engine === 3) {
                state.engine3Monthly[reservation.month] = Math.max(0, (Number(state.engine3Monthly[reservation.month]) || 0) - 1);
            }
            reservation.status = 'released';
            reservation.releasedAt = new Date().toISOString();
            reservation.releaseReason = String(reason).slice(0, 200);
            await this.writeState(state);
            return { released: true, reservationId };
        } finally { await release(); }
    }
}
module.exports = { OcrSpaceQuotaLedger, PROVIDER_LIMITS, periodKeys, boundedLimit };

'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

async function writeJsonAtomically(filePath, value, options = {}) {
    const resolved = path.resolve(filePath);
    const directory = path.dirname(resolved);
    const basename = path.basename(resolved);
    const serialized = JSON.stringify(value, null, 2);
    if (serialized === undefined) throw new TypeError('Checkpoint value is not JSON-serializable.');
    const content = serialized + '\n';
    await fs.mkdir(directory, { recursive: true });
    const temporaryPath = path.join(directory, '.' + basename + '.' + process.pid + '.' + randomUUID() + '.tmp');
    let handle = null;
    try {
        handle = await fs.open(temporaryPath, 'wx', options.mode || 0o600);
        await handle.writeFile(content, { encoding: 'utf8' });
        await handle.sync();
        await handle.close();
        handle = null;
        // Same-directory rename provides an atomic replacement on supported
        // local filesystems. If the platform/filesystem refuses replacement,
        // fail closed and preserve the previous checkpoint.
        await fs.rename(temporaryPath, resolved);
        // Best-effort directory metadata flush. Some platforms (notably Windows)
        // do not permit opening a directory handle through this API.
        try {
            const directoryHandle = await fs.open(directory, 'r');
            try { await directoryHandle.sync(); } finally { await directoryHandle.close(); }
        } catch {}
        return resolved;
    } catch (error) {
        try { await handle?.close(); } catch {}
        try { await fs.rm(temporaryPath, { force: true }); } catch {}
        throw error;
    }
}

function createProgressRecord(options = {}) {
    const now = options.startedAt || new Date().toISOString();
    const fixtureOrder = Array.isArray(options.fixtureOrder) ? [...options.fixtureOrder] : [];
    return {
        schemaVersion: 1,
        recordType: 'dwbot-ocr-sequence-progress',
        runId: String(options.runId || (Date.now() + '-' + process.pid)),
        status: 'running',
        acceptanceStatus: 'not-yet-evaluated',
        isReleaseAcceptanceReport: false,
        isResumeToken: false,
        startedAt: now,
        updatedAt: now,
        finishedAt: null,
        reportPath: path.resolve(options.reportPath || 'ocr-sequence-report.json'),
        nodeVersion: String(options.nodeVersion || process.version),
        packageName: String(options.packageName || ''),
        packageVersion: String(options.packageVersion || ''),
        configuredEngine: String(options.configuredEngine || 'auto'),
        networkBlocked: options.networkBlocked === true,
        sourceMetadata: options.sourceMetadata || null,
        fixtureOrder,
        totalJobs: fixtureOrder.length,
        completedJobs: 0,
        completedImages: 0,
        exactMatches: 0,
        mandatoryExactMatches: 0,
        requiredFieldsComplete: 0,
        currentJob: null,
        results: [],
        note: 'Progress evidence only. This file is not a release-acceptance report or an automatic resume token.',
    };
}

function markJobStarted(progress, job = {}) {
    if (!progress || progress.recordType !== 'dwbot-ocr-sequence-progress') throw new TypeError('A DWBOT OCR sequence progress record is required.');
    progress.currentJob = {
        index: Number(job.index) || progress.completedJobs + 1,
        fixtureKey: String(job.fixtureKey || ''),
        filename: String(job.filename || ''),
        status: 'running',
        startedAt: String(job.startedAt || new Date().toISOString()),
    };
    progress.updatedAt = new Date().toISOString();
    return progress;
}

function recordJobResult(progress, row) {
    if (!progress || progress.recordType !== 'dwbot-ocr-sequence-progress') throw new TypeError('A DWBOT OCR sequence progress record is required.');
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new TypeError('An OCR sequence result row is required.');
    progress.results.push(row);
    progress.completedJobs = progress.results.length;
    progress.completedImages = progress.results.filter(item => item.pipelineCompleted === true).length;
    progress.exactMatches = progress.results.filter(item => item.allExpectedFieldsPass === true).length;
    progress.mandatoryExactMatches = progress.results.filter(item => item.allRequiredFieldsPass === true).length;
    progress.requiredFieldsComplete = progress.results.filter(item => item.pipelineCompleted === true && Array.isArray(item.requiredMissing) && item.requiredMissing.length === 0).length;
    progress.currentJob = null;
    progress.updatedAt = new Date().toISOString();
    return progress;
}

function finishProgressRecord(progress, options = {}) {
    if (!progress || progress.recordType !== 'dwbot-ocr-sequence-progress') throw new TypeError('A DWBOT OCR sequence progress record is required.');
    progress.status = 'completed';
    progress.acceptanceStatus = options.acceptancePassed === true ? 'passed' : 'failed';
    progress.reportPath = path.resolve(options.reportPath || progress.reportPath);
    progress.finishedAt = String(options.finishedAt || new Date().toISOString());
    progress.updatedAt = progress.finishedAt;
    progress.currentJob = null;
    return progress;
}

function failProgressRecord(progress, error, options = {}) {
    if (!progress || progress.recordType !== 'dwbot-ocr-sequence-progress') return progress;
    progress.status = 'failed';
    progress.acceptanceStatus = 'not-evaluated';
    progress.finishedAt = String(options.finishedAt || new Date().toISOString());
    progress.updatedAt = progress.finishedAt;
    progress.fatalError = {
        code: String(error && error.code || 'OCR_SEQUENCE_FATAL'),
        message: String(error && error.message || error || 'Unknown OCR sequence failure').slice(0, 1000),
    };
    return progress;
}

module.exports = {
    writeJsonAtomically,
    createProgressRecord,
    markJobStarted,
    recordJobResult,
    finishProgressRecord,
    failProgressRecord,
};

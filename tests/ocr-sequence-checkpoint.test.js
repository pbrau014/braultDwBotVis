'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
    writeJsonAtomically,
    createProgressRecord,
    markJobStarted,
    recordJobResult,
    finishProgressRecord,
} = require('../src/ocr-sequence-checkpoint');

test('atomic JSON writer creates nested checkpoint paths and writes parseable JSON', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dwbot-checkpoint-create-'));
    try {
        const target = path.join(root, 'nested', 'progress.json');
        const saved = await writeJsonAtomically(target, { schemaVersion: 1, status: 'running' });
        assert.equal(saved, target);
        assert.deepEqual(JSON.parse(await fs.readFile(target, 'utf8')), { schemaVersion: 1, status: 'running' });
    } finally {
        await fs.rm(root, { recursive: true, force: true });
    }
});

test('atomic JSON replacement publishes the newest complete document', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dwbot-checkpoint-replace-'));
    try {
        const target = path.join(root, 'progress.json');
        await writeJsonAtomically(target, { revision: 1, results: ['first'] });
        await writeJsonAtomically(target, { revision: 2, results: ['first', 'second'] });
        assert.deepEqual(JSON.parse(await fs.readFile(target, 'utf8')), { revision: 2, results: ['first', 'second'] });
        assert.deepEqual((await fs.readdir(root)).sort(), ['progress.json']);
    } finally {
        await fs.rm(root, { recursive: true, force: true });
    }
});

test('serialization failure preserves the previous checkpoint and leaves no temp file', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dwbot-checkpoint-failure-'));
    try {
        const target = path.join(root, 'progress.json');
        const previous = { revision: 7, status: 'running' };
        await writeJsonAtomically(target, previous);
        const cyclic = { revision: 8 };
        cyclic.self = cyclic;
        await assert.rejects(writeJsonAtomically(target, cyclic), /circular|cyclic/i);
        assert.deepEqual(JSON.parse(await fs.readFile(target, 'utf8')), previous);
        assert.deepEqual(await fs.readdir(root), ['progress.json']);
    } finally {
        await fs.rm(root, { recursive: true, force: true });
    }
});

test('progress record records per-image outcomes without claiming acceptance or resumability', () => {
    const progress = createProgressRecord({
        runId: 'test-run-1',
        fixtureOrder: ['image-a', 'image-b'],
        reportPath: path.join(os.tmpdir(), 'final-report.json'),
        packageName: 'dwbot',
        packageVersion: '1.0.0',
    });
    markJobStarted(progress, { index: 1, fixtureKey: 'image-a', filename: 'a.png', startedAt: '2026-11-04T00:00:00.000Z' });
    recordJobResult(progress, {
        fixtureKey: 'image-a', pipelineCompleted: true, allExpectedFieldsPass: true,
        allRequiredFieldsPass: true, requiredMissing: [],
    });
    markJobStarted(progress, { index: 2, fixtureKey: 'image-b', filename: 'b.png' });
    recordJobResult(progress, {
        fixtureKey: 'image-b', pipelineCompleted: false, allExpectedFieldsPass: false,
        allRequiredFieldsPass: false, requiredMissing: [],
    });
    finishProgressRecord(progress, { acceptancePassed: false, reportPath: progress.reportPath });
    assert.equal(progress.status, 'completed');
    assert.equal(progress.acceptanceStatus, 'failed');
    assert.equal(progress.completedJobs, 2);
    assert.equal(progress.completedImages, 1);
    assert.equal(progress.exactMatches, 1);
    assert.equal(progress.mandatoryExactMatches, 1);
    assert.equal(progress.requiredFieldsComplete, 1);
    assert.equal(progress.currentJob, null);
    assert.equal(progress.isReleaseAcceptanceReport, false);
    assert.equal(progress.isResumeToken, false);
});

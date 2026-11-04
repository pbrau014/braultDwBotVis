'use strict';

// End-to-end lifecycle test: perform a genuine Tesseract.js recognition pass,
// inject a stall into the next recognition operation, require the operation
// watchdog to confirm thread termination and the supervised child to close,
// then process a real fixture successfully in a fresh child.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const Module = require('node:module');
const os = require('node:os');
const path = require('node:path');
const { quoteRequireOption, hasRequireOption } = require('./node-options-path');
const { runSupervisedProcess } = require('../src/ocr-process-supervisor');
const originalLoad = Module._load;
Module._load = function stubNetworkBoundServices(request, parent, isMain) {
    if (request === 'dotenv') return { config() {} };
    if (request === 'discord.js') {
        class MockClient { on() { return this; } once() { return this; } destroy() {} async login() {} }
        return {
            Client: MockClient,
            GatewayIntentBits: { Guilds: 1, GuildMessages: 2, MessageContent: 4 },
            Events: { MessageCreate: 'messageCreate', ClientReady: 'ready' },
            Partials: { Channel: 1 },
        };
    }
    return originalLoad.call(this, request, parent, isMain);
};
const bot = require('../src/bot');
const { numericValueOrNull } = require('../src/battle-record');
const { compareExpected } = require('../src/acceptance-checks');
const { createOcrReportMetadata } = require('../src/ocr-report-metadata');
const root = path.join(__dirname, '..');
const childScript = path.join(root, 'scripts', 'ocr-image-child.js');
const fixtureSpecs = {
    reported: {
        filename: 'Screenshot_2026-10-22_201950.png',
        imagePath: path.join(root, 'fixtures', 'reported-issue', 'Screenshot_2026-10-22_201950.png'),
        expected: {
            result: 'Defeat', player: '[AYNS]BabyEatingDingo', map: 'New Dawn', mode: 'Random Battle',
            battleStart: '30.09.2026 14:46', credits: 540180, xp: 4906, freeXp: 1536, damage: 87373,
        },
    },
    'asashio-defeat.jpg': {
        filename: 'asashio-defeat.jpg',
        imagePath: path.join(root, 'fixtures', 'four-screenshots', 'asashio-defeat.jpg'),
        expected: {
            result: 'Defeat', player: '[OVF]OldschoolGaming_YouTube', map: 'Northern Lights', mode: 'Random Battle',
            battleStart: '14.07.2024 22:51', credits: 1650259, xp: 4059, freeXp: 2110, damage: 171577,
        },
    },
};
const cliArgs = process.argv.slice(2);
const fixtureArg = cliArgs.find(arg => arg.startsWith('--fixture='));
const fixtureKey = fixtureArg ? fixtureArg.slice('--fixture='.length) : 'reported';
const lifecycleOnly = cliArgs.includes('--lifecycle-only');
if (!fixtureSpecs[fixtureKey]) {
    console.error(`[INTEGRATED-STALL] Unknown fixture '${fixtureKey}'. Use ${Object.keys(fixtureSpecs).join(' or ')}.`);
    process.exitCode = 2;
    throw new Error(`Unknown integrated recovery fixture '${fixtureKey}'.`);
}
const selectedFixture = fixtureSpecs[fixtureKey];
const selectedImage = selectedFixture.imagePath;
const expected = selectedFixture.expected;
const blockNetworkPath = path.join(__dirname, 'block-network.js');
const stallPreloadPath = path.join(__dirname, 'inject-recognition-stall-preload.js');
const quoteNodeOption = file => `--require="${file}"`;
const now = new Date().toISOString().replace(/[:.]/g, '-');
const reportDir = path.join(root, 'testdata', 'phase1-evidence', `integrated-stall-recovery-${now}-${process.pid}`);
const reportPath = path.join(reportDir, 'report.json');
const logPath = path.join(reportDir, 'blocked-network-attempts.log');
const resultPathFor = async label => path.join(await fs.mkdtemp(path.join(os.tmpdir(), `wows-${label}-`)), 'result.json');

function childEnv({ injected = false, operationTimeoutMs = 15_000 } = {}) {
    const preloads = [];
    // The acceptance launcher may already preload the network guard; avoid
    // loading it twice while still supporting direct standalone execution.
    if (!hasRequireOption(process.env.NODE_OPTIONS, blockNetworkPath)) preloads.push(quoteRequireOption(blockNetworkPath));
    if (injected) preloads.push(quoteRequireOption(stallPreloadPath));
    return {
        ...process.env,
        OCR_ENGINE: 'tesseractjs',
        OCR_IMAGE_CHILD: '1',
        OCR_OPERATION_TIMEOUT_MS: String(operationTimeoutMs),
        OCR_WORKER_TERMINATION_TIMEOUT_MS: '5000',
        OCR_DEBUG_TIMINGS: '1',
        OCR_NETWORK_BLOCK_ENABLED: '1',
        OCR_NETWORK_BLOCK_LOG: logPath,
        NODE_OPTIONS: [process.env.NODE_OPTIONS, ...preloads].filter(Boolean).join(' '),
        TOURNAMENT_STORAGE: 'json',
    };
}

async function runImage(label, imageBuffer, injected = false) {
    const childStartedAt = Date.now();
    console.log(`[INTEGRATED-STALL] starting ${label} (inject=${injected})`);
    const childResultPath = await resultPathFor(label);
    const childDir = path.dirname(childResultPath);
    try {
        const result = await runSupervisedProcess({
            command: process.execPath,
            args: [childScript, childResultPath],
            cwd: root,
            env: childEnv({ injected }),
            inputBuffer: imageBuffer,
            timeoutMs: injected ? 45_000 : 95_000,
            terminationTimeoutMs: 5_000,
            maxOutputBytes: 10 * 1024 * 1024,
            onOutput: (stream, chunk) => {
                // Stream supervised-child output while it is running so a stuck
                // recovery phase is diagnosable even before the child closes.
                const prefix = `[INTEGRATED-CHILD:${label}:${stream}] `;
                for (const line of String(chunk).split(/(?<=\n)/)) if (line) process.stdout.write(prefix + line);
            },
        });
        const payload = JSON.parse(await fs.readFile(childResultPath, 'utf8'));
        console.log(`[INTEGRATED-STALL] ${label} child closed ${result.code} after ${Date.now() - childStartedAt}ms`);
        return { result, payload, childDir };
    } catch (error) {
        let payload = null;
        try { payload = JSON.parse(await fs.readFile(childResultPath, 'utf8')); } catch {}
        console.log(`[INTEGRATED-STALL] ${label} child error ${error.code || 'no-code'} close=${error.closeConfirmed === true}; ${error.message}`);
        if (error.stdout) console.log(`[INTEGRATED-STALL] ${label} stdout tail:\n${error.stdout.slice(-2500)}`);
        if (error.stderr) console.log(`[INTEGRATED-STALL] ${label} stderr tail:\n${error.stderr.slice(-1500)}`);
        return { error, payload, childDir };
    }
}

(async () => {
    const started = Date.now();
    await fs.mkdir(reportDir, { recursive: true });
    let failedChild = null;
    let recoveryChild = null;
    let recoveryObservation = null;
    let lifecycleEvidence = null;
    try {
        const imageBuffer = await fs.readFile(selectedImage);
        console.log(`[INTEGRATED-STALL] fixture=${fixtureKey}; lifecycleOnly=${lifecycleOnly}; image bytes=${imageBuffer.length}; operation timeout=${process.env.OCR_OPERATION_TIMEOUT_MS || '15000'}ms`);
        const firstStarted = Date.now();
        failedChild = await runImage('injected-stall', imageBuffer, true);
        const failureElapsedMs = Date.now() - firstStarted;
        assert.ok(failedChild.error, 'the injected stalled recognition job must fail, not report success');
        assert.equal(failedChild.error.code, 'SUPERVISED_OCR_CHILD_EXIT');
        assert.equal(failedChild.error.closeConfirmed, true, 'the parent must observe child close');
        assert.equal(failedChild.payload?.ok, false, 'the child must persist its failure result');
        assert.equal(failedChild.payload?.code, 'OCR_OPERATION_TIMEOUT', 'the real OCR watchdog must fire');
        assert.match(failedChild.error.stdout || '', /\[STALL-TEST\] real-recognition-complete/, 'one genuine Tesseract.js recognition must complete before injection');
        assert.match(failedChild.error.stdout || '', /\[STALL-TEST\] injected-recognition-stall/, 'the next recognition call must be stalled');
        assert.match(failedChild.error.stdout || '', /"event":"operation-timeout","operation":"recognize"/, 'the operation watchdog event must be logged');
        assert.match(failedChild.error.stdout || '', /"event":"worker-terminated","confirmed":true/, 'underlying worker-thread termination must be confirmed');

        // A new process now processes the real screenshot through the same
        // production OCR child with no fault injector. This proves recovery after
        // the stalled worker was killed, not just a successful synthetic stub.
        console.log('[INTEGRATED-STALL] injected timeout verified; starting clean recovery job');
        const recoveryStarted = Date.now();
        recoveryChild = await runImage('real-image-recovery', imageBuffer, false);
        const recoveryElapsedMs = Date.now() - recoveryStarted;
        assert.ok(!recoveryChild.error, `recovery image process should exit normally: ${recoveryChild.error?.message || ''}`);
        assert.equal(recoveryChild.result?.closeConfirmed, true);
        assert.equal(recoveryChild.payload?.ok, true, 'recovery child should produce a successful OCR payload');
        assert.ok(Array.isArray(recoveryChild.payload?.output?.attempts) && recoveryChild.payload.output.attempts.length > 0,
            'recovery child should return a well-formed OCR output with at least one attempt');
        assert.ok(recoveryChild.payload?.output?.fields && typeof recoveryChild.payload.output.fields === 'object',
            'recovery child should return structured OCR fields');
        const validations = recoveryChild.payload.output.attempts
            .map(attempt => bot.validateWorldOfWarshipsScreenshot(attempt, recoveryChild.payload.output.fields))
            .sort((a, b) => a.missing.length - b.missing.length || b.confidence - a.confidence);
        const best = validations[0];
        const record = best.record;
        const actual = {
            result: record.result, player: record.player, map: record.map, mode: record.mode,
            battleStart: record.battleStart, credits: numericValueOrNull(record.credits),
            xp: numericValueOrNull(record.xp), freeXp: numericValueOrNull(record.freeXp),
            damage: numericValueOrNull(record.damage),
        };
        const compared = compareExpected(actual, expected);
        const missing = bot.getMissingRequiredFields(record).map(field => ({ key: field.key, reason: field.reason }));
        recoveryObservation = {
            fixture: path.relative(root, selectedImage),
            imageSha256: crypto.createHash('sha256').update(imageBuffer).digest('hex'),
            childCloseConfirmed: recoveryChild.result.closeConfirmed,
            childExitCode: recoveryChild.result.code,
            elapsedMs: recoveryElapsedMs,
            actual, expected, comparison: compared.comparison,
            exactMatch: compared.allMatch,
            requiredMissing: missing,
        };
        const blocked = await fs.readFile(logPath, 'utf8').catch(() => '');
        assert.equal(blocked.trim(), '', 'the integrated stall/recovery test must make no network attempt');

        lifecycleEvidence = {
            realRecognitionCompletedBeforeStall: (failedChild.error.stdout || '').includes('[STALL-TEST] real-recognition-complete'),
            injectedStallOccurred: (failedChild.error.stdout || '').includes('[STALL-TEST] injected-recognition-stall'),
            operationTimeoutLogged: /"event":"operation-timeout","operation":"recognize"/.test(failedChild.error.stdout || ''),
            underlyingWorkerTerminationConfirmed: /"event":"worker-terminated","confirmed":true/.test(failedChild.error.stdout || ''),
            failedChildCloseConfirmed: failedChild.error.closeConfirmed === true,
            freshRecoveryChildStarted: Boolean(recoveryChild),
            recoveryChildExitCode: recoveryChild.result.code,
            recoveryChildCloseConfirmed: recoveryChild.result.closeConfirmed === true,
            recoveryPayloadOkay: recoveryChild.payload?.ok === true,
            recoveryOutputWellFormed: Array.isArray(recoveryChild.payload?.output?.attempts) && recoveryChild.payload.output.attempts.length > 0 &&
                Boolean(recoveryChild.payload?.output?.fields && typeof recoveryChild.payload.output.fields === 'object'),
            networkBlocked: true,
            blockedNetworkAttempts: 0,
        };
        const lifecyclePassed = Object.entries(lifecycleEvidence)
            .filter(([key]) => !['networkBlocked', 'blockedNetworkAttempts'].includes(key))
            .every(([, value]) => value === true || (typeof value === 'number' && value === 0)) && blocked.trim() === '';
        assert.equal(lifecyclePassed, true, 'lifecycle evidence must confirm timeout, termination, close, and fresh-child output');
        if (!lifecycleOnly) {
            assert.equal(compared.allMatch, true, 'the reported-screenshot recovery must pass exact-field comparison');
            assert.equal(missing.length, 0, 'the reported-screenshot recovery must have all required fields complete');
        }

        const report = {
            reportMetadata: createOcrReportMetadata(root),
            schemaVersion: 1,
            createdAt: new Date().toISOString(),
            runtime: { node: process.version, platform: process.platform, arch: process.arch },
            configuredEngine: 'tesseractjs',
            scenario: lifecycleOnly
                ? 'lifecycle-isolation control: real recognition completes once; next recognize call stalls; watchdog terminates worker and confirms child close; fresh child returns well-formed OCR output. Exact-field accuracy is reported separately and does not determine this lifecycle-only exit code.'
                : 'reported-screenshot end-to-end: real recognition completes once; next recognize call stalls; watchdog terminates worker and confirms child close; fresh child processes the reported screenshot and must pass exact fields',
            injectedFailure: {
                expectedFailure: true,
                resultCode: failedChild.payload.code,
                supervisorCode: failedChild.error.code,
                childCloseConfirmed: failedChild.error.closeConfirmed,
                actualRecognitionCompletedBeforeStall: (failedChild.error.stdout || '').includes('[STALL-TEST] real-recognition-complete'),
                injectedStallOccurred: (failedChild.error.stdout || '').includes('[STALL-TEST] injected-recognition-stall'),
                operationTimeoutLogged: /"event":"operation-timeout","operation":"recognize"/.test(failedChild.error.stdout || ''),
                underlyingWorkerTerminationConfirmed: /"event":"worker-terminated","confirmed":true/.test(failedChild.error.stdout || ''),
                elapsedMs: failureElapsedMs,
                stdout: failedChild.error.stdout || '',
                stderr: failedChild.error.stderr || '',
            },
            lifecyclePassed,
            lifecycleEvidence,
            accuracy: recoveryObservation,
            accuracyEvaluatedAsGate: !lifecycleOnly,
            networkBlocked: true,
            blockedNetworkAttempts: 0,
            totalElapsedMs: Date.now() - started,
            passed: true,
        };
        await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
        if (lifecycleOnly) {
            console.log(`[INTEGRATED-STALL] PASS lifecycle-only: timeout, worker termination, child close, fresh child, and well-formed OCR output verified. Accuracy observation: exact=${compared.allMatch}, missingRequired=${missing.length}; accuracy is a separate gate.`);
        } else {
            console.log(`[INTEGRATED-STALL] PASS: lifecycle recovered and reported screenshot passed exact-field comparison with no required fields missing; no network attempts.`);
        }
        console.log(`[INTEGRATED-STALL] Report: ${reportPath}`);
    } catch (error) {
        const report = {
            reportMetadata: createOcrReportMetadata(root),
            schemaVersion: 1,
            createdAt: new Date().toISOString(),
            runtime: { node: process.version, platform: process.platform, arch: process.arch },
            configuredEngine: 'tesseractjs',
            passed: false,
            fixture: path.relative(root, selectedImage),
            lifecycleOnly,
            elapsedMs: Date.now() - started,
            error: { message: error.message, stack: error.stack, code: error.code || null },
            firstChild: failedChild ? { code: failedChild.error?.code || null, closeConfirmed: failedChild.error?.closeConfirmed === true, payload: failedChild.payload || null, stdout: failedChild.error?.stdout || '', stderr: failedChild.error?.stderr || '' } : null,
            recoveryChild: recoveryChild ? { error: recoveryChild.error?.message || null, closeConfirmed: recoveryChild.result?.closeConfirmed === true, payload: recoveryChild.payload || null } : null,
            lifecycleEvidence: lifecycleEvidence || (failedChild ? {
                realRecognitionCompletedBeforeStall: (failedChild.error?.stdout || '').includes('[STALL-TEST] real-recognition-complete'),
                injectedStallOccurred: (failedChild.error?.stdout || '').includes('[STALL-TEST] injected-recognition-stall'),
                operationTimeoutLogged: /"event":"operation-timeout","operation":"recognize"/.test(failedChild.error?.stdout || ''),
                underlyingWorkerTerminationConfirmed: /"event":"worker-terminated","confirmed":true/.test(failedChild.error?.stdout || ''),
                failedChildCloseConfirmed: failedChild.error?.closeConfirmed === true,
                freshRecoveryChildStarted: Boolean(recoveryChild),
                recoveryChildCloseConfirmed: recoveryChild?.result?.closeConfirmed === true,
                recoveryPayloadOkay: recoveryChild?.payload?.ok === true,
            } : null),
            accuracy: recoveryObservation,
            networkBlocked: true,
            blockedNetworkAttempts: (await fs.readFile(logPath, 'utf8').catch(() => '')).trim().split('\n').filter(Boolean).length,
        };
        await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
        console.error(`[INTEGRATED-STALL] FAIL: ${error.message}`);
        console.error(`[INTEGRATED-STALL] Report: ${reportPath}`);
        process.exitCode = 1;
    } finally {
        for (const row of [failedChild, recoveryChild]) {
            if (row?.childDir) await fs.rm(row.childDir, { recursive: true, force: true }).catch(() => {});
        }
        Module._load = originalLoad;
    }
})().catch(error => {
    console.error('[INTEGRATED-STALL] Fatal:', error);
    process.exitCode = 1;
    Module._load = originalLoad;
});

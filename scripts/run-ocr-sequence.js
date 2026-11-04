'use strict';

const Module = require('node:module');
const path = require('node:path');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const os = require('node:os');
const crypto = require('node:crypto');
const { runSupervisedProcess } = require('../src/ocr-process-supervisor');
const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
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
const packageInfo = require('../package.json');
const root = path.join(__dirname, '..');
const specs = {
    'reported': {
        filename: 'Screenshot_2026-10-22_201950.png',
        path: path.join(root, 'fixtures', 'reported-issue', 'Screenshot_2026-10-22_201950.png'),
        expected: { result: 'Defeat', player: '[AYNS]BabyEatingDingo', map: 'New Dawn', mode: 'Random Battle', battleStart: '30.09.2026 14:46', credits: 540180, xp: 4906, freeXp: 1536, damage: 87373 },
    },
    'hoffmann-victory.png': {
        filename: 'hoffmann-victory.png', path: path.join(root, 'fixtures', 'four-screenshots', 'hoffmann-victory.png'),
        expected: { result: 'Victory', player: '[-SEN-]WorldSpOwn', map: 'Mountain Range', mode: 'Random Battle', battleStart: '27.03.2025 23:55', credits: 1237152, xp: 14390, freeXp: 1645, damage: 303622 },
    },
    'asashio-defeat.jpg': {
        filename: 'asashio-defeat.jpg', path: path.join(root, 'fixtures', 'four-screenshots', 'asashio-defeat.jpg'),
        expected: { result: 'Defeat', player: '[OVF]OldschoolGaming_YouTube', map: 'Northern Lights', mode: 'Random Battle', battleStart: '14.07.2024 22:51', credits: 1650259, xp: 4059, freeXp: 2110, damage: 171577 },
    },
    'libertad-victory.jpg': {
        filename: 'libertad-victory.jpg', path: path.join(root, 'fixtures', 'four-screenshots', 'libertad-victory.jpg'),
        expected: { result: 'Victory', player: '[OVF]OldschoolGaming_YouTube', map: 'Sea of Fortune', mode: 'Random Battle', battleStart: '27.12.2024 23:30', credits: 511113, xp: 4509, freeXp: 608, damage: 227678 },
    },
    'schlieffen-defeat.jpg': {
        filename: 'schlieffen-defeat.jpg', path: path.join(root, 'fixtures', 'four-screenshots', 'schlieffen-defeat.jpg'),
        expected: { result: 'Defeat', player: '[ARGSY]Ensign_Cthulhu', map: 'Crash Zone Alpha', mode: 'Brawl', battleStart: '28.08.2025 20:06', credits: 317943, xp: 2653, freeXp: 325, damage: 131828 },
    },
};

// The user's 16 additional screenshots are an explicitly annotated extension
// corpus. Keep them addressable by their original filenames, without silently
// changing the historical five-image default batch. The dedicated additional
// corpus runner selects every manifest record and enforces exact comparisons.
const additionalManifestPath = path.join(root, 'testdata', 'additional-screenshot-ground-truth.json');
const additionalManifest = JSON.parse(fsSync.readFileSync(additionalManifestPath, 'utf8'));
const additionalSpecs = Object.fromEntries(additionalManifest.records.map((item) => [item.key, {
    filename: item.filename,
    path: path.join(root, 'fixtures', 'additional-screenshots', item.filename),
    expected: item.expected,
} ]));

function selectedSpecs(args) {
    if (!args.length) return Object.entries(specs).map(([key, spec]) => ({ key, ...spec }));
    return args.map(key => {
        const spec = specs[key] || additionalSpecs[key];
        if (!spec) throw new Error(`Unknown fixture '${key}'. Choose an existing or additional fixture: ${[...Object.keys(specs), ...Object.keys(additionalSpecs)].join(', ')}`);
        return { key, ...spec };
    });
}

(async () => {
    const results = [];
    const startedAll = Date.now();
    const entries = selectedSpecs(process.argv.slice(2));
    // Explicit test-only hook used by the acceptance launcher to prove that a
    // deliberately wrong expected value fails the real OCR comparison path.
    // It is ignored unless the separate test-mode switch is also enabled.
    const expectedOverride = process.env.OCR_ACCEPTANCE_TEST_MODE === '1'
        ? String(process.env.OCR_ACCEPTANCE_TEST_EXPECTED_OVERRIDE || '') : '';
    if (expectedOverride) {
        const match = expectedOverride.match(/^([a-z0-9_.-]+)\.([a-zA-Z][a-zA-Z0-9]*)=(.+)$/);
        if (!match) throw new Error('Invalid OCR_ACCEPTANCE_TEST_EXPECTED_OVERRIDE; expected fixture.field=value');
        const [, fixtureKey, field, rawValue] = match;
        const spec = entries.find(entry => entry.key === fixtureKey);
        if (!spec) throw new Error(`Expected-override fixture '${fixtureKey}' is not in this run.`);
        if (!(field in spec.expected)) throw new Error(`Expected-override field '${field}' does not exist on fixture '${fixtureKey}'.`);
        let value = rawValue;
        if (rawValue === 'null') value = null;
        else if (/^-?\d+(?:\.\d+)?$/.test(rawValue)) value = Number(rawValue);
        spec.expected = { ...spec.expected, [field]: value };
        console.log(`[OCR-SEQUENCE] TEST-ONLY expected override: ${fixtureKey}.${field}=${String(value)}`);
    }
    const outputPath = path.resolve(process.env.OCR_SEQUENCE_REPORT_PATH || path.join(root, 'testdata', 'ocr-acceptance', `sequence-${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}.json`));
    const saveRaw = process.env.OCR_SAVE_RAW_DIAGNOSTICS === '1';
    try {
        for (let position = 0; position < entries.length; position += 1) {
            const spec = entries[position];
            const start = Date.now();
            console.log(`[OCR-SEQUENCE] ${position + 1}/${entries.length} START ${spec.key}`);
            let supervision = null;
            let childTempDir = null;
            try {
                const buffer = await fs.readFile(spec.path);
                const imageSha256 = crypto.createHash('sha256').update(buffer).digest('hex');
                // Run each OCR job in a separately supervised child. The outer
                // process still owns one sequential batch, but the next image is
                // never started until this child's close event confirms exit.
                // This avoids relying on a reused Tesseract.js worker after a
                // difficult image and gives the parent an independent hard deadline.
                childTempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wows-ocr-image-'));
                const childResultPath = path.join(childTempDir, 'result.json');
                const imageTimeoutMs = Math.max(1000, Number(process.env.OCR_IMAGE_TIMEOUT_MS) || 95_000);
                const supervisedAt = Date.now();
                let childResult;
                try {
                    childResult = await runSupervisedProcess({
                        command: process.execPath,
                        args: [path.join(root, 'scripts', 'ocr-image-child.js'), childResultPath],
                        cwd: root,
                        env: { ...process.env, OCR_IMAGE_CHILD: '1' },
                        inputBuffer: buffer,
                        timeoutMs: imageTimeoutMs,
                        terminationTimeoutMs: Math.max(1000, Number(process.env.OCR_TERMINATION_TIMEOUT_MS) || 5000),
                    });
                } catch (error) {
                    // The image child persists a structured failure payload before
                    // exiting nonzero. Surface that actionable OCR error rather
                    // than masking it with only "child exited with code 1".
                    try {
                        const failedPayload = JSON.parse(await fs.readFile(childResultPath, 'utf8'));
                        if (failedPayload?.ok === false && failedPayload.error) {
                            error.message = `${failedPayload.error} (OCR child exit ${error.code ?? error.exitCode ?? 'nonzero'})`;
                            error.code = failedPayload.code || error.code || 'OCR_CHILD_FAILED';
                        }
                    } catch {}
                    throw error;
                }
                supervision = {
                    closeConfirmed: childResult.closeConfirmed === true,
                    childExitCode: childResult.code,
                    childSignal: childResult.signal,
                    elapsedMs: Date.now() - supervisedAt,
                    timeoutMs: imageTimeoutMs,
                };
                const childPayload = JSON.parse(await fs.readFile(childResultPath, 'utf8'));
                if (!childPayload?.ok || !childPayload.output) {
                    const error = new Error(childPayload?.error || 'Supervised OCR child produced no result payload.');
                    error.code = childPayload?.code || 'SUPERVISED_OCR_EMPTY_RESULT';
                    throw error;
                }
                if (!supervision.closeConfirmed || supervision.childExitCode !== 0) {
                    throw new Error('Supervised OCR child did not confirm a successful close.');
                }
                const output = childPayload.output;
                const validations = output.attempts.map(attempt => bot.validateWorldOfWarshipsScreenshot(attempt, output.fields));
                validations.sort((a, b) => a.missing.length - b.missing.length || b.confidence - a.confidence);
                const best = validations[0];
                const record = best.record;
                const actual = {
                    result: record.result, player: record.player, map: record.map, mode: record.mode,
                    battleStart: record.battleStart, credits: numericValueOrNull(record.credits),
                    xp: numericValueOrNull(record.xp), freeXp: numericValueOrNull(record.freeXp),
                    damage: numericValueOrNull(record.damage),
                };
                const { comparison, allMatch, requiredFieldsPass } = compareExpected(actual, spec.expected);
                const row = {
                    fixtureKey: spec.key, filename: spec.filename, imageSha256,
                    elapsedMs: Date.now() - start, pipelineCompleted: true, attempts: output.attempts.length,
                    selectedPageSegmentationMode: best.pageSegmentationMode, confidence: best.confidence,
                    actual, expected: spec.expected, comparison,
                    allExpectedFieldsPass: allMatch,
                    allRequiredFieldsPass: requiredFieldsPass,
                    requiredMissing: bot.getMissingRequiredFields(record).map(field => ({ key: field.key, reason: field.reason })),
                    ambiguities: record.ambiguities,
                    // Always carry per-image fallback timing/status into acceptance
                    // reports, even when verbose raw OCR diagnostics are disabled.
                    paddleOcrFallback: output.fields.paddleOcrFallback || { enabled: false, status: 'not-reported' },
                    supervision,
                    damageSelection: output.fields.damageSelection || null,
                    damageCandidates: output.fields.damageCandidates || [],
                    fullScreenDamageCandidates: output.fields.fullScreenDamageCandidates || [],
                    damageOcrText: output.fields.damageOcrText || '',
                    ...(saveRaw ? {
                        rawCandidateText: output.attempts.map(attempt => ({ psm: attempt.pageSegmentationMode, confidence: attempt.confidence, text: attempt.text })),
                        fullScreenDamageOcrText: output.fields.fullScreenDamageOcrText || [],
                        rewardOcrText: output.fields.rewardOcrText || '',
                        rawCandidateFields: {
                            identityCandidates: output.fields.identityCandidates,
                            metadataCandidates: output.fields.metadataCandidates,
                            resultCandidates: output.fields.resultCandidates,
                            rewardCandidates: output.fields.rewardCandidates,
                            legacyRewardCandidates: output.fields.legacyRewardCandidates,
                            localizedRewardEvidence: output.fields.localizedRewardEvidence,
                            rewardWordGeometry: output.fields.rewardWordGeometry,
                            performanceOcrText: output.fields.performanceOcrText,
                            performanceOcrWords: output.fields.performanceOcrWords,
                            sourceMetadataTightReads: output.fields.sourceMetadataTightReads,
                            sourceMapModeReads: output.fields.sourceMapModeReads,
                            sourceTimeDiagnostics: output.fields.sourceTimeDiagnostics,
                            panelMetadataCandidates: output.fields.panelMetadataCandidates,
                            damageFieldPasses: output.fields.damageFieldPasses,
                            damageCropSweepDiagnostics: output.fields.damageCropSweepDiagnostics,
                            cvFieldIsolation: output.fields.cvFieldIsolation,
                            cvDamageReads: output.fields.cvDamageReads,
                            paddleOcrFallback: output.fields.paddleOcrFallback || null,
                        },
                    } : {}),
                };
                results.push(row);
                console.log(`[OCR-SEQUENCE] ${row.allRequiredFieldsPass && row.requiredMissing.length === 0 ? 'PASS' : 'FAIL'} ${spec.key} ${row.elapsedMs}ms (mandatoryExact=${row.allRequiredFieldsPass}, allComparedExact=${row.allExpectedFieldsPass}, missing=${row.requiredMissing.length})`);
                if (!row.allRequiredFieldsPass || row.requiredMissing.length) process.exitCode = 1;
            } catch (error) {
                results.push({
                    fixtureKey: spec.key, filename: spec.filename, elapsedMs: Date.now() - start,
                    pipelineCompleted: false, error: error.message, code: error.code || null,
                    supervision: {
                        closeConfirmed: error.closeConfirmed === true,
                        childExitCode: error.exitCode ?? null,
                        childSignal: error.signal ?? null,
                        timeoutMs: error.timeoutMs ?? null,
                    },
                });
                console.error(`[OCR-SEQUENCE] ERROR ${spec.key}: ${error.message}`);
                process.exitCode = 1;
            } finally {
                if (childTempDir) await fs.rm(childTempDir, { recursive: true, force: true });
            }
        }
    } finally {
        try { await bot.terminateOcrWorker(); }
        catch (error) { console.error(`[OCR-SEQUENCE] Worker termination error: ${error.message}`); process.exitCode = 1; }
        Module._load = originalLoad;
    }

    const report = {
        reportMetadata: createOcrReportMetadata(root),
        buildVersion: packageInfo.version,
        packageName: packageInfo.name,
        packageEngines: packageInfo.engines,
        createdAt: new Date().toISOString(),
        nodeVersion: process.version,
        configuredEngine: String(process.env.OCR_ENGINE || 'auto').toLowerCase(),
        executionMode: 'single sequential parent batch; each screenshot runs in an isolated supervised child whose close is confirmed before the next image',
        workerRecyclePerImage: process.env.OCR_RECYCLE_WORKER_PER_IMAGE !== '0',
        operationTimeoutMs: Math.max(100, Number(process.env.OCR_OPERATION_TIMEOUT_MS) || 15000),
        fixtureOrder: entries.map(entry => entry.key),
        imageCount: entries.length,
        completedImages: results.filter(row => row.pipelineCompleted).length,
        exactMatches: results.filter(row => row.allExpectedFieldsPass).length,
        mandatoryExactMatches: results.filter(row => row.allRequiredFieldsPass).length,
        requiredFieldsComplete: results.filter(row => row.pipelineCompleted && row.requiredMissing.length === 0).length,
        durationMs: Date.now() - startedAll,
        networkBlocked: process.env.OCR_NETWORK_BLOCK_ENABLED === '1',
        results,
    };
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`[OCR-SEQUENCE] Report: ${outputPath}`);
    console.log(`[OCR-SEQUENCE] Summary ${report.completedImages}/${entries.length} completed, ${report.mandatoryExactMatches}/${entries.length} exact nine-field mandatory records, ${report.requiredFieldsComplete}/${entries.length} complete required fields; all compared values exact=${report.exactMatches}/${entries.length}`);
    if (report.completedImages !== entries.length || report.mandatoryExactMatches !== entries.length || report.requiredFieldsComplete !== entries.length) process.exitCode = 1;
})().catch(async error => {
    console.error('[OCR-SEQUENCE] Fatal:', error);
    process.exitCode = 1;
    try { await bot.terminateOcrWorker(); } catch {}
    Module._load = originalLoad;
});

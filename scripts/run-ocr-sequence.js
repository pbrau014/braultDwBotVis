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
        class MockClient { constructor() { this.rest = { on() {} }; } on() { return this; } once() { return this; } destroy() {} async login() {} }
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
const { failProgressRecord, createProgressRecord, markJobStarted, recordJobResult, finishProgressRecord, writeJsonAtomically } = require('../src/ocr-sequence-checkpoint');
const { validateSequenceResume, classifySequenceResumeRow } = require('../src/ocr-sequence-resume');
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

let activeProgress = null;
let activeProgressPath = null;


async function verifyCompletedSequenceArtifacts(row, imageSha256) {
    const evidence = row?.ocrSpacePdfFirst || {};
    const artifactDir = path.resolve(String(process.env.OCRSPACE_ARTIFACT_DIR || ''));
    const pdfPath = path.resolve(String(evidence.artifacts?.pdf || ''));
    const rasterPath = path.resolve(String(evidence.artifacts?.raster || ''));
    const inside = target => Boolean(artifactDir) && target.startsWith(artifactDir + path.sep);
    if (evidence.sourceSha256 !== imageSha256 || !inside(pdfPath) || !inside(rasterPath)) return { valid: false, reason: 'PDF/raster paths or source hash do not bind to this inventory and artifact directory.' };
    try {
        const [pdf, raster] = await Promise.all([fs.readFile(pdfPath), fs.readFile(rasterPath)]);
        const pdfSha256 = crypto.createHash('sha256').update(pdf).digest('hex');
        const rasterSha256 = crypto.createHash('sha256').update(raster).digest('hex');
        const pdfEof = pdf.subarray(Math.max(0, pdf.length - 1024)).includes(Buffer.from('%%EOF'));
        const pngSignature = raster.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
        const valid = pdf.subarray(0, 5).toString('ascii') === '%PDF-'
            && pdfEof && pdfSha256 === evidence.pdfSha256
            && rasterSha256 === evidence.rasterSha256 && pngSignature
            && pdf.length === evidence.pdfBytes && raster.length === evidence.rasterBytes;
        return { valid, reason: valid ? null : 'PDF/raster signature, byte count or SHA-256 mismatch.', pdfSha256, rasterSha256, pdfBytes: pdf.length, rasterBytes: raster.length };
    } catch (error) {
        return { valid: false, reason: 'Previously completed PDF/raster cannot be read: ' + String(error.message || error).slice(0, 300) };
    }
}

function getNetworkIsolation() {
    const logPath = String(process.env.OCR_NON_OCR_NETWORK_LOG || '').trim();
    let denied = false;
    let logPresent = false;
    let logBytes = null;
    let logSha256 = null;
    if (logPath) {
        try {
            logPresent = fsSync.existsSync(logPath);
            if (logPresent) {
                const log = fsSync.readFileSync(logPath);
                logBytes = log.length;
                logSha256 = crypto.createHash('sha256').update(log).digest('hex');
                denied = log.length > 0;
            }
        } catch { denied = true; }
    }
    return {
        ocrSpaceEnabled: process.env.OCRSPACE_ENABLED === '1',
        ocrSpaceNetworkAllowed: process.env.OCRSPACE_NETWORK_ALLOWLIST === '1',
        nonOcrNetworkRestricted: process.env.OCR_NON_OCR_NETWORK_RESTRICTED === '1',
        nonOcrDeniedAttemptsDetected: denied,
        networkDiagnosticLogPath: logPath || null,
        networkDiagnosticLogPresent: logPresent,
        networkDiagnosticLogBytes: logBytes,
        networkDiagnosticLogSha256: logSha256,
    };
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
    const progressPath = path.resolve(process.env.OCR_SEQUENCE_PROGRESS_PATH || (outputPath + '.progress.json'));
    const sourceMetadata = createOcrReportMetadata(root);
    const resumeFromPath = String(process.env.OCR_SEQUENCE_RESUME_FROM || '').trim()
        ? path.resolve(process.env.OCR_SEQUENCE_RESUME_FROM) : null;
    let resumeState = null;
    if (resumeFromPath) {
        if (resumeFromPath === progressPath) throw new Error('Resume source and new progress destination must be different files.');
        for (const existing of [outputPath, progressPath]) {
            try { await fs.access(existing); throw new Error('Resume destination already exists; refusing to overwrite evidence: ' + existing); }
            catch (error) { if (error.code !== 'ENOENT') throw error; }
        }
        const priorBytes = await fs.readFile(resumeFromPath);
        const prior = JSON.parse(priorBytes.toString('utf8'));
        if (prior.reportPath) {
            try { await fs.access(prior.reportPath); throw new Error('Prior final report already exists; evaluate it instead of resuming.'); }
            catch (error) { if (error.code !== 'ENOENT') throw error; }
        }
        const validated = validateSequenceResume(prior, {
            entries, packageName: packageInfo.name, packageVersion: packageInfo.version, sourceMetadata,
        });
        resumeState = {
            rows: validated.rows,
            currentJob: validated.currentJob,
            runId: prior.runId,
            progressPath: resumeFromPath,
            progressSha256: crypto.createHash('sha256').update(priorBytes).digest('hex'),
        };
    } else {
        for (const existing of [outputPath, progressPath]) {
            try { await fs.access(existing); throw new Error('Existing OCR sequence evidence found at ' + existing + '; use OCR_SEQUENCE_RESUME_FROM with the exact prior progress file instead of starting a duplicate batch.'); }
            catch (error) { if (error.code !== 'ENOENT') throw error; }
        }
    }
    const progress = createProgressRecord({
        runId: new Date().toISOString().replace(/[:.]/g, '-') + '-' + process.pid,
        reportPath: outputPath,
        fixtureOrder: entries.map(entry => entry.key),
        packageName: packageInfo.name,
        packageVersion: packageInfo.version,
        configuredEngine: String(process.env.OCR_ENGINE || 'auto').toLowerCase(),
        networkBlocked: process.env.OCR_NON_OCR_NETWORK_RESTRICTED === '1', // legacy field: unrelated egress only
        networkIsolation: getNetworkIsolation(),
        sourceMetadata,
    });
    if (resumeState) {
        progress.resumedFrom = {
            runId: resumeState.runId,
            progressPath: resumeState.progressPath,
            progressSha256: resumeState.progressSha256,
            startedAt: new Date().toISOString(),
        };
    }
    progress.networkDiagnosticLogPath = String(process.env.OCR_NON_OCR_NETWORK_LOG || '').trim() || null;
    activeProgress = progress;
    activeProgressPath = progressPath;
    await writeJsonAtomically(progressPath, progress);
    const saveRaw = process.env.OCR_SAVE_RAW_DIAGNOSTICS === '1';
    try {
        for (let position = 0; position < entries.length; position += 1) {
            const spec = entries[position];
            const start = Date.now();
            const buffer = await fs.readFile(spec.path);
            const imageSha256 = crypto.createHash('sha256').update(buffer).digest('hex');
            const priorRow = resumeState?.rows.get(spec.key) || null;
            if (priorRow && priorRow.imageSha256 !== imageSha256) {
                const error = new Error('Prior progress source-image hash differs from the current fixture: ' + spec.filename);
                error.code = 'OCR_SEQUENCE_RESUME_ROW_MISMATCH';
                throw error;
            }
            if (priorRow) {
                const disposition = classifySequenceResumeRow(priorRow, null, spec.key);
                if (disposition === 'verify-and-skip-complete') {
                    const artifactCheck = await verifyCompletedSequenceArtifacts(priorRow, imageSha256);
                    const resumedRow = artifactCheck.valid
                        ? { ...priorRow, resumeDisposition: 'verified-complete-provider-skipped', resumeArtifactVerification: artifactCheck }
                        : { ...priorRow, pipelineCompleted: false, allExpectedFieldsPass: false, allRequiredFieldsPass: false,
                            resumeDisposition: 'artifact-integrity-failure-no-provider-retry',
                            error: artifactCheck.reason, code: 'OCR_SEQUENCE_RESUME_ARTIFACT_INVALID' };
                    results.push(resumedRow);
                    recordJobResult(progress, resumedRow);
                    await writeJsonAtomically(progressPath, progress);
                    if (!artifactCheck.valid) process.exitCode = 1;
                    console.log('[OCR-SEQUENCE] ' + (artifactCheck.valid ? 'SKIP-COMPLETE' : 'FAIL-ARTIFACT') + ' ' + spec.key + ' (provider not repeated)');
                    continue;
                }
                const ambiguous = {
                    ...priorRow, pipelineCompleted: false, allExpectedFieldsPass: false, allRequiredFieldsPass: false,
                    resumeDisposition: 'ambiguous-prior-provider-submission-not-retried',
                    error: priorRow.error || 'Prior image attempt did not record a fully verified completed PDF/raster and local-reader result; automatic provider retry is prohibited.',
                    code: 'OCR_SEQUENCE_RESUME_AMBIGUOUS_SUBMISSION',
                };
                results.push(ambiguous);
                recordJobResult(progress, ambiguous);
                await writeJsonAtomically(progressPath, progress);
                process.exitCode = 1;
                console.log('[OCR-SEQUENCE] SKIP-AMBIGUOUS ' + spec.key + ' (provider not repeated)');
                continue;
            }
            if (resumeState?.currentJob?.fixtureKey === spec.key) {
                const ambiguous = {
                    fixtureKey: spec.key, filename: spec.filename, imageSha256,
                    pipelineCompleted: false, allExpectedFieldsPass: false, allRequiredFieldsPass: false,
                    resumeDisposition: 'ambiguous-in-flight-provider-submission-not-retried',
                    error: 'The prior process checkpointed this image as started but did not record a completed result; provider submission status is ambiguous.',
                    code: 'OCR_SEQUENCE_RESUME_AMBIGUOUS_SUBMISSION',
                };
                results.push(ambiguous);
                recordJobResult(progress, ambiguous);
                await writeJsonAtomically(progressPath, progress);
                process.exitCode = 1;
                console.log('[OCR-SEQUENCE] SKIP-AMBIGUOUS ' + spec.key + ' (prior in-flight request not repeated)');
                continue;
            }
            const artifactDir = String(process.env.OCRSPACE_ARTIFACT_DIR || '').trim()
                ? path.resolve(process.env.OCRSPACE_ARTIFACT_DIR) : null;
            if (artifactDir) {
                const possibleArtifacts = [
                    path.join(artifactDir, imageSha256 + '.ocrspace.pdf'),
                    path.join(artifactDir, imageSha256 + '.ocrspace-page.png'),
                ];
                let artifactExists = false;
                for (const candidate of possibleArtifacts) {
                    try { await fs.access(candidate); artifactExists = true; } catch {}
                }
                if (artifactExists) {
                    const ambiguous = {
                        fixtureKey: spec.key, filename: spec.filename, imageSha256,
                        pipelineCompleted: false, allExpectedFieldsPass: false, allRequiredFieldsPass: false,
                        resumeDisposition: 'orphaned-provider-artifact-not-resubmitted',
                        error: 'A PDF/raster artifact exists without a matching completed progress row; provider submission may already have occurred.',
                        code: 'OCR_SEQUENCE_RESUME_AMBIGUOUS_SUBMISSION',
                    };
                    results.push(ambiguous);
                    recordJobResult(progress, ambiguous);
                    await writeJsonAtomically(progressPath, progress);
                    process.exitCode = 1;
                    console.log('[OCR-SEQUENCE] SKIP-AMBIGUOUS ' + spec.key + ' (orphan artifact; provider not repeated)');
                    continue;
                }
            }
            console.log(`[OCR-SEQUENCE] ${position + 1}/${entries.length} START ${spec.key}`);
            markJobStarted(progress, { index: position + 1, fixtureKey: spec.key, filename: spec.filename, startedAt: new Date().toISOString() });
            await writeJsonAtomically(progressPath, progress);
            let supervision = null;
            let childTempDir = null;
            let resultRecorded = false;
            try {
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
                    ocrSpacePdfFirst: (() => {
                        const evidence = output.fields.ocrSpacePdfFirst || {};
                        return {
                            status: evidence.status || 'not-reported', provider: evidence.provider || null,
                            engine: evidence.engine || null, sourceSha256: evidence.sourceSha256 || null,
                            uploadSha256: evidence.uploadSha256 || null, uploadBytes: evidence.uploadBytes || null,
                            pdfBytes: evidence.pdfBytes || null, pdfSha256: evidence.pdfSha256 || null,
                            rasterBytes: evidence.rasterBytes || null, rasterSha256: evidence.rasterSha256 || null, rasterWidth: evidence.rasterWidth || null,
                            rasterHeight: evidence.rasterHeight || null, artifacts: evidence.artifacts || null,
                            reason: evidence.reason || null, requests: evidence.requests ?? null,
                        };
                    })(),
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
                recordJobResult(progress, row);
                resultRecorded = true;
                await writeJsonAtomically(progressPath, progress);
                console.log(`[OCR-SEQUENCE] ${row.allRequiredFieldsPass && row.requiredMissing.length === 0 ? 'PASS' : 'FAIL'} ${spec.key} ${row.elapsedMs}ms (mandatoryExact=${row.allRequiredFieldsPass}, allComparedExact=${row.allExpectedFieldsPass}, missing=${row.requiredMissing.length})`);
                if (!row.allRequiredFieldsPass || row.requiredMissing.length) process.exitCode = 1;
            } catch (error) {
                // Once a successful row has been added to the in-memory report,
                // checkpoint failures must abort the sequence rather than add a
                // second, contradictory failure row for the same image.
                if (resultRecorded) throw error;
                const errorRow = {
                    fixtureKey: spec.key, filename: spec.filename, elapsedMs: Date.now() - start,
                    pipelineCompleted: false, error: error.message, code: error.code || null,
                    supervision: {
                        closeConfirmed: error.closeConfirmed === true,
                        childExitCode: error.exitCode ?? null,
                        childSignal: error.signal ?? null,
                        timeoutMs: error.timeoutMs ?? null,
                    },
                };
                results.push(errorRow);
                recordJobResult(progress, errorRow);
                await writeJsonAtomically(progressPath, progress);
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
        progressCheckpointPath: progressPath,
        resumedFrom: progress.resumedFrom || null,
        networkDiagnosticLogPath: progress.networkDiagnosticLogPath || null,
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
        networkBlocked: process.env.OCR_NON_OCR_NETWORK_RESTRICTED === '1', // legacy field: unrelated egress only
        networkIsolation: getNetworkIsolation(),
        results,
    };
    await writeJsonAtomically(outputPath, report);
    finishProgressRecord(progress, {
        reportPath: outputPath,
        acceptancePassed: report.completedImages === entries.length
            && report.exactMatches === entries.length
            && report.mandatoryExactMatches === entries.length
            && report.requiredFieldsComplete === entries.length,
    });
    await writeJsonAtomically(progressPath, progress);
    console.log('[OCR-SEQUENCE] Progress checkpoint: ' + progressPath);
    console.log(`[OCR-SEQUENCE] Report: ${outputPath}`);
    console.log(`[OCR-SEQUENCE] Summary ${report.completedImages}/${entries.length} completed, ${report.mandatoryExactMatches}/${entries.length} exact nine-field mandatory records, ${report.requiredFieldsComplete}/${entries.length} complete required fields; all compared values exact=${report.exactMatches}/${entries.length}`);
    if (report.completedImages !== entries.length || report.mandatoryExactMatches !== entries.length || report.requiredFieldsComplete !== entries.length) process.exitCode = 1;
})().catch(async error => {
    console.error('[OCR-SEQUENCE] Fatal:', error);
    process.exitCode = 1;
    if (activeProgress && activeProgressPath) {
        failProgressRecord(activeProgress, error);
        try { await writeJsonAtomically(activeProgressPath, activeProgress); }
        catch (checkpointError) { console.error('[OCR-SEQUENCE] Could not persist fatal progress checkpoint:', checkpointError.message); }
    }
    try { await bot.terminateOcrWorker(); } catch {}
    Module._load = originalLoad;
});

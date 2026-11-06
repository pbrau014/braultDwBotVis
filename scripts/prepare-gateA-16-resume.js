'use strict';

const fs = require('node:fs/promises');
const fsConstants = require('node:fs').constants;
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function parseArgs(args) {
    const out = {};
    for (let i = 0; i < args.length; i += 2) {
        if (!args[i]?.startsWith('--') || !args[i + 1]) throw new Error('Arguments must be --name value pairs.');
        out[args[i].slice(2)] = args[i + 1];
    }
    return out;
}
function samePreflight(a, b) {
    const stable = value => JSON.stringify({
        status: value?.status,
        candidateFingerprint: value?.candidateFingerprint,
        candidateFingerprintMatchesGateBSource: value?.candidateFingerprintMatchesGateBSource,
        gateBSourceRunId: value?.gateBSourceRunId,
        gateBSourceCommitSha: value?.gateBSourceCommitSha,
        manifestSha256: value?.manifestSha256,
        corpusFingerprint: value?.corpusFingerprint,
        rows: value?.rows,
    });
    return stable(a) === stable(b);
}
function extractStartedFixtures(logText) {
    return [...String(logText || '').matchAll(/\[OCR-SEQUENCE\]\s+(\d+)\/16 START ([^\r\n]+)/g)]
        .map(match => ({ index: Number(match[1]), fixtureKey: match[2].trim() }));
}
function pngInfo(bytes) {
    const signature = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
    if (bytes.length < 24 || !bytes.subarray(0,8).equals(signature)
        || bytes.subarray(12,16).toString('ascii') !== 'IHDR') return null;
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function writeJson(filePath, value) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}
async function prepare(options) {
    const sourceRoot = path.resolve(options['source-root'] || '');
    const preflightPath = path.resolve(options.preflight || '');
    const partialRoot = path.resolve(options['partial-artifact-root'] || '');
    const expectedRunId = '42202563673';
    const expectedArtifactId = '13495008195';
    const expectedArtifactSha256 = '398f8152847cd3ea58fb9e16ac01886fced0c880869ce6a430d3343e5cb4ecd8';
    const expectedCandidateSha = String(process.env.GATEB_SOURCE_SHA || 'adaf4f8c3a9573f56d0348a4bba36686fc31c22e').toLowerCase();
    if (!sourceRoot || !preflightPath || !partialRoot) throw new Error('Usage: node scripts/prepare-gateA-16-resume.js --source-root DIR --preflight FILE --partial-artifact-root DIR');
    const sourceCommit = execFileSync('git', ['-C', sourceRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim().toLowerCase();
    if (sourceCommit !== expectedCandidateSha) throw new Error('Gate A source checkout does not match the locked Gate B candidate commit.');
    const manifestPath = path.join(sourceRoot, 'testdata', 'additional-screenshot-ground-truth.json');
    const manifestBytes = await fs.readFile(manifestPath);
    const manifest = JSON.parse(manifestBytes.toString('utf8'));
    const manifestSha256 = sha256(manifestBytes);
    const preflight = JSON.parse(await fs.readFile(preflightPath, 'utf8'));
    const priorPreflightPath = path.join(partialRoot, 'testdata', 'gateA-16-preflight.json');
    const priorPreflight = JSON.parse(await fs.readFile(priorPreflightPath, 'utf8'));
    const priorManifestPath = path.join(partialRoot, 'source', 'testdata', 'additional-screenshot-ground-truth.json');
    const priorManifestBytes = await fs.readFile(priorManifestPath);
    const priorGateAPath = path.join(partialRoot, 'source', 'testdata', 'gateA-16', 'gate-a-acceptance.json');
    const priorGateA = JSON.parse(await fs.readFile(priorGateAPath, 'utf8'));
    const originalJobLogPath = path.join(partialRoot, 'original-run.log');
    const originalJobLog = await fs.readFile(originalJobLogPath, 'utf8');
    const originalStartedFixtures = extractStartedFixtures(originalJobLog);
    const preservedOriginalJobLogPath = path.join(sourceRoot, 'testdata', 'gateA-16', 'original-run-42202563673.log');
    await fs.mkdir(path.dirname(preservedOriginalJobLogPath), { recursive: true });
    await fs.writeFile(preservedOriginalJobLogPath, originalJobLog, { flag: 'wx' });
    if (originalStartedFixtures.length !== 1 || originalStartedFixtures[0].index !== 1
        || originalStartedFixtures[0].fixtureKey !== 'Screenshot_16.jpg') {
        throw new Error('Original job log does not prove exactly one start for Screenshot_16.jpg; refusing to resume any provider work.');
    }
    if (manifest.imageCount !== 16 || manifest.records?.length !== 16 || preflight.imageCount !== 16
        || !samePreflight(priorPreflight, preflight) || manifestSha256 !== preflight.manifestSha256
        || sha256(priorManifestBytes) !== manifestSha256
        || priorGateA.candidateFingerprint !== expectedCandidateSha
        || priorGateA.candidateFingerprintMatchesGateBSource !== true
        || priorGateA.gateBSourceRunId !== '42160979140'
        || priorGateA.gateBSourceCommitSha !== expectedCandidateSha) {
        throw new Error('Partial Gate A artifact, current preflight, manifest or locked candidate fingerprint do not reconcile.');
    }
    const first = manifest.records[0];
    const firstPreflight = preflight.rows?.[0];
    if (!first || !firstPreflight || first.key !== first.filename
        || first.filename !== 'Screenshot_16.jpg'
        || first.sha256 !== firstPreflight.sha256
        || first.filename !== firstPreflight.filename
        || Number(firstPreflight.fieldsPresent) !== 9) {
        throw new Error('First fixture is not the exact first nine-field Gate A preflight record.');
    }
    const sourceImagePath = path.join(sourceRoot, 'fixtures', 'additional-screenshots', first.filename);
    const sourceImage = await fs.readFile(sourceImagePath);
    if (sha256(sourceImage) !== first.sha256 || sourceImage.length !== Number(firstPreflight.bytes)) {
        throw new Error('First source image bytes/hash do not match the approved Gate A manifest and preflight.');
    }

    const partialArtifactDir = path.join(partialRoot, 'source', 'testdata', 'gateA-16', 'artifacts');
    const partialFiles = await fs.readdir(partialArtifactDir);
    const expectedPdfName = first.sha256 + '.ocrspace.pdf';
    const expectedRasterName = first.sha256 + '.ocrspace-page.png';
    if (partialFiles.filter(name => name.endsWith('.ocrspace.pdf')).length !== 1
        || partialFiles.filter(name => name.endsWith('.ocrspace-page.png')).length !== 1
        || !partialFiles.includes(expectedPdfName) || !partialFiles.includes(expectedRasterName)) {
        throw new Error('Original partial artifact must contain exactly one PDF/raster pair for the first fixture; refusing ambiguous recovery.');
    }
    const partialPdfPath = path.join(partialArtifactDir, expectedPdfName);
    const partialRasterPath = path.join(partialArtifactDir, expectedRasterName);
    const [pdf, raster] = await Promise.all([fs.readFile(partialPdfPath), fs.readFile(partialRasterPath)]);
    const rasterDimensions = pngInfo(raster);
    const pdfSha256 = sha256(pdf);
    const rasterSha256 = sha256(raster);
    if (pdf.length < 8 || pdf.subarray(0,5).toString('ascii') !== '%PDF-'
        || !pdf.subarray(Math.max(0,pdf.length-1024)).includes(Buffer.from('%%EOF'))
        || !rasterDimensions?.width || !rasterDimensions?.height) {
        throw new Error('Original partial PDF/raster failed signature, EOF or PNG IHDR validation.');
    }

    const artifactRoot = path.join(sourceRoot, 'testdata', 'gateA-16', 'artifacts');
    await fs.mkdir(artifactRoot, { recursive: true });
    const pdfPath = path.join(artifactRoot, expectedPdfName);
    const rasterPath = path.join(artifactRoot, expectedRasterName);
    for (const target of [pdfPath, rasterPath]) {
        try { await fs.access(target); throw new Error('Gate A resume destination already exists; refusing to overwrite: ' + target); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    await fs.copyFile(partialPdfPath, pdfPath, fsConstants.COPYFILE_EXCL);
    await fs.copyFile(partialRasterPath, rasterPath, fs.constants.COPYFILE_EXCL);

    // The candidate OCR engine remains at the exact Gate B source commit.
    // Only the parent sequence orchestrator and its resume validator are overlaid.
    const candidateRunnerPath = path.join(sourceRoot, 'scripts', 'run-ocr-sequence.js');
    const candidateRunnerSha256 = sha256(await fs.readFile(candidateRunnerPath));
    const candidateResumeHelperPath = path.join(sourceRoot, 'src', 'ocr-sequence-resume.js');
    try { await fs.access(candidateResumeHelperPath); throw new Error('Unexpected resume helper already exists in the pinned candidate; inspect before continuing.'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const root = path.resolve(__dirname, '..');
    const runnerOverlayPath = path.join(root, 'scripts', 'run-ocr-sequence.js');
    const helperOverlayPath = path.join(root, 'src', 'ocr-sequence-resume.js');
    const runnerOverlay = await fs.readFile(runnerOverlayPath);
    const helperOverlay = await fs.readFile(helperOverlayPath);
    await fs.copyFile(runnerOverlayPath, candidateRunnerPath);
    await fs.copyFile(helperOverlayPath, candidateResumeHelperPath);
    const runnerOverlaySha256 = sha256(runnerOverlay);
    const helperOverlaySha256 = sha256(helperOverlay);

    const localResultPath = path.join(sourceRoot, 'testdata', 'gateA-16', 'resume-first-local-reader.json');
    const localNetworkLogPath = path.join(sourceRoot, 'testdata', 'gateA-16', 'resume-local-network.log');
    const progressPath = path.join(sourceRoot, 'testdata', 'gateA-16', 'resume-from-progress.json');
    const reportPath = path.join(sourceRoot, 'testdata', 'gateA-16', 'report.json');
    for (const target of [localResultPath, localNetworkLogPath, progressPath, reportPath, reportPath + '.progress.json']) {
        try { await fs.access(target); throw new Error('Gate A resume evidence destination already exists; refusing to overwrite: ' + target); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    await fs.writeFile(localNetworkLogPath, '');
    const { runSupervisedProcess } = require(path.join(sourceRoot, 'src', 'ocr-process-supervisor'));
    const childEnv = {
        ...process.env,
        OCRSPACE_ENABLED: '0',
        OCRSPACE_API_KEY: '',
        OCRSPACE_NETWORK_ALLOWLIST: '0',
        OCR_NON_OCR_NETWORK_RESTRICTED: '1',
        OCR_NON_OCR_NETWORK_LOG: localNetworkLogPath,
        OCR_ENGINE: 'tesseractjs',
        OCR_SAVE_RAW_DIAGNOSTICS: '1',
        PADDLEOCR_FIELD_FALLBACK: '0',
        OCR_IMAGE_CHILD: '1',
    };
    const supervised = await runSupervisedProcess({
        command: process.execPath,
        args: [path.join(sourceRoot, 'scripts', 'ocr-image-child.js'), localResultPath],
        cwd: sourceRoot,
        env: childEnv,
        inputBuffer: raster,
        timeoutMs: 180000,
        terminationTimeoutMs: 5000,
    });
    if (supervised.closeConfirmed !== true || supervised.code !== 0 || supervised.signal) {
        throw new Error('Local-only OCR recovery child did not close successfully; provider calls are not authorized to proceed.');
    }
    const localPayload = JSON.parse(await fs.readFile(localResultPath, 'utf8'));
    if (localPayload.ok !== true || !localPayload.output || !Array.isArray(localPayload.output.attempts) || !localPayload.output.attempts.length) {
        throw new Error('Local-only OCR recovery produced no usable candidate output; provider calls are not authorized to proceed.');
    }
    const localNetworkLog = await fs.readFile(localNetworkLogPath);
    if (localNetworkLog.length !== 0) throw new Error('Local-only recovery attempted unrelated network access; refusing provider continuation.');

    const bot = require(path.join(sourceRoot, 'src', 'bot'));
    const { numericValueOrNull: toNumeric } = require(path.join(sourceRoot, 'src', 'battle-record'));
    const { compareExpected } = require(path.join(sourceRoot, 'src', 'acceptance-checks'));
    const validations = localPayload.output.attempts.map(attempt => bot.validateWorldOfWarshipsScreenshot(attempt, localPayload.output.fields));
    validations.sort((a, b) => a.missing.length - b.missing.length || b.confidence - a.confidence);
    const best = validations[0];
    const record = best.record;
    const actual = {
        result: record.result, player: record.player, map: record.map, mode: record.mode,
        battleStart: record.battleStart, credits: toNumeric(record.credits),
        xp: toNumeric(record.xp), freeXp: toNumeric(record.freeXp), damage: toNumeric(record.damage),
    };
    const { comparison, allMatch, requiredFieldsPass } = compareExpected(actual, first.expected);
    const requiredMissing = bot.getMissingRequiredFields(record).map(field => ({ key: field.key, reason: field.reason }));
    const row = {
        fixtureKey: first.key, filename: first.filename, imageSha256: first.sha256,
        elapsedMs: Number(supervised.elapsedMs) || null, pipelineCompleted: true,
        attempts: localPayload.output.attempts.length, selectedPageSegmentationMode: best.pageSegmentationMode,
        confidence: best.confidence, actual, expected: first.expected, comparison,
        allExpectedFieldsPass: allMatch, allRequiredFieldsPass: requiredFieldsPass,
        requiredMissing, ambiguities: record.ambiguities,
        paddleOcrFallback: localPayload.output.fields.paddleOcrFallback || { enabled: false, status: 'disabled-for-recovery' },
        supervision: { closeConfirmed: true, childExitCode: 0, childSignal: null, timeoutMs: 180000 },
        damageSelection: localPayload.output.fields.damageSelection || null,
        damageCandidates: localPayload.output.fields.damageCandidates || [],
        fullScreenDamageCandidates: localPayload.output.fields.fullScreenDamageCandidates || [],
        damageOcrText: localPayload.output.fields.damageOcrText || '',
        ocrSpacePdfFirst: {
            status: 'complete', provider: 'ocr.space', engine: 2,
            sourceSha256: first.sha256, uploadSha256: first.sha256, uploadBytes: sourceImage.length,
            pdfBytes: pdf.length, pdfSha256, rasterBytes: raster.length, rasterSha256,
            rasterWidth: rasterDimensions.width, rasterHeight: rasterDimensions.height,
            artifacts: { pdf: pdfPath, raster: rasterPath },
            recoveredFromPriorRunId: expectedRunId, recoveredFromPriorArtifactId: expectedArtifactId,
        },
        providerSubmissionAttempted: true,
        resumeDisposition: 'recovered-existing-pdf-raster-local-reader-rerun',
        originalProviderResponseTextAvailable: false,
    };
    const recoveryReport = {
        schemaVersion: 1, status: allMatch && requiredFieldsPass && requiredMissing.length === 0
            ? 'FIRST_IMAGE_RECOVERED_EXACT' : 'FIRST_IMAGE_NOT_EXACT',
        providerRequests: 0, sourceRunId: expectedRunId, sourceArtifactId: expectedArtifactId,
        sourceArtifactSha256: expectedArtifactSha256, sourceCommit: sourceCommit,
        sourceImageSha256: first.sha256, pdfSha256, rasterSha256,
        localReader: { engine: 'tesseractjs', networkAttempts: 0, closeConfirmed: true },
        actual, expected: first.expected, comparison, allExpectedFieldsPass: allMatch,
        allRequiredFieldsPass: requiredFieldsPass, requiredMissing,
        originalNetworkLogStatus: 'MISSING_FROM_ORIGINAL_PARTIAL_ARTIFACT',
        originalNetworkAttemptCount: null,
        originalJobLogSha256: sha256(Buffer.from(originalJobLog, 'utf8')),
        preservedOriginalJobLogPath: path.relative(sourceRoot, preservedOriginalJobLogPath),
        originalProviderStartCount: originalStartedFixtures.length,
        originalProviderStartedFixtureKeys: originalStartedFixtures.map(item => item.fixtureKey),
        orchestrationOverlay: { candidateRunnerSha256, runnerOverlaySha256, helperOverlaySha256 },
        sourceBuildSha256: null,
        createdAt: new Date().toISOString(),
    };
    const localResult = { ...recoveryReport, row, rawOutput: localPayload.output };
    await writeJson(localResultPath, localResult);
    if (recoveryReport.status !== 'FIRST_IMAGE_RECOVERED_EXACT') {
        await writeJson(path.join(sourceRoot, 'testdata', 'gateA-16', 'resume-manifest.json'), recoveryReport);
        throw new Error('First image was not recovered as an exact nine-field record; no remaining provider requests were made.');
    }

    // Metadata is generated for the exact future OCR run configuration. The
    // placeholder key is used only to record "configured"; it is never passed
    // to the local child or written into a report.
    const originalEnv = {};
    const metadataEnv = {
        OCR_ENGINE: 'tesseractjs', OCRSPACE_ENABLED: '1', OCRSPACE_API_KEY: 'configured-only-for-metadata',
        OCRSPACE_NETWORK_ALLOWLIST: '1', OCR_NON_OCR_NETWORK_RESTRICTED: '1',
        OCR_IMAGE_TIMEOUT_MS: String(process.env.OCR_IMAGE_TIMEOUT_MS || '180000'),
        PADDLEOCR_FIELD_FALLBACK: '0',
    };
    for (const [key, value] of Object.entries(metadataEnv)) {
        originalEnv[key] = process.env[key];
        process.env[key] = value;
    }
    let sourceMetadata;
    try {
        sourceMetadata = require(path.join(sourceRoot, 'src', 'ocr-report-metadata')).createOcrReportMetadata(sourceRoot);
    } finally {
        for (const [key, value] of Object.entries(originalEnv)) {
            if (value === undefined) delete process.env[key]; else process.env[key] = value;
        }
    }
    const packageInfo = require(path.join(sourceRoot, 'package.json'));
    const checkpoint = require(path.join(sourceRoot, 'src', 'ocr-sequence-checkpoint'));
    const progress = checkpoint.createProgressRecord({
        runId: 'reconstructed-from-gateA-run-' + expectedRunId,
        reportPath, fixtureOrder: manifest.records.map(item => item.key),
        packageName: packageInfo.name, packageVersion: packageInfo.version,
        configuredEngine: 'tesseractjs', networkBlocked: true,
        networkIsolation: { ocrSpaceEnabled: true, ocrSpaceNetworkAllowed: true, nonOcrNetworkRestricted: true,
            nonOcrDeniedAttemptsDetected: false, historicalOriginalLogPresent: false },
        sourceMetadata,
    });
    checkpoint.recordJobResult(progress, row);
    progress.status = 'failed';
    progress.acceptanceStatus = 'not-evaluated';
    progress.finishedAt = new Date().toISOString();
    progress.reconstructedFromArtifact = {
        originalRunId: expectedRunId, originalArtifactId: expectedArtifactId,
        originalArtifactSha256: expectedArtifactSha256, originalProgressCheckpointPresent: false,
        originalNetworkLogPresent: false, localReaderRerun: true, providerRequestCountDuringRecovery: 0,
    };
    progress.note = 'Reconstructed resume checkpoint from the original verified PDF/raster artifact. The original report/progress and original network log were absent; this is a derivative checkpoint, not original run evidence. The completed first provider submission is reused and never repeated.';
    await checkpoint.writeJsonAtomically(progressPath, progress);

    recoveryReport.status = 'READY_TO_RESUME_15_NO_DUPLICATE_PROVIDER_REQUEST';
    recoveryReport.sourceBuildSha256 = sourceMetadata.sourceBuild.sha256;
    recoveryReport.resumeProgressPath = path.relative(sourceRoot, progressPath);
    recoveryReport.remainingProviderRequests = 15;
    recoveryReport.completedProviderRequestsReused = 1;
    recoveryReport.resumeProgressSha256 = sha256(await fs.readFile(progressPath));
    recoveryReport.originalNetworkLogStatus = 'MISSING_FROM_ORIGINAL_PARTIAL_ARTIFACT';
    await fs.writeFile(path.join(sourceRoot, 'testdata', 'gateA-16', 'resume-manifest.json'), JSON.stringify(recoveryReport, null, 2) + '\n', { flag: 'wx' });
    console.log('[DWBOT-GATE-A-RESUME] READY; first image recovered locally from existing PDF/raster; provider requests=0 during recovery; remaining=15; original network evidence remains missing.');
    return recoveryReport;
}

if (require.main === module) {
    prepare(parseArgs(process.argv.slice(2))).catch(error => {
        console.error('[DWBOT-GATE-A-RESUME] FAILED:', String(error.message || error).slice(0, 1000));
        process.exitCode = 1;
    });
}
module.exports = { prepare, samePreflight, pngInfo, extractStartedFixtures };

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const { REQUIRED_MANUAL_FIELDS, buildBattleRecord, getMissingRequiredFields, formatBattleRecord } = require('../src/battle-record');

const botSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'bot.js'), 'utf8');
const referenceRunnerSource = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'run-reference-regression.js'), 'utf8');

test('all nine user-designated fields are required; ribbons and auxiliary metadata are optional', () => {
    assert.deepEqual(REQUIRED_MANUAL_FIELDS.map((field) => field.key), [
        'result', 'player', 'map', 'mode', 'battleStart', 'credits', 'freeXp', 'damage', 'xp',
    ]);
    assert.equal(REQUIRED_MANUAL_FIELDS.some((field) => field.key === 'ribbons' || field.key === 'ship' || field.key === 'description'), false);
    assert.match(referenceRunnerSource, /const required = REQUIRED_FIELD_KEYS/,
        'the reference regression runner must use the shared nine-field contract, not a hard-coded subset');
});

test('bot uses OCR-value validation and has no visual-color or signature accept/reject gate', () => {
    assert.match(botSource, /validateWorldOfWarshipsScreenshot\(attempt, ocrOutput\.fields\)/);
    assert.match(botSource, /getMissingRequiredFields\(record\)/);
    for (const obsoleteGate of ['inspectImageVisuals', 'sniffImageFormat', 'isImageAttachment', 'MIN_BLUE_BACKGROUND_RATIO', 'SUPPORTED_IMAGE_FORMATS']) {
        assert.equal(botSource.includes(obsoleteGate), false, `${obsoleteGate} should not be present`);
    }
});

test('result and damage recovery crops include left-edge values on scaled result screens', () => {
    assert.match(botSource, /resultTitleRect[\s\S]{0,160}sourceWidth \* 0\.06/);
    assert.match(botSource, /const narrowWidth = Math\.min\(imageWidth - left, Math\.ceil\(imageWidth \* \(compactLeftLayout \? 0\.09 : 0\.075\)\)\)/);
    assert.match(botSource, /measuredDamageLeftFraction/);
    assert.match(botSource, /correctedDamageLeftFraction/);
    assert.match(botSource, /needsExpandedDamageSweep/);
    assert.match(botSource, /fallbackDamageTop/);
    assert.match(botSource, /performanceAnchor\?\.bbox/);
    assert.match(botSource, /resultTitleSparse/);
});

test('optional ship, result description, and ribbon data do not hold up a complete nine-field report', () => {
    const record = buildBattleRecord('Victory!', {
        identityCandidates: [{ text: '[ABCD]CaptainName', confidence: 95 }, { text: '[ABCD]CaptainName', confidence: 91 }],
        metadataCandidates: [
            { text: 'Shards — Random Battle\nBattle start time: 15.09.2026 19:06', confidence: 95 },
            { text: 'Shards — Random Battle\nBattle start time: 15.09.2026 19:06', confidence: 91 },
        ],
        resultCandidates: [{ text: 'Victory!', confidence: 95 }, { text: 'Victory!', confidence: 90 }],
        rewardCandidates: [
            { credits: '899836', xp: '3776', freeXp: '1596', confidence: 95 },
            { credits: '899836', xp: '3776', freeXp: '1596', confidence: 90 },
        ],
        damageCandidates: [{ value: '321070', confidence: 95 }, { value: '321070', confidence: 91 }],
        ribbons: [],
    });
    assert.deepEqual(getMissingRequiredFields(record), []);
    assert.equal(record.ship, 'Not detected');
    assert.equal(record.description, 'Not detected');
    assert.deepEqual(record.ribbons, []);
    const text = formatBattleRecord(record);
    assert.match(text, /Credits: 899836/);
    assert.match(text, /Free XP: 1596/);
    assert.match(text, /Damage:\*\* 321070/);
    assert.doesNotMatch(text, /Combat Missions|Other displayed rewards/);
});


test('live bot asks for one plain correction value at a time', () => {
    const battleRecordSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'battle-record.js'), 'utf8');
    assert.match(botSource, /const activeField = beforeMissing\[0\]/);
    assert.match(botSource, /`\$\{activeField\.label\}: \$\{content\}`/);
    assert.match(battleRecordSource, /Reply with the value only/);
    assert.doesNotMatch(botSource, /one `Field: value` per line|Correction problems:|Fields still missing:/i);
    assert.doesNotMatch(battleRecordSource, /Choose how to continue|Correction template|clearer, full, uncropped screenshot/i);
});

test('each corrected required value advances to the next missing field', () => {
    const { buildBattleRecord, getMissingRequiredFields, applyCorrections } = require('../src/battle-record');
    let record = buildBattleRecord('', {});
    const values = {
        result: 'Defeat',
        player: '[AYNS]BabyEatingDingo',
        map: 'New Dawn',
        mode: 'Random Battle',
        battleStart: '30.09.2026 14:46',
        credits: '540180',
        freeXp: '1536',
        damage: '87373',
        xp: '3776',
    };
    const asked = [];
    while (getMissingRequiredFields(record).length) {
        const field = getMissingRequiredFields(record)[0];
        asked.push(field.key);
        const result = applyCorrections(record, `${field.label}: ${values[field.key]}`);
        assert.equal(result.invalid.length, 0, `${field.label} should accept the supplied test value`);
        record = result.record;
        assert.notEqual(getMissingRequiredFields(record)[0]?.key, field.key, `${field.label} should clear before the next question`);
    }
    assert.deepEqual(asked, ['result', 'player', 'map', 'mode', 'battleStart', 'credits', 'freeXp', 'damage', 'xp']);
});

test('completed OCR reports export a structured JSON attachment for the tournament importer', () => {
    const recordModule = fs.readFileSync(path.join(__dirname, '..', 'src', 'battle-record.js'), 'utf8');
    assert.match(recordModule, /format:\s*'wows-yolo-tourney-battle'/);
    assert.match(recordModule, /required_fields_complete:\s*getMissingRequiredFields\(record\)\.length === 0/);
    assert.match(botSource, /makeTournamentExport\(record, \{ sourceFileName: fileName, sourceEvidence \}\)/);
    assert.match(botSource, /new AttachmentBuilder\(/);
    assert.match(botSource, /wows-battle-record-\$\{exportData\.record_id\}\.json/);
});


test('unified bot includes tournament admin, result, missing-slot, standings, and recovery commands', () => {
    for (const command of [
        "command === 'add-player'", "command === 'rename-player'", "command === 'remove-player'",
        "command === 'result'", "command === 'setting'", "command === 'standings'",
        "command === 'missing'", "command === 'clear-slot'", "command === 'clear-event'",
        "command === 'clear-results'", "command === 'finalize'", "command === 'export'", "command === 'export-workbook'",
        "command === 'import'", "command === 'records'", "command === 'map'",
    ]) assert.ok(botSource.includes(command), `expected handler for ${command}`);
    assert.match(botSource, /final_summary/);
    assert.match(botSource, /final-tournament-export/);
});

test('unfinished OCR correction state is persisted and rehydrated at startup', () => {
    const tournamentSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'tournament.js'), 'utf8');
    assert.match(tournamentSource, /pendingOcrCorrections: Array\.isArray\(input\.pendingOcrCorrections\)/);
    assert.match(tournamentSource, /pending_ocr_corrections:/);
    assert.match(botSource, /tournamentState\?\.pendingOcrCorrections \|\| \[\]/);
    assert.match(botSource, /pendingRecords\.set\(key, pending\)/);
    assert.match(botSource, /restorePendingOcrCorrectionsFromState\(\)/, 'the same recovery helper is used by startup and full-archive import');
});


test('bot serializes screenshot and tournament-mapping conversations to avoid mixing answers', () => {
    assert.match(botSource, /Finish or `cancel mapping` for the current tournament submission first/);
    assert.match(botSource, /Please upload one screenshot per message/);
    assert.match(botSource, /Finish or `cancel correction` for the active screenshot before starting a different mapping/);
});

test('OCR extraction is serialized end-to-end with bounded backlog and explicit timeout handling', () => {
    assert.match(botSource, /createSerialTaskQueue\(/);
    assert.match(botSource, /return ocrTaskQueue\.run\(\(\) => process\.env\.OCR_IMAGE_CHILD === '1'\s*\?\s*extractTextUnlocked\(imageBuffer\)\s*:\s*runSupervisedExtraction\(imageBuffer\)\)/);
    assert.match(botSource, /async function runSupervisedExtraction\(imageBuffer\)/);
    assert.match(botSource, /runSupervisedProcess\(/);
    assert.match(botSource, /timeoutMs:\s*OCR_IMAGE_TIMEOUT_MS \+ 12_000/);
    assert.match(botSource, /maxPending:\s*MAX_PENDING_OCR_JOBS/);
    assert.match(botSource, /timeoutMs:\s*OCR_IMAGE_TIMEOUT_MS \+ 12_000/);
    assert.match(botSource, /onTimeout:\s*async \(error\) =>[\s\S]{0,220}terminateOcrWorker\(\)/);
    assert.match(botSource, /SERIAL_QUEUE_FULL/);
    assert.match(botSource, /SERIAL_TASK_TIMEOUT/);
    assert.match(botSource, /ocrWorkerGeneration/);
});


test('OCR attachment download is inside the bounded queue and unsafe timeout recovery fails closed', () => {
    assert.match(botSource, /function extractTextFromAttachment\(attachment, onStart = null, sourceContext = \{\}\)\s*\{\s*return ocrTaskQueue\.run\(async \(\) => \{/);
    assert.match(botSource, /sha256: createHash\('sha256'\)\.update\(imageBuffer\)\.digest\('hex'\)/);
    assert.ok(botSource.includes('ocrOutput.sourceEvidence || null'));
    assert.ok(botSource.includes('pending.sourceEvidence || null'));
    assert.match(botSource, /const imageBuffer = await downloadImage\(attachment\);/);
    assert.match(botSource, /const sourceEvidence = buildSourceEvidence\(attachment, imageBuffer, sourceContext\);/);
    assert.match(botSource, /function buildSourceEvidence\(attachment, imageBuffer, sourceContext = \{\}\)/);
    assert.match(botSource, /const output = process\.env\.OCR_IMAGE_CHILD === '1'\s*\?\s*await extractTextUnlocked\(imageBuffer\)\s*:\s*await runSupervisedExtraction\(imageBuffer\);/);
    assert.match(botSource, /return \{ \.\.\.output, sourceEvidence \};/);
    assert.match(botSource, /const ocrPromise = extractTextFromAttachment\(attachment, async \(\) => \{/);
    assert.ok(botSource.includes('messageUrl: message.url'));
    assert.match(botSource, /const ocrOutput = await ocrPromise;/);
    assert.match(botSource, /Could not display OCR typing indicator/);
    assert.match(botSource, /accepted into the OCR queue/i);
    assert.match(botSource, /workflow could not finish reliably/i);
    assert.doesNotMatch(botSource, /const emptyRecord = buildBattleRecord\('', \{\}\);/);
    const queueSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'serial-task-queue.js'), 'utf8');
    assert.match(queueSource, /class SerialTaskUnsettledError/);
    assert.match(queueSource, /closed = true;\s*throw haltError/);
    assert.match(botSource, /SERIAL_TASK_UNSETTLED.*SERIAL_QUEUE_CLOSED/s);
});

test('Node.js 22.16.0 is the accepted runtime baseline; Node 24 is not mandatory', () => {
    const root = path.join(__dirname, '..');
    const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const packageLock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
    const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'dwbot-verification.yml'), 'utf8');
    const nvmrc = fs.readFileSync(path.join(root, '.nvmrc'), 'utf8').trim();
    const windowsAcceptance = fs.readFileSync(path.join(root, 'scripts', 'run-windows-ocr-acceptance.ps1'), 'utf8');

    assert.equal(nvmrc, '22.16.0');
    assert.equal(packageJson.engines?.node, '>=22.16.0');
    assert.equal(packageLock.packages?.['']?.engines?.node, '>=22.16.0');
    assert.match(workflow, /node-version:\s*22\.16\.0/);
    assert.doesNotMatch(workflow, /node-version:\s*24(?:\.|\s|$)/);
    assert.match(windowsAcceptance, /MinimumNodeVersion\s*=\s*'22\.16\.0'/);
});


test('eligible screenshot acceptance uses OCR.Space PDF-first and retains the isolated offline lifecycle test', () => {
    const root = path.join(__dirname, '..');
    const acceptance = fs.readFileSync(path.join(root, 'scripts', 'accept-tesseractjs.js'), 'utf8');
    const windowsAcceptance = fs.readFileSync(path.join(root, 'scripts', 'run-windows-ocr-acceptance.ps1'), 'utf8');
    const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'dwbot-verification.yml'), 'utf8');

    assert.match(acceptance, /OCRSPACE_ENABLED:\s*'1'/);
    assert.match(acceptance, /OCRSPACE_NETWORK_ALLOWLIST:\s*'1'/);
    assert.match(acceptance, /OCRSPACE_ARTIFACT_DIR:\s*path\.join\(runDir/);
    assert.match(acceptance, /isolated-asashio-stall-recovery-lifecycle[\s\S]*?OCRSPACE_ENABLED:\s*'0'[\s\S]*?OCRSPACE_NETWORK_ALLOWLIST:\s*'0'/);
    assert.match(windowsAcceptance, /OCRSPACE_ENABLED='1'/);
    assert.match(windowsAcceptance, /OCRSPACE_NETWORK_ALLOWLIST='1'/);
    assert.match(workflow, /OCRSPACE_ENABLED:\s*'1'/);
    assert.match(workflow, /OCRSPACE_NETWORK_ALLOWLIST:\s*'1'/);
});


test('63-image exploratory workflow persists restricted-egress attempts for artifact review', () => {
    const workflow = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'dwbot-imagesF-63-exploratory.yml'), 'utf8');
    assert.match(workflow, /^  workflow_dispatch:/m);
    assert.doesNotMatch(workflow, /^  push:/m, 'billable exploratory extraction must not trigger from pushes');
    assert.match(workflow, /if: github\.event_name == 'workflow_dispatch'/);
    assert.match(workflow, /OCR_NON_OCR_NETWORK_RESTRICTED: '1'/);
    assert.match(workflow, /OCR_NON_OCR_NETWORK_LOG:/);
    assert.match(workflow, /imagesF-63-blocked-network-attempts\.log/);
    assert.match(workflow, /Initialize restricted-egress diagnostic log for a fresh batch/);
    assert.match(workflow, /if: inputs\.resume_run_id == ''/);
    assert.match(workflow, /if: always\(\)/);
});


test('billable imagesF extraction workflow supports fingerprint-bound no-duplicate resume', () => {
    const workflow = read('.github/workflows/dwbot-imagesF-63-exploratory.yml');
    assert.ok(workflow.includes('node-version: 24.17.0'));
    assert.ok(workflow.includes('Assert accepted Node.js runtime'));
    const runner = read('scripts/run-ocrspace-imagesF-63-exploratory.js');
    const resumeGuard = read('src/ocrspace-exploratory-resume.js');
    assert.match(workflow, /resume_run_id/);
    assert.match(workflow, /gh run view/);
    assert.match(workflow, /headSha -ne \$env:CURRENT_SHA/);
    assert.match(workflow, /progress\.json/);
    assert.match(workflow, /OCRSPACE_63_RESUME=1/);
    assert.match(workflow, /oldNetworkLogs\.Count -ne 1/);
    assert.match(workflow, /network provenance/);
    assert.match(runner, /onProviderRequestStarted/);
    const rasterWrite = runner.indexOf("await fs.writeFile(rasterPath, pdfFirst.rasterBuffer, { flag: 'wx' });");
    const localCheckpoint = runner.indexOf('await writeProgress(outputRoot, run);', rasterWrite);
    const localReaders = runner.indexOf('for (const engine of engines)', rasterWrite);
    assert.ok(rasterWrite >= 0 && localCheckpoint > rasterWrite && localCheckpoint < localReaders, 'PDF/raster must be durably checkpointed before local readers run');
    assert.match(runner, /Keep progress\.json's terminal status aligned with the immutable final report/);
    assert.match(runner, /classifyResumeRow/);
    assert.match(runner, /resume-local-only/);
    assert.match(runner, /local-readers-rerun-from-hash-verified-pdf-derived-raster/);
    assert.match(runner, /Existing OCR.Space output found/);
    assert.match(resumeGuard, /skip-ambiguous/);
    assert.match(resumeGuard, /OCRSPACE_RESUME_FINGERPRINT_MISMATCH/);
});


test('19-image Gate B artifact workflow verifies the completed run without provider requests', () => {
    const workflow = read('.github/workflows/dwbot-imagesF-21-artifact-verification.yml');
    assert.match(workflow, /^  workflow_dispatch:/m);
    assert.match(workflow, /^  push:/m);
    assert.match(workflow, /SOURCE_RUN_ID: \$\{\{ inputs\.source_run_id \|\| '42160979140' \}\}/);
    assert.match(workflow, /gh run download/);
    assert.match(workflow, /prepare-ocrspace-imagesF-63\.py/);
    assert.match(workflow, /verify-ocrspace-imagesF-21-artifacts\.js/);
    assert.match(workflow, /gate-b-complete-ground-truth-19/);
    assert.match(workflow, /recover-ocrspace-imagesF-21-local-readers\.js/);
    assert.match(workflow, /OCRSPACE_ENABLED: '0'/);
    assert.match(workflow, /OCRSPACE_NETWORK_ALLOWLIST: '0'/);
    assert.match(workflow, /evaluate-ocrspace-imagesF-63-ground-truth\.py/);
    assert.match(workflow, /--network-log-reconciliation/);
    assert.match(workflow, /evaluate-ocrspace-pdf-text-layer\.js/);
    assert.match(workflow, /pdf-text-layer-analysis-19\.json/);
    assert.match(workflow, /RECONSTRUCTED_LIMITED_EVIDENCE/);
    assert.match(workflow, /originalBlockedAttemptCount = \$null/);
    assert.match(workflow, /\$recoveryNetworkLog =/);
    assert.doesNotMatch(workflow, /createOcrSpacePdfFirst|OCRSPACE_63_RESUME=1/);
});


test('Gate A acceptance uses the accepted runtime, fail-closed network guard and preserves interruption checkpoints', () => {
    const workflow = read('.github/workflows/dwbot-gateA-16-pdf-first.yml');
    assert.ok(workflow.includes('node-version: 24.17.0'));
    assert.ok(workflow.includes('runtimePass'));
    assert.ok(workflow.includes('Configure fail-closed restricted-egress diagnostic preload'));
    assert.ok(workflow.includes('source/scripts/block-network.js'));
    assert.ok(workflow.includes('scripts/block-network.js'));
    const preload = workflow.split(String.fromCharCode(10)).find(line => line.includes('NODE_OPTIONS='));
    assert.ok(preload && preload.indexOf('$candidateGuard') < preload.indexOf('$failClosedGuard'), 'fail-closed logger must wrap the candidate guard');
    assert.ok(workflow.includes('source/testdata/gateA-16/report.json.progress.json'));
    assert.ok(workflow.includes('cancel-in-progress: false'));
    assert.ok(workflow.includes('DWBOT-GATE-A-16-PDF-FIRST-ONE-TIME'));
});


test('four-image PDF-first runner refuses duplicates and supports fingerprint-bound resume', () => {
    const runner = read('scripts/run-four-screenshot-pipeline.js');
    const sequence = read('scripts/run-ocr-sequence.js');
    const resume = read('src/ocr-sequence-resume.js');
    assert.match(runner, /FOUR_SCREENSHOT_RESUME_FROM/);
    assert.match(runner, /OCR_SEQUENCE_RESUME_FROM/);
    assert.match(runner, /Existing OCR.Space artifacts are present without a resume token/);
    assert.match(runner, /networkDiagnosticLogPresent: fs\.existsSync/);
    assert.match(runner, /originalNetworkLogNoDeniedAttempts/);
    assert.match(runner, /MISSING_ORIGINAL_LOG/);
    assert.match(sequence, /validateSequenceResume/);
    assert.match(sequence, /verifyCompletedSequenceArtifacts/);
    assert.match(sequence, /orphaned-provider-artifact-not-resubmitted/);
    assert.match(sequence, /ambiguous-prior-provider-submission-not-retried/);
    assert.match(resume, /OCR_SEQUENCE_RESUME_FINGERPRINT_MISMATCH/);
});


test('ordinary verification uses Node 24.17 and cannot submit the legacy 56-image provider batch', () => {
    const workflow = read('.github/workflows/dwbot-verification.yml');
    const pkg = JSON.parse(read('package.json'));
    assert.equal(pkg.engines.node, '>=24.17.0');
    assert.ok(workflow.includes('node-version: 24.17.0'));
    assert.ok(workflow.includes('run_legacy_56_provider_acceptance'));
    assert.ok(workflow.includes("if: github.event_name == 'workflow_dispatch' && inputs.run_legacy_56_provider_acceptance == true"));
});

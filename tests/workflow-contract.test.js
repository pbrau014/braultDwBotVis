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
    assert.match(botSource, /const activeField = reviewFields\[0\]/);
    assert.match(botSource, /makeCorrectionPrompt\(pending\.fileName, pending\.record, reviewFields/);
    assert.match(botSource, /applyReviewCorrection\(pending\.record, reviewFields, content\)/);
    assert.match(botSource, /one value only, without a field label or a list/);
    assert.match(battleRecordSource, /Reply with the value only/);
    assert.doesNotMatch(botSource, /one `Field: value` per line|Correction problems:|Fields still missing:/i);
    assert.doesNotMatch(battleRecordSource, /Choose how to continue|Correction template|clearer, full, uncropped screenshot/i);
});

test('conflicting-but-present mandatory OCR values persist in the human correction queue', () => {
    assert.match(botSource, /reviewFields: fields/);
    assert.match(botSource, /REQUIRED_MANUAL_FIELDS\.find\(field => field\.key === unresolved\.field\)/);
    assert.match(botSource, /applyReviewCorrection\(pending\.record, reviewFields, content\)/);
    assert.match(botSource, /pending\.reviewFields = applied\.reviewFields/);
    assert.match(botSource, /if \(pending\.reviewFields\.length\)/);
    assert.match(botSource, /Required values confirmed by the user/);
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

test('Node.js 24.22.1 is the branch runtime baseline', () => {
    const root = path.join(__dirname, '..');
    const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const packageLock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
    const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'dwbot-verification.yml'), 'utf8');
    const nvmrc = fs.readFileSync(path.join(root, '.nvmrc'), 'utf8').trim();
    const windowsAcceptance = fs.readFileSync(path.join(root, 'scripts', 'run-windows-ocr-acceptance.ps1'), 'utf8');

    assert.equal(nvmrc, '24.22.1');
    assert.equal(packageJson.engines?.node, '>=24.17.0');
    assert.equal(packageLock.packages?.['']?.engines?.node, '>=24.17.0');
    assert.match(workflow, /node-version:\s*24\.22\.1/);
    assert.doesNotMatch(workflow, /node-version:\s*22\.16\.0/);
    assert.match(windowsAcceptance, /MinimumNodeVersion\s*=\s*\[version\]'24\.17\.0'/);
});


test('local screenshot acceptance stays offline and live multi-provider smoke is explicit', () => {
    const root = path.join(__dirname, '..');
    const acceptance = fs.readFileSync(path.join(root, 'scripts', 'accept-tesseractjs.js'), 'utf8');
    const windowsAcceptance = fs.readFileSync(path.join(root, 'scripts', 'run-windows-ocr-acceptance.ps1'), 'utf8');
    const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'dwbot-verification.yml'), 'utf8');

    assert.match(acceptance, /DWBOT_MULTI_PROVIDER_ENABLED:\s*'0'/);
    assert.match(acceptance, /OCRSPACE_ENABLED:\s*'0'/);
    assert.match(acceptance, /OCRSPACE_NETWORK_ALLOWLIST:\s*'0'/);
    assert.match(acceptance, /AZURE_DOCUMENT_INTELLIGENCE_ENABLED:\s*'0'/);
    assert.match(acceptance, /additional-sixteen-images-sequential-local/);
    assert.doesNotMatch(acceptance, /ocrspace-pdf-first|OCRSPACE_ARTIFACT_DIR/);
    assert.match(acceptance, /isolated-asashio-stall-recovery-lifecycle[\s\S]*?OCRSPACE_ENABLED:\s*'0'[\s\S]*?OCRSPACE_NETWORK_ALLOWLIST:\s*'0'/);
    assert.match(windowsAcceptance, /OCRSPACE_ENABLED\s*=\s*'0'/);
    assert.match(windowsAcceptance, /AZURE_DOCUMENT_INTELLIGENCE_ENABLED\s*=\s*'0'/);
    assert.match(workflow, /DWBOT_MULTI_PROVIDER_ENABLED:\s*'1'/);
    assert.match(workflow, /OCRSPACE_ENABLED:\s*'1'/);
    assert.match(workflow, /AZURE_DOCUMENT_INTELLIGENCE_ENABLED:\s*'1'/);
});



test('release package excludes runtime state and review-only source assets while retaining useful HTML assets', () => {
    const packager = read('scripts/package-release.ps1');
    assert.match(packager, /DWBOT_56_IMAGE_GROUND_TRUTH_REVIEW/);
    assert.match(packager, /yolo_tournament_complete_instruction_set/);
    assert.match(packager, /persistence-recovery/);
    assert.match(packager, /tournament-state/);
    assert.match(packager, /live-discord-state/);
    assert.match(packager, /provenance\/input-archives/);
    assert.match(packager, /docs\/source-baselines/);
    assert.match(packager, /docs\/source-inputs/);
    assert.match(packager, /excludedReviewAssets/);
    assert.match(packager, /excludedFilePatterns/);
    assert.match(packager, /imgsHalf1-eligible-56/);
    assert.doesNotMatch(packager, /dwbotStuff\/\*|dwbotStuff\\\(\.\*\)/);
});

test('ordinary branch verification has no legacy Gate B or bulk-provider workflow and exposes an explicit multi-provider smoke path', () => {
    const workflow = read('.github/workflows/dwbot-verification.yml');
    const pkg = JSON.parse(read('package.json'));
    assert.equal(pkg.engines.node, '>=24.17.0');
    assert.ok(workflow.includes('run_live_multi_provider_smoke'));
    assert.ok(workflow.includes('DWBOT_MULTI_PROVIDER_ENABLED: \'1\''));
    assert.ok(workflow.includes('AZURE_DOCUMENT_INTELLIGENCE_ENABLED: \'1\''));
    assert.ok(workflow.includes('scripts/run-multi-provider-smoke.js'));
    assert.ok(!workflow.includes('run_legacy_56_provider_acceptance'));
    assert.ok(!workflow.includes('eligible-only 56-image archive'));
    assert.ok(!workflow.includes('Post-hoc Gate B evaluator'));
});


test('Windows CI uploads recovery summaries but never private backups or database copies', () => {
    const workflow = read('.github/workflows/dwbot-verification.yml');
    const start = workflow.indexOf('name: Upload Windows acceptance evidence even on failure');
    const end = workflow.indexOf('  manual-and-package:', start);
    assert.ok(start >= 0 && end > start);
    const artifactStep = workflow.slice(start, end);
    assert.match(artifactStep, /persistence-recovery\/\*\*\/persistence-recovery-report\.json/);
    assert.match(artifactStep, /persistence-recovery\/\*\*\/persistence-recovery-report\.sha256/);
    assert.doesNotMatch(artifactStep, /testdata\/persistence-recovery\/\*\*\s*$/m);
    assert.doesNotMatch(artifactStep, /full-private-backup|copied-full-private-backup|public-redacted-snapshot|\.sqlite/);
});


test('multi-provider smoke preserves original, prepared, and provider-overlay provenance', () => {
    const bot = read('src/bot.js');
    const smoke = read('scripts/run-multi-provider-smoke.js');
    assert.match(bot, /sourceImageProvenance/);
    assert.match(bot, /primaryTesseractPreparedInput/);
    assert.match(smoke, /imageProvenance:\s*output\?\.fields\?\.sourceImageProvenance/);
    assert.match(smoke, /providerOverlay:\s*Array\.isArray\(value\.raw\?\.overlay\)/);
    assert.match(smoke, /overlayTransformToOriginalScreenshot/);
});

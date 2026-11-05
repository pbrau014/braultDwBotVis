'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    NOT_DETECTED,
    parseBattleResult,
    parseResultDescription,
    parseIdentityLine,
    parseModeMap,
    parseBattleStartTime,
    buildBattleRecord,
    getMissingRequiredFields,
    applyCorrections,
    formatBattleRecord,
    makeTournamentExport,
    parseTierFromShip,
    makeCorrectionPrompt,
    numericValueOrNull,
} = require('../src/battle-record');

function completeFields(overrides = {}) {
    return {
        identityCandidates: [
            { text: '[WOLF1]SunkCostFallacy » X SALEM', confidence: 95 },
            { text: '[WOLF1]SunkCostFallacy » X SALEM', confidence: 91 },
        ],
        metadataCandidates: [
            { text: 'Tears of the Desert — Co-op Battle\nBattle start time: 16.11.2022 18:18', confidence: 95 },
            { text: 'Tears of the Desert — Co-op Battle\nBattle start time: 16.11.2022 18:18', confidence: 90 },
        ],
        resultCandidates: [
            { text: 'Victory!\nAll enemy warships destroyed.', confidence: 95 },
            { text: 'Victory!\nAll enemy warships destroyed.', confidence: 91 },
        ],
        rewardCandidates: [
            { credits: '471621', xp: '4023', freeXp: '493', confidence: 95 },
            { credits: '471621', xp: '4023', freeXp: '493', confidence: 90 },
        ],
        damageCandidates: [{ value: '305916', confidence: 95 }, { value: '305916', confidence: 91 }],
        ribbons: [],
        ...overrides,
    };
}

test('XP is mandatory, and missing or invalid XP blocks record acceptance', () => {
    const complete = buildBattleRecord('Victory!', completeFields());
    assert.deepEqual(getMissingRequiredFields(complete), []);
    assert.ok(getMissingRequiredFields({ ...complete, xp: NOT_DETECTED }).some((field) => field.key === 'xp'));
    assert.ok(getMissingRequiredFields({ ...complete, xp: '12O4' }).some((field) => field.key === 'xp'));
    assert.ok(getMissingRequiredFields({ ...complete, xp: '12345678' }).some((field) => field.key === 'xp'));
    const corrected = applyCorrections({ ...complete, xp: NOT_DETECTED }, 'XP: 4023');
    assert.equal(corrected.invalid.length, 0);
    assert.equal(corrected.record.xp, '4023');
    assert.equal(getMissingRequiredFields(corrected.record).some((field) => field.key === 'xp'), false);
});

test('recognizes Victory/Defeat and visible result descriptions', () => {
    assert.equal(parseBattleResult('Victory!\nAll enemy warships destroyed.'), 'Victory');
    assert.equal(parseBattleResult('Defeat\nThe enemy team completed the mission.'), 'Defeat');
    assert.equal(parseBattleResult('Battle summary only'), NOT_DETECTED);
    assert.equal(parseResultDescription('Defeat\nThe enemy team completed the mission.'), 'The enemy team completed the mission.');
});

test('reads player and ship from the dedicated identity line and stops before adjacent UI text', () => {
    const parsed = parseIdentityLine('[WOLF1]SunkCostFallacy » X SALEM Received for the Battle');
    assert.equal(parsed.player, '[WOLF1]SunkCostFallacy');
    assert.equal(parsed.ship, 'X SALEM');
    assert.equal(parseIdentityLine('Personal Score\nVictory!\nNo bracketed identity here').player, NOT_DETECTED);
});

test('extracts map/mode and validates calendar-correct battle timestamps', () => {
    assert.deepEqual(parseModeMap('Tears of the Desert — Co-op Battle'), { map: 'Tears of the Desert', mode: 'Co-op Battle' });
    assert.equal(parseBattleStartTime('Battle start time: 16.11.2022 18:18'), '16.11.2022 18:18');
    assert.equal(parseBattleStartTime('Battlefstartitime:28:09:202417:04'), '28.09.2024 17:04');
    // Low-contrast screenshot OCR sometimes reads date dots as colons. Allow that
    // substitution only in the labelled date/time pattern and still validate the
    // resulting calendar date and clock range.
    assert.equal(parseBattleStartTime('Battle start time: 27:03:2025 23:55'), '27.03.2025 23:55');
    assert.equal(parseBattleStartTime('Battle start time: 31.02.2024 18:18'), NOT_DETECTED);
    assert.equal(parseBattleStartTime('Battle start time: 16.13.2022 18:18'), NOT_DETECTED);
});

test('parseBattleStartTime accepts a labeled nine-digit compact date only after strict calendar validation', () => {
    assert.equal(parseBattleStartTime('Battlelstartitimes281091202417:04'), '28.09.2024 17:04');
    assert.equal(parseBattleStartTime('Battle start time: 28102024 17:04'), '28.10.2024 17:04');
    assert.equal(parseBattleStartTime('Battle start time: 31132024 17:04'), NOT_DETECTED);
});

test('parseModeMap strips malformed banner fragments and trailing OCR punctuation', () => {
    assert.deepEqual(parseModeMap('Crash Zone Alpha — Brawl'), { map: 'Crash Zone Alpha', mode: 'Brawl' });
    assert.deepEqual(parseModeMap('— Crash Zone Alpha — Brawl —'), { map: 'Crash Zone Alpha', mode: 'Brawl' });
    assert.deepEqual(parseModeMap('Hil avi] Big Race — Random Battle'), { map: 'Big Race', mode: 'Random Battle' });
    assert.deepEqual(parseModeMap('North& — Random Battle'), { map: 'North', mode: 'Random Battle' });
    // Native Tesseract can capture the map separator but omit the following mode.
    assert.deepEqual(parseModeMap('Crash Zone Alpha —'), { map: 'Crash Zone Alpha', mode: NOT_DETECTED });
});

test('parseModeMap recovers a trailing-separator map line inside multiline OCR text', () => {
    assert.deepEqual(
        parseModeMap('Victory!\nCrash Zone Alpha —\nBattle start time: 28.08.2025 20:06'),
        { map: 'Crash Zone Alpha', mode: NOT_DETECTED },
    );
});

test('parseModeMap removes an inserted lowercase i at a fused title-case map boundary', () => {
    assert.deepEqual(parseModeMap('MountainiRange — RandomBattle'), {
        map: 'Mountain Range', mode: 'Random Battle',
    });
});

test('normalizes known OCR spacing/truncation artifacts in battle modes and map separators', () => {
    assert.deepEqual(parseModeMap('Sleeping Giant — AsymmetricBattle'), {
        map: 'Sleeping Giant', mode: 'Asymmetric Battle',
    });
    assert.deepEqual(parseModeMap('Sea of Fortune — RandomBattle'), {
        map: 'Sea of Fortune', mode: 'Random Battle',
    });
    assert.deepEqual(parseModeMap('Big\\Race — RandomBattle'), {
        map: 'Big Race', mode: 'Random Battle',
    });
    assert.deepEqual(parseModeMap('Sea of Fortune — Braw'), {
        map: 'Sea of Fortune', mode: 'Brawl',
    });
    assert.deepEqual(parseModeMap('Sealof Fortune — Braw'), {
        map: 'Sea of Fortune', mode: 'Brawl',
    });
});

test('builds a complete record from agreeing OCR candidates and does not require ribbons', () => {
    const record = buildBattleRecord('Victory!\nAll enemy warships destroyed.', completeFields());
    assert.deepEqual(getMissingRequiredFields(record), []);
    assert.equal(record.credits, '471621');
    assert.equal(record.xp, '4023');
    assert.equal(record.freeXp, '493');
    assert.equal(record.damage, '305916');
    assert.deepEqual(record.ribbons, []);
    const output = formatBattleRecord(record);
    assert.match(output, /Credits: 471621/);
    assert.match(output, /Free XP: 493/);
    assert.match(output, /Damage:\*\* 305916/);
    assert.doesNotMatch(output, /Combat Missions|Other displayed rewards/);
});

test('disagreement marks only the affected field as missing instead of silently choosing one OCR value', () => {
    const fields = completeFields({
        rewardCandidates: [
            { credits: '471621', xp: '4023', freeXp: '493' },
            { credits: '471621', xp: '4023', freeXp: '499' },
        ],
        damageCandidates: [{ value: '305916' }, { value: '305916' }],
    });
    const record = buildBattleRecord('Victory!', fields);
    assert.equal(record.freeXp, NOT_DETECTED);
    assert.ok(getMissingRequiredFields(record).some((field) => field.key === 'freeXp'));
    assert.match(record.ambiguities.freeXp, /disagreed/i);
    assert.equal(record.damage, '305916');
});

test('conflicting result, map or identity readings are sent for correction', () => {
    const fields = completeFields({
        identityCandidates: [
            { text: '[WOLF1]SunkCostFallacy » X SALEM' },
            { text: '[TEST]DifferentPlayer » X SALEM' },
        ],
        metadataCandidates: [
            { text: 'Tears of the Desert — Co-op Battle\nBattle start time: 16.11.2022 18:18' },
            { text: 'Shards — Co-op Battle\nBattle start time: 16.11.2022 18:18' },
        ],
        resultCandidates: [{ text: 'Victory!' }, { text: 'Defeat' }],
    });
    const record = buildBattleRecord('Battle Performance', fields);
    const missingKeys = getMissingRequiredFields(record).map((field) => field.key);
    assert.ok(missingKeys.includes('player'));
    assert.ok(missingKeys.includes('map'));
    assert.ok(missingKeys.includes('result'));
});

test('manual corrections can fill just the missing fields and valid short damage values', () => {
    const record = buildBattleRecord('Victory!', completeFields({ damageCandidates: [] }));
    assert.ok(getMissingRequiredFields(record).some((field) => field.key === 'damage'));
    const corrected = applyCorrections(record, 'Damage: 700\nFree XP: 1596');
    assert.equal(corrected.record.damage, '700');
    assert.equal(corrected.record.freeXp, '1596');
    assert.equal(corrected.invalid.length, 0);
    assert.ok(getMissingRequiredFields(corrected.record).every((field) => field.key !== 'damage'));
});

test('correction prompts ask for exactly one missing value at a time', () => {
    const record = buildBattleRecord('Battle summary only', {});
    const missing = getMissingRequiredFields(record);
    const firstPrompt = makeCorrectionPrompt('screen.png', record, missing);
    assert.match(firstPrompt, /Battle Result needed/);
    assert.match(firstPrompt, /What is the correct Battle Result/i);
    assert.match(firstPrompt, /value only/i);
    assert.match(firstPrompt, /Victory or Defeat/);
    assert.match(firstPrompt, /cancel correction/i);
    assert.doesNotMatch(firstPrompt, /Player needed|Map needed|Battle Mode needed|Damage needed/);
    assert.doesNotMatch(firstPrompt, /clearer, full, uncropped|Choose how to continue|Fields needing attention|Field: value per line|Correction template/i);

    const nextPrompt = makeCorrectionPrompt('screen.png', record, missing.slice(2));
    assert.match(nextPrompt, /Map needed/);
    assert.doesNotMatch(nextPrompt, /Battle Result needed|Player needed|Battle Mode needed|Damage needed/);
});

test('correction prompts never show sample field values or ask for a bulk correction', () => {
    const record = buildBattleRecord('Battle summary only', completeFields({
        resultCandidates: [{ text: 'Unreadable', confidence: 20 }],
        damageCandidates: [],
    }));
    const missing = getMissingRequiredFields(record);
    const prompt = makeCorrectionPrompt('Screenshot_2026-10-22_201950.png', record, missing);
    assert.match(prompt, /Battle Result needed/);
    assert.doesNotMatch(prompt, /Damage needed/);
    assert.doesNotMatch(prompt, /Battle Result: Victory/);
    assert.doesNotMatch(prompt, /Damage: 305916/);
    assert.doesNotMatch(prompt, /899836|321070|1596/);
});

test('correction parser accepts labelled fields and rejects malformed values', () => {
    const record = buildBattleRecord('Victory!', completeFields({ rewardCandidates: [], damageCandidates: [] }));
    const result = applyCorrections(record, [
        'Battle Result: Defeat',
        'Player: [ABCD]CaptainName',
        'Map: Shards',
        'Battle Mode: Random Battle',
        'Battle Start Time: 15.09.2026 19:06',
        'Credits: 899 836',
        'Free XP: 1,596',
        'Damage: 321 070',
        'XP: 4,023',
    ].join('\n'));
    assert.equal(result.invalid.length, 0);
    assert.deepEqual(getMissingRequiredFields(result.record), []);
    assert.equal(result.record.result, 'Defeat');
    assert.equal(result.record.credits, '899836');
    assert.equal(result.record.freeXp, '1596');
    assert.equal(result.record.damage, '321070');
    assert.equal(result.record.xp, '4023');
});

test('a single high-confidence OCR reading may pass, but a single weak reading is requested for correction', () => {
    const highConfidenceFields = completeFields({
        identityCandidates: [{ text: '[WOLF1]SunkCostFallacy » X SALEM', confidence: 93 }],
        metadataCandidates: [{ text: 'Tears of the Desert — Co-op Battle\nBattle start time: 16.11.2022 18:18', confidence: 92 }],
        resultCandidates: [{ text: 'Victory! All enemy warships destroyed.', confidence: 94 }],
        rewardCandidates: [{ credits: '471621', xp: '4023', freeXp: '493', confidence: 93 }],
        damageCandidates: [{ value: '305916', confidence: 92 }],
    });
    assert.deepEqual(getMissingRequiredFields(buildBattleRecord('Victory!', highConfidenceFields)), []);

    const weakReadFields = completeFields({
        rewardCandidates: [{ credits: '471621', xp: '4023', freeXp: '493', confidence: 51 }],
    });
    const weakRecord = buildBattleRecord('Victory!', weakReadFields);
    assert.ok(getMissingRequiredFields(weakRecord).some((field) => field.key === 'credits'));
    assert.match(weakRecord.ambiguities.credits, /only one OCR pass/i);
});

test('missing ribbons are not part of the exact required-field list', () => {
    const record = buildBattleRecord('Victory!', completeFields({ ribbons: [] }));
    assert.deepEqual(getMissingRequiredFields(record), []);
    assert.doesNotMatch(formatBattleRecord(record), /Combat Missions/);
});

test('an invalid manual correction cannot leave a prior guessed required value in place', () => {
    const record = buildBattleRecord('Victory!', completeFields());
    assert.equal(record.damage, '305916');
    const corrected = applyCorrections(record, 'Damage: not sure');
    assert.equal(corrected.record.damage, NOT_DETECTED);
    assert.ok(getMissingRequiredFields(corrected.record).some((field) => field.key === 'damage'));
    assert.match(corrected.record.ambiguities.damage, /not accepted/i);
});

test('tournament JSON export is stable, typed, and never invents missing tournament inputs', () => {
    const record = buildBattleRecord('Victory!\nAll enemy warships destroyed.', completeFields({
        ribbons: [{ label: 'Destroyed', count: '3' }, { label: 'Set on fire', count: '' }],
    }));
    const exported = makeTournamentExport(record, {
        sourceFileName: 'battle.png',
        exportedAt: '2026-10-23T00:00:00.000Z',
        sourceEvidence: {
            platform: 'discord', messageId: '123456789012345678', channelId: '223456789012345678',
            messageUrl: 'https://discord.com/channels/323456789012345678/223456789012345678/123456789012345678',
            attachmentId: '423456789012345678', sha256: 'a'.repeat(64), sizeBytes: 98765,
            contentType: 'image/png', retrievedAt: '2026-10-23T00:00:00.000Z',
        },
    });
    assert.equal(exported.format, 'wows-yolo-tourney-battle');
    assert.equal(exported.schema_version, 1);
    assert.match(exported.record_id, /^[a-f0-9]{24}$/);
    assert.equal(exported.verification.required_fields_complete, true);
    assert.equal(exported.battle.player_name, '[WOLF1]SunkCostFallacy');
    assert.equal(exported.battle.metrics.damage, 305916);
    assert.equal(exported.battle.metrics.kills, 3);
    assert.equal(exported.battle.metrics.time, null);
    assert.equal(exported.battle.rewards.credits, 471621);
    assert.equal(exported.battle.ribbons[1].count, null);
    assert.equal(exported.tournament.round, null);
    assert.equal(exported.tournament.game_number, null);
    assert.equal(exported.tournament.ship_class, null);
    assert.equal(exported.tournament.tier, null);
    assert.equal(exported.tournament.suggestions.tier_from_ship_name, 10);
    assert.equal(exported.source.screenshot_filename, 'battle.png');
    assert.equal(exported.source.evidence.message_id, '123456789012345678');
    assert.equal(exported.source.evidence.attachment_id, '423456789012345678');
    assert.equal(exported.source.evidence.sha256, 'a'.repeat(64));
    assert.equal(exported.source.evidence.size_bytes, 98765);
    assert.equal(exported.source.evidence.message_url, 'https://discord.com/channels/323456789012345678/223456789012345678/123456789012345678');
    assert.equal(makeTournamentExport(record, { exportedAt: '2027-01-01T00:00:00.000Z' }).source.evidence, null);
    assert.equal(makeTournamentExport(record, { sourceEvidence: { sha256: 'not-a-hash', messageUrl: 'https://evil.example/x' } }).source.evidence.sha256, null);
    assert.equal(makeTournamentExport(record, { sourceEvidence: { sha256: 'not-a-hash', messageUrl: 'https://evil.example/x' } }).source.evidence.message_url, null);
    assert.equal(makeTournamentExport(record, { exportedAt: '2027-01-01T00:00:00.000Z' }).record_id, exported.record_id);
});

test('desktop upload evidence preserves its provenance marker and cryptographic digest', () => {
    const record = buildBattleRecord('Victory!', completeFields());
    const exported = makeTournamentExport(record, {
        sourceFileName: 'desktop-upload.png',
        sourceEvidence: { platform: 'desktop', sha256: 'b'.repeat(64), sizeBytes: 1234,
            contentType: 'image/png', retrievedAt: '2026-11-04T18:00:00.000Z' },
    });
    assert.equal(exported.source.evidence.platform, 'desktop');
    assert.equal(exported.source.evidence.sha256, 'b'.repeat(64));
    assert.equal(exported.source.evidence.size_bytes, 1234);
    assert.equal(exported.source.evidence.content_type, 'image/png');
});
test('ship tier suggestions support Roman numerals through tier XI without claiming class or time', () => {
    assert.equal(parseTierFromShip('XI SUPERSHIP'), 11);
    assert.equal(parseTierFromShip('VIII SHIP NAME'), 8);
    assert.equal(parseTierFromShip('Ship without tier'), null);
});

test('map consensus strips leading result-banner and all-caps OCR debris without using ground-truth map names', () => {
    const fields = completeFields({
        metadataCandidates: [
            { text: 'Mountain Range — Random Battle\nBattle start time: 27.03.2025 23:55', confidence: 82, weight: 1.4, source: 'full-screen-psm-3' },
            { text: 'Victor Mountain Range — Random Battle\nBattle start time: 27.03.2025 23:55', confidence: 78, weight: 1.4, source: 'full-screen-psm-11' },
        ],
    });
    const mountainRecord = buildBattleRecord('Victory', fields);
    assert.equal(mountainRecord.map, 'Mountain Range');

    const crashFields = completeFields({
        metadataCandidates: [
            { text: 'Crash Zone Alpha — Brawl\nBattle start time: 28.08.2025 20:06', confidence: 80, weight: 1.4, source: 'full-screen-psm-3' },
            { text: 'ATRAT Crash Zone Alpha — Brawl\nBattle start time: 28.08.2025 20:06', confidence: 74, weight: 1.4, source: 'full-screen-psm-11' },
        ],
    });
    const crashRecord = buildBattleRecord('Defeat', crashFields);
    assert.equal(crashRecord.map, 'Crash Zone Alpha');
});

test('weighted player and cleaned map candidates resolve only OCR debris and common glyph confusion', () => {
    const fields = completeFields({
        identityCandidates: [
            { text: '[OVF]OldschoolGaming_YouTube VIII ASASHIO', confidence: 69, weight: 1.5, source: 'prepared-identity-psm6' },
            { text: '[OVF]OldschoolGaming_YouTube VIII ASASHIO', confidence: 68, weight: 1.5, source: 'prepared-identity-psm11' },
            { text: '[OVF]0ldschoolGaming_YouTube VIII ASASHIO', confidence: 77, weight: 1.1, source: 'source-identity-psm6' },
            { text: '[OVF]0ldschoolGaming_YouTube VIII ASASHIO', confidence: 74, weight: 1.1, source: 'source-identity-psm11' },
        ],
        metadataCandidates: [
            { text: 'D ef e 1 Northern Lights — Random Battle\nBattle start time: 14.07.2024 22:51', confidence: 66, weight: 1.4, source: 'full-screen-psm-3' },
            { text: ')) ef Eg at Northern Lights — Random Battle\nBattle start time: 14.07.2024 22:51', confidence: 70, weight: 1.4, source: 'full-screen-psm-11' },
            { text: 'Northern Lights — Random Battle\nBattle start time: 14.07.2024 22:51', confidence: 92, weight: 1.0, source: 'tight-metadata' },
        ],
    });
    const record = buildBattleRecord('Defeat', fields);
    assert.equal(record.player, '[OVF]OldschoolGaming_YouTube');
    assert.equal(record.map, 'Northern Lights');
    assert.equal(record.mode, 'Random Battle');
    assert.equal(record.battleStart, '14.07.2024 22:51');
});


test('operation result descriptions identify a primary-task victory without a readable Victory title', () => {
  const { parseBattleResult, parseResultDescription, buildBattleRecord } = require('../src/battle-record');
  assert.equal(parseBattleResult('Our team completed the primary task.'), 'Victory');
  assert.equal(parseResultDescription('Our team completed the primary task.'), 'Our team completed the primary task.');
  const record = buildBattleRecord('', { resultCandidates: [
    { text: 'Our team completed the primary task.', confidence: 78 },
    { text: 'Our team completed the primary task.', confidence: 70 },
  ] });
  assert.equal(record.result, 'Victory');
});

test('a result-description line stating that our team won by points is a victory', () => {
    assert.equal(parseBattleResult('Our team won by points.'), 'Victory');
    assert.equal(parseResultDescription('Our team won by points.'), 'Our team won by points.');
    assert.equal(parseBattleResult("Our'team WOR'by points"), 'Victory');
    assert.equal(parseResultDescription("Our'team WOR'by points"), 'Our team won by points.');
});

test('map cleanup discards leading parenthesized numeric OCR debris', () => {
  const { buildBattleRecord } = require('../src/battle-record');
  const record = buildBattleRecord('', { metadataCandidates: [
    { text: 'Aegis — Operations', confidence: 48 },
    { text: '(1) \\ a | Aegis — Operations', confidence: 68 },
  ] });
  assert.equal(record.map, 'Aegis');
  assert.equal(record.mode, 'Operations');
});

test('rejects undecodable replacement characters in OCR metadata and manual corrections', () => {
    const malformedMap = 'Estuary \uFFFD';
    const fields = completeFields({
        metadataCandidates: [
            { text: `${malformedMap} — Random Battle\nBattle start time: 15.09.2024 11:56`, confidence: 90 },
            { text: `${malformedMap} — Random Battle\nBattle start time: 15.09.2024 11:56`, confidence: 88 },
        ],
    });
    const record = buildBattleRecord('Victory!', fields);
    assert.equal(record.map, NOT_DETECTED);
    assert.ok(getMissingRequiredFields(record).some((field) => field.key === 'map'));

    const corrected = applyCorrections(record, `Map: ${malformedMap}`);
    assert.equal(corrected.record.map, NOT_DETECTED);
    assert.equal(corrected.invalid.length, 1);
    assert.match(corrected.invalid[0].reason, /replacement character/i);

    assert.ok(getMissingRequiredFields({ ...record, map: malformedMap }).some((field) => field.key === 'map'));
});


test('numeric conversion preserves legitimate zero-valued fields and rejects malformed or unsafe values', () => {
    assert.equal(numericValueOrNull('0'), 0);
    assert.equal(numericValueOrNull('0,000'), 0);
    assert.equal(numericValueOrNull('1,234,567'), 1234567);
    assert.equal(numericValueOrNull('Not detected'), null);
    assert.equal(numericValueOrNull('12O4'), null);
    assert.equal(numericValueOrNull('9007199254740992'), null);
});

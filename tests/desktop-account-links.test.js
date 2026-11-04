'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../src/tournament');
test('Discord account links are unique, survive the private archive, and stay out of workbook exports', () => {
  const state = T.createState();
  const alpha = T.addPlayer(state, 'Alpha');
  const bravo = T.addPlayer(state, 'Bravo');
  const discordAlpha = '12345678901234567';
  const discordBravo = '22345678901234567';
  T.linkPlayerDiscordAccount(state, alpha.id, discordAlpha);
  assert.equal(T.findPlayerByDiscordUserId(state, discordAlpha).id, alpha.id);
  assert.throws(() => T.linkPlayerDiscordAccount(state, bravo.id, discordAlpha), /already linked to Alpha/);
  assert.throws(() => T.linkPlayerDiscordAccount(state, bravo.id, 'not-a-snowflake'), /17–20 digit/);
  T.linkPlayerDiscordAccount(state, bravo.id, discordBravo);
  const workbookBackup = T.makeWorkbookBackup(state);
  assert.equal(Object.hasOwn(workbookBackup, 'playerAccountLinks'), false);
  assert.equal(JSON.stringify(workbookBackup).includes(discordAlpha), false);
  const archive = T.makeArchiveSnapshot(state);
  assert.deepEqual(archive.player_account_links, {
    [alpha.id]: discordAlpha,
    [bravo.id]: discordBravo,
  });
  const restored = T.importBackup(archive);
  assert.equal(T.findPlayerByDiscordUserId(restored, discordAlpha).name, 'Alpha');
  assert.equal(T.findPlayerByDiscordUserId(restored, discordBravo).name, 'Bravo');
});

test('removing a player removes the associated account link and malformed or duplicate archive links fail closed', () => {
  const state = T.createState();
  const alpha = T.addPlayer(state, 'Alpha');
  const discordAlpha = '12345678901234567';
  T.linkPlayerDiscordAccount(state, alpha.id, discordAlpha);
  T.removePlayer(state, alpha.id);
  assert.equal(T.findPlayerByDiscordUserId(state, discordAlpha), null);
  assert.throws(() => T.normalizeState({
    players: [{ id: 1, name: 'One' }],
    player_account_links: { 1: 'not-a-snowflake' },
  }), /valid Discord snowflake/);
  assert.throws(() => T.normalizeState({
    players: [{ id: 1, name: 'One' }, { id: 2, name: 'Two' }],
    player_account_links: { 1: discordAlpha, 2: discordAlpha },
  }), /more than one tournament player/);
  assert.throws(() => T.normalizeState({
    players: [{ id: 1, name: 'One' }],
    player_account_links: { 2: discordAlpha },
  }), /unknown tournament player/);
});


test('public recovery snapshots omit private account links and per-user pending identities while full admin archives retain them', () => {
  const state = T.createState();
  const alpha = T.addPlayer(state, 'Alpha');
  const discordId = '12345678901234567';
  T.linkPlayerDiscordAccount(state, alpha.id, discordId);
  state.battleRecords.push({
    record_id: 'public-safe-record',
    status: 'awaiting-mapping',
    desktop_owner_id: discordId,
    desktop_owner_role: 'player',
    record: {},
  });
  state.pendingSubmissions.push({ record_id: 'public-safe-record', userId: discordId, channelId: '22345678901234567' });
  state.pendingOcrCorrections.push({ key: '22345678901234567:12345678901234567', userId: discordId });
  const full = T.makeArchiveSnapshot(state);
  assert.equal(full.player_account_links[String(alpha.id)], discordId);
  assert.equal(full.battle_records[0].desktop_owner_id, discordId);
  assert.equal(full.pending_submissions[0].userId, discordId);
  const safe = T.makePublicArchiveSnapshot(state);
  assert.equal(safe.public_snapshot, true);
  assert.deepEqual(safe.player_account_links, {});
  assert.equal(Object.hasOwn(safe.battle_records[0], 'desktop_owner_id'), false);
  assert.equal(Object.hasOwn(safe.battle_records[0], 'desktop_owner_role'), false);
  assert.deepEqual(safe.pending_submissions, []);
  assert.deepEqual(safe.pending_ocr_corrections, []);
  assert.deepEqual(safe.pending_workflow_counts, { pending_submissions: 1, pending_ocr_corrections: 1 });
  assert.ok(safe.private_data_omitted.includes('player_account_links'));
  assert.match(safe.public_snapshot_note, /authenticated local Admin backup/);
  const restoredPublic = T.importBackup(safe);
  assert.equal(Object.keys(restoredPublic.playerAccountLinks).length, 0);
  const restoredFull = T.importBackup(full);
  assert.equal(T.findPlayerByDiscordUserId(restoredFull, discordId).name, 'Alpha');
});

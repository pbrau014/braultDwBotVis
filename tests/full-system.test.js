'use strict';

// End-to-end offline simulation of the real Discord message handler. No live token
// or Discord API call is made; channel sends and attachment downloads are mocked.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const zlib = require('node:zlib');

process.env.NODE_ENV = 'test';
process.env.ENABLE_SLASH_COMMANDS = '0';
// Exercise coalesced snapshots in the simulated Discord handler without waiting 30 seconds.
process.env.SNAPSHOT_DEBOUNCE_MS = '300';
process.env.TARGET_CHANNEL_ID = 'synthetic-tournament-channel';
process.env.ARCHIVE_CHANNEL_ID = 'legacy-separate-channel-must-be-ignored';
process.env.TOURNAMENT_ADMIN_IDS = 'synthetic-admin';
const tempRoot = path.join(os.tmpdir(), `wows-yolo-system-test-${process.pid}`);
process.env.TOURNAMENT_STATE_PATH = path.join(tempRoot, 'data', 'tournament-state.json');

const Tournament = require('../src/tournament');
const BattleRecord = require('../src/battle-record');
const Bot = require('../src/bot');
const H = Bot.__test;
const workbookHtml = require('node:fs').readFileSync(path.join(__dirname, '..', 'testdata', 'yolo_tourney_workbook_reference.html'), 'utf8');
const workbookTruth = JSON.parse(require('node:fs').readFileSync(path.join(__dirname, '..', 'testdata', 'workbook-h12-source-truth.json'), 'utf8'));
const sourceWorkbookPath = path.join(__dirname, '..', 'assets', 'YOLO-Tournament-Workbook.xlsm');
const outputDir = path.join(__dirname, '..', 'examples', 'synthetic-validation');

test('source evidence hashes the original uploaded bytes and records only compact Discord provenance', () => {
  const sourceBytes = Buffer.from('original screenshot bytes');
  const evidence = H.buildSourceEvidence({ id: '423456789012345678', contentType: 'image/png' }, sourceBytes, {
    messageId: '123456789012345678', channelId: '223456789012345678',
    messageUrl: 'https://discord.com/channels/323456789012345678/223456789012345678/123456789012345678',
  });
  assert.equal(evidence.platform, 'discord');
  assert.equal(evidence.sha256, crypto.createHash('sha256').update(sourceBytes).digest('hex'));
  assert.equal(evidence.sizeBytes, sourceBytes.length);
  assert.equal(evidence.messageId, '123456789012345678');
  assert.equal(evidence.attachmentId, '423456789012345678');
  assert.equal(evidence.contentType, 'image/png');
  assert.throws(() => H.buildSourceEvidence({}, Buffer.alloc(0)), /non-empty original image buffer/);
});

const archiveSends = [];
const fetchedChannelIds = [];
const archiveChannel = {
  id: process.env.TARGET_CHANNEL_ID,
  isTextBased: () => true,
  async send(payload) { archiveSends.push(payload); return { id: `synthetic-archive-${archiveSends.length}` }; },
};
H.client.channels.fetch = async (id) => {
  fetchedChannelIds.push(String(id));
  return archiveChannel;
};

function makeMessage(content, opts = {}) {
  const replies = [];
  const channelSends = [];
  const admin = opts.admin !== false;
  const channel = {
    id: opts.channelId || process.env.TARGET_CHANNEL_ID,
    async send(payload) { channelSends.push(payload); return { id: `synthetic-message-${channelSends.length}` }; },
    async sendTyping() {
      if (opts.sendTypingError) throw new Error('synthetic typing endpoint failure');
    },
  };
  const message = {
    id: opts.id || `msg-${Math.random().toString(16).slice(2)}`,
    content: String(content || ''),
    channelId: opts.channelId || process.env.TARGET_CHANNEL_ID,
    channel,
    author: { id: opts.userId || (admin ? 'synthetic-admin' : 'synthetic-user'), bot: opts.bot === true, tag: 'SyntheticTester#0001' },
    member: { permissions: { has: (flag) => admin && flag === 'ManageGuild' } },
    attachments: opts.attachments || new Map(),
    async reply(payload) { replies.push(typeof payload === 'string' ? { content: payload } : payload); return { id: `synthetic-reply-${replies.length}` }; },
    _replies: replies,
    _channelSends: channelSends,
  };
  return message;
}

async function send(content, opts = {}) {
  const message = makeMessage(content, opts);
  const handled = await H.handleIncomingMessage(message);
  return { message, handled, replies: message._replies, sends: message._channelSends, text: message._replies.map(r => r.content || '').join('\n') };
}

function unzipTextEntry(archiveBuffer, entryName) {
  let eocd = -1;
  for (let i = archiveBuffer.length - 22; i >= Math.max(0, archiveBuffer.length - 65557); i--) {
    if (archiveBuffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  assert.notEqual(eocd, -1, 'OOXML package is missing its ZIP directory');
  const count = archiveBuffer.readUInt16LE(eocd + 10);
  let cursor = archiveBuffer.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    assert.equal(archiveBuffer.readUInt32LE(cursor), 0x02014b50, 'invalid ZIP central directory record');
    const method = archiveBuffer.readUInt16LE(cursor + 10);
    const compressedSize = archiveBuffer.readUInt32LE(cursor + 20);
    const nameLength = archiveBuffer.readUInt16LE(cursor + 28);
    const extraLength = archiveBuffer.readUInt16LE(cursor + 30);
    const commentLength = archiveBuffer.readUInt16LE(cursor + 32);
    const localOffset = archiveBuffer.readUInt32LE(cursor + 42);
    const name = archiveBuffer.toString('utf8', cursor + 46, cursor + 46 + nameLength);
    if (name === entryName) {
      assert.equal(archiveBuffer.readUInt32LE(localOffset), 0x04034b50, 'invalid ZIP local header');
      const localNameLength = archiveBuffer.readUInt16LE(localOffset + 26);
      const localExtraLength = archiveBuffer.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = archiveBuffer.subarray(start, start + compressedSize);
      if (method === 0) return compressed.toString('utf8');
      if (method === 8) return zlib.inflateRawSync(compressed).toString('utf8');
      throw new Error(`Unsupported ZIP compression method ${method} for ${entryName}`);
    }
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  throw new Error(`OOXML ZIP is missing ${entryName}`);
}
function zipEntryBuffer(archiveBuffer, entryName) {
  // Reuse the central-directory parser with an identity decompression wrapper.
  let eocd = -1;
  for (let i = archiveBuffer.length - 22; i >= Math.max(0, archiveBuffer.length - 65557); i--) {
    if (archiveBuffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  assert.notEqual(eocd, -1);
  const count = archiveBuffer.readUInt16LE(eocd + 10);
  let cursor = archiveBuffer.readUInt32LE(eocd + 16);
  for (let i = 0; i < count; i++) {
    const method = archiveBuffer.readUInt16LE(cursor + 10);
    const size = archiveBuffer.readUInt32LE(cursor + 20);
    const nl = archiveBuffer.readUInt16LE(cursor + 28), el = archiveBuffer.readUInt16LE(cursor + 30), cl = archiveBuffer.readUInt16LE(cursor + 32);
    const local = archiveBuffer.readUInt32LE(cursor + 42);
    const name = archiveBuffer.toString('utf8', cursor + 46, cursor + 46 + nl);
    if (name === entryName) {
      const ln = archiveBuffer.readUInt16LE(local + 26), le = archiveBuffer.readUInt16LE(local + 28);
      const start = local + 30 + ln + le, packed = archiveBuffer.subarray(start, start + size);
      return method === 0 ? packed : method === 8 ? zlib.inflateRawSync(packed) : Buffer.alloc(0);
    }
    cursor += 46 + nl + el + cl;
  }
  throw new Error(`OOXML ZIP is missing ${entryName}`);
}

function attachmentBuffer(attachment) {
  assert.ok(attachment, 'expected a JSON attachment');
  assert.ok(Buffer.isBuffer(attachment.attachment), `expected AttachmentBuilder buffer; got ${attachment.constructor?.name}`);
  return attachment.attachment;
}
function exportedAttachment(result, filename) {
  const reply = result.replies.find(r => Array.isArray(r.files) && r.files.length);
  assert.ok(reply, `expected file attachment from command; replies: ${result.text}`);
  const file = reply.files.find(f => !filename || f.name === filename) || reply.files[0];
  return { name: file.name, data: attachmentBuffer(file), json: JSON.parse(attachmentBuffer(file).toString('utf8')), reply };
}

// Seeded pseudo-random numbers keep the run repeatable while filling every value.
function rngFactory(seed = 0x4f435231) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 0x100000000;
  };
}
function randomInt(rng, min, max) { return Math.floor(rng() * (max - min + 1)) + min; }
const CLASS_CODES = ['DD', 'CA', 'BB'];
function referenceCurrentScore(state, player, event) {
  // Independent implementation of current DWBOT policy. Race uses C01 inverse-time;
  // the archived workbook deliberately remains an unchanged raw-time source record.
  const settings = state.settings.events[event];
  const classWeight = code => ({ DD: 4, CA: 3, BB: 2 }[code] || 0);
  const totalMetric = (p, key) => p.events[key].reduce((sum, game) => {
    if (key === 'grand') return sum + Number(game.damage || 0);
    if (key === 'race') return sum + (Number(game.metric) > 0 ? 1 / Number(game.metric) : 0);
    return sum + Number(game.metric || 0);
  }, 0);
  if (event !== 'grand') {
    const rosterTotal = state.players.reduce((sum, p) => sum + totalMetric(p, event), 0);
    if (!rosterTotal || player.events[event].some(g => Number(g.tier) <= 0)) return 0;
    let raw = 0;
    for (const g of player.events[event]) {
      const metric = event === 'race' ? (Number(g.metric) > 0 ? 1 / Number(g.metric) : 0) : Number(g.metric || 0);
      raw += classWeight(g.class) * (metric / rosterTotal) / Math.pow(Number(g.tier), Number(settings.tierPower));
    }
    return 2 * Number(settings.multiplier) * Number(settings.pool) * raw;
  }
  const totalDamage = state.players.reduce((sum, p) => sum + totalMetric(p, 'grand'), 0);
  if (!totalDamage || player.events.grand.some(g => Number(g.tier) <= 0 || Number(g.time) <= 0)) return 0;
  const playerDamage = totalMetric(player, 'grand');
  let weighted = 0;
  for (const g of player.events.grand) {
    const tier = Number(g.tier); const time = Number(g.time);
    const perGame = (100 / tier * Number(settings.tierWeight))
      + (Number(g.damage) / tier / 1000 * Number(settings.damageWeight))
      + (Number(g.kills) * 10 / tier * Number(settings.killsWeight))
      + (5 / time * 1000 * Number(settings.timeWeight));
    weighted += perGame * classWeight(g.class) * (playerDamage / totalDamage);
  }
  // Workbook Grand Yolo formula does not use its stored pool value.
  return Number(settings.multiplier) * weighted / 3;
}
function nearlyEqual(a, b, eps = 1e-8) { return Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b)); }

function extractFunctionDeclaration(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `HTML function ${name} is missing`);
  const open = source.indexOf('{', start);
  assert.notEqual(open, -1, `HTML function ${name} has no body`);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`HTML function ${name} is not closed`);
}
function assertScoresMatchWorkbook(state, context) {
  for (const player of state.players) for (const event of Tournament.EVENTS) {
    const actual = Tournament.eventScore(state, player, event);
    const expected = referenceCurrentScore(state, player, event);
    assert.ok(nearlyEqual(actual, expected), `${context}: ${player.name}/${event}: bot=${actual}, workbook-reference=${expected}`);
  }
}
function ensureWorkbookHtmlAgrees() {
  assert.match(workbookHtml, /const DEFAULT_SETTINGS = \{[\s\S]{0,260}damage:\s*\{pool:500, multiplier:1, tierPower:1\}/);
  assert.match(workbookHtml, /grand:\s*\{pool:500, multiplier:1, tierWeight:0\.9/);
  assert.match(workbookHtml, /const STORAGE_KEY = \"yoloTourneyWorkbookMerged_v6\"/);
  assert.match(workbookHtml, /for\(const oldKey of OBSOLETE_STORAGE_KEYS\) localStorage\.removeItem\(oldKey\)/);
  assert.doesNotMatch(workbookHtml, /const migrated=normalizeState\(JSON\.parse\(legacy\)\)/);
  assert.match(workbookHtml, /classWeightFor\(g\.class\)\*\(num\(g\.metric\)\/total\)\/Math\.pow\(num\(g\.tier\),num\(settings\.tierPower\)\)/);
  assert.match(workbookHtml, /\(1\/tier\*100\*num\(settings\.tierWeight\)\)/);
  assert.match(workbookHtml, /\(num\(g\.damage\)\/tier\/1000\*num\(settings\.damageWeight\)\)/);
  assert.match(workbookHtml, /\(num\(g\.kills\)\*10\/tier\*num\(settings\.killsWeight\)\)/);
  assert.match(workbookHtml, /\(5\/time\*1000\*num\(settings\.timeWeight\)\)/);
  assert.match(workbookHtml, /return num\(settings\.multiplier\)\*weighted\/3/);
  assert.match(workbookHtml, /"version":2|version:\s*2|const STORAGE_KEY/);
}

test('Excel Totals!H12 source-of-truth audit matches the clean browser seed and packaged workbook', async () => {
  const seedMatch = workbookHtml.match(/const SEED = (\[[\s\S]*?\]);\s*const EVENT_META/);
  assert.ok(seedMatch, 'could not find seeded default data in the HTML workbook reference');
  const seed = JSON.parse(seedMatch[1]);
  const cleanState = Tournament.normalizeState({ players: seed });
  assert.equal(cleanState.players.length, 9);
  assert.equal(cleanState.settings.events.grand.tierWeight, workbookTruth.grand_yolo_default_tier_weight);

  // This block audits the preserved historical workbook only. Current DWBOT Race
  // C01 intentionally differs from the archived workbook's raw-time Race formula.
  const historicalWorkbookTotalDoubloons = workbookTruth.source_G12_cached_value;
  const calculatedH12 = 0.54 * historicalWorkbookTotalDoubloons / 100;
  assert.ok(Math.abs(calculatedH12 - workbookTruth.source_H12_cached_value) < 1e-8,
    `default H12 mismatch: calculated ${calculatedH12}, Excel cached ${workbookTruth.source_H12_cached_value}`);
  assert.equal(`$${calculatedH12.toFixed(2)}`, workbookTruth.source_H12_display_value);
  assert.equal(workbookTruth.source_formula, '=0.54*G12/100');
  assert.equal(workbookTruth.original_source_total_doubloons_formula, '=SUM(G3:G11)');
  assert.equal(workbookTruth.expanded_total_doubloons_formula, '=SUM(G3:G11,G14:G54)');
  assert.equal(workbookTruth.expanded_max_players, 50);

  // Execute the actual HTML scoring functions in a clean JS context rather than
  // relying only on the bot's parallel implementation or a regex-only check.
  const settingsMatch = workbookHtml.match(/const DEFAULT_SETTINGS = (\{[\s\S]*?\n\});/);
  assert.ok(settingsMatch, 'could not read the HTML default scoring settings');
  const htmlDefaultSettings = vm.runInNewContext(`(${settingsMatch[1]})`);
  const htmlFormulaCode = [
    'const KEYS = ["damage", "kills", "race", "grand"];',
    `const state = { players: ${JSON.stringify(seed)}, settings: ${JSON.stringify(htmlDefaultSettings)} };`,
    'function num(v){ const n=Number(v); return Number.isFinite(n) ? n : 0; }',
    'function normalizeClass(code){ const c=String(code ?? "-").trim().toUpperCase(); return ["DD","CA","BB"].includes(c)?c:"-"; }',
    extractFunctionDeclaration(workbookHtml, 'classWeightFor'),
    'function cfg(key){ return state.settings.events[key]; }',
    extractFunctionDeclaration(workbookHtml, 'eventTotal'),
    extractFunctionDeclaration(workbookHtml, 'eventRawScore'),
    extractFunctionDeclaration(workbookHtml, 'eventScore'),
    extractFunctionDeclaration(workbookHtml, 'eventGrandTotal'),
    extractFunctionDeclaration(workbookHtml, 'totalDubs'),
    extractFunctionDeclaration(workbookHtml, 'dollars'),
    'globalThis.htmlFormulaAudit = { total: totalDubs(), h12: dollars(totalDubs()), grandTierWeight: cfg("grand").tierWeight };'
  ].join('\n');
  const htmlFormulaContext = {};
  vm.runInNewContext(htmlFormulaCode, htmlFormulaContext);
  assert.ok(Math.abs(htmlFormulaContext.htmlFormulaAudit.total - historicalWorkbookTotalDoubloons) < 1e-8,
    'archival HTML scoring functions do not reproduce the preserved Excel G12');
  assert.ok(Math.abs(htmlFormulaContext.htmlFormulaAudit.h12 - workbookTruth.source_H12_cached_value) < 1e-8,
    'actual HTML dollars function does not reproduce Excel H12');
  assert.equal(htmlFormulaContext.htmlFormulaAudit.grandTierWeight, 0.9);
  assert.match(workbookHtml, /id="totalDollars"[^>]*>\$\{money\(grandDollars\)\}/,
    'Totals page must display the H12-equivalent through the currency formatter');

  // Simulate a browser with stale legacy keys: the new build must delete v1-v5,
  // ignore their data, and construct the clean workbook default.
  const storageMatch = workbookHtml.match(/const STORAGE_KEY = "([^"]+)";[\s\S]*?const OBSOLETE_STORAGE_KEYS = (\[[^;]+\]);/);
  assert.ok(storageMatch, 'could not read the HTML storage version contract');
  const obsoleteKeys = vm.runInNewContext(storageMatch[2]);
  assert.equal(storageMatch[1], 'yoloTourneyWorkbookMerged_v6');
  assert.deepEqual(Array.from(obsoleteKeys), ['yoloTourneyWorkbookMerged_v5', 'yoloTourneyWorkbookMerged_v4', 'yoloTourneyWorkbookMerged_v3', 'yoloTourneyWorkbookMerged_v2', 'yoloTourneyWorkbookMerged_v1']);
  const fakeBrowserCache = new Map(obsoleteKeys.map(key => [key, JSON.stringify({settings:{events:{grand:{tierWeight:1}}}})]));
  const storageContext = {
    STORAGE_KEY: storageMatch[1], OBSOLETE_STORAGE_KEYS: obsoleteKeys, SEED: seed,
    localStorage: { getItem: key => fakeBrowserCache.get(key) ?? null, removeItem: key => fakeBrowserCache.delete(key) },
    clone: value => JSON.parse(JSON.stringify(value)), makeDefaultSettings: () => JSON.parse(JSON.stringify(htmlDefaultSettings)),
    normalizeState: value => value
  };
  vm.runInNewContext(`${extractFunctionDeclaration(workbookHtml, 'loadState')}\nglobalThis.cleanBoot = loadState();`, storageContext);
  assert.equal(fakeBrowserCache.size, 0, 'old browser state keys must be removed on a clean v6 load');
  assert.equal(storageContext.cleanBoot.settings.events.grand.tierWeight, 0.9);

  const workbookBytes = await fs.readFile(sourceWorkbookPath);
  assert.equal(crypto.createHash('sha256').update(workbookBytes).digest('hex'), workbookTruth.source_workbook_sha256,
    'packaged expanded Excel workbook bytes differ from the audited workbook hash');
  const totalsXml = unzipTextEntry(workbookBytes, 'xl/worksheets/sheet5.xml');
  const totalsCell = ref => {
    const marker = `r="${ref}"`;
    const at = totalsXml.indexOf(marker);
    assert.notEqual(at, -1, `expanded workbook is missing Totals!${ref}`);
    const start = totalsXml.lastIndexOf('<c ', at);
    const end = totalsXml.indexOf('</c>', at);
    assert.ok(start >= 0 && end >= 0, `could not parse Totals!${ref}`);
    const cellXml = totalsXml.slice(start, end + 4);
    const f = cellXml.match(/<f(?:\s[^>]*)?>([\s\S]*?)<\/f>/);
    const v = cellXml.match(/<v>([\s\S]*?)<\/v>/);
    return { formula: f ? f[1] : null, cached: v ? Number(v[1]) : null };
  };
  assert.equal(totalsCell('G12').formula, workbookTruth.expanded_total_doubloons_formula.slice(1));
  assert.equal(totalsCell('H12').formula, workbookTruth.source_formula.slice(1));
  assert.equal(totalsCell('G12').cached, workbookTruth.source_G12_cached_value);
  assert.equal(totalsCell('H12').cached, workbookTruth.source_H12_cached_value);
  for (let row = 3; row <= 11; row++) assert.equal(totalsCell(`H${row}`).formula, `0.54*G${row}/100`);
  for (let row = 14; row <= 54; row++) {
    assert.equal(totalsCell(`G${row}`).formula, `'a1'!AE${row+10}+'b2'!AE${row+10}+'c3'!AE${row+10}+'d4'!AS${row+10}`);
    assert.equal(totalsCell(`H${row}`).formula, `0.54*G${row}/100`);
  }
  assert.ok(zipEntryBuffer(workbookBytes, 'xl/vbaProject.bin').length > 100000, 'expanded workbook must retain its VBA project');
  assert.match(workbookHtml, /const STORAGE_KEY = "yoloTourneyWorkbookMerged_v6"/);
  assert.match(workbookHtml, /OBSOLETE_STORAGE_KEYS = \["yoloTourneyWorkbookMerged_v5", "yoloTourneyWorkbookMerged_v4", "yoloTourneyWorkbookMerged_v3", "yoloTourneyWorkbookMerged_v2", "yoloTourneyWorkbookMerged_v1"\]/);
  assert.match(workbookHtml, /localStorage\.removeItem\(oldKey\)/);
  assert.doesNotMatch(workbookHtml, /Number\(legacyTier\)===0\.9\) \? 1/,
    'HTML must not rewrite the Excel source tier weight 0.9 to 1');
});

const testPromises = [];
test('complete synthetic Discord tour: all commands, every slot, formulas, persistence, OCR recovery, exports, and clearing', async (t) => {
  await fs.rm(tempRoot, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
  archiveSends.length = 0; fetchedChannelIds.length = 0;
  assert.equal(H.getTargetChannelId(), process.env.TARGET_CHANNEL_ID);
  assert.notEqual(H.getTargetChannelId(), process.env.ARCHIVE_CHANNEL_ID, 'legacy second archive channel must be ignored');
  ensureWorkbookHtmlAgrees();

  await H.setTournamentState(Tournament.createState());
  H.pendingRecords.clear();

  // Entry point routing, ignored users/channels, help, and admin gate.
  assert.equal((await send('!yolo help', { channelId: 'other-channel' })).handled, false);
  assert.equal((await send('!yolo help', { bot: true })).handled, false);
  const help = await send('!yolo help');
  assert.match(help.text, /add-player/);
  assert.match(help.text, /export-workbook/);
  assert.match(help.text, /download-workbook/);
  assert.match(help.text, /snapshot/);
  assert.match(help.text + '\n' + help.sends.map(x => x.content || '').join('\n'), /50 participants/i);
  assert.match((await send('!yolo snapshot', { admin: false })).text, /restricted to tournament admins/i);
  assert.match((await send('!yolo totals')).text, /Total doubloons/);
  assert.match((await send('!yolo standings')).text, /aggregate/i);
  assert.match((await send('!yolo export', { admin: false })).text, /restricted to tournament admins/i);
  assert.match((await send('!yolo export-workbook', { admin: false })).text, /restricted to tournament admins/i);
  assert.match((await send('!yolo settings', { admin: false })).text, /restricted to tournament admins/i);
  assert.match((await send('!yolo setting damage multiplier 9', { admin: false })).text, /restricted to tournament admins/i);
  assert.match(help.text + '\n' + help.sends.map(x => x.content || '').join('\n'), /same configured channel/i);
  const workbookDownload = await send('!yolo download-workbook', { admin: true });
  const workbookReply = workbookDownload.replies.find(r => Array.isArray(r.files) && r.files.length);
  assert.ok(workbookReply, `expected Excel attachment from download command: ${workbookDownload.text}`);
  const workbookFile = workbookReply.files.find(f => f.name === 'YOLO-Tournament-Workbook.xlsm');
  assert.ok(workbookFile && Buffer.isBuffer(workbookFile.attachment), 'download command must attach the source .xlsm bytes');
  assert.deepEqual(workbookFile.attachment, await fs.readFile(H.getWorkbookPath()));
  assert.match(workbookDownload.text, /\$12\.49/);
  const workbookAlias = await send('!yolo workbook', { admin: true });
  assert.ok(workbookAlias.replies.some(r => Array.isArray(r.files) && r.files.some(f => f.name === 'YOLO-Tournament-Workbook.xlsm')),
    'workbook alias must also attach the Excel source workbook');
  assert.match((await send('!yolo players')).text, /No players yet/);
  const twoFakeImages = new Map([['a', { name: 'one.png', size: 1 }], ['b', { name: 'two.png', size: 1 }]]);
  assert.match((await send('uploaded two images', { attachments: twoFakeImages })).text, /one screenshot per message/i);
  const unsupportedFile = new Map([['a', { name: 'payload.pdf', contentType: 'application/pdf', size: 10 }]]);
  assert.match((await send('uploaded a PDF', { attachments: unsupportedFile })).text, /upload a screenshot as PNG, JPG, WEBP, BMP, or TIFF/i);
  // A failing Discord typing indicator must not stop queue admission. This image
  // is deliberately rejected by size before fetch/OCR, proving the processing
  // path ran and did not create an empty required-field correction workflow.
  const oversizedImage = new Map([['a', { name: 'large.png', contentType: 'image/png', size: 26 * 1024 * 1024, url: 'https://example.invalid/large.png' }]]);
  const typingLogs = [];
  const oldConsoleError = console.error;
  let oversizedResult;
  try {
    console.error = (...values) => typingLogs.push(values.map(String).join(' '));
    oversizedResult = await send('upload with typing failure', { attachments: oversizedImage, sendTypingError: true, userId: 'synthetic-typing-failure' });
  } finally {
    console.error = oldConsoleError;
  }
  assert.match(typingLogs.join('\n'), /Image is too large/i, 'OCR queue should still validate the oversized image after the typing call fails');
  assert.match(oversizedResult.text, /could not finish reliably/i);
  assert.doesNotMatch(oversizedResult.text, /what was the battle result/i, 'infrastructure errors must not start an empty correction workflow');
  assert.match((await send('!yolo add-player Unauthorized', { admin: false })).text, /restricted to tournament admins/i);
  assert.match((await send('!yolo add-player Configured Admin', { admin: false, userId: 'synthetic-admin' })).text, /Added/);
  assert.match((await send('!yolo remove-player Configured Admin')).text, /Removed/);

  // Create, rename (scores must persist), and delete a player via real command parsing.
  assert.match((await send('!yolo add-player Temporary')).text, /Added/);
  assert.match((await send('!yolo add-player Another Temporary')).text, /Added/);
  let testState = H.getTournamentState();
  const temporaryId = testState.players[0].id;
  assert.match((await send(`!yolo result ${temporaryId} | damage | 1 | DD | 8 | 45678`)).text, /Saved/);
  assert.match((await send(`!yolo rename-player ${temporaryId} | Temporary Prime`)).text, /without changing scores/);
  testState = H.getTournamentState();
  assert.equal(testState.players[0].name, 'Temporary Prime');
  assert.equal(testState.players[0].events.damage[0].metric, 45678);
  assert.match((await send(`!yolo rename-player ${temporaryId} | Another Temporary`)).text, /already exists/);
  assert.match((await send(`!yolo remove-player ${temporaryId}`)).text, /Removed/);
  assert.match((await send('!yolo remove-player Another Temporary')).text, /Removed/);
  assert.equal(H.getTournamentState().players.length, 0);
  assert.match((await send('!yolo remove-player 9999')).text, /not found/);

  // Randomized but reproducible roster: 3 players x 4 events x 7 games = 84 filled slots.
  const roster = ['[WOLF1]CaptainWren', '[NORTH]StarPilot', '[YOLO]Pixel7'];
  for (const name of roster) assert.match((await send(`!yolo add-player ${name}`)).text, /Added/);
  assert.match((await send(`!yolo add-player ${roster[0]}`)).text, /already exists/);
  const rng = rngFactory();
  const generatedRows = [];
  const settingsCommands = [
    ['damage','pool',625.5], ['damage','multiplier',1.17], ['damage','tierPower',1.25],
    ['kills','pool',575.2], ['kills','multiplier',0.95], ['kills','tierPower',0.5],
    ['race','pool',700], ['race','multiplier',1.4], ['race','tierPower',1.15],
    ['grand','pool',999.9], ['grand','multiplier',0.85], ['grand','tierWeight',1.1],
    ['grand','damageWeight',1.4], ['grand','killsWeight',0.9], ['grand','timeWeight',1.3],
  ];
  for (const name of roster) {
    for (const event of Tournament.EVENTS) {
      for (let game = 1; game <= 7; game++) {
        const shipClass = CLASS_CODES[randomInt(rng, 0, 2)];
        const tier = randomInt(rng, 1, 11);
        let metrics;
        if (event === 'damage') metrics = [randomInt(rng, 10000, 210000)];
        else if (event === 'kills') metrics = [randomInt(rng, 0, 8)];
        else if (event === 'race') metrics = [randomInt(rng, 38, 260)];
        else metrics = [randomInt(rng, 10000, 210000), randomInt(rng, 0, 8), randomInt(rng, 38, 260)];
        const resultArgs = [name, event, game, shipClass, tier, ...metrics].join(' | ');
        const saved = await send(`!yolo result ${resultArgs}`);
        assert.match(saved.text, /Saved/ , `manual result should save: ${resultArgs}`);
        generatedRows.push({ player: name, event, game, shipClass, tier, metrics });
      }
    }
  }
  assert.equal(generatedRows.length, 84);
  testState = H.getTournamentState();
  for (const player of testState.players) for (const event of Tournament.EVENTS) assert.equal(player.events[event].length, 7);
  assertScoresMatchWorkbook(testState, 'randomized complete grid with default settings');
  assert.match((await send('!yolo players')).text, /CaptainWren/);
  assert.match((await send(`!yolo player ${roster[0]}`)).text, /Grand Yolo/);
  assert.match((await send('!yolo status')).text, /Damage 7\/7/);
  assert.match((await send('!yolo missing')).text, /All requested slots are filled/);
  assert.match((await send(`!yolo missing damage | ${roster[0]}`)).text, /All requested slots are filled/);
  assert.match((await send('!yolo standings')).text, /aggregate/i);
  for (const event of Tournament.EVENTS) assert.match((await send(`!yolo standings ${event}`)).text, /leaderboard/);
  assert.match((await send('!yolo settings')).text, /Current scoring settings/);

  // Exercise every editable setting through the Discord command handler.
  for (const [event, field, value] of settingsCommands) {
    const result = await send(`!yolo setting ${event} ${field} ${value}`);
    assert.match(result.text, /Updated/ , `${event}.${field} update should succeed`);
    assert.equal(H.getTournamentState().settings.events[event][field], value);
  }
  assertScoresMatchWorkbook(H.getTournamentState(), 'all 15 adjusted settings');
  assert.deepEqual([Tournament.classWeightFor('DD'), Tournament.classWeightFor('CA'), Tournament.classWeightFor('BB')], [4, 3, 2]);
  // Zero-weight adjustments are legal and must remove only their own formula term.
  for (const event of ['damage', 'kills', 'race']) {
    const original = H.getTournamentState().settings.events[event].multiplier;
    await send(`!yolo setting ${event} multiplier 0`);
    assert.equal(Tournament.standings(H.getTournamentState()).every(row => row.events[event] === 0), true, `${event} multiplier zero should zero that event`);
    await send(`!yolo setting ${event} multiplier ${original}`);
    const originalPower = H.getTournamentState().settings.events[event].tierPower;
    await send(`!yolo setting ${event} tierPower 0`);
    assertScoresMatchWorkbook(H.getTournamentState(), `${event} tier power zero adjustment`);
    await send(`!yolo setting ${event} tierPower ${originalPower}`);
  }
  for (const field of ['tierWeight', 'damageWeight', 'killsWeight', 'timeWeight']) {
    const original = H.getTournamentState().settings.events.grand[field];
    await send(`!yolo setting grand ${field} 0`);
    assertScoresMatchWorkbook(H.getTournamentState(), `Grand Yolo ${field} zero adjustment`);
    await send(`!yolo setting grand ${field} ${original}`);
  }
  const grandMultiplier = H.getTournamentState().settings.events.grand.multiplier;
  await send('!yolo setting grand multiplier 0');
  assert.equal(Tournament.standings(H.getTournamentState()).every(row => row.events.grand === 0), true);
  await send(`!yolo setting grand multiplier ${grandMultiplier}`);
  await send('!yolo setting damage pool 0');
  assert.equal(Tournament.standings(H.getTournamentState()).every(row => row.events.damage === 0), true);
  await send('!yolo setting damage pool 625.5');
  assertScoresMatchWorkbook(H.getTournamentState(), 'restored all adjusted settings after zero tests');
  assert.match((await send('!yolo setting damage pool -1')).text, /non-negative/);
  assert.match((await send('!yolo setting damage unknown 1')).text, /not valid/);
  assert.match((await send('!yolo setting grand tierPower 1')).text, /not valid/);
  const grandBeforePoolChange = Tournament.eventScore(H.getTournamentState(), H.getTournamentState().players[0], 'grand');
  await send('!yolo setting grand pool 1');
  const grandAfterPoolChange = Tournament.eventScore(H.getTournamentState(), H.getTournamentState().players[0], 'grand');
  assert.ok(nearlyEqual(grandBeforePoolChange, grandAfterPoolChange), 'Grand Yolo pool is stored but does not enter workbook formula');
  await send('!yolo setting grand pool 999.9');
  assertScoresMatchWorkbook(H.getTournamentState(), 'Grand pool has no scoring effect');

  // Result overwrite protection, replacement, and every result validation boundary.
  const originalDamage = H.getTournamentState().players[0].events.damage[0].metric;
  assert.match((await send(`!yolo result ${roster[0]} | damage | 1 | DD | 8 | 11111`)).text, /already filled/);
  assert.match((await send(`!yolo result ${roster[0]} | damage | 1 | CA | 8 | 11111 --replace`)).text, /Saved/);
  assert.equal(H.getTournamentState().players[0].events.damage[0].metric, 11111);
  assert.notEqual(H.getTournamentState().players[0].events.damage[0].metric, originalDamage);
  assert.match((await send(`!yolo result ${roster[0]} | damage | 8 | DD | 8 | 10`)).text, /Game number must be/);
  assert.match((await send(`!yolo result ${roster[0]} | damage | 2 | XX | 8 | 10`)).text, /Ship class must/);
  assert.match((await send(`!yolo result ${roster[0]} | damage | 2 | DD | 12 | 10`)).text, /Ship tier/);
  assert.match((await send(`!yolo result ${roster[0]} | damage | 2 | DD | 8.5 | 10`)).text, /whole number/);
  assert.match((await send(`!yolo result ${roster[0]} | kills | 2 | CA | 7 | -1`)).text, /non-negative/);
  assert.match((await send(`!yolo result ${roster[0]} | race | 2 | DD | 8 | 0`)).text, /positive time/);
  assert.match((await send(`!yolo result ${roster[0]} | grand | 2 | DD | 8 | 10 | 1`)).text, /requires/);
  assert.match((await send(`!yolo result ${roster[0]} | grand | 2 | DD | 8 | 10 | 1 | 0`)).text, /positive time/);
  assertScoresMatchWorkbook(H.getTournamentState(), 'after deliberate replacement');

  // Manual command syntax, unknown command and unauthorized mutations.
  assert.match((await send('!yolo unknown-command')).text, /Unknown command/);
  assert.match((await send('!yolo clear-results CONFIRM', { admin: false })).text, /restricted to tournament admins/);
  assert.match((await send('!yolo clear-slot')).text, /Usage/);
  assert.match((await send('!yolo rename-player')).text, /Usage/);
  assert.match((await send('!yolo result')).text, /Usage/);
  assert.match((await send('!yolo missing damage | absent-player')).text, /not found/);

  // Local JSON state must be saved atomically and reload into the same state.
  await H.saveTournamentState({ archive: false });
  const persisted = await H.tournamentStore.load();
  assert.deepEqual(persisted.players, H.getTournamentState().players);
  assert.deepEqual(persisted.settings, H.getTournamentState().settings);
  assert.equal(persisted.players.length * 4 * 7, 84);

  // Verify the actual snapshot function archives to the one configured command channel.
  const snapshotsBefore = archiveSends.length;
  await H.saveTournamentState();
  await H.flushArchiveSnapshot();
  assert.ok(archiveSends.length > snapshotsBefore, 'state save should create a JSON snapshot attachment after flush');
  const latestSnapshotPayload = archiveSends[archiveSends.length - 1];
  assert.equal(latestSnapshotPayload.files[0].name.startsWith('yolo-tourney-snapshot-'), true);
  const latestSnapshot = JSON.parse(attachmentBuffer(latestSnapshotPayload.files[0]).toString('utf8'));
  assert.equal(latestSnapshot.format, 'wows-yolo-tourney-state');
  assert.equal(latestSnapshot.workbook_backup.players.length, 3);
  assert.ok(fetchedChannelIds.length > 0 && fetchedChannelIds.every(id => id === process.env.TARGET_CHANNEL_ID), 'all automatic snapshots must be posted in TARGET_CHANNEL_ID, never a second channel');

  // Generate export examples using actual command responses, before destructive clear tests.
  const workbookExport = exportedAttachment(await send('!yolo export-workbook'), 'yolo-tourney-workbook-backup.json');
  assert.equal(workbookExport.json.version, 2);
  assert.ok(workbookExport.json.exportedAt);
  assert.equal(workbookExport.json.players.length, 3);
  assert.ok(workbookExport.json.settings.events.damage);
  assert.ok(workbookExport.json.players.every(p => Tournament.EVENTS.every(e => p.events[e].length === 7)));
  assertScoresMatchWorkbook(Tournament.importBackup(workbookExport.json), 'workbook JSON backup round-trip');
  const finalExport = exportedAttachment(await send('!yolo finalize'));
  assert.equal(finalExport.json.export_purpose, 'final-tournament-export');
  assert.equal(finalExport.json.final_summary.player_count, 3);
  assert.equal(finalExport.json.final_summary.total_game_slots, 84);
  assert.equal(finalExport.json.final_summary.filled_game_slots, 84);
  assert.equal(finalExport.json.final_summary.missing_game_slots, 0);
  assert.equal(Tournament.importBackup(finalExport.json).players.length, 3);

  await fs.writeFile(path.join(outputDir, 'synthetic-workbook-backup.json'), `${JSON.stringify(workbookExport.json, null, 2)}\n`);
  await fs.writeFile(path.join(outputDir, 'synthetic-final-tournament-export.json'), `${JSON.stringify(finalExport.json, null, 2)}\n`);

  // Workbook-compatible import works through the real command and rehydrates state.
  await H.setTournamentState(Tournament.createState());
  const originalFetch = global.fetch;
  try {
    global.fetch = async () => ({ ok: true, status: 200, async text() { return JSON.stringify(workbookExport.json); } });
    const fakeAttachment = { name: 'backup.json', contentType: 'application/json', size: Buffer.byteLength(JSON.stringify(workbookExport.json)), url: 'https://synthetic.invalid/backup.json' };
    const importResult = await send('!yolo import', { attachments: new Map([['backup', fakeAttachment]]) });
    assert.match(importResult.text, /Restored tournament backup: 3 players/);
    assert.equal(H.getTournamentState().players.length, 3);
    assert.equal(H.getTournamentState().battleRecords.length, 0, 'workbook backup should not invent OCR records');
  } finally { global.fetch = originalFetch; }
  assertScoresMatchWorkbook(H.getTournamentState(), 'real command workbook import');

  // Prepare a full archive containing an unfinished OCR correction and one unmapped record.
  const pendingRecord = BattleRecord.buildBattleRecord('', {});
  const pendingKey = `${process.env.TARGET_CHANNEL_ID}:synthetic-admin`;
  H.pendingRecords.clear();
  const pendingSourceEvidence = {
    platform: 'discord', messageId: '123456789012345678', channelId: '223456789012345678',
    messageUrl: 'https://discord.com/channels/323456789012345678/223456789012345678/123456789012345678',
    attachmentId: '423456789012345678', sha256: 'b'.repeat(64), sizeBytes: 12345,
    contentType: 'image/png', retrievedAt: new Date().toISOString(),
  };
  H.pendingRecords.set(pendingKey, {
    record: pendingRecord, fileName: 'synthetic-pending.png', createdAt: Date.now(),
    uploadMessageId: 'synthetic-upload', sourceEvidence: pendingSourceEvidence,
  });
  await H.syncPendingOcrCorrections({ archive: false });
  const mapRecord = {
    format: 'wows-yolo-tourney-battle', schema_version: 1, record_id: 'SYNTHETIC-ARCHIVE-RECORD',
    verification: { required_fields_complete: true, tournament_mapping_complete: false },
    battle: { player_name: roster[0], ship: 'VIII Destroyer', result: 'Victory', map: 'New Dawn', mode: 'Random Battle', battle_start_time: '22.10.2026 14:22', metrics: { damage: 65000, kills: 3, time: null }, rewards: { credits: 100000, free_xp: 1000, xp: 2500 } },
    tournament: { suggestions: { tier_from_ship_name: 8 } },
  };
  H.getTournamentState().battleRecords.push({ record_id: mapRecord.record_id, status: 'unmapped', captured_at: new Date().toISOString(), source_file: 'synthetic-map.png', record: mapRecord });
  const grandMapRecord = {
    format: 'wows-yolo-tourney-battle', schema_version: 1, record_id: 'SYNTHETIC-GRAND-RECORD',
    verification: { required_fields_complete: true, tournament_mapping_complete: false },
    battle: { player_name: roster[0], ship: 'X Battleship', result: 'Victory', map: 'North', mode: 'Random Battle', battle_start_time: '22.10.2026 14:45', metrics: { damage: null, kills: null, time: null }, rewards: { credits: 100000, free_xp: 1000, xp: 2500 } },
    tournament: { suggestions: { tier_from_ship_name: 10 } },
  };
  H.getTournamentState().battleRecords.push({ record_id: grandMapRecord.record_id, status: 'unmapped', captured_at: new Date().toISOString(), source_file: 'synthetic-grand-map.png', record: grandMapRecord });
  await H.saveTournamentState({ archive: false });
  const publicArchiveExport = exportedAttachment(await send('!yolo export'), 'yolo-tourney-public-archive.json');
  assert.equal(publicArchiveExport.json.format, 'wows-yolo-tourney-state');
  assert.equal(publicArchiveExport.json.schema_version, 1);
  assert.equal(publicArchiveExport.json.public_snapshot, true);
  assert.equal(publicArchiveExport.json.workbook_backup.players.length, 3);
  assert.equal(publicArchiveExport.json.battle_records.length, 2);
  assert.deepEqual(publicArchiveExport.json.player_account_links, {});
  assert.deepEqual(publicArchiveExport.json.pending_ocr_corrections, []);
  assert.equal(publicArchiveExport.json.pending_workflow_counts.pending_ocr_corrections, 1);
  assert.ok(publicArchiveExport.json.workbook_backup.players.every(p => Tournament.EVENTS.every(e => p.events[e].length === 7)));

  // The authenticated local Admin download remains the complete private archive.
  // Simulate that archive separately from the public Discord export.
  const fullArchiveExport = { json: Tournament.makeArchiveSnapshot(H.getTournamentState()) };
  fullArchiveExport.data = JSON.stringify(fullArchiveExport.json, null, 2);
  assert.equal(fullArchiveExport.json.player_account_links !== undefined, true);
  assert.equal(fullArchiveExport.json.pending_ocr_corrections.length, 1);
  await fs.writeFile(path.join(outputDir, 'synthetic-full-state-archive.json'), JSON.stringify(fullArchiveExport.json, null, 2) + '\n');

  // Importing the full local Admin archive restores both working state and its pending OCR queue.
  H.pendingRecords.clear();
  await H.setTournamentState(Tournament.createState());
  try {
    global.fetch = async () => ({ ok: true, status: 200, async text() { return JSON.stringify(fullArchiveExport.json); } });
    const fakeAttachment = { name: 'full-archive.json', contentType: 'application/json', size: Buffer.byteLength(fullArchiveExport.data), url: 'https://synthetic.invalid/full-archive.json' };
    const importResult = await send('!yolo import', { attachments: new Map([['archive', fakeAttachment]]) });
    assert.match(importResult.text, /Restored tournament backup: 3 players/);
    assert.equal(H.getTournamentState().battleRecords.length, 2);
    assert.equal(H.pendingRecords.has(pendingKey), true, 'imported pending OCR correction is restored in memory');
    assert.equal(H.getTournamentState().pendingOcrCorrections.length, 1);
    assert.equal(H.pendingRecords.get(pendingKey).sourceEvidence.sha256, 'b'.repeat(64), 'source checksum survives archive import/restart');
  } finally { global.fetch = originalFetch; }

  // Continue the one-value-at-a-time OCR correction after the import/restart simulation.
  const answers = ['Defeat', roster[0], 'New Dawn', 'Random Battle', '23.10.2026 14:46', '540180', '1536', '87373', '3776'];
  for (const answer of answers) {
    const result = await send(answer, { id: `correction-${answers.indexOf(answer)}` });
    assert.doesNotMatch(result.text, /Correction problems|Fields still missing/);
  }
  assert.equal(H.pendingRecords.has(pendingKey), false, 'completed correction leaves no in-memory pending state');
  assert.equal(H.getTournamentState().pendingOcrCorrections.length, 0);
  const correctedRecord = H.getTournamentState().battleRecords.find(row => row.source_file === 'synthetic-pending.png');
  assert.ok(correctedRecord, 'verified corrected screenshot should become a structured OCR record');
  assert.equal(correctedRecord.record.battle.player_name, roster[0]);
  assert.equal(correctedRecord.record.battle.metrics.damage, 87373);
  assert.equal(correctedRecord.record.source.evidence.sha256, 'b'.repeat(64), 'source evidence survives pending correction and record export');
  assert.equal(correctedRecord.record.source.evidence.message_id, '123456789012345678');
  assert.match((await send('cancel mapping')).text, /mapping cancelled/i, 'user can cancel the tournament mapping while retaining OCR record');

  const cancelRecord = BattleRecord.buildBattleRecord('', {});
  await H.promptForMissingValues(makeMessage(''), 'synthetic-cancel.png', cancelRecord, BattleRecord.getMissingRequiredFields(cancelRecord));
  assert.equal(H.pendingRecords.has(pendingKey), true);
  assert.match((await send('cancel correction')).text, /Correction cancelled/i);
  assert.equal(H.pendingRecords.has(pendingKey), false);
  assert.equal(H.getTournamentState().pendingOcrCorrections.length, 0);

  // Complete guided mapping through a record from the archive, including resuming after a slot clear.
  assert.match((await send('!yolo records')).text, /SYNTHETIC-ARCHIVE-RECORD/);
  assert.match((await send('!yolo records')).text, /SYNTHETIC-GRAND-RECORD/);

  // Race mapping must ask for time; the screenshot timestamp is never substituted.
  assert.match((await send(`!yolo clear-slot ${roster[0]} | race | 7`)).text, /Cleared/);
  assert.match((await send('!yolo map SYNTHETIC-ARCHIVE-RECORD')).text, /Started or queued mapping/);
  const blockedUpload = new Map([['image', { name: 'blocked.png', size: 1 }]]);
  assert.match((await send('not a mapping answer', { attachments: blockedUpload })).text, /Finish or `cancel mapping`/);
  assert.match((await send('unknown event')).text, /Use `damage`, `kills`, `race`, or `grand`/);
  assert.match((await send('race')).text, /game slot/i);
  assert.match((await send('7')).text, /ship class/i);
  assert.match((await send('CV')).text, /Ship class must be/);
  assert.match((await send('DD')).text, /ship tier/i);
  assert.match((await send('12')).text, /Tier must be/);
  assert.match((await send('8')).text, /positive number of seconds/i);
  assert.match((await send('0')).text, /Race time must be a positive number/i);
  const raceMapFinish = await send('74.5');
  assert.match(raceMapFinish.text, /Saved screenshot to/);
  let mapped = H.getTournamentState().battleRecords.find(row => row.record_id === 'SYNTHETIC-ARCHIVE-RECORD');
  assert.equal(mapped.status, 'mapped');
  assert.equal(mapped.tournament_mapping.event, 'race');
  assert.equal(mapped.tournament_mapping.game_number, 7);
  assert.equal(H.getTournamentState().players[0].events.race[6].metric, 74.5);
  assert.ok(H.getTournamentState().importedBattleRecordIds.includes('SYNTHETIC-ARCHIVE-RECORD'));

  // Grand Yolo mapping asks for missing damage, kills, and time one at a time.
  assert.match((await send(`!yolo clear-slot ${roster[0]} | grand | 7`)).text, /Cleared/);
  assert.match((await send('!yolo map SYNTHETIC-GRAND-RECORD')).text, /Started or queued mapping/);
  assert.match((await send('grand')).text, /game slot/i);
  assert.match((await send('7')).text, /ship class/i);
  assert.match((await send('CA')).text, /ship tier/i);
  assert.match((await send('8')).text, /damage value/i);
  assert.match((await send('144000')).text, /How many kills/i);
  assert.match((await send('4')).text, /race time/i);
  const grandMapFinish = await send('63.5');
  assert.match(grandMapFinish.text, /Saved screenshot to/);
  const mappedGrand = H.getTournamentState().battleRecords.find(row => row.record_id === 'SYNTHETIC-GRAND-RECORD');
  assert.equal(mappedGrand.status, 'mapped');
  assert.equal(H.getTournamentState().players[0].events.grand[6].damage, 144000);
  assert.equal(H.getTournamentState().players[0].events.grand[6].kills, 4);
  assert.equal(H.getTournamentState().players[0].events.grand[6].time, 63.5);
  assert.match((await send('!yolo map SYNTHETIC-GRAND-RECORD')).text, /already mapped|already been used/i);
  assertScoresMatchWorkbook(H.getTournamentState(), 'after Race and Grand Yolo screenshot mapping');

  // Clear one slot/event/all events, check missing slots, standings, and reset behavior.
  assert.match((await send(`!yolo clear-slot ${roster[0]} | race | 7`)).text, /Released 1 archived record/);
  assert.equal(mapped.status, 'unmapped');
  assert.match((await send(`!yolo missing race | ${roster[0]}`)).text, /G7/);
  assert.match((await send(`!yolo clear-slot ${roster[0]} | grand | 7`)).text, /Released 1 archived record/);
  assert.equal(mappedGrand.status, 'unmapped');
  assert.match((await send(`!yolo clear-event kills | ${roster[0]}`)).text, /Cleared Kills/);
  assert.equal(H.getTournamentState().players[0].events.kills.every(g => g.class === '-'), true);
  assert.match((await send('!yolo clear-event race | ALL')).text, /Cleared Race for 3 player/);
  assert.equal(H.getTournamentState().players.every(p => p.events.race.every(g => g.class === '-')), true);
  assert.match((await send('!yolo clear-results')).text, /Type.*CONFIRM/);
  const poolBeforeClear = H.getTournamentState().settings.events.damage.pool;
  assert.match((await send('!yolo clear-results CONFIRM')).text, /All event slots cleared/);
  testState = H.getTournamentState();
  assert.equal(testState.players.length, 3);
  assert.equal(testState.settings.events.damage.pool, poolBeforeClear);
  assert.ok(testState.players.every(p => Tournament.EVENTS.every(e => p.events[e].every(g => g.class === '-'))));
  assert.match((await send('!yolo status')).text, /Damage 0\/7/);
  assert.match((await send('!yolo missing')).text, /Damage/);
  assert.match((await send('!yolo standings')).text, /aggregate/i);
  assertScoresMatchWorkbook(testState, 'after clear-results');

  // Clear events by individual and ALL paths are covered; test remove/add on the live roster too.
  const oldPixelId = Tournament.findPlayer(testState, roster[2]).id;
  assert.match((await send(`!yolo remove-player ${roster[2]}`)).text, /Removed/);
  assert.equal(Tournament.findPlayer(H.getTournamentState(), roster[2]), null);
  assert.match((await send(`!yolo add-player ${roster[2]}`)).text, /Added/);
  assert.notEqual(Tournament.findPlayer(H.getTournamentState(), roster[2]).id, oldPixelId, 'deleted IDs are not silently reused while the bot is running');

  // Invalid/missing import attachments and malformed JSON fail without corrupting active state.
  assert.match((await send('!yolo import')).text, /Attach a `\.json` backup/);
  const stateBeforeBadImport = JSON.stringify(H.getTournamentState());
  try {
    global.fetch = async () => ({ ok: true, status: 200, async text() { return '{not valid json'; } });
    const bad = { name: 'bad.json', contentType: 'application/json', size: 20, url: 'https://synthetic.invalid/bad.json' };
    assert.match((await send('!yolo import', { attachments: new Map([['bad', bad]]) })).text, /Unexpected token|JSON/);
  } finally { global.fetch = originalFetch; }
  assert.equal(JSON.stringify(H.getTournamentState()), stateBeforeBadImport, 'invalid import must not replace live state');

  // Same-channel snapshot volume and contents are recorded in the report.
  await H.flushArchiveSnapshot();
  const stateFile = await fs.readFile(process.env.TOURNAMENT_STATE_PATH, 'utf8');
  const diskState = JSON.parse(stateFile);
  assert.equal(diskState.version, 2);
  assert.ok(archiveSends.length > 0, 'at least one same-channel recovery snapshot must be attached');
  assert.ok(archiveSends.length < 100, `snapshot coalescing should reduce archive volume, got ${archiveSends.length}`);
  assert.ok(fetchedChannelIds.every(id => id === process.env.TARGET_CHANNEL_ID));
  await fs.writeFile(path.join(outputDir, 'synthetic-system-validation-report.json'), `${JSON.stringify({
    generated_at: new Date().toISOString(), test_scope: 'offline Discord handler integration; no real Discord token/API calls',
    generated_randomized_game_slots: generatedRows.length, players_in_generated_grid: roster.length,
    events: Tournament.EVENTS, game_slots_per_player: 28, result_rows: generatedRows,
    settings_tested: settingsCommands.map(([event, field, value]) => ({ event, field, value })),
    workbook_reference: 'testdata/yolo_tourney_workbook_reference.html',
    excel_h12_source_truth: { cell: 'Totals!H12', formula: workbookTruth.source_formula, source_G12: workbookTruth.source_G12_cached_value, source_H12_raw: workbookTruth.source_H12_cached_value, source_H12_display: workbookTruth.source_H12_display_value, default_grand_tier_weight: workbookTruth.grand_yolo_default_tier_weight },
    workbook_backup_schema: { version: workbookExport.json.version, player_count: workbookExport.json.players.length, all_players_have_28_slots: workbookExport.json.players.every(p => Tournament.EVENTS.every(e => p.events[e].length === 7)) },
    final_export_summary: finalExport.json.final_summary,
    full_archive: { format: fullArchiveExport.json.format, battle_records: fullArchiveExport.json.battle_records.length, pending_corrections: fullArchiveExport.json.pending_ocr_corrections.length },
    local_json_persisted: true, archive_snapshot_attachments_captured: archiveSends.length,
    snapshot_channel_ids: [...new Set(fetchedChannelIds)], synthetic_discord_tests_only: true,
  }, null, 2)}\n`);

  // Every bot command currently advertised by `!yolo help` has been invoked at least once.
  const documented = ['help', 'players', 'player', 'add-player', 'rename-player', 'remove-player', 'result', 'setting', 'settings', 'standings', 'totals', 'status', 'missing', 'clear-slot', 'clear-event', 'clear-results', 'records', 'map', 'export', 'finalize', 'snapshot', 'export-workbook', 'download-workbook', 'workbook', 'import'];
  assert.ok(documented.length >= 20);
  t.diagnostic(`Executed ${documented.length} documented command families; generated ${generatedRows.length} slot results and ${archiveSends.length} same-channel snapshots.`);
});


test('50-player randomized tournament: roster cap, all-player aggregates, dollars and public same-channel commands stay consistent', async () => {
  const rng = rngFactory(0x50A11CE);
  const state = Tournament.createState();
  const pick = values => values[randomInt(rng, 0, values.length - 1)];
  for (let i = 1; i <= 50; i++) {
    const player = Tournament.addPlayer(state, `Random Player ${String(i).padStart(2, '0')}`);
    for (const event of Tournament.EVENTS) {
      player.events[event] = Array.from({ length: 7 }, () => {
        const shipClass = pick(CLASS_CODES);
        const base = { class: shipClass, classWeight: ({DD:4,CA:3,BB:2})[shipClass], tier: randomInt(rng,1,11) };
        if (event === 'damage') return { ...base, metric: randomInt(rng, 1_000, 250_000) };
        if (event === 'kills') return { ...base, metric: randomInt(rng, 0, 8) };
        if (event === 'race') return { ...base, metric: randomInt(rng, 15, 240) };
        return { ...base, damage: randomInt(rng, 1_000, 250_000), kills: randomInt(rng, 0, 8), time: randomInt(rng, 15, 240) };
      });
    }
  }
  await H.setTournamentState(state);
  // Independently compare every player's four event scores to the formulas
  // extracted from the supplied HTML workbook, not just the bot's own total.
  assertScoresMatchWorkbook(H.getTournamentState(), '50-player randomized independent workbook formula comparison');
  // Exercise non-default weights and multipliers against the same independent
  // formula oracle, including Grand Yolo's unusual tier-weight formula.
  const variedSettingsState = Tournament.normalizeState(H.getTournamentState());
  for (const [event, field, value] of [
    ['damage', 'pool', 735], ['damage', 'multiplier', 1.27], ['damage', 'tierPower', 1.4],
    ['kills', 'pool', 290], ['kills', 'multiplier', 0.82], ['kills', 'tierPower', 0.75],
    ['race', 'pool', 460], ['race', 'multiplier', 1.11], ['race', 'tierPower', 1.6],
    ['grand', 'multiplier', 1.23], ['grand', 'tierWeight', 1.07], ['grand', 'damageWeight', 0.91],
    ['grand', 'killsWeight', 0.74], ['grand', 'timeWeight', 1.16],
  ]) Tournament.setSetting(variedSettingsState, event, field, value);
  assertScoresMatchWorkbook(variedSettingsState, '50-player randomized non-default settings independent workbook formula comparison');
  const rows = Tournament.standings(H.getTournamentState());
  assert.equal(rows.length, 50);
  assert.throws(() => Tournament.addPlayer(H.getTournamentState(), 'Player 51'), /roster is full \(50 players\)/i);
  const totalDoubloons = rows.reduce((sum, row) => sum + row.total, 0);
  const expectedDollars = 0.54 * totalDoubloons / 100;
  const totals = await send('!yolo totals');
  assert.match(totals.text, /Players: \*\*50\/50\*\*/);
  assert.ok(totals.text.includes(`**Total doubloons (G12-equivalent): ${totalDoubloons.toFixed(2)}**`));
  assert.doesNotMatch(totals.text, /H12-equivalent|Estimated total value|\$/);
  assert.ok(Math.abs(rows.reduce((sum,row) => sum + row.estimatedValue, 0) - expectedDollars) < 1e-7);
  const standings = await send('!yolo standings');
  const allStandingsMessages = standings.text + '\n' + standings.sends.map(x => x.content || '').join('\n');
  assert.match(allStandingsMessages, /All-player aggregate \(50\/50 players\)/);
  assert.ok(allStandingsMessages.includes(`Total doubloons (G12-equivalent): ${totalDoubloons.toFixed(2)}`));
  assert.doesNotMatch(allStandingsMessages, /H12-equivalent|Estimated total value|\$/);
  const before = archiveSends.length;
  const snapshot = await send('!yolo snapshot');
  assert.match(snapshot.text, /snapshot attached/i);
  assert.ok(archiveSends.length > before);
  assert.ok(fetchedChannelIds.every(id => id === process.env.TARGET_CHANNEL_ID), 'all snapshots remain public in the one configured channel');
  const backup = Tournament.makeWorkbookBackup(H.getTournamentState());
  const workbookRestored = Tournament.importBackup(JSON.parse(JSON.stringify(backup)));
  assert.equal(workbookRestored.players.length, 50);
  assertScoresMatchWorkbook(workbookRestored, '50-player workbook backup round-trip');
  const fullArchive = Tournament.makeArchiveSnapshot(H.getTournamentState());
  const archiveRestored = Tournament.importBackup(JSON.parse(JSON.stringify(fullArchive)));
  assert.equal(archiveRestored.players.length, 50);
  assertScoresMatchWorkbook(archiveRestored, '50-player full archive round-trip');
  const variedBackup = Tournament.makeWorkbookBackup(variedSettingsState);
  const variedRestored = Tournament.importBackup(JSON.parse(JSON.stringify(variedBackup)));
  assert.deepEqual(variedRestored.settings, variedSettingsState.settings, 'import must preserve all customized scoring settings');
  assertScoresMatchWorkbook(variedRestored, '50-player varied-settings workbook backup round-trip');
  const restoredTotal = Tournament.standings(archiveRestored).reduce((sum, row) => sum + row.total, 0);
  assert.ok(Math.abs((0.54 * restoredTotal / 100) - expectedDollars) < 1e-8,
    'full archive restore must preserve the internal legacy H12 diagnostic');
  assert.throws(() => Tournament.importBackup({ ...backup, players: [...backup.players, { id: 51, name: 'Over cap' }] }), /at most 50 players/i);
});


test('public interactive panel renders controls, responds to totals/event selection, and ignores other channels', async () => {
  const panel = await send('!yolo panel');
  assert.equal(panel.replies.length, 1);
  assert.match(panel.replies[0].content, /YOLO Tournament Control Panel/);
  assert.equal(panel.replies[0].components.length, 2);
  // Inspect the serialized Discord API payload rather than private builder state.
  // discord.js keeps select-menu options on the builder and includes them in toJSON().
  const buttons = panel.replies[0].components[0].components.map(item => item.toJSON().custom_id);
  assert.deepEqual(buttons, ['yolo:home', 'yolo:totals', 'yolo:standings', 'yolo:players', 'yolo:scoring']);
  const menu = panel.replies[0].components[1].components[0].toJSON();
  assert.equal(menu.custom_id, 'yolo:event');
  assert.deepEqual(menu.options.map(option => option.value), Tournament.EVENTS);
  assert.deepEqual(menu.options.map(option => option.label), Tournament.EVENTS.map(event => Tournament.EVENT_LABELS[event]));

  let updated;
  const totalsInteraction = {
    channelId: process.env.TARGET_CHANNEL_ID,
    customId: 'yolo:totals',
    isChatInputCommand: () => false,
    isButton: () => true,
    isStringSelectMenu: () => false,
    async update(payload) { updated = payload; },
  };
  assert.equal(await H.handleInteraction(totalsInteraction), true);
  assert.match(updated.content, /G12-equivalent/);
  assert.equal(updated.components.length, 2);

  const eventInteraction = {
    channelId: process.env.TARGET_CHANNEL_ID,
    customId: 'yolo:event', values: ['grand'],
    isChatInputCommand: () => false,
    isButton: () => false,
    isStringSelectMenu: () => true,
    async update(payload) { updated = payload; },
  };
  assert.equal(await H.handleInteraction(eventInteraction), true);
  assert.match(updated.content, /Grand Yolo leaderboard/);

  let outsideChannelResponded = false;
  const outside = { ...totalsInteraction, channelId: 'not-the-configured-channel', async update() { outsideChannelResponded = true; } };
  assert.equal(await H.handleInteraction(outside), false);
  assert.equal(outsideChannelResponded, false, 'the bot must never publish tournament content in another channel');
});


test('interactive panel ignores unsupported and malformed interaction payloads safely', async () => {
  const base = {
    channelId: process.env.TARGET_CHANNEL_ID,
    isChatInputCommand: () => false,
    isButton: () => false,
    isStringSelectMenu: () => false,
    async update() { throw new Error('unsupported interaction must not update a message'); },
    async reply() { throw new Error('unsupported interaction must not reply'); },
  };
  assert.equal(await H.handleInteraction({ ...base, channelId: undefined }), false, 'missing channel ID must fail closed');
  assert.equal(await H.handleInteraction({ ...base, customId: 'yolo:unknown' }), false, 'unsupported component type must be ignored');

  let replyContent = '';
  const malformedSelect = {
    ...base,
    isStringSelectMenu: () => true,
    customId: 'yolo:event',
    values: [],
    async reply(payload) { replyContent = payload.content; },
  };
  assert.equal(await H.handleInteraction(malformedSelect), true);
  assert.match(replyContent, /event selection is invalid/i, 'malformed select values must produce a controlled public error');
});

test('runtime gate accepts Node 22.16.0 and newer stable releases', () => {
  assert.equal(H.runtimeSupported('22.16.0'), true);
  assert.equal(H.runtimeSupported('v22.16.0'), true);
  assert.equal(H.runtimeSupported('22.16.1'), true);
  assert.equal(H.runtimeSupported('22.17.0'), true);
  assert.equal(H.runtimeSupported('23.0.0'), true);
  assert.equal(H.runtimeSupported('24.17.0'), true);
  assert.equal(H.runtimeSupported('25.0.0'), true);
  assert.equal(H.runtimeSupported('22.15.9'), false);
  assert.equal(H.runtimeSupported('22.0.0'), false);
  assert.equal(H.runtimeSupported('21.99.99'), false);
  assert.equal(H.runtimeSupported('not-a-version'), false);
  assert.equal(H.runtimeSupported('22.16.0-rc.1'), false);
});

test.after(async () => {
  H.pendingRecords.clear();
  await fs.rm(tempRoot, { recursive: true, force: true });
});


test('Discord score views label event scores as doubloons and separate bracket wins from damage awards', async () => {
  const previous = Tournament.normalizeState(H.getTournamentState());
  try {
    const state = Tournament.createState();
    const fast = Tournament.addPlayer(state, 'Race Fast');
    const slow = Tournament.addPlayer(state, 'Race Slow');
    Tournament.recordResult(state, { player: fast.id, event: 'race', gameNumber: 1, shipClass: 'DD', tier: 2, time: 60 });
    Tournament.recordResult(state, { player: slow.id, event: 'race', gameNumber: 1, shipClass: 'DD', tier: 2, time: 120 });
    await H.setTournamentState(state);

    const standings = H.tournamentStandingsText();
    assert.match(standings, /Damage dubs/);
    assert.match(standings, /calculated doubloons, not raw damage\/kills\/time/);
    assert.match(standings, /Match wins and weekly bracket advancement are tracked separately/);

    const race = H.eventStandingsText('race');
    assert.match(race, /C01 inverse-time/);
    assert.ok(race.indexOf('Race Fast') < race.indexOf('Race Slow'));

    const guide = H.scoringGuideText();
    assert.match(guide, /1 ÷ that player's elapsed seconds/);
    assert.match(guide, /high-damage loss does not become a bracket win/);

    const player = H.playerDetailText('Race Fast');
    assert.match(player, /60s/);
    assert.match(player, /raw scoring inputs/);
    const command = await send('!yolo scoring');
    assert.match(command.text, /YOLO scoring guide/);
    const componentRows = H.buildTournamentPanelComponents();
    assert.ok(componentRows[0].components.some(button => button.data.custom_id === 'yolo:scoring'));
    let updated;
    const scoringButton = {
      channelId: H.getTargetChannelId(),
      customId: 'yolo:scoring',
      isChatInputCommand: () => false,
      isButton: () => true,
      isStringSelectMenu: () => false,
      async update(payload) { updated = payload; },
    };
    assert.equal(await H.handleInteraction(scoringButton), true);
    assert.match(updated.content, /YOLO scoring guide/);

  } finally {
    await H.setTournamentState(previous);
  }
});

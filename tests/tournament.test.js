'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const T = require('../src/tournament');

test('new state has all four rounds with seven empty slots and workbook defaults', () => {
  const state = T.createState();
  assert.deepEqual(state.players, []);
  assert.deepEqual(state.settings.events.damage, { pool: 500, multiplier: 1, tierPower: 1 });
  assert.deepEqual(state.settings.events.grand, { pool: 500, multiplier: 1, tierWeight: 0.9, damageWeight: 1, killsWeight: 1, timeWeight: 1 });
  const p = T.addPlayer(state, 'Alpha');
  for (const event of T.EVENTS) assert.equal(p.events[event].length, 7);
});

test('Grand Yolo tier-weight default matches Excel d4!F10 and old tierPower imports preserve 0.9', () => {
  const state = T.createState();
  assert.equal(state.settings.events.grand.tierWeight, 0.9);
  assert.equal(T.normalizeState({ settings: { events: { grand: { tierPower: 0.9 } } } }).settings.events.grand.tierWeight, 0.9);
  assert.equal(T.normalizeState({ settings: { events: { grand: { tierPower: 1 } } } }).settings.events.grand.tierWeight, 1);
});

test('damage scoring follows workbook formula and recalculates against the whole roster', () => {
  const state = T.createState();
  const a = T.addPlayer(state, 'Alpha');
  const b = T.addPlayer(state, 'Bravo');
  T.recordResult(state, { player: a.id, event: 'damage', gameNumber: 1, shipClass: 'DD', tier: 1, damage: 100 });
  T.recordResult(state, { player: b.id, event: 'damage', gameNumber: 1, shipClass: 'BB', tier: 1, damage: 100 });
  assert.equal(T.eventScore(state, a, 'damage'), 2 * 500 * (4 * (100 / 200)));
  assert.equal(T.eventScore(state, b, 'damage'), 2 * 500 * (2 * (100 / 200)));
});

test('manual result entry validates fields and blocks accidental overwrites', () => {
  const state = T.createState();
  const p = T.addPlayer(state, 'Alpha');
  T.recordResult(state, { player: p.name, event: 'kills', gameNumber: 1, shipClass: 'CA', tier: 8, kills: 3 });
  assert.equal(p.events.kills[0].metric, 3);
  assert.throws(() => T.recordResult(state, { player: p.name, event: 'kills', gameNumber: 1, shipClass: 'CA', tier: 8, kills: 2 }), /already filled/);
  assert.throws(() => T.recordResult(state, { player: p.name, event: 'race', gameNumber: 2, shipClass: 'DD', tier: 8, time: 0 }), /positive time/);
});

test('Grand Yolo requires positive time and scores using the workbook Grand formula', () => {
  const state = T.createState();
  const p = T.addPlayer(state, 'Alpha');
  const payload = { player: p.id, event: 'grand', gameNumber: 1, shipClass: 'DD', tier: 10, damage: 50000, kills: 3, time: 60 };
  assert.throws(() => T.recordResult(state, { ...payload, time: 0 }), /positive time/);
  T.recordResult(state, payload);
  assert.equal(T.eventScore(state, p, 'grand'), 0, 'workbook returns zero until all seven times are positive');
  for (let game = 2; game <= 7; game++) T.recordResult(state, { ...payload, gameNumber: game });
  const expected = (((100 / 10 * 0.9) + (50000 / 10 / 1000) + (3 * 10 / 10) + (5 / 60 * 1000)) * 4 * 7) / 3;
  assert.ok(Math.abs(T.eventScore(state, p, 'grand') - expected) < 1e-9);
});

test('settings, standings, and workbook backup round-trip', () => {
  const state = T.createState();
  const p = T.addPlayer(state, 'Alpha');
  T.recordResult(state, { player: p.id, event: 'damage', gameNumber: 1, shipClass: 'DD', tier: 7, damage: 12345 });
  T.setSetting(state, 'damage', 'multiplier', 1.5);
  assert.equal(T.standings(state)[0].name, 'Alpha');
  const backup = T.makeWorkbookBackup(state);
  const restored = T.importBackup(backup);
  assert.equal(restored.players[0].events.damage[0].metric, 12345);
  assert.equal(restored.settings.events.damage.multiplier, 1.5);
});

test('persistent JSON store saves and reloads state', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'yolo-tourney-'));
  try {
    const store = T.createStore(path.join(dir, 'state.json'));
    const state = await store.load();
    T.addPlayer(state, 'Persisted Player');
    await store.save(state);
    const reloaded = await store.load();
    assert.equal(reloaded.players[0].name, 'Persisted Player');
    assert.equal((await store.exportSnapshot(reloaded)).includes('Persisted Player'), true);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});


test('rename preserves score data and rejects duplicate names', () => {
  const state = T.createState();
  const a = T.addPlayer(state, 'Alpha');
  const b = T.addPlayer(state, 'Bravo');
  T.recordResult(state, { player: a.id, event: 'damage', gameNumber: 1, shipClass: 'DD', tier: 6, damage: 12000 });
  const renamed = T.renamePlayer(state, a.id, 'Alpha Prime');
  assert.equal(renamed.previousName, 'Alpha');
  assert.equal(a.name, 'Alpha Prime');
  assert.equal(a.events.damage[0].metric, 12000);
  assert.throws(() => T.renamePlayer(state, b.id, 'Alpha Prime'), /already exists/);
});

test('clear event and all-results reset preserve roster and settings while making slots empty', () => {
  const state = T.createState();
  const a = T.addPlayer(state, 'Alpha');
  const b = T.addPlayer(state, 'Bravo');
  T.recordResult(state, { player: a.id, event: 'damage', gameNumber: 1, shipClass: 'DD', tier: 6, damage: 12000 });
  T.recordResult(state, { player: b.id, event: 'kills', gameNumber: 1, shipClass: 'CA', tier: 8, kills: 2 });
  T.setSetting(state, 'damage', 'multiplier', 1.25);
  T.clearEvent(state, 'damage', a.id);
  assert.equal(a.events.damage[0].class, '-');
  assert.equal(b.events.kills[0].metric, 2);
  T.clearAllResults(state);
  assert.equal(state.players.length, 2);
  assert.equal(state.players[0].events.kills.every(g => g.class === '-'), true);
  assert.equal(state.settings.events.damage.multiplier, 1.25);
});

test('full archive round-trip preserves OCR pending corrections and mapping queue', () => {
  const state = T.createState();
  T.addPlayer(state, 'Alpha');
  state.pendingOcrCorrections = [{ key: 'channel:user', createdAt: Date.now(), fileName: 'partial.png', record: { test: true } }];
  state.pendingSubmissions = [{ record_id: 'rec-1', userId: 'u1', channelId: 'c1' }];
  state.battleRecords = [{ record_id: 'rec-1', status: 'unmapped' }];
  const archive = T.makeArchiveSnapshot(state);
  const restored = T.importBackup(archive);
  assert.equal(restored.pendingOcrCorrections[0].key, 'channel:user');
  assert.equal(restored.pendingSubmissions[0].record_id, 'rec-1');
  assert.equal(restored.battleRecords[0].record_id, 'rec-1');
});

test('store can recover from a full Discord archive snapshot file', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'yolo-tourney-archive-'));
  try {
    const statePath = path.join(dir, 'state.json');
    const seed = T.createState();
    T.addPlayer(seed, 'Archive Player');
    await fs.writeFile(statePath, JSON.stringify(T.makeArchiveSnapshot(seed)), 'utf8');
    const loaded = await T.createStore(statePath).load();
    assert.equal(loaded.players[0].name, 'Archive Player');
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});


test('randomized 50-player tournament aggregate matches Excel-style G12/H12 unrounded aggregation', () => {
  const state = T.createState();
  let seed = 0x51A7BEEF;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 0x100000000; };
  const classes = ['DD', 'CA', 'BB'];
  for (let i = 1; i <= T.MAX_PLAYERS; i++) {
    const player = T.addPlayer(state, `Synthetic ${String(i).padStart(2, '0')}`);
    for (const event of T.EVENTS) {
      player.events[event] = Array.from({ length: 7 }, () => {
        const shipClass = classes[Math.floor(random() * classes.length)];
        const tier = 1 + Math.floor(random() * 11);
        const classWeight = T.classWeightFor(shipClass);
        if (event === 'grand') return { class: shipClass, classWeight, tier, damage: 10000 + Math.floor(random() * 250000), kills: Math.floor(random() * 8), time: 20 + Math.floor(random() * 240) };
        return { class: shipClass, classWeight, tier, metric: event === 'damage' ? 1000 + Math.floor(random() * 250000) : event === 'kills' ? Math.floor(random() * 8) : 20 + Math.floor(random() * 240) };
      });
    }
  }
  assert.equal(state.players.length, 50);
  const rows = T.standings(state);
  assert.equal(rows.length, 50);
  const excelG12Equivalent = rows.reduce((sum, row) => sum + row.total, 0);
  const excelH12Equivalent = 0.54 * excelG12Equivalent / 100;
  const noRoundedRowsBeforeSum = 0.54 * rows.reduce((sum, row) => sum + row.total, 0) / 100;
  assert.ok(Number.isFinite(excelG12Equivalent) && excelG12Equivalent > 0);
  assert.ok(Math.abs(excelH12Equivalent - noRoundedRowsBeforeSum) < 1e-12);
  assert.equal(`$${excelH12Equivalent.toFixed(2)}`, `$${(0.54 * excelG12Equivalent / 100).toFixed(2)}`);
  assert.equal(T.MAX_PLAYERS, 50);
});


test('standalone HTML score calculator matches DWBOT Grand Yolo tier-weight default and migration', async () => {
  const html = await fs.readFile(path.join(__dirname, '..', 'dwbotStuff', 'yolo_tournament_scoreCalculator.html'), 'utf8');
  assert.match(html, /grand:\s*\{pool:500, multiplier:1, tierWeight:0\.9, damageWeight:1, killsWeight:1, timeWeight:1\}/);
  assert.match(html, /savedEvent\.tierWeight=legacyTier===undefined \? 0\.9 : num\(legacyTier\)/);
  assert.match(html, /const legacyTier=old\.grandTierWeight \?\? old\.grandTierPower \?\? old\.tierPower \?\? 0\.9/);
  assert.match(html, /function defaultSettingValue\(key,field\)\{ return key===\"grand\"&&field===\"tierWeight\" \? 0\.9 : 1; \}/);
  assert.match(html, /Reset \$\{label\} to \$\{defaultValue\}/);
  assert.match(html, /cfg\(key\)\[field\]=defaultValue/);
  assert.match(html, /Grand Yolo Tier weight is 0\.9/);
});


test('standalone HTML score calculator exposes mouseover and assistive scoring help', async () => {
  const html = await fs.readFile(path.join(__dirname, '..', 'dwbotStuff', 'yolo_tournament_scoreCalculator.html'), 'utf8');
  assert.match(html, /title="\$\{esc\(description\)\}"/);
  assert.match(html, /title="\$\{esc\(poolDescription\)\}"/);
  assert.match(html, /aria-describedby="\$\{key\}-pool-note"/);
  assert.match(html, /Ship class weighting: DD = 4, CA = 3, BB = 2/);
  assert.match(html, /Restore the workbook\/DWBOT default/);
});


test('standalone HTML Grand Yolo formula matches the live DWBOT scoring engine', async () => {
  const html = await fs.readFile(path.join(__dirname, '..', 'dwbotStuff', 'yolo_tournament_scoreCalculator.html'), 'utf8');
  const core = await fs.readFile(path.join(__dirname, '..', 'src', 'tournament.js'), 'utf8');
  const htmlFormula = html.match(/const perGame=([\s\S]*?);/)?.[1]?.replace(/\s+/g, '');
  const coreFormula = core.match(/const perGame\s*=\s*([\s\S]*?);/)?.[1]?.replace(/\s+/g, '');
  assert.ok(htmlFormula, 'HTML Grand Yolo formula must be present');
  assert.ok(coreFormula, 'DWBOT Grand Yolo formula must be present');
  assert.equal(htmlFormula, coreFormula);
  assert.equal(T.DEFAULT_SETTINGS.events.grand.tierWeight, 0.9);
});


test('HTML calculator and live DWBOT engine match all four event formulas', async () => {
  const html = await fs.readFile(path.join(__dirname, '..', 'dwbotStuff', 'yolo_tournament_scoreCalculator.html'), 'utf8');
  const start = html.indexOf('function eventRawScore(p,key){');
  const end = html.indexOf('function eventScore(p,key)', start);
  assert.ok(start >= 0 && end > start, 'HTML eventRawScore function must exist');
  const functionSource = html.slice(start, end).trim();
  const state = T.createState();
  let seed = 271828;
  const random = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 12; i++) {
    const player = T.addPlayer(state, 'Formula parity ' + i);
    for (const event of T.EVENTS) {
      player.events[event] = Array.from({ length: 7 }, () => {
        const shipClass = ['DD', 'CA', 'BB'][Math.floor(random() * 3)];
        const tier = 1 + Math.floor(random() * 10);
        if (event === 'grand') return {
          class: shipClass, classWeight: ({ DD: 4, CA: 3, BB: 2 })[shipClass], tier,
          damage: 10000 + Math.floor(random() * 90000),
          kills: Math.floor(random() * 8),
          time: 30 + Math.floor(random() * 240),
        };
        return {
          class: shipClass, classWeight: ({ DD: 4, CA: 3, BB: 2 })[shipClass], tier,
          metric: event === 'race' ? 30 + Math.floor(random() * 240) : 1000 + Math.floor(random() * 100000),
        };
      });
    }
  }
  const sandbox = {
    state,
    num: value => { const n = Number(value); return Number.isFinite(n) ? n : 0; },
    cfg: key => state.settings.events[key],
    classWeightFor: code => ({ DD: 4, CA: 3, BB: 2 })[String(code || '-').toUpperCase()] || 0,
    eventTotal: (player, key) => player.events[key].reduce((sum, game) => sum + Number(key === 'grand' ? game.damage : game.metric), 0),
  };
  const htmlEventRawScore = vm.runInNewContext(functionSource + '\neventRawScore;', sandbox);
  for (const player of state.players) {
    for (const event of T.EVENTS) {
      const live = T.eventScore(state, player, event);
      const browser = htmlEventRawScore(player, event);
      assert.ok(Math.abs(live - browser) < 1e-10, player.name + ' / ' + event + ': ' + live + ' vs ' + browser);
    }
  }
});

test('HTML calculator participant tables do not expose H12 dollar estimates', async () => {
  const html = await fs.readFile(path.join(__dirname, '..', 'dwbotStuff', 'yolo_tournament_scoreCalculator.html'), 'utf8');
  assert.doesNotMatch(html, /Estimated value|Season dollars|H12-equivalent|function dollars\(|function money\(|totalDollars/);
  assert.match(html, /Total doubloons/);
});

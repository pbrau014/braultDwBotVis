'use strict';

// Tournament state and scoring engine ported from the supplied YOLO Tourney HTML.
// The state shape intentionally remains compatible with its version-2 JSON backup.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const EVENTS = ['damage', 'kills', 'race', 'grand'];
const EVENT_LABELS = { damage: 'Damage', kills: 'Kills', race: 'Race', grand: 'Grand Yolo' };
const CLASSES = { DD: 4, CA: 3, BB: 2 };
// The expanded Excel workbook provides 50 participant rows. Enforce the same
// capacity in live state so Excel and Discord never silently diverge.
const MAX_PLAYERS = 50;
const DEFAULT_SETTINGS = {
  events: {
    damage: { pool: 500, multiplier: 1, tierPower: 1 },
    kills: { pool: 500, multiplier: 1, tierPower: 1 },
    race: { pool: 500, multiplier: 1, tierPower: 1 },
    grand: { pool: 500, multiplier: 1, tierWeight: 0.9, damageWeight: 1, killsWeight: 1, timeWeight: 1 },
  },
};

function num(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
function normalizeClass(value) { const code = String(value ?? '-').trim().toUpperCase(); return Object.hasOwn(CLASSES, code) ? code : '-'; }
function classWeightFor(value) { return CLASSES[normalizeClass(value)] || 0; }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function emptyGame(key) {
  return key === 'grand'
    ? { class: '-', classWeight: 0, tier: 1, damage: 0, kills: 0, time: 0 }
    : { class: '-', classWeight: 0, tier: 1, metric: 0 };
}
function normalizePlayer(player, index) {
  const p = player || {};
  const out = { id: Number(p.id) || index + 1, name: String(p.name || `Player ${index + 1}`).trim(), events: {} };
  for (const key of EVENTS) {
    const games = Array.isArray(p.events?.[key]) ? p.events[key] : [];
    out.events[key] = Array.from({ length: 7 }, (_, i) => {
      const g = games[i] || {};
      const code = normalizeClass(g.class);
      if (key === 'grand') return { class: code, classWeight: classWeightFor(code), tier: num(g.tier ?? 1), damage: num(g.damage), kills: num(g.kills), time: num(g.time) };
      return { class: code, classWeight: classWeightFor(code), tier: num(g.tier ?? 1), metric: num(g.metric) };
    });
  }
  return out;
}
function normalizeSettings(settings) {
  const out = clone(DEFAULT_SETTINGS);
  const old = settings || {};
  if (old.events && typeof old.events === 'object') {
    for (const key of EVENTS) {
      const saved = { ...(old.events[key] || {}) };
      if (key === 'grand') {
        if (saved.tierWeight === undefined) saved.tierWeight = saved.tierPower === undefined ? 0.9 : num(saved.tierPower);
        delete saved.tierPower;
      }
      out.events[key] = { ...out.events[key], ...saved };
    }
  }
  return out;
}
function normalizePlayerAccountLinks(raw, players) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const knownPlayerIds = new Set(players.map(player => String(player.id)));
  const seenDiscordIds = new Set();
  const links = {};
  for (const [playerId, rawDiscordId] of Object.entries(source)) {
    const discordId = String(rawDiscordId || '').trim();
    if (!knownPlayerIds.has(String(playerId))) throw new Error(`Discord account link refers to unknown tournament player ${playerId}.`);
    if (!/^\d{17,20}$/.test(discordId)) throw new Error(`Discord account link for player ${playerId} is not a valid Discord snowflake.`);
    if (seenDiscordIds.has(discordId)) throw new Error(`Discord account ${discordId} is linked to more than one tournament player.`);
    seenDiscordIds.add(discordId);
    links[String(playerId)] = discordId;
  }
  return links;
}

function normalizeState(input = {}) {
  const players = Array.isArray(input.players) ? input.players.map(normalizePlayer) : [];
  if (players.length > MAX_PLAYERS) throw new Error(`Tournament backups may contain at most ${MAX_PLAYERS} players because the bundled workbook supports that many.`);
  const playerAccountLinks = normalizePlayerAccountLinks(
    input.playerAccountLinks ?? input.player_account_links,
    players,
  );
  return {
    version: 2,
    players,
    settings: normalizeSettings(input.settings),
    playerAccountLinks,
    importedBattleRecordIds: Array.isArray(input.importedBattleRecordIds) ? input.importedBattleRecordIds.filter(v => typeof v === 'string') : [],
    battleRecords: Array.isArray(input.battleRecords) ? input.battleRecords : [],
    pendingSubmissions: Array.isArray(input.pendingSubmissions) ? input.pendingSubmissions : [],
    pendingOcrCorrections: Array.isArray(input.pendingOcrCorrections) ? input.pendingOcrCorrections : [],
    nextPlayerId: Math.max(Math.max(0, ...players.map(p => Number(p?.id) || 0)) + 1, Number(input.nextPlayerId) || 1),
  };
}
function createState() { return normalizeState({ players: [], settings: DEFAULT_SETTINGS }); }
function findPlayer(state, nameOrId) {
  const query = String(nameOrId ?? '').trim();
  if (!query) return null;
  return state.players.find(p => String(p.id) === query) || state.players.find(p => p.name.toLowerCase() === query.toLowerCase()) || null;
}
function findPlayerByDiscordUserId(state, discordUserId) {
  const userId = String(discordUserId || '').trim();
  if (!/^\d{17,20}$/.test(userId)) return null;
  const linkedId = Object.entries(state.playerAccountLinks || {}).find(([, value]) => value === userId)?.[0];
  return linkedId == null ? null : findPlayer(state, linkedId);
}
function linkPlayerDiscordAccount(state, playerNameOrId, discordUserId) {
  const player = findPlayer(state, playerNameOrId);
  if (!player) throw new Error(`Player "${playerNameOrId}" was not found.`);
  const userId = String(discordUserId || '').trim();
  if (!/^\d{17,20}$/.test(userId)) throw new Error('Discord user ID must be a 17–20 digit snowflake.');
  const currentOwner = findPlayerByDiscordUserId(state, userId);
  if (currentOwner && currentOwner.id !== player.id) throw new Error(`Discord account ${userId} is already linked to ${currentOwner.name}.`);
  state.playerAccountLinks ||= {};
  state.playerAccountLinks[String(player.id)] = userId;
  return { player, discordUserId: userId };
}
function unlinkPlayerDiscordAccount(state, playerNameOrId) {
  const player = findPlayer(state, playerNameOrId);
  if (!player) throw new Error(`Player "${playerNameOrId}" was not found.`);
  state.playerAccountLinks ||= {};
  const discordUserId = state.playerAccountLinks[String(player.id)] || null;
  delete state.playerAccountLinks[String(player.id)];
  return { player, discordUserId };
}
function addPlayer(state, name) {
  if (state.players.length >= MAX_PLAYERS) throw new Error(`The roster is full (${MAX_PLAYERS} players). The bundled workbook supports up to ${MAX_PLAYERS} participants.`);
  const clean = String(name || '').trim();
  if (!clean) throw new Error('Player name cannot be blank.');
  if (state.players.some(p => p.name.toLowerCase() === clean.toLowerCase())) throw new Error(`Player "${clean}" already exists.`);
  const player = normalizePlayer({ id: state.nextPlayerId++, name: clean, events: {} }, state.players.length);
  state.players.push(player);
  return player;
}
function removePlayer(state, nameOrId) {
  const player = findPlayer(state, nameOrId);
  if (!player) throw new Error(`Player "${nameOrId}" was not found.`);
  state.players = state.players.filter(p => p.id !== player.id);
  if (state.playerAccountLinks) delete state.playerAccountLinks[String(player.id)];
  return player;
}
function renamePlayer(state, nameOrId, newName) {
  const player = findPlayer(state, nameOrId);
  if (!player) throw new Error(`Player "${nameOrId}" was not found.`);
  const clean = String(newName || '').trim();
  if (!clean) throw new Error('New player name cannot be blank.');
  if (state.players.some(p => p.id !== player.id && p.name.toLowerCase() === clean.toLowerCase())) throw new Error(`Player "${clean}" already exists.`);
  const previousName = player.name;
  player.name = clean;
  return { player, previousName };
}
function clearSlot(state, playerNameOrId, event, gameNumber) {
  const slot = getSlot(state, playerNameOrId, event, gameNumber);
  slot.player.events[event][slot.index] = emptyGame(event);
  return { player: slot.player, event, gameNumber: slot.index + 1 };
}
function clearEvent(state, event, playerNameOrId = null) {
  if (!EVENTS.includes(event)) throw new Error(`Event must be one of: ${EVENTS.join(', ')}.`);
  const players = playerNameOrId == null ? state.players : [findPlayer(state, playerNameOrId)].filter(Boolean);
  if (!players.length && playerNameOrId != null) throw new Error(`Player "${playerNameOrId}" was not found.`);
  for (const player of players) player.events[event] = Array.from({ length: 7 }, () => emptyGame(event));
  return players;
}
function clearAllResults(state) {
  for (const player of state.players) for (const event of EVENTS) player.events[event] = Array.from({ length: 7 }, () => emptyGame(event));
  state.importedBattleRecordIds = [];
  state.pendingSubmissions = [];
  for (const record of state.battleRecords) {
    record.status = 'unmapped';
    delete record.mapped_at;
    delete record.tournament_mapping;
  }
}
function eventTotal(player, key) {
  return player.events[key].reduce((sum, game) => sum + num(key === 'grand' ? game.damage : game.metric), 0);
}
function eventScore(state, player, key) {
  if (!EVENTS.includes(key)) throw new Error(`Unknown event: ${key}`);
  const games = player.events[key];
  const settings = state.settings.events[key];
  if (key !== 'grand') {
    const total = state.players.reduce((sum, p) => sum + eventTotal(p, key), 0);
    if (!total || games.some(g => num(g.tier) <= 0)) return 0;
    const raw = games.reduce((sum, g) => sum + classWeightFor(g.class) * (num(g.metric) / total) / Math.pow(num(g.tier), num(settings.tierPower)), 0);
    return 2 * num(settings.multiplier) * num(settings.pool) * raw;
  }
  const totalDamage = state.players.reduce((sum, p) => sum + eventTotal(p, 'grand'), 0);
  if (!totalDamage || games.some(g => num(g.tier) <= 0 || num(g.time) <= 0)) return 0;
  const playerDamage = eventTotal(player, 'grand');
  const weighted = games.reduce((sum, g) => {
    const tier = num(g.tier); const time = num(g.time);
    const perGame = (1 / tier * 100 * num(settings.tierWeight))
      + (num(g.damage) / tier / 1000 * num(settings.damageWeight))
      + (num(g.kills) * 10 / tier * num(settings.killsWeight))
      + (5 / time * 1000 * num(settings.timeWeight));
    return sum + perGame * classWeightFor(g.class) * (playerDamage / totalDamage);
  }, 0);
  // The HTML implementation intentionally divides this weighted score by 3;
  // its Grand Yolo pool setting is stored but not used in this formula.
  return num(settings.multiplier) * weighted / 3;
}
function standings(state) {
  return state.players.map(player => {
    const byEvent = Object.fromEntries(EVENTS.map(key => [key, eventScore(state, player, key)]));
    const total = EVENTS.reduce((sum, key) => sum + byEvent[key], 0);
    const avg = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    const tierValues = ['damage', 'kills', 'grand'].flatMap(key => player.events[key].map(game => num(game.tier)));
    const classValues = ['damage', 'kills', 'grand'].flatMap(key => player.events[key].map(game => classWeightFor(game.class)));
    return {
      id: player.id, name: player.name, events: byEvent, total, estimatedValue: 0.54 * total / 100,
      // These summary columns mirror the HTML workbook's tournament summary.
      damageAverage: (eventTotal(player, 'damage') + eventTotal(player, 'grand')) / 2,
      averageTier: avg(tierValues),
      averageKills: avg(player.events.kills.map(game => num(game.metric))),
      averageClassWeight: avg(classValues),
    };
  }).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}
function getSlot(state, playerNameOrId, event, gameNumber) {
  const player = findPlayer(state, playerNameOrId);
  if (!player) throw new Error(`Player "${playerNameOrId}" was not found.`);
  if (!EVENTS.includes(event)) throw new Error(`Round must be one of: ${EVENTS.join(', ')}.`);
  const n = Number(gameNumber);
  if (!Number.isInteger(n) || n < 1 || n > 7) throw new Error('Game number must be 1–7.');
  return { player, game: player.events[event][n - 1], index: n - 1 };
}
function validateResult(event, result) {
  const code = normalizeClass(result.shipClass);
  if (!Object.hasOwn(CLASSES, code)) throw new Error('Ship class must be DD, CA, or BB.');
  const tier = Number(result.tier);
  if (!Number.isFinite(tier) || tier < 1 || tier > 11) throw new Error('Ship tier must be an integer from 1 to 11.');
  if (!Number.isInteger(tier)) throw new Error('Ship tier must be a whole number.');
  const nonNegative = value => value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value)) && Number(value) >= 0;
  const positive = value => value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value)) && Number(value) > 0;
  if (event === 'damage' && !nonNegative(result.damage)) throw new Error('Damage round requires a non-negative damage value.');
  if (event === 'kills' && !nonNegative(result.kills)) throw new Error('Kills round requires a non-negative kills value.');
  if (event === 'race' && !positive(result.time)) throw new Error('Race round requires a positive time value.');
  if (event === 'grand' && (!nonNegative(result.damage) || !nonNegative(result.kills) || !positive(result.time))) throw new Error('Grand Yolo requires damage, kills, and a positive time value.');
  return { ...result, shipClass: code, tier };
}
function recordResult(state, input, options = {}) {
  const event = String(input.event || input.round || '').toLowerCase();
  const { player, game, index } = getSlot(state, input.player, event, input.gameNumber ?? input.game);
  const result = validateResult(event, input);
  const occupied = game.class !== '-' || (event === 'grand' ? num(game.damage) || num(game.kills) || num(game.time) : num(game.metric));
  if (occupied && !options.replace) throw new Error(`That slot is already filled for ${player.name}, ${event} game ${index + 1}. Use an explicit replace option to overwrite it.`);
  const battleRecordId = input.recordId ? String(input.recordId) : null;
  if (battleRecordId && state.importedBattleRecordIds.includes(battleRecordId)) throw new Error(`Battle record ${battleRecordId} has already been used.`);
  if (event === 'grand') Object.assign(game, { class: result.shipClass, classWeight: classWeightFor(result.shipClass), tier: result.tier, damage: Number(result.damage), kills: Number(result.kills), time: Number(result.time) });
  else {
    const metric = event === 'damage' ? result.damage : event === 'kills' ? result.kills : result.time;
    Object.assign(game, { class: result.shipClass, classWeight: classWeightFor(result.shipClass), tier: result.tier, metric: Number(metric) });
  }
  if (battleRecordId) state.importedBattleRecordIds.push(battleRecordId);
  return { player, event, gameNumber: index + 1, game: clone(game), scores: standings(state) };
}
function setSetting(state, event, field, value) {
  if (!EVENTS.includes(event)) throw new Error(`Event must be one of: ${EVENTS.join(', ')}.`);
  const allowed = event === 'grand' ? ['pool', 'multiplier', 'tierWeight', 'damageWeight', 'killsWeight', 'timeWeight'] : ['pool', 'multiplier', 'tierPower'];
  if (!allowed.includes(field)) throw new Error(`Setting ${field} is not valid for ${event}. Allowed: ${allowed.join(', ')}.`);
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error('Setting value must be a non-negative number.');
  state.settings.events[event][field] = n;
  return n;
}
function makeWorkbookBackup(state) {
  return { version: 2, exportedAt: new Date().toISOString(), players: clone(state.players), settings: clone(state.settings), importedBattleRecordIds: [...state.importedBattleRecordIds] };
}
function makeArchiveSnapshot(state) {
  return {
    format: 'wows-yolo-tourney-state',
    schema_version: 1,
    exported_at: new Date().toISOString(),
    workbook_backup: makeWorkbookBackup(state),
    battle_records: clone(state.battleRecords),
    pending_submissions: clone(state.pendingSubmissions),
    pending_ocr_corrections: clone(state.pendingOcrCorrections || []),
    player_account_links: clone(state.playerAccountLinks || {}),
  };
}
function makePublicArchiveSnapshot(state) {
  const snapshot = makeArchiveSnapshot(state);
  snapshot.public_snapshot = true;
  snapshot.private_data_omitted = [
    'player_account_links',
    'battle_records[].desktop_owner_id',
    'battle_records[].desktop_owner_role',
    'pending_submissions',
    'pending_ocr_corrections',
  ];
  snapshot.player_account_links = {};
  snapshot.battle_records = snapshot.battle_records.map(entry => {
    const { desktop_owner_id, desktop_owner_role, ...publicEntry } = entry || {};
    return publicEntry;
  });
  snapshot.pending_workflow_counts = {
    pending_submissions: snapshot.pending_submissions.length,
    pending_ocr_corrections: snapshot.pending_ocr_corrections.length,
  };
  snapshot.pending_submissions = [];
  snapshot.pending_ocr_corrections = [];
  snapshot.public_snapshot_note = 'Public-channel recovery copy. Private Discord account-to-roster links, per-user ownership identifiers, and resumable per-user correction associations are intentionally omitted. Use the authenticated local Admin backup for a complete private recovery archive.';
  return snapshot;
}
function importBackup(raw) {
  const source = raw?.workbook_backup || raw;
  if (!source || !Array.isArray(source.players) || !source.settings) throw new Error('JSON must contain a YOLO Tourney backup with players and settings.');
  const state = normalizeState(source);
  if (raw?.format === 'wows-yolo-tourney-state') {
    state.battleRecords = Array.isArray(raw.battle_records) ? raw.battle_records : [];
    state.pendingSubmissions = Array.isArray(raw.pending_submissions) ? raw.pending_submissions : [];
    state.pendingOcrCorrections = Array.isArray(raw.pending_ocr_corrections) ? raw.pending_ocr_corrections : [];
    state.playerAccountLinks = normalizePlayerAccountLinks(raw.player_account_links, state.players);
  }
  return state;
}
function createStore(filePath) {
  const resolved = path.resolve(filePath);
  let queue = Promise.resolve();
  async function load() {
    try {
      const raw = JSON.parse(await fs.readFile(resolved, 'utf8'));
      return raw?.format === 'wows-yolo-tourney-state' ? importBackup(raw) : normalizeState(raw);
    } catch (error) {
      if (error.code === 'ENOENT') { const fresh = createState(); await save(fresh); return fresh; }
      throw error;
    }
  }
  async function save(state) {
    // Capture the exact version at invocation time, so queued writes cannot serialize
    // a state object that a later Discord message has already mutated.
    const snapshot = normalizeState(state);
    const task = async () => {
      await fs.mkdir(path.dirname(resolved), { recursive: true });
      const temp = `${resolved}.${process.pid}.tmp`;
      await fs.writeFile(temp, `${JSON.stringify(snapshot, null, 2)}\n`, { mode: 0o600 });
      await fs.rename(temp, resolved);
    };
    queue = queue.then(task, task);
    return queue;
  }
  async function exportSnapshot(state) { return JSON.stringify(makeArchiveSnapshot(state), null, 2); }
  return { path: resolved, load, save, exportSnapshot };
}


// Optional SQLite-backed store. This uses Node's built-in node:sqlite API, so no
// native npm driver or hosted service is required. One transactional document row
// is deliberate: all tournament state (roster, scores, OCR queue and settings)
// commits atomically as one logical snapshot. JSON remains a migration/mirror and
// the same-channel Discord archive remains the portable disaster-recovery format.
function createSqliteStore(databasePath, options = {}) {
  const resolved = path.resolve(databasePath);
  const mirrorPath = options.mirrorPath ? path.resolve(options.mirrorPath) : null;
  const legacyJsonPath = options.legacyJsonPath ? path.resolve(options.legacyJsonPath) : mirrorPath;
  const CURRENT_SCHEMA_VERSION = 1;
  let db = null;
  let queue = Promise.resolve();

  async function open() {
    if (db) return db;
    let DatabaseSync;
    try {
      ({ DatabaseSync } = require('node:sqlite'));
    } catch (error) {
      throw new Error(`SQLite storage requires the built-in node:sqlite module available in Node.js v22.16.0 or newer. Original error: ${error.message}`);
    }
    await fs.mkdir(path.dirname(resolved), { recursive: true });
    db = new DatabaseSync(resolved, { timeout: 5000 });
    db.exec('PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;');
    const version = Number(db.prepare('PRAGMA user_version').get().user_version || 0);
    if (version > CURRENT_SCHEMA_VERSION) {
      db.close(); db = null;
      throw new Error(`SQLite database schema version ${version} is newer than this bot supports (${CURRENT_SCHEMA_VERSION}). Upgrade the bot rather than downgrading this database.`);
    }
    if (version < 1) {
      db.exec(`
        BEGIN IMMEDIATE;
        CREATE TABLE IF NOT EXISTS tournament_state (
          singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
          schema_version INTEGER NOT NULL,
          revision INTEGER NOT NULL,
          updated_at TEXT NOT NULL,
          payload TEXT NOT NULL
        ) STRICT;
        PRAGMA user_version = 1;
        COMMIT;
      `);
    }
    return db;
  }

  async function atomicJsonMirror(state) {
    if (!mirrorPath) return;
    try {
      await fs.mkdir(path.dirname(mirrorPath), { recursive: true });
      const temp = `${mirrorPath}.${process.pid}.tmp`;
      await fs.writeFile(temp, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
      await fs.rename(temp, mirrorPath);
    } catch (error) {
      // SQLite has already committed. Do not misreport the durable save as failed;
      // log the stale mirror loudly so the operator can fix disk permissions.
      console.error(`[storage] SQLite committed, but JSON mirror update failed (${mirrorPath}): ${error.message}`);
    }
  }

  async function load() {
    const database = await open();
    const row = database.prepare('SELECT payload FROM tournament_state WHERE singleton = 1').get();
    if (row) {
      let parsed;
      try { parsed = JSON.parse(row.payload); }
      catch (error) { throw new Error(`SQLite tournament state is not valid JSON: ${error.message}`); }
      return parsed?.format === 'wows-yolo-tourney-state' ? importBackup(parsed) : normalizeState(parsed);
    }

    // First-run migration from the historic JSON state file or a downloaded full
    // archive. The source JSON is not deleted; it remains an independent fallback.
    let initial = createState();
    if (legacyJsonPath) {
      try {
        const raw = JSON.parse(await fs.readFile(legacyJsonPath, 'utf8'));
        initial = raw?.format === 'wows-yolo-tourney-state' ? importBackup(raw) : normalizeState(raw);
      } catch (error) {
        if (error.code !== 'ENOENT') throw new Error(`Could not migrate legacy JSON state (${legacyJsonPath}): ${error.message}`);
      }
    }
    await save(initial);
    return initial;
  }

  async function save(state) {
    // Serialize a point-in-time snapshot before waiting behind earlier commits.
    const safeState = normalizeState(state);
    const task = async () => {
      const database = await open();
      const payload = JSON.stringify(safeState);
      database.exec('BEGIN IMMEDIATE');
      try {
        database.prepare(`
          INSERT INTO tournament_state (singleton, schema_version, revision, updated_at, payload)
          VALUES (1, ?, 1, ?, ?)
          ON CONFLICT(singleton) DO UPDATE SET
            schema_version = excluded.schema_version,
            revision = tournament_state.revision + 1,
            updated_at = excluded.updated_at,
            payload = excluded.payload
        `).run(CURRENT_SCHEMA_VERSION, new Date().toISOString(), payload);
        database.exec('COMMIT');
      } catch (error) {
        try { database.exec('ROLLBACK'); } catch {}
        throw error;
      }
      await atomicJsonMirror(safeState);
    };
    queue = queue.then(task, task);
    return queue;
  }

  async function exportSnapshot(state) { return JSON.stringify(makeArchiveSnapshot(state), null, 2); }
  async function close() {
    try { await queue; }
    finally {
      if (db) {
        let checkpointError = null;
        try {
          // On clean shutdown, checkpoint WAL pages into the main database file.
          // This makes an offline single-file copy practical after the store closes.
          const checkpoint = db.prepare('PRAGMA wal_checkpoint(TRUNCATE)').get();
          if (Number(checkpoint?.busy || 0) !== 0) {
            checkpointError = new Error('SQLite WAL checkpoint remained busy; do not make a single-file backup yet.');
          }
        } catch (error) {
          checkpointError = error;
        }
        db.close();
        db = null;
        if (checkpointError) throw new Error(`SQLite closed, but WAL checkpoint failed: ${checkpointError.message}`);
      }
    }
  }
  function getRevision() {
    if (!db) return 0;
    const row = db.prepare('SELECT revision FROM tournament_state WHERE singleton = 1').get();
    return Number(row?.revision || 0);
  }
  return { path: resolved, mirrorPath, engine: 'sqlite', load, save, exportSnapshot, close, getRevision };
}

function deterministicBattleId(record) {
  return crypto.createHash('sha256').update(JSON.stringify(record)).digest('hex').slice(0, 24);
}

module.exports = {
  EVENTS, EVENT_LABELS, CLASSES, DEFAULT_SETTINGS, normalizeClass, classWeightFor,
  MAX_PLAYERS, normalizeState, createState, findPlayer, findPlayerByDiscordUserId,
  linkPlayerDiscordAccount, unlinkPlayerDiscordAccount, addPlayer, removePlayer, renamePlayer,
  clearSlot, clearEvent, clearAllResults, eventTotal, eventScore, standings, getSlot, validateResult, recordResult, setSetting,
  makeWorkbookBackup, makeArchiveSnapshot, makePublicArchiveSnapshot, importBackup, createStore, createSqliteStore, deterministicBattleId,
};

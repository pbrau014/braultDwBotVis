'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const T = require('../src/tournament');

test('SQLite store creates schema, persists atomically, mirrors JSON, and reopens', async (t) => {
  let DatabaseSync;
  try { ({ DatabaseSync } = require('node:sqlite')); } catch { t.skip('node:sqlite is unavailable in this runtime'); return; }
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'yolo-sqlite-store-'));
  const dbPath = path.join(dir, 'state.sqlite');
  const mirrorPath = path.join(dir, 'tournament-state.json');
  try {
    const store = T.createSqliteStore(dbPath, { mirrorPath });
    const state = await store.load();
    assert.deepEqual(state.players, []);
    const first = T.addPlayer(state, 'SQLite Alpha');
    T.recordResult(state, { player: first.id, event: 'damage', gameNumber: 1, shipClass: 'DD', tier: 7, damage: 12345 });
    await store.save(state);
    assert.ok(store.getRevision() >= 2);
    const jsonMirror = JSON.parse(await fs.readFile(mirrorPath, 'utf8'));
    assert.equal(jsonMirror.players[0].events.damage[0].metric, 12345);
    await store.close();

    const reopened = T.createSqliteStore(dbPath, { mirrorPath });
    const loaded = await reopened.load();
    assert.equal(loaded.players[0].name, 'SQLite Alpha');
    assert.equal(loaded.players[0].events.damage[0].metric, 12345);
    const db = new DatabaseSync(dbPath);
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 1);
    db.close();
    await reopened.close();
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('SQLite store migrates a legacy JSON tournament state without deleting the source', async (t) => {
  try { require('node:sqlite'); } catch { t.skip('node:sqlite is unavailable in this runtime'); return; }
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'yolo-sqlite-migrate-'));
  const legacyPath = path.join(dir, 'legacy-state.json');
  const dbPath = path.join(dir, 'state.sqlite');
  try {
    const legacy = T.createState();
    T.addPlayer(legacy, 'Legacy Player');
    await fs.writeFile(legacyPath, JSON.stringify(legacy));
    const store = T.createSqliteStore(dbPath, { legacyJsonPath: legacyPath, mirrorPath: path.join(dir, 'mirror.json') });
    const migrated = await store.load();
    assert.equal(migrated.players[0].name, 'Legacy Player');
    assert.equal(JSON.parse(await fs.readFile(legacyPath, 'utf8')).players[0].name, 'Legacy Player');
    await store.close();
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('SQLite store refuses to open a database created by a newer schema', async (t) => {
  let DatabaseSync;
  try { ({ DatabaseSync } = require('node:sqlite')); } catch { t.skip('node:sqlite is unavailable in this runtime'); return; }
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'yolo-sqlite-future-'));
  const dbPath = path.join(dir, 'future.sqlite');
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA user_version = 999');
  db.close();
  try { await assert.rejects(() => T.createSqliteStore(dbPath).load(), /newer than this bot supports/); }
  finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('SQLite queued saves preserve invocation-time snapshots and full 50-player archive round-trips', async (t) => {
  try { require('node:sqlite'); } catch { t.skip('node:sqlite is unavailable in this runtime'); return; }
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'yolo-sqlite-50-'));
  const dbPath = path.join(dir, 'primary.sqlite');
  const mirrorPath = path.join(dir, 'mirror.json');
  const restorePath = path.join(dir, 'restored.sqlite');
  try {
    const store = T.createSqliteStore(dbPath, { mirrorPath });
    await store.load();
    const small = T.createState();
    T.addPlayer(small, 'Snapshot One');
    const medium = T.createState();
    for (let i = 1; i <= 10; i++) T.addPlayer(medium, `Snapshot ${i}`);
    const full = T.createState();
    for (let i = 1; i <= 50; i++) {
      const player = T.addPlayer(full, `Participant ${String(i).padStart(2, '0')}`);
      T.recordResult(full, { player: player.id, event: 'damage', gameNumber: 1, shipClass: i % 3 === 0 ? 'BB' : i % 3 === 1 ? 'DD' : 'CA', tier: 1 + (i % 11), damage: 10000 + i * 997 });
      T.recordResult(full, { player: player.id, event: 'kills', gameNumber: 1, shipClass: 'DD', tier: 1 + (i % 11), kills: i % 7 });
    }
    // All snapshots are taken synchronously at save invocation, then committed in order.
    await Promise.all([store.save(small), store.save(medium), store.save(full)]);
    assert.ok(store.getRevision() >= 4);
    const loaded = await store.load();
    assert.equal(loaded.players.length, 50);
    assert.equal(loaded.players[49].name, 'Participant 50');
    assert.equal(loaded.players.reduce((sum, p) => sum + p.events.damage[0].metric, 0), full.players.reduce((sum, p) => sum + p.events.damage[0].metric, 0));

    const archiveText = await store.exportSnapshot(loaded);
    const archive = JSON.parse(archiveText);
    assert.equal(archive.format, 'wows-yolo-tourney-state');
    assert.equal(T.importBackup(archive).players.length, 50);
    await fs.writeFile(path.join(dir, 'full-archive.json'), `${JSON.stringify(archive, null, 2)}\n`);
    await store.close();

    // Test a physical SQLite backup separately from the portable JSON archive.
    // Copy only after clean close/checkpoint, then open the copied database itself.
    const physicalCopyPath = path.join(dir, 'physical-copy.sqlite');
    await fs.copyFile(dbPath, physicalCopyPath);
    const physicalCopy = T.createSqliteStore(physicalCopyPath, { mirrorPath: path.join(dir, 'physical-copy-mirror.json') });
    const physicalCopyState = await physicalCopy.load();
    assert.equal(physicalCopyState.players.length, 50);
    assert.deepEqual(physicalCopyState.players.map(p => p.events.damage[0].metric), loaded.players.map(p => p.events.damage[0].metric));
    assert.deepEqual(physicalCopyState.players.map(p => p.events.kills[0].metric), loaded.players.map(p => p.events.kills[0].metric));
    const physicalDb = new (require('node:sqlite').DatabaseSync)(physicalCopyPath);
    assert.equal(physicalDb.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    physicalDb.close();
    await physicalCopy.close();

    const restored = T.createSqliteStore(restorePath, { legacyJsonPath: path.join(dir, 'full-archive.json'), mirrorPath: path.join(dir, 'restored-mirror.json') });
    const restoredState = await restored.load();
    assert.equal(restoredState.players.length, 50);
    assert.equal(restoredState.players[49].name, 'Participant 50');
    assert.deepEqual(restoredState.players.map(p => p.events.damage[0].metric), loaded.players.map(p => p.events.damage[0].metric));
    const database = new (require('node:sqlite').DatabaseSync)(restorePath);
    assert.equal(database.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    database.close();
    await restored.close();
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('SQLite durable commit succeeds and remains recoverable when the optional JSON mirror cannot be written', async (t) => {
  try { require('node:sqlite'); } catch { t.skip('node:sqlite is unavailable in this runtime'); return; }
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'yolo-sqlite-mirror-fail-'));
  const dbPath = path.join(dir, 'state.sqlite');
  const blockedMirror = path.join(dir, 'blocked-mirror');
  await fs.mkdir(blockedMirror);
  const originalError = console.error;
  console.error = () => {}; // Expected failure: keep the regression test output quiet.
  try {
    const store = T.createSqliteStore(dbPath, { legacyJsonPath: path.join(dir, 'absent-legacy.json'), mirrorPath: blockedMirror });
    const state = await store.load();
    T.addPlayer(state, 'SQLite Survives Mirror Failure');
    await assert.doesNotReject(() => store.save(state));
    await store.close();
    const reopened = T.createSqliteStore(dbPath, { legacyJsonPath: path.join(dir, 'absent-legacy.json'), mirrorPath: blockedMirror });
    const loaded = await reopened.load();
    assert.equal(loaded.players[0].name, 'SQLite Survives Mirror Failure');
    await reopened.close();
  } finally {
    console.error = originalError;
    await fs.rm(dir, { recursive: true, force: true });
  }
});

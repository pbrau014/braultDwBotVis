'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'testdata', 'additional-screenshot-ground-truth.json'), 'utf8'));
const requiredKeys = ['result', 'player', 'map', 'mode', 'battleStart', 'credits', 'freeXp', 'damage', 'xp'];
const optionalKeys = [];
const expectedKeys = requiredKeys;

test('additional OCR corpus contains all 16 attached images with complete exact-match annotations', () => {
  assert.equal(manifest.imageCount, 16);
  assert.equal(manifest.records.length, 16);
  assert.deepEqual(manifest.requiredComparedFields, requiredKeys);
  assert.deepEqual(manifest.optionalComparedFields, optionalKeys);
  assert.deepEqual(manifest.comparedFields, expectedKeys);
  assert.equal(new Set(manifest.records.map((row) => row.key)).size, 16);
  assert.equal(new Set(manifest.records.map((row) => row.filename)).size, 16);
  for (const row of manifest.records) {
    assert.equal(row.key, row.filename);
    assert.ok(row.sha256 && /^[a-f0-9]{64}$/.test(row.sha256), `${row.filename} has a SHA-256`);
    assert.deepEqual(Object.keys(row.expected).sort(), [...expectedKeys].sort(), `${row.filename} annotates every compared field`);
    for (const key of expectedKeys) assert.notEqual(row.expected[key], null, `${row.filename}.${key} is explicitly confirmed`);
    const imagePath = path.join(root, 'fixtures', 'additional-screenshots', row.filename);
    assert.ok(fs.existsSync(imagePath), `${row.filename} is packaged as a fixture`);
    const actualHash = crypto.createHash('sha256').update(fs.readFileSync(imagePath)).digest('hex');
    assert.equal(actualHash, row.sha256, `${row.filename} hash matches its annotation manifest`);
  }
});

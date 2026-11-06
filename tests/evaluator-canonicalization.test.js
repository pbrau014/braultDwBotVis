'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const python = process.platform === 'win32' ? 'python' : 'python3';

function runPython(source) {
    const result = spawnSync(python, ['-c', source], {
        cwd: root, encoding: 'utf8', timeout: 15000,
    });
    if (result.error || result.status !== 0) {
        throw new Error('Python evaluator contract probe failed: ' + (result.stderr || result.error?.message || result.status));
    }
    return JSON.parse(result.stdout.trim());
}

test('numeric evaluator normalization accepts only non-negative integer values with valid grouping', () => {
    const result = runPython(`
import json, importlib.util
spec = importlib.util.spec_from_file_location('ev', 'scripts/evaluate-ocrspace-imagesF-63-ground-truth.py')
ev = importlib.util.module_from_spec(spec); spec.loader.exec_module(ev)
values = ['1234', '1,234', '1.234', '1 234', '1\\u00a0234', "1'234", '0',
          '12x3', '1,23', '-123', '+123', '1.23', '1e3', '12 34', '1234,567', '']
print(json.dumps({
  'accepted': [ev.norm('damage', x) for x in values[:7]],
  'rejected': [ev.norm('damage', x) for x in values[7:]],
  'nonnumeric': ev.norm('player', '  Player   One  ')
}))
`);
    assert.deepEqual(result.accepted, ['1234', '1234', '1234', '1234', '1234', '1234', '0']);
    assert.deepEqual(result.rejected, [null, null, null, null, null, null, null, null, null]);
    assert.equal(result.nonnumeric, 'player one');
});

test('canonical JSON fingerprints ignore BOM, line endings, key order and Unicode normalization while raw hashes remain distinct', () => {
    const result = runPython(`
import hashlib, json, importlib.util
spec = importlib.util.spec_from_file_location('ev', 'scripts/evaluate-ocrspace-imagesF-63-ground-truth.py')
ev = importlib.util.module_from_spec(spec); spec.loader.exec_module(ev)
a = b'{"z":1,\\n"a":"e\\\\u0301"}'
b = b'\\xef\\xbb\\xbf{\\r\\n "a":"\\xc3\\xa9", "z":1\\r\\n}'
print(json.dumps({
  'canonicalA': hashlib.sha256(ev.canonical_json_bytes(a)).hexdigest(),
  'canonicalB': hashlib.sha256(ev.canonical_json_bytes(b)).hexdigest(),
  'rawA': hashlib.sha256(a).hexdigest(),
  'rawB': hashlib.sha256(b).hexdigest(),
  'canonical': ev.canonical_json_bytes(a).decode('utf-8')
}))
`);
    assert.equal(result.canonicalA, result.canonicalB);
    assert.notEqual(result.rawA, result.rawB);
    assert.equal(result.canonical, '{"a":"é","z":1}');
});

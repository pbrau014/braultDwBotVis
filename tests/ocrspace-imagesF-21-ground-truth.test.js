'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const groundTruth = require('../testdata/ground-truth/imagesF-63-working-ground-truth-v6.json');
const fields = ['result', 'player', 'map', 'mode', 'battleStart', 'credits', 'freeXp', 'damage', 'xp'];

function selectedRecords() {
    return groundTruth.records.filter(record =>
        record.recordStatus === 'COMPLETE_9_FIELD_TRANSCRIPTION'
        && fields.every(field => record.fieldStatus?.[field]?.eligible_for_exact_match === true));
}

test('replacement 21-image inventory is exactly the first 21 complete nine-field ground-truth records', () => {
    const selected = selectedRecords();
    assert.equal(groundTruth.records.length, 63);
    assert.equal(selected.length, 21);
    assert.deepEqual(selected.map(x => x.filename), groundTruth.records.slice(0, 21).map(x => x.filename));
    for (const record of selected) {
        assert.equal(record.recordStatus, 'COMPLETE_9_FIELD_TRANSCRIPTION');
        assert.equal(record.sourceImage.sha256.length, 64);
        assert.ok(record.sourceImage.bytes > 0);
        for (const field of fields) {
            assert.equal(record.fieldStatus[field].eligible_for_exact_match, true, record.filename + ':' + field);
            assert.ok(String(record.expected[field] ?? '').trim(), record.filename + ':' + field + ' must have an expected value');
        }
    }
});

test('21-image selection preserves source dimensions instead of imposing an arbitrary pixel threshold', () => {
    const selected = selectedRecords();
    assert.ok(selected.every(record => record.sourceImage.width > 0 && record.sourceImage.height > 0));
    assert.equal(selected[0].sourceImage.width, 1334);
    assert.equal(selected[0].sourceImage.height, 627);
});

test('post-hoc 21-image evaluator is reuse-only and never performs OCR.Space submissions', () => {
    const evaluator = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'evaluate-ocrspace-imagesF-63-ground-truth.py'), 'utf8');
    assert.match(evaluator, /complete-ground-truth-21/);
    assert.match(evaluator, /selected_records != gt\["records"\]\[:21\]/);
    assert.match(evaluator, /POST_HOC_EVALUATION_INCOMPLETE_SELECTED_INVENTORY/);
    assert.doesNotMatch(evaluator, /createOcrSpacePdfFirst|OCRSPACE_API_KEY/);
});

test('21-image evaluation remains separate from Gate B certification', () => {
    const evaluator = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'evaluate-ocrspace-imagesF-63-ground-truth.py'), 'utf8');
    assert.match(evaluator, /"gateB":"NOT_PASSED"/);
    assert.match(evaluator, /"gateB":"NOT_PASSED"/);
});

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

test('Gate B inventory is exactly the first 21 complete nine-field ground-truth records', () => {
    const selected = selectedRecords();
    assert.equal(groundTruth.records.length, 63);
    assert.equal(selected.length, 21);
    assert.deepEqual(selected.map(x => x.filename), groundTruth.records.slice(0, 21).map(x => x.filename));
    for (const record of selected) {
        assert.equal(record.recordStatus, 'COMPLETE_9_FIELD_TRANSCRIPTION');
        assert.match(record.sourceImage.sha256, /^[0-9a-f]{64}$/);
        assert.ok(record.sourceImage.bytes > 0);
        for (const field of fields) {
            assert.equal(record.fieldStatus[field].eligible_for_exact_match, true, record.filename + ':' + field);
            assert.ok(String(record.expected[field] ?? '').trim(), record.filename + ':' + field + ' must have an expected value');
        }
    }
});

test('21-image Gate B selection preserves source dimensions instead of imposing an arbitrary pixel threshold', () => {
    const selected = selectedRecords();
    assert.ok(selected.every(record => record.sourceImage.width > 0 && record.sourceImage.height > 0));
    assert.equal(selected[0].sourceImage.width, 1334);
    assert.equal(selected[0].sourceImage.height, 627);
});

test('post-hoc evaluator is reuse-only, source-bound and counts missing selected rows as unresolved', () => {
    const evaluator = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'evaluate-ocrspace-imagesF-63-ground-truth.py'), 'utf8');
    assert.match(evaluator, /complete-ground-truth-21/);
    assert.match(evaluator, /selected != records\[:MIN_GATE_B_IMAGES\]/);
    assert.match(evaluator, /MISSING_RUN_RESULT/);
    assert.match(evaluator, /SOURCE_HASH_MISMATCH/);
    assert.match(evaluator, /artifact-verification-report\.json/);
    assert.doesNotMatch(evaluator, /createOcrSpacePdfFirst|OCRSPACE_API_KEY/);
});

test('Gate B requires 21 labels, verified artifacts, zero wrong acceptance and clean network evidence', () => {
    const evaluator = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'evaluate-ocrspace-imagesF-63-ground-truth.py'), 'utf8');
    assert.match(evaluator, /MIN_GATE_B_IMAGES = 21/);
    assert.match(evaluator, /PENDING_ARTIFACT_VERIFICATION/);
    assert.match(evaluator, /PENDING_GATE_A/);
    assert.match(evaluator, /gateAPassAndLockedCandidateFingerprintRequired/);
    assert.match(evaluator, /zeroWronglyAcceptedMandatoryFieldValues/);
    assert.match(evaluator, /zeroUnauthorizedNetworkAttempts/);
    assert.match(evaluator, /gate_b = "PASS"/);
});

test('uncertain or partial ground-truth fields cannot count as eligible Gate B labels', () => {
    const evaluator = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'evaluate-ocrspace-imagesF-63-ground-truth.py'), 'utf8');
    assert.match(evaluator, /eligible_for_exact_match/);
    assert.match(evaluator, /norm\(field, expected\.get\(field\)\) is not None/);
    assert.match(evaluator, /NOT_SCORED_REFERENCE_NOT_ELIGIBLE/);
});

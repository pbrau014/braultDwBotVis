'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {
  REQUIRED_FIELDS,
  MINIMUM_IMAGES,
  PREFERRED_IMAGES,
  auditGateBInventory,
} = require('../scripts/audit-gateb-holdout-eligibility');
const { buildFieldReviewRows, renderCsv } = require('../scripts/build-gateb-field-label-review-template');

const root = path.resolve(__dirname, '..');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');

function makeRecord(index, overrides = {}) {
  const expected = Object.fromEntries(REQUIRED_FIELDS.map((field, fieldIndex) =>
    [field, fieldIndex >= 5 ? String(1000 + index + fieldIndex) : `value-${field}-${index}`]));
  const fieldStatus = Object.fromEntries(REQUIRED_FIELDS.map(field =>
    [field, { status: 'COMPLETE_MANUAL_TRANSCRIPTION_SOURCE', eligible_for_exact_match: true }]));
  return {
    corpusOrder: index + 1,
    filename: `holdout-${index + 1}.png`,
    expected,
    fieldStatus,
    recordStatus: 'COMPLETE_9_FIELD_TRANSCRIPTION',
    sourceImage: {
      sha256: digest(`source-${index}`),
      bytes: 1000 + index,
      width: 1920,
      height: 1080,
    },
    ...overrides,
  };
}

function makeGroundTruth(count) {
  return {
    schemaVersion: 2,
    requiredFields: [...REQUIRED_FIELDS],
    manualTranscriptionSource: 'independent-manual-reference.txt',
    sourceLineAudit: { preservedInWorkbook: true },
    records: Array.from({ length: count }, (_, index) => makeRecord(index)),
  };
}

function makeDevelopmentGroundTruth() {
  return {
    records: Array.from({ length: 16 }, (_, index) => ({
      filename: `development-${index + 1}.png`,
      sha256: digest(`development-${index}`),
    })),
  };
}

function makeRegressionHashes() {
  return Array.from({ length: 4 }, (_, index) => digest(`regression-${index + 1}`));
}

test('governing Gate B policy is nine fields, 50 minimum, 100 preferred', () => {
  assert.deepEqual(REQUIRED_FIELDS, [
    'result', 'player', 'map', 'mode', 'battleStart',
    'credits', 'freeXp', 'damage', 'xp',
  ]);
  assert.equal(MINIMUM_IMAGES, 50);
  assert.equal(PREFERRED_IMAGES, 100);
});

test('49 eligible independent images remain blocked and select none', () => {
  const report = auditGateBInventory({
    groundTruth: makeGroundTruth(49),
    developmentGroundTruth: makeDevelopmentGroundTruth(),
    regressionImageHashes: makeRegressionHashes(),
  });
  assert.equal(report.status, 'BLOCKED_BELOW_MINIMUM_OR_PROVENANCE');
  assert.equal(report.eligibleIndependentNineFieldImageCount, 49);
  assert.equal(report.missingEligibleImagesToMinimum, 1);
  assert.equal(report.selectedImageCount, 0);
  assert.equal(report.gateBPass, false);
});

test('50 eligible independent images meet only the inventory threshold, not Gate B acceptance', () => {
  const report = auditGateBInventory({
    groundTruth: makeGroundTruth(50),
    developmentGroundTruth: makeDevelopmentGroundTruth(),
    regressionImageHashes: makeRegressionHashes(),
  });
  assert.equal(report.status, 'INVENTORY_THRESHOLD_MET_NOT_GATE_ACCEPTANCE');
  assert.equal(report.selectedImageCount, 50);
  assert.equal(report.gateBPass, false);
});

test('100 eligible independent images meet the preferred target', () => {
  const report = auditGateBInventory({
    groundTruth: makeGroundTruth(100),
    developmentGroundTruth: makeDevelopmentGroundTruth(),
    regressionImageHashes: makeRegressionHashes(),
  });
  assert.equal(report.eligibleIndependentNineFieldImageCount, 100);
  assert.equal(report.missingEligibleImagesToPreferred, 0);
  assert.equal(report.selectedImageCount, 100);
  assert.equal(report.gateBPass, false);
});

test('a missing or ineligible XP label excludes the record', () => {
  const groundTruth = makeGroundTruth(50);
  groundTruth.records[0].fieldStatus.xp.eligible_for_exact_match = false;
  const report = auditGateBInventory({
    groundTruth,
    developmentGroundTruth: makeDevelopmentGroundTruth(),
    regressionImageHashes: makeRegressionHashes(),
  });
  assert.equal(report.eligibleIndependentNineFieldImageCount, 49);
  assert.equal(report.rejected.incompleteNineFieldLabels, 1);
  assert.equal(report.status, 'BLOCKED_BELOW_MINIMUM_OR_PROVENANCE');
});

test('missing-value sentinels are not accepted as ground-truth labels', () => {
  const groundTruth = makeGroundTruth(50);
  groundTruth.records[0].expected.xp = 'Not Detected';
  const report = auditGateBInventory({
    groundTruth,
    developmentGroundTruth: makeDevelopmentGroundTruth(),
    regressionImageHashes: makeRegressionHashes(),
  });
  assert.equal(report.eligibleIndependentNineFieldImageCount, 49);
  assert.equal(report.rejected.incompleteNineFieldLabels, 1);
});

test('development and regression corpus overlaps are excluded', () => {
  const groundTruth = makeGroundTruth(50);
  const development = makeDevelopmentGroundTruth();
  const regressionHashes = makeRegressionHashes();
  groundTruth.records[0].sourceImage.sha256 = development.records[0].sha256;
  groundTruth.records[1].sourceImage.sha256 = regressionHashes[0];
  const report = auditGateBInventory({
    groundTruth,
    developmentGroundTruth: development,
    regressionImageHashes: regressionHashes,
  });
  assert.equal(report.independence.developmentOverlapCount, 1);
  assert.equal(report.independence.regressionOverlapCount, 1);
  assert.equal(report.eligibleIndependentNineFieldImageCount, 48);
  assert.equal(report.selectedImageCount, 0);
});

test('the minimum cannot be configured below 50', () => {
  assert.throws(() => auditGateBInventory({
    groundTruth: makeGroundTruth(100),
    developmentGroundTruth: makeDevelopmentGroundTruth(),
    regressionImageHashes: makeRegressionHashes(),
    minimumImages: 19,
  }), /cannot be configured below/);
});

test('current repository ground truth is correctly reported as 21 eligible, not a 50-image holdout', async () => {
  const [groundTruthBytes, developmentBytes, regressionEntries] = await Promise.all([
    fs.readFile(path.join(root, 'testdata/ground-truth/imagesF-63-working-ground-truth-v6.json')),
    fs.readFile(path.join(root, 'testdata/additional-screenshot-ground-truth.json')),
    fs.readdir(path.join(root, 'fixtures/four-screenshots'), { withFileTypes: true }),
  ]);
  const regressionHashes = [];
  for (const entry of regressionEntries) {
    if (!entry.isFile() || !/\.(png|jpe?g)$/i.test(entry.name)) continue;
    regressionHashes.push(digest(await fs.readFile(path.join(root, 'fixtures/four-screenshots', entry.name))));
  }
  const report = auditGateBInventory({
    groundTruth: JSON.parse(groundTruthBytes.toString('utf8')),
    developmentGroundTruth: JSON.parse(developmentBytes.toString('utf8')),
    regressionImageHashes: regressionHashes,
  });
  assert.equal(report.corpusImageCount, 63);
  assert.equal(report.eligibleIndependentNineFieldImageCount, 21);
  assert.equal(report.missingEligibleImagesToMinimum, 29);
  assert.equal(report.selectedImageCount, 0);
  assert.equal(report.gateBPass, false);
  assert.equal(report.independence.developmentOverlapCount, 0);
  assert.equal(report.independence.regressionOverlapCount, 0);
  assert.equal(report.labelReviewQueue.length, 42);
  assert.deepEqual(report.missingFieldCounts, {
    result: 0, player: 39, map: 39, mode: 37, battleStart: 41,
    credits: 2, freeXp: 4, damage: 1, xp: 1,
  });
});

test('an inferred or illegible status cannot count even if its eligibility flag is accidentally true', () => {
  const groundTruth = makeGroundTruth(50);
  groundTruth.records[0].fieldStatus.xp.status = 'MISSING_NOT_INFERRED';
  const report = auditGateBInventory({
    groundTruth,
    developmentGroundTruth: makeDevelopmentGroundTruth(),
    regressionImageHashes: makeRegressionHashes(),
  });
  assert.equal(report.eligibleIndependentNineFieldImageCount, 49);
  assert.equal(report.rejected.incompleteNineFieldLabels, 1);
});


test('inventory report explicitly distinguishes fingerprint metadata from source-byte verification', () => {
  const report = auditGateBInventory({
    groundTruth: makeGroundTruth(49),
    developmentGroundTruth: makeDevelopmentGroundTruth(),
    regressionImageHashes: makeRegressionHashes(),
  });
  assert.deepEqual(report.sourceImageVerification, {
    status: 'METADATA_ONLY_NOT_REHASHED',
    verified: false,
    qualification: 'This preflight validates recorded SHA-256 syntax, byte count, and dimensions only. It does not read or rehash source image bytes; archive/member integrity must be established by the separate source-archive reconciliation.',
  });
});


test('partial rows cannot conceal duplicate source-image hashes', () => {
  const groundTruth = makeGroundTruth(50);
  groundTruth.records[0].fieldStatus.xp.eligible_for_exact_match = false;
  groundTruth.records[1].sourceImage.sha256 = groundTruth.records[0].sourceImage.sha256;
  const report = auditGateBInventory({
    groundTruth,
    developmentGroundTruth: makeDevelopmentGroundTruth(),
    regressionImageHashes: makeRegressionHashes(),
  });
  assert.equal(report.rejected.duplicateSourceHashes, 1);
  assert.equal(report.eligibleIndependentNineFieldImageCount, 48);
  assert.equal(report.gateBPass, false);
});

test('partial rows are checked for development and regression overlap', () => {
  const groundTruth = makeGroundTruth(50);
  const development = makeDevelopmentGroundTruth();
  groundTruth.records[0].fieldStatus.xp.eligible_for_exact_match = false;
  groundTruth.records[0].sourceImage.sha256 = development.records[0].sha256;
  const report = auditGateBInventory({
    groundTruth,
    developmentGroundTruth: development,
    regressionImageHashes: makeRegressionHashes(),
  });
  assert.equal(report.rejected.overlapsDevelopmentCorpus, 1);
  assert.equal(report.eligibleIndependentNineFieldImageCount, 49);
  assert.equal(report.gateBPass, false);
});


test('field-level review template creates blank provenance slots without copying or inferring expected values', async () => {
  const groundTruth = JSON.parse(await fs.readFile(path.join(root, 'testdata/ground-truth/imagesF-63-working-ground-truth-v6.json'), 'utf8'));
  const rows = buildFieldReviewRows(groundTruth);
  assert.equal(rows.length, 164);
  assert.equal(rows.length, rows.reduce((count, row) => count + (row.reviewStatus === 'PENDING' ? 1 : 0), 0));
  assert.ok(rows.every(row => /^[a-f0-9]{64}$/.test(row.sourceImageSha256)));
  assert.ok(rows.every(row => row.reviewedValue === '' && row.reviewer === '' && row.reviewedAt === ''
    && row.evidenceReference === '' && row.evidenceNote === ''));
  assert.ok(rows.every(row => !Object.hasOwn(row, 'expectedValue')));
  const csv = renderCsv(rows);
  assert.match(csv, /^corpusOrder,filename,sourceImageSha256,field,/);
  assert.equal(csv.trimEnd().split(/\\r?\\n/).length, 165);
  assert.match(csv, /PENDING/);
});

test('field review CSV escapes commas, quotes, and newlines', () => {
  const csv = renderCsv([{
    corpusOrder: 1, filename: 'a,b.png', sourceImageSha256: 'a'.repeat(64),
    field: 'player', currentStatus: 'MANUAL', currentExpectedValuePresent: false,
    reviewedValue: '', reviewer: 'Reviewer "A"\\nSecond line', reviewedAt: '',
    evidenceReference: '', evidenceNote: '', reviewStatus: 'PENDING',
  }]);
  assert.match(csv, /"a,b.png"/);
  assert.match(csv, /"Reviewer ""A""\\nSecond line"/);
});

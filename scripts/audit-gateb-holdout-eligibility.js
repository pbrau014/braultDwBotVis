'use strict';

// Read-only Gate B corpus eligibility audit. This module never runs OCR and
// never edits source images, ground truth, provider artifacts, or prior reports.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const REQUIRED_FIELDS = Object.freeze([
  'result', 'player', 'map', 'mode', 'battleStart',
  'credits', 'freeXp', 'damage', 'xp',
]);
const MINIMUM_IMAGES = 50;
const PREFERRED_IMAGES = 100;
const COMPLETE_STATUS = 'COMPLETE_9_FIELD_TRANSCRIPTION';
const MISSING_EXPECTED = new Set(['', 'none', 'null', 'n/a', 'not applicable', 'not detected', 'not_detected', 'unknown', 'illegible', 'unreadable', 'uncertain', 'missing', 'absent']);
const ELIGIBLE_LABEL_STATUSES = new Set([
  'COMPLETE_MANUAL_TRANSCRIPTION_SOURCE',
  'LOW_RES_MANUAL_TRANSCRIPTION_SOURCE',
  'VISUALLY_CONFIRMED',
  'VISUALLY_CONFIRMED_LOW_RES',
  'IMAGE_VERIFIED_WITH_PREMIUM_FINAL_VALUE',
]);

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function hasExpectedValue(value) {
  if (typeof value === 'string') return !MISSING_EXPECTED.has(value.trim().toLowerCase());
  if (typeof value === 'number') return Number.isFinite(value);
  return false;
}

// Validates the recorded fingerprint metadata only. It does not read or hash the original image bytes.
function sourceFingerprintIsValid(source) {
  return Boolean(source
    && typeof source.sha256 === 'string'
    && /^[a-f0-9]{64}$/.test(source.sha256)
    && Number.isSafeInteger(source.bytes) && source.bytes > 0
    && Number.isSafeInteger(source.width) && source.width > 0
    && Number.isSafeInteger(source.height) && source.height > 0);
}

function recordHasEligibleNineFieldLabel(record, fields = REQUIRED_FIELDS) {
  if (!record || record.recordStatus !== COMPLETE_STATUS) return false;
  return fields.every(field =>
    record.fieldStatus?.[field]?.eligible_for_exact_match === true
    && ELIGIBLE_LABEL_STATUSES.has(record.fieldStatus?.[field]?.status)
    && hasExpectedValue(record.expected?.[field]));
}

function auditGateBInventory({
  groundTruth,
  developmentGroundTruth,
  regressionImageHashes = [],
  minimumImages = MINIMUM_IMAGES,
  preferredImages = PREFERRED_IMAGES,
}) {
  if (!Number.isInteger(minimumImages) || minimumImages < MINIMUM_IMAGES) {
    throw new Error('Gate B minimum cannot be configured below the governing 50-image minimum.');
  }
  if (!Number.isInteger(preferredImages) || preferredImages < minimumImages) {
    throw new Error('Preferred holdout size must be an integer at least as large as the minimum.');
  }
  if (!groundTruth || groundTruth.schemaVersion !== 2 || !Array.isArray(groundTruth.records)) {
    throw new Error('Ground-truth schema or records collection is invalid.');
  }
  if (JSON.stringify(groundTruth.requiredFields) !== JSON.stringify(REQUIRED_FIELDS)) {
    throw new Error('Ground truth does not match the exact nine-field contract.');
  }
  if (!developmentGroundTruth || !Array.isArray(developmentGroundTruth.records)) {
    throw new Error('The 16-image development ground-truth inventory is missing or invalid.');
  }

  const developmentHashes = new Set(developmentGroundTruth.records
    .map(row => row.sha256 || row.sourceImage?.sha256)
    .filter(value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value)));
  const regressionHashes = new Set(regressionImageHashes);
  if (developmentGroundTruth.records.length !== 16 || developmentHashes.size !== 16) {
    throw new Error('Gate A independence reference must contain 16 unique development-image hashes.');
  }
  if (regressionImageHashes.length !== 4 || regressionHashes.size !== 4
      || [...regressionHashes].some(value => typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value))) {
    throw new Error('The independent four-image regression inventory must contain exactly four unique SHA-256 values.');
  }
  const seenNames = new Set();
  const seenHashes = new Set();
  const seenOrders = new Set();
  const eligible = [];
  const labelReviewQueue = [];
  const missingFieldCounts = Object.fromEntries(REQUIRED_FIELDS.map(field => [field, 0]));
  const rejected = {
    incompleteNineFieldLabels: 0,
    invalidSourceFingerprints: 0,
    duplicateFilenames: 0,
    duplicateSourceHashes: 0,
    invalidCorpusOrders: 0,
    duplicateCorpusOrders: 0,
    overlapsDevelopmentCorpus: 0,
    overlapsRegressionCorpus: 0,
  };

  const ordered = [...groundTruth.records].sort((a, b) =>
    Number(a.corpusOrder || 0) - Number(b.corpusOrder || 0));

  for (const record of ordered) {
    // Validate corpus identity for every row, including partial labels. An incomplete
    // row must not hide a duplicate filename/hash/order or a development/regression overlap.
    const order = Number(record.corpusOrder);
    if (!Number.isSafeInteger(order) || order < 1) {
      rejected.invalidCorpusOrders++;
      continue;
    }
    if (seenOrders.has(order)) {
      rejected.duplicateCorpusOrders++;
      continue;
    }
    seenOrders.add(order);
    const source = record.sourceImage;
    if (!record.filename || !sourceFingerprintIsValid(source)) {
      rejected.invalidSourceFingerprints++;
      continue;
    }
    if (seenNames.has(record.filename)) {
      rejected.duplicateFilenames++;
      continue;
    }
    if (seenHashes.has(source.sha256)) {
      rejected.duplicateSourceHashes++;
      continue;
    }
    seenNames.add(record.filename);
    seenHashes.add(source.sha256);
    if (developmentHashes.has(source.sha256)) {
      rejected.overlapsDevelopmentCorpus++;
      continue;
    }
    if (regressionHashes.has(source.sha256)) {
      rejected.overlapsRegressionCorpus++;
      continue;
    }
    if (!recordHasEligibleNineFieldLabel(record)) {
      rejected.incompleteNineFieldLabels++;
      const missingFields = REQUIRED_FIELDS.filter(field =>
        !(record.fieldStatus?.[field]?.eligible_for_exact_match === true
          && ELIGIBLE_LABEL_STATUSES.has(record.fieldStatus?.[field]?.status)
          && hasExpectedValue(record.expected?.[field])));
      for (const field of missingFields) missingFieldCounts[field]++;
      labelReviewQueue.push({
        corpusOrder: order,
        filename: record.filename,
        sourceImageSha256: source.sha256,
        missingFields,
        missingFieldStatuses: Object.fromEntries(missingFields.map(field =>
          [field, record.fieldStatus?.[field]?.status || 'MISSING_STATUS'])),
      });
      continue;
    }
    eligible.push({
      corpusOrder: order,
      filename: record.filename,
      sourceImage: {
        sha256: source.sha256,
        bytes: source.bytes,
        width: source.width,
        height: source.height,
      },
    });
  }

  const manualSourceDeclared = typeof groundTruth.manualTranscriptionSource === 'string'
    && groundTruth.manualTranscriptionSource.trim().length > 0;
  const provenanceDeclared = manualSourceDeclared
    && groundTruth.sourceLineAudit?.preservedInWorkbook === true;
  const overlapCount = rejected.overlapsDevelopmentCorpus + rejected.overlapsRegressionCorpus;
  const blockingReasons = [];
  if (eligible.length < minimumImages) blockingReasons.push('INSUFFICIENT_ELIGIBLE_NINE_FIELD_LABELS');
  if (!provenanceDeclared) blockingReasons.push('MANUAL_LABEL_PROVENANCE_OR_SOURCE_LINE_AUDIT_MISSING');
  if (overlapCount > 0) blockingReasons.push('HOLDOUT_OVERLAPS_DEVELOPMENT_OR_REGRESSION_CORPUS');
  if (rejected.invalidSourceFingerprints > 0) blockingReasons.push('INVALID_SOURCE_IMAGE_FINGERPRINTS');
  if (rejected.duplicateFilenames > 0 || rejected.duplicateSourceHashes > 0) blockingReasons.push('DUPLICATE_SOURCE_IMAGE_IDENTITY');
  if (rejected.invalidCorpusOrders > 0 || rejected.duplicateCorpusOrders > 0) blockingReasons.push('INVALID_OR_DUPLICATE_CORPUS_ORDER');
  const ready = blockingReasons.length === 0;
  const selected = ready ? eligible.slice(0, preferredImages) : [];

  return {
    schemaVersion: 1,
    auditType: 'READ_ONLY_GATE_B_INVENTORY_ELIGIBILITY',
    status: ready ? 'INVENTORY_THRESHOLD_MET_NOT_GATE_ACCEPTANCE' : 'BLOCKED_BELOW_MINIMUM_OR_PROVENANCE',
    gateBPass: false,
    minimumImages,
    preferredImages,
    corpusImageCount: groundTruth.records.length,
    eligibleIndependentNineFieldImageCount: eligible.length,
    missingEligibleImagesToMinimum: Math.max(0, minimumImages - eligible.length),
    missingEligibleImagesToPreferred: Math.max(0, preferredImages - eligible.length),
    selectedImageCount: selected.length,
    requiredFields: [...REQUIRED_FIELDS],
    labelProvenance: {
      manualTranscriptionSourceDeclared: manualSourceDeclared,
      sourceLineAuditPreserved: groundTruth.sourceLineAudit?.preservedInWorkbook === true,
      separateBlindSecondReviewerDocumented: false,
      qualification: 'Declared manual transcription provenance is retained; this audit does not certify double-blind review.',
    },
    sourceImageVerification: {
      status: 'METADATA_ONLY_NOT_REHASHED',
      verified: false,
      qualification: 'This preflight validates recorded SHA-256 syntax, byte count, and dimensions only. It does not read or rehash source image bytes; archive/member integrity must be established by the separate source-archive reconciliation.',
    },
    independence: {
      developmentCorpusImageCount: developmentGroundTruth.records.length,
      developmentOverlapCount: rejected.overlapsDevelopmentCorpus,
      regressionCorpusImageCount: regressionHashes.size,
      regressionOverlapCount: rejected.overlapsRegressionCorpus,
    },
    rejected,
    blockingReasons,
    missingFieldCounts,
    labelReviewQueue,
    eligibleRecords: eligible,
    selectedRecords: selected,
    limitations: [
      'This is an inventory eligibility audit only, not OCR accuracy or Gate B acceptance.',
      'No OCR.Space requests are made.',
      'No source images, labels, PDFs, rasters, reports, or manifests are modified.',
      'Per-image source byte hashes are not recomputed by this metadata-only preflight; do not treat its fingerprint-shape check as source-image integrity verification.',
      'A ready inventory still requires Gate A PASS, locked source fingerprints, verified artifacts, zero wrong accepted values, zero unresolved mandatory outputs, network proof, and security checks.',
    ],
  };
}

async function hashRegressionImages(directory) {
  const hashes = [];
  const allowed = new Set(['.png', '.jpg', '.jpeg']);
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !allowed.has(path.extname(entry.name).toLowerCase())) continue;
    hashes.push(sha256(await fs.readFile(path.join(directory, entry.name))));
  }
  return hashes;
}

async function runCli(argv = process.argv.slice(2)) {
  const root = path.resolve(__dirname, '..');
  const valueAfter = (flag, fallback) => {
    const index = argv.indexOf(flag);
    return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
  };
  const groundTruthPath = path.resolve(valueAfter('--ground-truth',
    path.join(root, 'testdata/ground-truth/imagesF-63-working-ground-truth-v6.json')));
  const developmentPath = path.resolve(valueAfter('--development-ground-truth',
    path.join(root, 'testdata/additional-screenshot-ground-truth.json')));
  const regressionDirectory = path.resolve(valueAfter('--regression-dir',
    path.join(root, 'fixtures/four-screenshots')));
  const outputPath = valueAfter('--output', null);

  const [groundTruthBytes, developmentBytes, regressionImageHashes] = await Promise.all([
    fs.readFile(groundTruthPath),
    fs.readFile(developmentPath),
    hashRegressionImages(regressionDirectory),
  ]);
  const report = auditGateBInventory({
    groundTruth: JSON.parse(groundTruthBytes.toString('utf8').replace(/^\uFEFF/, '')),
    developmentGroundTruth: JSON.parse(developmentBytes.toString('utf8').replace(/^\uFEFF/, '')),
    regressionImageHashes,
  });
  report.inputs = {
    groundTruth: path.relative(root, groundTruthPath).replace(/\\/g, '/'),
    groundTruthRawSha256: sha256(groundTruthBytes),
    developmentGroundTruth: path.relative(root, developmentPath).replace(/\\/g, '/'),
    developmentGroundTruthRawSha256: sha256(developmentBytes),
    regressionImageDirectory: path.relative(root, regressionDirectory).replace(/\\/g, '/'),
    regressionImageCount: regressionImageHashes.length,
  };
  const serialized = JSON.stringify(report, null, 2) + '\n';
  if (outputPath) await fs.writeFile(path.resolve(outputPath), serialized, { flag: 'wx' });
  process.stdout.write(JSON.stringify({
    status: report.status,
    gateBPass: report.gateBPass,
    corpusImageCount: report.corpusImageCount,
    eligibleIndependentNineFieldImageCount: report.eligibleIndependentNineFieldImageCount,
    minimumImages: report.minimumImages,
    missingEligibleImagesToMinimum: report.missingEligibleImagesToMinimum,
    preferredImages: report.preferredImages,
    missingEligibleImagesToPreferred: report.missingEligibleImagesToPreferred,
    selectedImageCount: report.selectedImageCount,
    labelReviewQueueCount: report.labelReviewQueue.length,
    missingFieldCounts: report.missingFieldCounts,
    inputs: report.inputs,
  }, null, 2) + '\n');
  return report;
}

if (require.main === module) {
  runCli().catch(error => {
    process.stderr.write((error.stack || String(error)) + '\n');
    process.exitCode = 1;
  });
}

module.exports = {
  REQUIRED_FIELDS,
  ELIGIBLE_LABEL_STATUSES,
  MINIMUM_IMAGES,
  PREFERRED_IMAGES,
  auditGateBInventory,
  recordHasEligibleNineFieldLabel,
  hasExpectedValue,
  sourceFingerprintIsValid,
  runCli,
};

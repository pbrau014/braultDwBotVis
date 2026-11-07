'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_FIELDS = [
  'result', 'player', 'map', 'mode', 'battleStart',
  'credits', 'freeXp', 'damage', 'xp',
];
const ELIGIBLE_LABEL_STATUSES = new Set([
  'COMPLETE_MANUAL_TRANSCRIPTION_SOURCE',
  'VISUALLY_CONFIRMED',
  'VISUALLY_REVIEWED',
]);

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function buildFieldReviewRows(groundTruth) {
  if (!groundTruth || groundTruth.schemaVersion !== 2 || !Array.isArray(groundTruth.records)) {
    throw new Error('Expected the version 2 Gate B ground-truth record collection.');
  }
  if (JSON.stringify(groundTruth.requiredFields) !== JSON.stringify(REQUIRED_FIELDS)) {
    throw new Error('Ground truth does not match the exact nine-field contract.');
  }
  const rows = [];
  const records = [...groundTruth.records].sort((a, b) => Number(a.corpusOrder) - Number(b.corpusOrder));
  for (const record of records) {
    for (const field of REQUIRED_FIELDS) {
      const status = record.fieldStatus?.[field]?.status || 'MISSING_STATUS';
      const value = record.expected?.[field];
      const present = value !== null && value !== undefined && String(value).trim().length > 0;
      const eligible = record.fieldStatus?.[field]?.eligible_for_exact_match === true
        && ELIGIBLE_LABEL_STATUSES.has(status)
        && present;
      if (eligible) continue;
      rows.push({
        corpusOrder: Number(record.corpusOrder),
        filename: record.filename || '',
        sourceImageSha256: record.sourceImage?.sha256 || '',
        field,
        currentStatus: status,
        currentExpectedValuePresent: present,
        reviewedValue: '',
        reviewer: '',
        reviewedAt: '',
        evidenceReference: '',
        evidenceNote: '',
        reviewStatus: 'PENDING',
      });
    }
  }
  return rows;
}

function renderCsv(rows) {
  const columns = [
    'corpusOrder', 'filename', 'sourceImageSha256', 'field',
    'currentStatus', 'currentExpectedValuePresent',
    'reviewedValue', 'reviewer', 'reviewedAt',
    'evidenceReference', 'evidenceNote', 'reviewStatus',
  ];
  return [columns.join(','), ...rows.map(row => columns.map(column => csvCell(row[column])).join(','))].join('\n') + '\n';
}

function main(args = process.argv.slice(2)) {
  const index = args.indexOf('--output');
  const output = index >= 0 ? args[index + 1] : 'testdata/ground-truth/gateb-field-label-review-template.csv';
  if (!output || output.startsWith('--')) throw new Error('Usage: node scripts/build-gateb-field-label-review-template.js --output FILE');
  const root = path.resolve(__dirname, '..');
  const input = path.join(root, 'testdata/ground-truth/imagesF-63-working-ground-truth-v6.json');
  const groundTruth = JSON.parse(fs.readFileSync(input, 'utf8'));
  const rows = buildFieldReviewRows(groundTruth);
  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  fs.writeFileSync(output, renderCsv(rows), { encoding: 'utf8' });
  console.log(JSON.stringify({
    status: 'REVIEW_TEMPLATE_CREATED',
    rows: rows.length,
    sourceRecords: groundTruth.records.length,
    source: path.relative(root, input),
    output: path.resolve(output),
    expectedValuesCopied: false,
    valuesInferred: false,
  }, null, 2));
  return rows.length;
}

if (require.main === module) {
  try { main(); } catch (error) {
    console.error('[GATEB-LABEL-REVIEW-TEMPLATE] FAILED:', String(error.message || error).slice(0, 1000));
    process.exitCode = 1;
  }
}

module.exports = { REQUIRED_FIELDS, buildFieldReviewRows, renderCsv, main };

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateResumeState, classifyResumeRow } = require('../src/ocrspace-exploratory-resume');

const members = [
  { filename: 'one.png', bytes: 10, sha256: 'a'.repeat(64) },
  { filename: 'two.png', bytes: 20, sha256: 'b'.repeat(64) },
];
const fields = ['result', 'player', 'map', 'mode', 'battleStart', 'credits', 'freeXp', 'damage', 'xp'];
function state(results = []) {
  return { schemaVersion: 1, sourceArchiveSha256: 'c'.repeat(64),
    preflightReportSha256: 'd'.repeat(64), imageCount: 63, requiredFields: fields, results };
}

test('resume validation binds progress to exact archive, preflight, inventory, and field contract', () => {
  const valid = { ...state(), results: [{ index: 1, filename: 'one.png', sourceSha256: members[0].sha256, providerSubmissionAttempted: false }] };
  const rows = validateResumeState(valid, { sourceArchiveSha256: 'c'.repeat(64),
    preflightReportSha256: 'd'.repeat(64), verifiedMembers: Array.from({length:63},(_,i)=>i===0?members[0]:{filename:`image-${i+1}.png`,bytes:1,sha256:String(i).padStart(64,'0')}),
    requiredFields: fields });
  assert.equal(rows.size, 1);
  assert.throws(() => validateResumeState(valid, { sourceArchiveSha256: 'e'.repeat(64),
    preflightReportSha256: 'd'.repeat(64), verifiedMembers: Array.from({length:63},(_,i)=>i===0?members[0]:{filename:`image-${i+1}.png`,bytes:1,sha256:String(i).padStart(64,'0')}),
    requiredFields: fields }), { code: 'OCRSPACE_RESUME_FINGERPRINT_MISMATCH' });
});

test('completed image rows are skipped only when artifacts and both local readers are recorded', () => {
  const item = { filename: 'one.png', index: 1, sha256: 'a'.repeat(64) };
  const complete = { ...item, sourceSha256: item.sha256, status: 'pdf-first-complete', providerSubmissionAttempted: true,
    pdfSha256: 'e'.repeat(64), rasterSha256: 'f'.repeat(64), pdfPath: 'one.pdf', rasterPath: 'one.png',
    localReaders: [{ engine: 'tesseractjs' }, { engine: 'native' }], localReaderFailures: [] };
  assert.equal(classifyResumeRow(null, item), 'submit');
  assert.equal(classifyResumeRow(complete, item), 'skip-complete');
  assert.equal(classifyResumeRow({ ...complete, localReaders: [{ engine: 'tesseractjs' }], localReaderFailures: [{ engine: 'native' }] }, item), 'resume-local-only');
  assert.equal(classifyResumeRow({ ...complete, rasterSha256: undefined }, item), 'skip-ambiguous');
});

test('uncertain provider submissions are never automatically repeated', () => {
  const item = { filename: 'one.png', index: 1, sha256: 'a'.repeat(64) };
  assert.equal(classifyResumeRow({ ...item, sourceSha256: item.sha256, status: 'provider-submission-started', providerSubmissionAttempted: true }, item), 'skip-ambiguous');
  assert.equal(classifyResumeRow({ ...item, sourceSha256: item.sha256, status: 'failed', providerSubmissionAttempted: true }, item), 'skip-ambiguous');
  assert.equal(classifyResumeRow({ ...item, sourceSha256: item.sha256, status: 'failed', providerSubmissionAttempted: false }, item), 'submit');
});

test('resume rejects changed or reordered source rows', () => {
  const item = { filename: 'one.png', index: 1, sha256: 'a'.repeat(64) };
  assert.throws(() => classifyResumeRow({ ...item, sourceSha256: 'b'.repeat(64) }, item), { code: 'OCRSPACE_RESUME_ROW_MISMATCH' });
});

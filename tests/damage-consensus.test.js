'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { selectDamageCandidates, hasUniqueDamageConsensus, extractFullScreenDamageCandidates } = require('../src/damage-consensus');

test('sparse PSM 11 keeps an independent damage read when the Damage caption is omitted', () => {
  const candidates = extractFullScreenDamageCandidates([
    {
      pageSegmentationMode: 3,
      confidence: 79,
      text: 'PERSONAL SCORE\nBattle performance\n87373 1 \\ BP. FTE =T1\nDamage Destroyed Citadel hits\nCombat Missions',
    },
    {
      pageSegmentationMode: 11,
      confidence: 68,
      text: 'PERSONAL SCORE\nBattle performance\n87373 1 = Bin} FY\nx1\nDEEN\nDestroyed\nCombat Missions\n[2 Earn 3000 Base XP\ndamage\nReceive potential',
    },
  ]);
  assert.deepEqual(candidates.map(candidate => ({ value: candidate.value, source: candidate.source })), [
    { value: '87373', source: 'full-screen-psm-3' },
    { value: '87373', source: 'full-screen-psm-11' },
  ]);
  const selected = selectDamageCandidates(
    [{ value: '873131', confidence: 0, source: 'focused-8', excludeAdjacentUi: false }],
    candidates,
  );
  assert.equal(selected.selectedBy, 'full-screen-consensus');
  assert.equal(selected.selectedValue, '87373');
});

test('agreeing independent full-screen damage reads override a conflicting focused-crop value', () => {
  const selected = selectDamageCandidates(
    [
      { value: '87313', confidence: 96, source: 'focused-7' },
      { value: '87313', confidence: 94, source: 'focused-6' },
    ],
    [
      { value: '87373', confidence: 88, source: 'full-screen-psm-3' },
      { value: '87373', confidence: 84, source: 'full-screen-psm-11' },
    ],
  );
  assert.equal(selected.selectedBy, 'full-screen-consensus');
  assert.equal(selected.selectedValue, '87373');
  assert.deepEqual(selected.candidates.map(candidate => candidate.value), ['87373', '87373']);
  assert.deepEqual(selected.conflictingFocusedValues, ['87313']);
});

test('conflicting full-screen reads are not resolved by confidence alone', () => {
  const selected = selectDamageCandidates(
    [{ value: '87313', confidence: 99, source: 'focused-7' }],
    [
      { value: '87373', confidence: 88, source: 'full-screen-psm-3' },
      { value: '87313', confidence: 84, source: 'full-screen-psm-11' },
    ],
  );
  assert.equal(selected.selectedBy, 'conflicting-evidence-fail-closed');
  assert.equal(selected.selectedValue, null);
  assert.ok(selected.candidates.some(candidate => candidate.value === '87373'));
  assert.ok(selected.candidates.some(candidate => candidate.value === '87313'));
});

test('missing full-screen evidence preserves the focused candidate for validation', () => {
  const selected = selectDamageCandidates(
    [{ value: '123456', confidence: 90, source: 'focused-7' }],
    [{ value: '', confidence: 0, source: 'full-screen-psm-3' }],
  );
  assert.equal(selected.selectedBy, 'combined-evidence');
  assert.deepEqual(selected.candidates.map(candidate => candidate.value), ['123456']);
});

test('one extra final digit in a single full-screen read repairs unanimous clipped focused prefixes', () => {
  const selected = selectDamageCandidates(
    [
      { value: '13182', confidence: 86, source: 'focused-8' },
      { value: '13182', confidence: 86, source: 'focused-13' },
      { value: '13182', confidence: 82, source: 'focused-6' },
    ],
    [{ value: '131828', confidence: 72, source: 'full-screen-psm-3' }],
  );
  assert.equal(selected.selectedBy, 'one-digit-full-screen-extension-consensus');
  assert.equal(selected.selectedValue, '131828');
  assert.deepEqual(selected.conflictingFocusedValues, ['13182']);
});

test('prefix repair does not accept low-confidence or non-prefix damage values', () => {
  const lowConfidence = selectDamageCandidates(
    [{ value: '13182', confidence: 90 }, { value: '13182', confidence: 90 }],
    [{ value: '131828', confidence: 30 }],
  );
  assert.equal(lowConfidence.selectedValue, null);
  const nonPrefix = selectDamageCandidates(
    [{ value: '13182', confidence: 90 }, { value: '13182', confidence: 90 }],
    [{ value: '132829', confidence: 90 }],
  );
  assert.equal(nonPrefix.selectedValue, null);
});

test('geometry-bounded crops that stop before adjacent ribbon icons override one appended full-screen icon digit', () => {
  const selected = selectDamageCandidates(
    [
      { value: '227678', confidence: 0, source: 'source-crop-psm-8', excludeAdjacentUi: true },
      { value: '227678', confidence: 0, source: 'source-crop-psm-13', excludeAdjacentUi: true },
    ],
    [{ value: '2276787', confidence: 74, source: 'full-screen-psm-11' }],
  );
  assert.equal(selected.selectedBy, 'isolated-focused-crop-consensus-excludes-adjacent-ui');
  assert.equal(selected.selectedValue, '227678');
});

test('a unique isolated six-digit crop prefix is checked before unanimous seven-digit icon-contaminated full-screen reads', () => {
  const selected = selectDamageCandidates(
    [
      { value: '289577', confidence: 0, source: 'crop-a-psm8', excludeAdjacentUi: true, cropWidth: 0.102, cropPsm: 8 },
      { value: '289577', confidence: 0, source: 'crop-a-psm13', excludeAdjacentUi: true, cropWidth: 0.102, cropPsm: 13 },
      { value: '289577', confidence: 0, source: 'crop-b-psm8', excludeAdjacentUi: true, cropWidth: 0.104, cropPsm: 8 },
      { value: '289577', confidence: 0, source: 'crop-b-psm13', excludeAdjacentUi: true, cropWidth: 0.104, cropPsm: 13 },
    ],
    [
      { value: '2895770', confidence: 68, source: 'full-screen-psm-3' },
      { value: '2895770', confidence: 70, source: 'full-screen-psm-11' },
    ],
  );
  assert.equal(selected.selectedBy, 'isolated-focused-crop-consensus-excludes-adjacent-ui');
  assert.equal(selected.selectedValue, '289577');
});

test('focused crop cannot trim a full-screen digit unless it is explicitly marked isolated', () => {
  const selected = selectDamageCandidates(
    [
      { value: '227678', confidence: 0, source: 'focused-8' },
      { value: '227678', confidence: 0, source: 'focused-13' },
    ],
    [{ value: '2276787', confidence: 74, source: 'full-screen-psm-11' }],
  );
  assert.equal(selected.selectedValue, null);
});

test('unique isolated crop quorum can resolve a divergent full-screen read', () => {
  const selected = selectDamageCandidates(
    [
      { value: '171577', confidence: 40, source: 'focused-8', excludeAdjacentUi: true, cropWidth: 0.096, cropPsm: 8 },
      { value: '171577', confidence: 40, source: 'focused-13', excludeAdjacentUi: true, cropWidth: 0.096, cropPsm: 13 },
      { value: '171577', confidence: 57, source: 'focused-8', excludeAdjacentUi: true, cropWidth: 0.098, cropPsm: 8 },
      { value: '171577', confidence: 57, source: 'focused-13', excludeAdjacentUi: true, cropWidth: 0.098, cropPsm: 13 },
    ],
    [{ value: '11377', confidence: 85, source: 'full-screen-psm-3' }],
  );
  assert.equal(selected.selectedBy, 'isolated-focused-crop-quorum');
  assert.equal(selected.selectedValue, '171577');
  assert.deepEqual(selected.conflictingFocusedValues, ['11377']);
});

test('isolated crop quorum rejects repeats that do not span multiple widths and PSMs', () => {
  const selected = selectDamageCandidates(
    [
      { value: '171577', confidence: 90, source: 'focused-8', excludeAdjacentUi: true, cropWidth: 0.096, cropPsm: 8 },
      { value: '171577', confidence: 90, source: 'focused-8-again', excludeAdjacentUi: true, cropWidth: 0.096, cropPsm: 8 },
      { value: '171577', confidence: 90, source: 'focused-8-third', excludeAdjacentUi: true, cropWidth: 0.096, cropPsm: 8 },
      { value: '171577', confidence: 90, source: 'focused-8-fourth', excludeAdjacentUi: true, cropWidth: 0.096, cropPsm: 8 },
    ],
    [{ value: '11377', confidence: 85, source: 'full-screen-psm-3' }],
  );
  assert.equal(selected.selectedValue, null);
});

test('unique isolated crop quorum can recover damage when full-screen OCR has no candidate', () => {
  const selected = selectDamageCandidates(
    [
      { value: '303622', confidence: 0, source: 'caption-psm7-a', excludeAdjacentUi: true, cropWidth: 0.080, cropPsm: 7 },
      { value: '303622', confidence: 0, source: 'caption-psm8-a', excludeAdjacentUi: true, cropWidth: 0.080, cropPsm: 8 },
      { value: '303622', confidence: 0, source: 'caption-psm7-b', excludeAdjacentUi: true, cropWidth: 0.084, cropPsm: 7 },
      { value: '303622', confidence: 0, source: 'caption-psm8-b', excludeAdjacentUi: true, cropWidth: 0.084, cropPsm: 8 },
    ],
    [],
  );
  assert.equal(selected.selectedBy, 'isolated-focused-crop-quorum-no-full-screen');
  assert.equal(selected.selectedValue, '303622');
  assert.equal(selected.candidates.length, 4);
});

test('no-full-screen crop quorum stays fail-closed for multiple competing values', () => {
  const selected = selectDamageCandidates(
    [
      { value: '303622', confidence: 0, source: 'a-psm7', excludeAdjacentUi: true, cropWidth: 0.080, cropPsm: 7 },
      { value: '303622', confidence: 0, source: 'a-psm8', excludeAdjacentUi: true, cropWidth: 0.080, cropPsm: 8 },
      { value: '303622', confidence: 0, source: 'b-psm7', excludeAdjacentUi: true, cropWidth: 0.084, cropPsm: 7 },
      { value: '303622', confidence: 0, source: 'b-psm8', excludeAdjacentUi: true, cropWidth: 0.084, cropPsm: 8 },
      { value: '309322', confidence: 0, source: 'c-psm7', excludeAdjacentUi: true, cropWidth: 0.086, cropPsm: 7 },
      { value: '309322', confidence: 0, source: 'c-psm8', excludeAdjacentUi: true, cropWidth: 0.086, cropPsm: 8 },
      { value: '309322', confidence: 0, source: 'd-psm7', excludeAdjacentUi: true, cropWidth: 0.088, cropPsm: 7 },
      { value: '309322', confidence: 0, source: 'd-psm8', excludeAdjacentUi: true, cropWidth: 0.088, cropPsm: 8 },
    ],
    [],
  );
  assert.equal(selected.selectedValue, null);
  assert.equal(selected.selectedBy, 'combined-evidence');
});


test('a conflicting valid damage crop prevents the initial plurality from suppressing a sweep', () => {
  assert.equal(hasUniqueDamageConsensus(['221010', '221010', '227678']), false);
  assert.equal(hasUniqueDamageConsensus(['171577', '171577', '']), true);
  assert.equal(hasUniqueDamageConsensus(['13182', '13182', '131828']), false);
});


test('unique isolated crop family recovers a leading digit omitted by agreeing full-screen reads', () => {
  const selected = selectDamageCandidates(
    [
      { value: '171577', confidence: 31, source: 'crop-a-psm8', excludeAdjacentUi: true, cropWidth: 0.096, cropPsm: 8 },
      { value: '171577', confidence: 32, source: 'crop-a-psm13', excludeAdjacentUi: true, cropWidth: 0.096, cropPsm: 13 },
      { value: '171577', confidence: 48, source: 'crop-b-psm8', excludeAdjacentUi: true, cropWidth: 0.098, cropPsm: 8 },
      { value: '171577', confidence: 52, source: 'crop-b-psm13', excludeAdjacentUi: true, cropWidth: 0.098, cropPsm: 13 },
    ],
    [{ value: '71577', confidence: 83, source: 'full-screen-psm-3' }, { value: '71577', confidence: 78, source: 'full-screen-psm-11' }],
  );
  assert.equal(selected.selectedBy, 'isolated-focused-crop-leading-digit-recovery');
  assert.equal(selected.selectedValue, '171577');
});

test('leading-digit recovery stays fail-closed when full-screen values conflict', () => {
  const selected = selectDamageCandidates(
    [
      { value: '171577', confidence: 35, excludeAdjacentUi: true, cropWidth: 0.096, cropPsm: 8 },
      { value: '171577', confidence: 35, excludeAdjacentUi: true, cropWidth: 0.096, cropPsm: 13 },
      { value: '171577', confidence: 35, excludeAdjacentUi: true, cropWidth: 0.098, cropPsm: 8 },
    ],
    [{ value: '71577', confidence: 80, source: 'full-screen-psm-3' }, { value: '17577', confidence: 79, source: 'full-screen-psm-11' }],
  );
  assert.equal(selected.selectedValue, null);
});


test('PSM 11 retains a split damage value near the top of the performance block when its caption appears later', () => {
  const candidates = extractFullScreenDamageCandidates([{
    pageSegmentationMode: 11,
    confidence: 82,
    text: [
      'Battle performance',
      'Te Li.l',
      '166 183',
      'Tax',
      '=',
      '—',
      'SZ',
      '=',
      '=',
      'Set on fire',
      'Citadel hits',
      'Damage',
      'Target hits',
      'Combat Missions',
    ].join('\n'),
  }]);
  assert.deepEqual(candidates.map(candidate => candidate.value), ['166183']);
});

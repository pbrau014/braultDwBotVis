'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { compareExpected, acceptancePasses, validateNegativeExpectedControl } = require('../src/acceptance-checks');

test('exact-match acceptance rejects a deliberately incorrect expected value', () => {
  const { comparison, allMatch } = compareExpected({ damage: 87373, credits: 540180 }, { damage: 87313, credits: 540180 });
  assert.equal(comparison.damage.pass, false);
  assert.equal(allMatch, false);
});

test('exact-match acceptance rejects missing or incomplete required fields', () => {
  const { allMatch } = compareExpected({ result: 'Victory', damage: null }, { result: 'Victory', damage: 131828 });
  assert.equal(allMatch, false);
  assert.equal(acceptancePasses({ pipelineCompleted: true, allExpectedFieldsPass: true, requiredMissing: [{ key: 'damage' }] }), false);
  assert.equal(acceptancePasses({ pipelineCompleted: true, allExpectedFieldsPass: true, requiredMissing: [] }), false,
    'legacy reports without an explicit nine-field result fail closed');
});

test('acceptance gate passes only complete exact-match rows', () => {
  assert.equal(acceptancePasses({ pipelineCompleted: true, allExpectedFieldsPass: true, allRequiredFieldsPass: true, requiredMissing: [] }), true);
  assert.equal(acceptancePasses({ pipelineCompleted: true, allExpectedFieldsPass: false, allRequiredFieldsPass: true, requiredMissing: [] }), true,
    'the explicit required-field result is authoritative and includes all nine fields');
  assert.equal(acceptancePasses({ pipelineCompleted: true, allExpectedFieldsPass: false, allRequiredFieldsPass: false, requiredMissing: [{ key: 'xp' }] }), false,
    'missing XP must block acceptance');
  assert.equal(acceptancePasses({ pipelineCompleted: true, allExpectedFieldsPass: true, allRequiredFieldsPass: false, requiredMissing: [] }), false, 'a wrong mandatory value still fails');
  assert.equal(acceptancePasses({ pipelineCompleted: false, allExpectedFieldsPass: true, allRequiredFieldsPass: true, requiredMissing: [] }), false);
});

test('real negative control requires an exact nine-field baseline and the injected damage expectation as the sole mismatch', () => {
  const baseline = {
    pipelineCompleted: true,
    actual: {
      result: 'Defeat', player: '[OVF]OldschoolGaming_YouTube', map: 'Northern Lights',
      mode: 'Random Battle', battleStart: '14.07.2024 22:51', credits: 1650259,
      freeXp: 2110, damage: 171577, xp: 4059,
    },
    expected: {
      result: 'Defeat', player: '[OVF]OldschoolGaming_YouTube', map: 'Northern Lights',
      mode: 'Random Battle', battleStart: '14.07.2024 22:51', credits: 1650259,
      freeXp: 2110, damage: 171577, xp: 4059,
    },
    allExpectedFieldsPass: true,
    allRequiredFieldsPass: true,
    requiredMissing: [],
  };
  baseline.comparison = Object.fromEntries(Object.keys(baseline.expected).map((key) => [key, {
    expected: baseline.expected[key], actual: baseline.actual[key], pass: true,
  }]));
  const negative = {
    ...baseline,
    expected: { ...baseline.expected, damage: 171578 },
    allExpectedFieldsPass: false,
    allRequiredFieldsPass: false,
    comparison: {
      ...baseline.comparison,
      damage: { expected: 171578, actual: 171577, pass: false },
    },
  };
  assert.equal(validateNegativeExpectedControl(baseline, negative, 1), true);
  assert.equal(validateNegativeExpectedControl({ ...baseline, expected: Object.fromEntries(
    Object.entries(baseline.expected).filter(([key]) => key !== 'xp'),
  ) }, negative, 1), false,
    'a baseline cannot claim nine-field acceptance when the expected XP value is absent');
  assert.equal(validateNegativeExpectedControl(baseline, { ...negative, allRequiredFieldsPass: undefined }, 1), false,
    'a legacy negative-control report cannot substitute allExpectedFieldsPass for the current nine-field result');
  assert.equal(validateNegativeExpectedControl({ ...baseline, allExpectedFieldsPass: false, actual: { ...baseline.actual, damage: null } }, negative, 1), false);
  assert.equal(validateNegativeExpectedControl(baseline, { ...negative, comparison: {
    ...negative.comparison,
    credits: { expected: 1, actual: 1650259, pass: false },
  } }, 1), false);
  assert.equal(validateNegativeExpectedControl(baseline, negative, 0), false);
});

test('all nine fields are required; an XP mismatch or omitted XP fails the mandatory comparison', () => {
  const { REQUIRED_FIELD_KEYS } = require('../src/acceptance-checks');
  assert.deepEqual(REQUIRED_FIELD_KEYS, ['result', 'player', 'map', 'mode', 'battleStart', 'credits', 'freeXp', 'damage', 'xp']);
  const expected = Object.fromEntries(REQUIRED_FIELD_KEYS.map((key) => [key, key === 'result' ? 'Victory' : 'ValidValue']));
  expected.xp = 1234;
  const actual = { ...expected, xp: null };
  const { allMatch, requiredFieldsPass } = compareExpected(actual, expected);
  assert.equal(allMatch, false);
  assert.equal(requiredFieldsPass, false);
  const omittedXp = Object.fromEntries(Object.entries(expected).filter(([key]) => key !== 'xp'));
  assert.equal(compareExpected(actual, omittedXp).requiredFieldsPass, false, 'omitting expected XP is a contract failure');
  const nullXp = { ...expected, xp: null };
  assert.equal(compareExpected({ ...actual, xp: null }, nullXp).requiredFieldsPass, false, 'null XP cannot match null expected data to pass');
});

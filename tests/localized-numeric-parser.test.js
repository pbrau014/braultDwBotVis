'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseLocalizedNumericField, selectLocalizedRewardValue, hasIndependentRewardFieldValueSupport, hasIndependentRewardFieldConflict, hasIndependentRewardFieldPrefixConflict, reconcileCreditPrefix } = require('../src/number-parser');

test('localized parser combines only conventional thousands groups', () => {
    assert.equal(parseLocalizedNumericField('1 650 259', 'credits'), '1650259');
    assert.equal(parseLocalizedNumericField('14 390', 'xp'), '14390');
    assert.equal(parseLocalizedNumericField('2 110', 'freeXp'), '2110');
});

test('localized XP parser rejects appended icon digits rather than accepting a false value', () => {
    assert.equal(parseLocalizedNumericField('143905', 'xp'), '');
    assert.equal(parseLocalizedNumericField('26534', 'xp'), '26534'); // length alone cannot prove this is wrong
    assert.equal(parseLocalizedNumericField('4509 608', 'xp'), '');
});

test('localized parser accepts a single isolated field but not ambiguous equally ranked values', () => {
    assert.equal(parseLocalizedNumericField('4059', 'xp'), '4059');
    assert.equal(parseLocalizedNumericField('608', 'freeXp'), '608');
    assert.equal(parseLocalizedNumericField('4509 608', 'xp'), '');
    assert.equal(parseLocalizedNumericField('12345\n67890', 'credits'), '');
});

test('localized parser rejects unknown fields and invalid reward sizes', () => {
    assert.throws(() => parseLocalizedNumericField('12345', 'damage'), /Unknown localized numeric field/);
    assert.equal(parseLocalizedNumericField('9999', 'credits'), '');
    assert.equal(parseLocalizedNumericField('12345678', 'xp'), '');
});

test('reward selection uses localized agreement and never accepts XP from legacy broad candidates alone', () => {
    assert.equal(selectLocalizedRewardValue('xp', ['14390', '14390'], ['143905', '143905']), '14390');
    assert.equal(selectLocalizedRewardValue('xp', ['14390', '143905'], ['143905', '143905']), '');
    // Conflicting isolated reads must abstain; broad agreement cannot outvote them.
    assert.equal(selectLocalizedRewardValue('credits', ['940180', '540180'], ['540180', '540180']), '');
    assert.equal(selectLocalizedRewardValue('credits', ['540180', '540180'], ['540180', '540180']), '540180');
    assert.equal(selectLocalizedRewardValue('freeXp', ['1336', '1536'], ['1536', '1536']), '');
    assert.equal(selectLocalizedRewardValue('freeXp', ['1536', '1536'], ['1536', '1536']), '1536');
    assert.equal(selectLocalizedRewardValue('credits', ['940180', '540180'], ['123456', '654321']), '');
});

test('complete reward tuple fallback requires two distinct agreeing OCR sources', () => {
    const { selectConsistentRewardTuple } = require('../src/number-parser');
    assert.deepEqual(selectConsistentRewardTuple([
        { credits: '1650259', xp: '4059', freeXp: '2110', source: 6 },
        { credits: '1650259', xp: '4059', freeXp: '2110', source: 7 },
    ]), {
        credits: '1650259', xp: '4059', freeXp: '2110',
        source: 'independent-complete-tuple-consensus',
        supportingSources: ['6', '7'],
        supportingReads: [
            { source: '6', confidence: 0 },
            { source: '7', confidence: 0 },
        ],
    });
    assert.equal(selectConsistentRewardTuple([
        { credits: '1650259', xp: '4059', freeXp: '2110', source: 6 },
        { credits: '1650259', xp: '4058', freeXp: '2110', source: 7 },
    ]), null);
    assert.equal(selectConsistentRewardTuple([
        { credits: '1650259', xp: '4059', freeXp: '2110', source: 6 },
    ]), null);
});


test('Credits prefix recovery requires isolated plus two independent broad supports', () => {
    assert.deepEqual(reconcileCreditPrefix('54018', [
        { value: '540180', confidence: 89, psm: 8 },
    ], [
        { credits: '540180', confidence: 63, source: 6 },
        { credits: '540180', confidence: 63, source: 7 },
    ]), {
        value: '540180', recovered: true,
        supportingSources: ['localized-psm-8', 'broad-6', 'broad-7'],
    });
    assert.equal(reconcileCreditPrefix('317943', [
        { value: '31794', confidence: 96, psm: 7 },
    ], [
        { credits: '317943', confidence: 69, source: 6 },
        { credits: '317943', confidence: 69, source: 7 },
    ]).value, '317943');
    assert.equal(reconcileCreditPrefix('54018', [
        { value: '540180', confidence: 89, psm: 8 },
    ], [
        { credits: '540180', confidence: 63, source: 6 },
    ]).recovered, false);
});


test('Credits prefix recovery can use a matching reward-band token plus two distinct broad modes when a crop clips the last digit', () => {
    assert.deepEqual(reconcileCreditPrefix('51111', [
        { value: '51111', confidence: 76, psm: 8 },
    ], [
        { credits: '511113', confidence: 28, source: 7 },
        { credits: '511113', confidence: 85, source: 3 },
    ], [
        { text: '511113®', bbox: { x0: 320 } },
    ]), {
        value: '511113', recovered: true,
        supportingSources: ['reward-band-geometry-320', 'broad-7', 'broad-3'],
    });
});


test('reward conflict detection requires independent field support and never accepts a value by itself', () => {
    const candidates = [
        { credits: '1650259', xp: '4059', freeXp: '2110', confidence: 44, source: 6 },
        { credits: '1650259', xp: '4059', freeXp: '2110', confidence: 44, source: 7 },
    ];
    assert.equal(hasIndependentRewardFieldConflict('xp', '40595', candidates), true);
    assert.equal(hasIndependentRewardFieldValueSupport('xp', '4059', candidates), true);
    assert.equal(hasIndependentRewardFieldValueSupport('xp', '40595', candidates), false);
    assert.equal(hasIndependentRewardFieldConflict('xp', '4059', candidates), false);
    assert.equal(hasIndependentRewardFieldValueSupport('xp', '4509', [
        { xp: '4509', confidence: 85, source: 'independent-high-confidence' },
    ]), true);
});


test('one-digit reward prefix conflicts require independently supported longer or shorter values', () => {
    const candidates = [
        { xp: '2653', confidence: 48, source: 6 },
        { xp: '2653', confidence: 48, source: 7 },
    ];
    assert.equal(hasIndependentRewardFieldPrefixConflict('xp', '26534', candidates), true);
    assert.equal(hasIndependentRewardFieldPrefixConflict('xp', '2653', candidates), false);
    assert.equal(hasIndependentRewardFieldPrefixConflict('xp', '27535', candidates), false);
    assert.equal(hasIndependentRewardFieldPrefixConflict('xp', '', candidates), false);
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    normaliseOcrNumber,
    extractNumberTokens,
    extractRewardGroups,
    extractFocusedRewards,
    extractFocusedDamage,
} = require('../src/number-parser');

test('normalizes thousands separators only after isolating a value', () => {
    assert.equal(normaliseOcrNumber('899 836'), '899836');
    assert.deepEqual(extractNumberTokens('Damage 321 070, target hits x393'), ['321070', '393']);
});

test('reads the three reward columns without treating medal counts as rewards', () => {
    assert.deepEqual(extractFocusedRewards('899 836 3776 1596% 1 © #4'), { credits: '899836', xp: '3776', freeXp: '1596' });
    assert.deepEqual(extractFocusedRewards('471 621@ 4023 493%'), { credits: '471621', xp: '4023', freeXp: '493' });
    assert.deepEqual(extractFocusedRewards('540180@ 4906% 1536% 1'), { credits: '540180', xp: '4906', freeXp: '1536' });
    assert.deepEqual(extractFocusedRewards('145 806 1 831 91'), { credits: '145806', xp: '1831', freeXp: '91' });
    assert.deepEqual(extractFocusedRewards('1 650 259@ 4 059☆ 2 110☆'), { credits: '1650259', xp: '4059', freeXp: '2110' });
    assert.deepEqual(extractFocusedRewards('1 237152@ 14390% 1645 <2'), { credits: '1237152', xp: '14390', freeXp: '1645' });
    assert.deepEqual(extractFocusedRewards('511 113@ 4 509☆ 608☆'), { credits: '511113', xp: '4509', freeXp: '608' });
});

test('repairs a Credits chunk contaminated by the coin icon', () => {
    assert.deepEqual(extractFocusedRewards('899 8369 3 776% 1596% 1 ©', '836'), { credits: '899836', xp: '3776', freeXp: '1596' });
});

test('refuses malformed or incomplete reward rows instead of shifting values', () => {
    assert.equal(extractFocusedRewards('73 20899 836'), null);
    assert.equal(extractFocusedRewards('899 8369'), null);
});

test('reads damage from a dedicated crop and rejects obviously tiny/incomplete OCR fragments', () => {
    assert.equal(extractFocusedDamage('321 070!'), '321070');
    assert.equal(extractFocusedDamage('305 916 FS'), '305916');
    assert.equal(extractFocusedDamage('87373 |\nDamage Destroyed'), '87373');
    assert.equal(extractFocusedDamage('18 596'), '18596');
    assert.equal(extractFocusedDamage('700'), '');
    assert.equal(extractFocusedDamage('321 0708'), '');
});

test('reward groups ignore following medal / award numbers after the first three values', () => {
    assert.deepEqual(extractRewardGroups('899 836 3 776 1 596 1 medal x4'), ['899836', '3776', '1596', '1', '4']);
});

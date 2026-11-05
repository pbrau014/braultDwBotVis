'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  findRewardBaseX,
  findRewardGeometryAnchor,
  buildRewardGeometryRects,
  rewardGeometryValueIsValid,
  rewardValueMatchesAnchor,
  rewardGeometryAnchorDigitsAreUsable,
  rewardGeometryQuorumCanResolveXpTrailingAdornment,
} = require('../src/reward-geometry');

const ctx = (imageWidth = 1920, imageHeight = 1080, baseX = 318) => ({
  imageWidth, imageHeight, baseX,
  rowTop: 365, rowBottom: 410,
});
function attempt(name, words, psm = 7) {
  return { name, attempt: { pageSegmentationMode: psm, words: words.map(([text, x0, x1, y0 = 375, y1 = 397, confidence = 80]) => ({
    text, confidence, bbox: { x0, x1, y0, y1 },
  })) } };
}

test('reward geometry anchors fragmented Hoffmann XP and Free XP to the first fragment', () => {
  const sources = [attempt('row-psm7', [
    ['1237152@', 319, 533], ['14', 556, 600], ['3907', 612, 717], ['1', 739, 755], ['645%', 772, 877],
  ])];
  const context = ctx(1920, 1080, findRewardBaseX(sources, ctx()));
  assert.equal(context.baseX, 319);
  const xp = findRewardGeometryAnchor('xp', sources, context);
  const freeXp = findRewardGeometryAnchor('freeXp', sources, context);
  assert.equal(xp.text, '14');
  assert.deepEqual(xp.groupedWords, ['14', '3907']);
  assert.equal(xp.groupedDigits, '143907');
  assert.equal(freeXp.text, '1');
  assert.deepEqual(freeXp.groupedWords, ['1', '645%']);
  assert.equal(freeXp.groupedDigits, '1645');
});

test('reward geometry anchors split Libertad rewards and ignores a split Credits tail for XP', () => {
  const sources = [attempt('row-psm7', [
    ['511', 320, 401], ['113@', 407, 499], ['45095', 523, 662], ['608%', 685, 791],
  ])];
  const context = ctx(1800, 1000, findRewardBaseX(sources, ctx(1800, 1000)));
  const credits = findRewardGeometryAnchor('credits', sources, context);
  const xp = findRewardGeometryAnchor('xp', sources, context);
  const freeXp = findRewardGeometryAnchor('freeXp', sources, context);
  assert.equal(credits.text, '511');
  assert.equal(credits.groupedDigits, '511113');
  assert.equal(xp.text, '45095');
  assert.equal(freeXp.text, '608%');
});

test('reward geometry keeps the XP split separate from Free XP on Schlieffen', () => {
  const sources = [attempt('row-psm7', [
    ['317943@', 300, 470], ['2', 492, 512], ['653>x', 524, 623], ['325%', 644, 744],
  ])];
  const context = ctx(1800, 1000, findRewardBaseX(sources, ctx(1800, 1000)));
  const xp = findRewardGeometryAnchor('xp', sources, context);
  const freeXp = findRewardGeometryAnchor('freeXp', sources, context);
  assert.equal(xp.text, '2');
  assert.deepEqual(xp.groupedWords, ['2', '653>x']);
  assert.equal(xp.groupedDigits, '2653');
  assert.equal(freeXp.text, '325%');
  assert.equal(freeXp.groupedDigits, '325');
});

test('geometry crops are bounded, distinct, and retain the numeric group', () => {
  const sources = [attempt('row-psm7', [
    ['1237152@', 319, 533], ['14', 556, 600], ['3907', 612, 717], ['1', 739, 755], ['645%', 772, 877],
  ])];
  const context = ctx(1920, 1080, findRewardBaseX(sources, ctx()));
  const anchor = findRewardGeometryAnchor('xp', sources, context);
  const rects = buildRewardGeometryRects('xp', anchor, context);
  assert.equal(rects.length, 3);
  assert.equal(new Set(rects.map(item => item.rect.width)).size, 3);
  for (const { rect } of rects) {
    assert.ok(rect.left >= 0);
    assert.ok(rect.top >= 0);
    assert.ok(rect.width > 0 && rect.left + rect.width <= context.imageWidth);
    assert.ok(rect.height > 0 && rect.top + rect.height <= context.imageHeight);
    assert.ok(rect.left <= anchor.bbox.x0);
    assert.ok(rect.left + rect.width < 739, 'XP crop should stop before the Free XP column');
  }
});

test('reward candidate value validation enforces Credits width and numeric XP/Free XP bounds', () => {
  assert.equal(rewardGeometryValueIsValid('credits', '511113'), true);
  assert.equal(rewardGeometryValueIsValid('credits', '5111'), false);
  assert.equal(rewardGeometryValueIsValid('xp', '14390'), true);
  assert.equal(rewardGeometryValueIsValid('xp', '143905'), false);
  assert.equal(rewardGeometryValueIsValid('freeXp', '608'), true);
  assert.equal(rewardGeometryValueIsValid('freeXp', '12345678'), false);
});


test('complete Credits token never groups the following XP column', () => {
  const sources = [attempt('row-psm6', [
    ['540180@', 147, 354], ['4906+', 368, 493], ['1536%', 560, 691],
  ])];
  const context = ctx(1800, 1000, findRewardBaseX(sources, ctx(1800, 1000)));
  const credits = findRewardGeometryAnchor('credits', sources, context);
  assert.equal(credits.text, '540180@');
  assert.equal(credits.groupedDigits, '540180');
  assert.deepEqual(credits.groupedWords, ['540180@']);
});

test('single-token Credits adornment gets tighter crop widths without changing acceptance bounds', () => {
  const anchor = {
    field: 'credits', text: '317943®', digits: '317943', groupedText: '317943®',
    groupedDigits: '317943', groupedWords: ['317943®'],
    bbox: { x0: 300, y0: 375, x1: 512, y1: 434 },
    groupBBox: { x0: 300, y0: 375, x1: 512, y1: 434 },
  };
  const context = ctx(1800, 1000, 300);
  const rects = buildRewardGeometryRects('credits', anchor, context);
  assert.equal(rects.length, 3);
  assert.ok(rects[0].rect.width < rects[1].rect.width);
  assert.ok(rects[1].rect.width < rects[2].rect.width);
  const widths = rects.map(item => item.rect.width);
  assert.ok(widths[1] - widths[0] <= 5, `credit widths should be tightly spaced: ${widths}`);
  assert.ok(widths[2] - widths[1] <= 5, `credit widths should be tightly spaced: ${widths}`);
  assert.equal(rewardGeometryValueIsValid('credits', '317943'), true);
  assert.equal(rewardValueMatchesAnchor('credits', '3179430', anchor), false);
});

test('split Credits anchor uses grouped adornment text to keep icon digits outside geometry crops', () => {
  const anchor = {
    field: 'credits',
    text: '828',
    digits: '828',
    groupedText: '828 719@',
    groupedDigits: '828719',
    groupedWords: ['828', '719@'],
    bbox: { x0: 320, y0: 375, x1: 360, y1: 397 },
    groupBBox: { x0: 320, y0: 375, x1: 520, y1: 397 },
  };
  const context = ctx(1800, 1000, 320);
  const rects = buildRewardGeometryRects('credits', anchor, context);
  assert.equal(rects.length, 3);
  assert.ok(rects[0].rect.width < rects[1].rect.width);
  assert.ok(rects[1].rect.width < rects[2].rect.width);
  assert.ok(rects[2].rect.left + rects[2].rect.width < anchor.groupBBox.x1,
    'the widest crop should trim trailing adornment without changing accepted-value rules');
  assert.equal(rewardGeometryValueIsValid('credits', '828719'), true);
  assert.equal(rewardValueMatchesAnchor('credits', '8287191', anchor), false,
    'a longer crop result must still be independently resolved rather than treated as an anchor prefix');
  assert.equal(rewardGeometryValueIsValid('credits', '8287191234'), false,
    'the maximum accepted Credits width is unchanged');
});

test('row geometry ignores oversized panel boxes that overlap the reward row', () => {
  const sources = [
    attempt('reward-row', [['4059+', 560, 660, 432, 470, 82]]),
    attempt('performance-region', [['14300%', 550, 710, 365, 477, 95]]),
  ];
  const context = { imageWidth: 1920, imageHeight: 1080, baseX: 319, rowTop: 410, rowBottom: 490 };
  const anchor = findRewardGeometryAnchor('xp', sources, context);
  assert.equal(anchor.text, '4059+');
});

test('misaligned adorned XP geometry expands left while keeping three bounded crop widths', () => {
  const sources = [attempt('row-psm7', [['4059+', 560, 660, 375, 405]])];
  const context = ctx(1800, 1000, 319);
  const anchor = findRewardGeometryAnchor('xp', sources, context);
  const rects = buildRewardGeometryRects('xp', anchor, context);
  assert.equal(rects.length, 3);
  assert.ok(rects[0].rect.width < rects[1].rect.width);
  assert.ok(rects[1].rect.width < rects[2].rect.width);
  assert.ok(rects[0].rect.left < anchor.bbox.x0, 'target-aligned variants reach left of the shifted token');
  assert.ok(rects[2].rect.left + rects[2].rect.width < 680,
    'the widest crop remains bounded before the Free XP column');
});

test('row geometry preserves a reward token that extends below the heading boundary', () => {
  const anchor = {
    text: '1645%', digits: '1645', groupedDigits: '1645',
    bbox: { x0: 738, y0: 395, x1: 877, y1: 433 },
    groupBBox: { x0: 738, y0: 395, x1: 877, y1: 433 },
  };
  const context = { imageWidth: 1920, imageHeight: 1080, rowTop: 380, rowBottom: 419 };
  const rectangles = buildRewardGeometryRects('freeXp', anchor, context);
  assert.equal(rectangles.length, 3);
  for (const { rect } of rectangles) {
    assert.ok(rect.top + rect.height >= anchor.bbox.y1, 'crop must contain the full detected reward token');
    assert.ok(rect.top + rect.height <= context.rowBottom + context.imageHeight * 0.02 + 1,
      'crop must extend only within the bounded reward-row margin');
  }
});


test('five-digit XP anchor stays near its measured token and probes narrow icon-boundary widths', () => {
    const anchor = {
        source: 'localized-selected-word-geometry',
        text: '26534', digits: '26534', groupedDigits: '26534',
        bbox: { x0: 523, y0: 440, x1: 622, y1: 475 },
        groupBBox: { x0: 523, y0: 440, x1: 622, y1: 475 },
        targetX: 508,
    };
    const rects = buildRewardGeometryRects('xp', anchor,
        { imageWidth: 1800, imageHeight: 1080, rowTop: 420, rowBottom: 465 });
    assert.equal(rects.length, 3);
    assert.deepEqual(rects.map(item => [item.rect.left, item.rect.width]), [
        [505, 103], [505, 105], [505, 116],
    ]);
    assert.ok(rects.every(({ rect }) => rect.left <= anchor.bbox.x0), 'each crop starts just left of the measured token');
    assert.ok(rects[0].rect.left + rects[0].rect.width < 640, 'narrow crop must stop before the Free XP column');
});


test('misaligned four-digit XP anchor also probes target-aligned crops without widening accepted XP bounds', () => {
    const rects = buildRewardGeometryRects('xp', {
        source: 'localized-selected-word-geometry',
        text: '0365+', digits: '0365', groupedDigits: '0365',
        bbox: { x0: 559, y0: 390, x1: 665, y1: 433 },
        groupBBox: { x0: 559, y0: 390, x1: 665, y1: 433 },
        targetX: 541,
    }, { imageWidth: 1916, imageHeight: 1032, rowTop: 380, rowBottom: 463 });
    assert.equal(rects.length, 3);
    assert.ok(rects[0].rect.left < 559, 'the first crop must reach left of the shifted OCR token');
    assert.ok(rects[2].rect.left + rects[2].rect.width < 559 + 1916 * 0.09,
      'the widest target-aligned crop must stay bounded before the neighboring Free XP column');
    assert.equal(rewardGeometryValueIsValid('xp', '4056'), true);
    assert.equal(rewardGeometryValueIsValid('xp', '40565'), true,
      'length alone does not prove whether the fifth digit is real');
    assert.equal(rewardGeometryValueIsValid('xp', '405650'), false,
      'the actual-value limit remains five digits');
});

test('Free XP geometry joins a separate leading digit only beside the target-aligned Free XP token', () => {
  const imageWidth = 2600;
  const imageHeight = 1463;
  const baseX = 433;
  const sources = [attempt('panel-psm11', [
    ['6872+', 715, 899, 586, 636, 55],
    ['2', 931, 960, 586, 635, 69],
    ['856%', 978, 1119, 586, 636, 69],
    ['4', 1152, 1225, 574, 642, 36],
  ], 11)];
  const context = { imageWidth, imageHeight, baseX, rowTop: 566, rowBottom: 677 };
  const anchor = findRewardGeometryAnchor('freeXp', sources, context);
  assert.equal(anchor.text, '856%');
  assert.equal(anchor.groupedDigits, '2856');
  assert.deepEqual(anchor.groupedWords, ['2', '856%']);
  assert.equal(anchor.prefixedLeadingDigit, true);
  const rects = buildRewardGeometryRects('freeXp', anchor, context);
  assert.equal(rects.length, 3);
  assert.ok(rects[0].rect.left <= 931, 'crop retains the leading split digit');
  assert.ok(rects.every(({ rect }) => rect.left + rect.width <= 1135), 'crop stops before the neighboring icon/count');
});

test('Free XP does not prepend a nearby one-digit token outside the tighter target alignment band', () => {
  const imageWidth = 2600;
  const imageHeight = 1463;
  const baseX = 433;
  const sources = [attempt('panel-psm11', [
    ['1', 900, 956, 586, 635, 69],
    ['856%', 978, 1119, 586, 636, 69],
  ], 11)];
  const context = { imageWidth, imageHeight, baseX, rowTop: 566, rowBottom: 677 };
  const anchor = findRewardGeometryAnchor('freeXp', sources, context);
  assert.equal(anchor.text, '856%');
  assert.equal(anchor.groupedDigits, '856',
    'a stray digit 3% left of the Free XP target must not be merged into the crop anchor');
  assert.deepEqual(anchor.groupedWords, ['856%']);
});

test('short localized XP fragment falls back to a complete adjacent row token group', () => {
  const sources = [attempt('reward-row-psm11', [
    ['735475@', 479, 706, 566, 614, 84],
    ['13', 735, 789, 566, 614, 50],
    ['036%', 805, 937, 566, 614, 50],
    ['2208%«', 966, 1141, 566, 614, 19],
  ], 11)];
  const context = { imageWidth: 1800, imageHeight: 1000, baseX: 479, rowTop: 550, rowBottom: 620 };
  const xp = findRewardGeometryAnchor('xp', sources, context);
  assert.equal(xp.groupedDigits, '13036');
  assert.deepEqual(xp.groupedWords, ['13', '036%']);
});

test('short localized Credits fragment can group adjacent thousands-row tokens', () => {
  const sources = [attempt('reward-row-psm11', [
    ['828', 481, 564, 566, 614, 91],
    ['719@', 579, 707, 566, 614, 78],
    ['31741+x', 738, 933, 566, 614, 0],
    ['2632%', 962, 1136, 566, 614, 51],
  ], 11)];
  const context = { imageWidth: 1800, imageHeight: 1000, baseX: 481, rowTop: 550, rowBottom: 620 };
  const credits = findRewardGeometryAnchor('credits', sources, context);
  assert.equal(credits.groupedDigits, '828719');
  assert.deepEqual(credits.groupedWords, ['828', '719@']);
});


test('split four-digit Free XP crops retain the full joined token across three widths', () => {
  const context = { imageWidth: 1000, imageHeight: 500, rowTop: 100, rowBottom: 180 };
  const anchor = {
    bbox: { x0: 230, y0: 120, x1: 270, y1: 140 },
    groupBBox: { x0: 215, y0: 120, x1: 270, y1: 140 },
    groupedDigits: '1743', digits: '743', text: '743', groupedText: '1 743',
    groupedWords: ['1', '743'], prefixedLeadingDigit: false, targetX: 230,
  };
  const rects = buildRewardGeometryRects('freeXp', anchor, context);
  assert.equal(rects.length, 3);
  assert.ok(rects[0].rect.width < rects[1].rect.width);
  assert.ok(rects[1].rect.width < rects[2].rect.width);
  const rightLimit = Math.ceil(anchor.groupBBox.x1 + 6);
  assert.ok(rects[0].rect.left + rects[0].rect.width >= anchor.groupBBox.x1 - 6,
    'even the narrowest crop should reach the final numeric glyph');
  assert.ok(rects.every(({ rect }) => rect.left + rect.width <= rightLimit),
    'all variants remain bounded just beyond the grouped token');
});


test('truncated XP prefixes trigger a geometry repair instead of masquerading as full values', () => {
  const anchor = { groupedDigits: '143907', digits: '143907' };
  assert.equal(rewardValueMatchesAnchor('xp', '143', anchor), false,
    'a three-digit prefix must not suppress recovery of a five-digit XP value');
  assert.equal(rewardValueMatchesAnchor('xp', '1439', anchor), false,
    'a four-digit prefix must not suppress recovery of a five-digit XP value');
  assert.equal(rewardValueMatchesAnchor('xp', '14390', anchor), true,
    'only the exact five-digit XP prefix may discard a sixth icon-like glyph');
  assert.equal(rewardValueMatchesAnchor('xp', '143907', anchor), true);
});

test('four-digit XP crop quorum may remove one trailing icon digit from a five-digit anchor', () => {
  const evidence = { reads: 4, geometries: 2, psms: 2 };
  assert.equal(rewardGeometryQuorumCanResolveXpTrailingAdornment('xp', '26534', '2653', evidence), true);
  assert.equal(rewardGeometryQuorumCanResolveXpTrailingAdornment('xp', '66465', '6646', evidence), true,
    'the reported image3 false-acceptance must resolve to 6646 only with an independent four-read geometry/PSM quorum');
  assert.equal(rewardGeometryQuorumCanResolveXpTrailingAdornment('xp', '66465', '6645', evidence), false,
    'a different four-digit value must remain unresolved rather than being guessed');
  assert.equal(rewardGeometryQuorumCanResolveXpTrailingAdornment('xp', '26534', '2653', {
    reads: 3, geometries: 2, psms: 2,
  }), false, 'three reads are not a quorum');
  assert.equal(rewardGeometryQuorumCanResolveXpTrailingAdornment('xp', '26534', '2653', {
    reads: 4, geometries: 1, psms: 2,
  }), false, 'repeated geometry cannot establish an independent quorum');
  assert.equal(rewardGeometryQuorumCanResolveXpTrailingAdornment('xp', '26534', '2653', {
    reads: 4, geometries: 2, psms: 1,
  }), false, 'repeated PSM cannot establish an independent quorum');
  assert.equal(rewardGeometryQuorumCanResolveXpTrailingAdornment('credits', '26534', '2653', evidence), false);
  assert.equal(rewardGeometryQuorumCanResolveXpTrailingAdornment('xp', '143907', '14390', evidence), false,
    'the rule must not weaken the five-digit XP prefix guard for a six-digit anchor');
  assert.equal(rewardGeometryQuorumCanResolveXpTrailingAdornment('xp', '26534', '2652', evidence), false,
    'a non-prefix disagreement stays unresolved');
});

test('prefix mismatches in other reward fields remain repair candidates', () => {
  assert.equal(rewardValueMatchesAnchor('freeXp', '164', { groupedDigits: '1645' }), false);
  assert.equal(rewardValueMatchesAnchor('credits', '82871', { groupedDigits: '828719' }), false);
  assert.equal(rewardValueMatchesAnchor('xp', '405', { groupedDigits: '4056' }), false);
  assert.equal(rewardValueMatchesAnchor('xp', '4059', { groupedDigits: '4059' }), true);
});


test('grouped-only fallback prefers fragmented XP geometry over an overlong whole-row token', () => {
  const sources = [
    attempt('full-screen-psm3', [
      ['317943@', 300, 470], ['26537', 492, 623], ['325%', 644, 744],
    ], 3),
    attempt('reward-row-psm7', [
      ['317943@', 300, 470], ['2', 492, 512], ['653>x', 524, 623], ['325%', 644, 744],
    ], 7),
    attempt('reward-row-psm6', [
      ['317943@', 300, 470], ['2', 492, 512], ['653>x', 524, 623], ['325%', 644, 744],
    ], 6),
  ];
  const context = ctx(1800, 1000, 300);
  const broad = findRewardGeometryAnchor('xp', sources, context);
  assert.equal(broad.groupedDigits, '26537', 'broad OCR can merge the star into a false final digit');
  const fragmented = findRewardGeometryAnchor('xp', sources, context, { requireGrouped: true });
  assert.equal(fragmented.groupedDigits, '2653', 'the split token is a better crop anchor when the localized read is incomplete');
  assert.deepEqual(fragmented.groupedWords, ['2', '653>x']);

  const rects = buildRewardGeometryRects('xp', fragmented, context);
  assert.equal(rects.length, 3);
  assert.ok(rects.every(({ rect }) => rect.left <= 492), 'each variant must start at or before the leading XP fragment');
  assert.ok(rects.every(({ rect }) => rect.left + rect.width >= 600),
    'each variant must extend across the token gap instead of cropping from the isolated `2`');
  assert.ok(rects.every(({ rect }) => rect.left + rect.width < 644),
    'the geometry crop must stop before the adjacent Free XP token');
});

test('a six-digit grouped XP anchor keeps the full measured crop extent but remains invalid as a value', () => {
  const anchor = {
    field: 'xp', source: 'localized-six-digit-split', text: '1 43907', groupedText: '1 43907',
    groupedDigits: '143907', groupedWords: ['1', '43907'], digits: '143907',
    bbox: { x0: 500, y0: 560, x1: 690, y1: 610 },
    groupBBox: { x0: 470, y0: 560, x1: 690, y1: 610 }, targetX: 500,
  };
  const rects = buildRewardGeometryRects('xp', anchor, {
    imageWidth: 2000, imageHeight: 1000, rowTop: 550, rowBottom: 620,
  });
  assert.equal(rects.length, 3);
  assert.ok(rects.some(({ rect }) => rect.left + rect.width >= anchor.bbox.x1),
    'at least one crop must retain the full grouped token extent for independent OCR');
  assert.equal(rewardGeometryValueIsValid('xp', anchor.groupedDigits), false,
    'the crop geometry exception must not widen accepted XP value limits');
});

test('six-digit XP is allowed only as geometry, never as an accepted reward value', () => {
  assert.equal(rewardGeometryAnchorDigitsAreUsable('xp', '14390'), true);
  assert.equal(rewardGeometryAnchorDigitsAreUsable('xp', '143907'), true,
    'a sixth anchor digit may be an adjacent icon; crops will still decide the numeric field');
  assert.equal(rewardGeometryAnchorDigitsAreUsable('xp', '1439078'), false);
  assert.equal(rewardGeometryAnchorDigitsAreUsable('xp', '143'), false);
  assert.equal(rewardGeometryValueIsValid('xp', '143907'), false,
    'an overlong anchor must not pass the actual-value validator');
  assert.equal(rewardGeometryAnchorDigitsAreUsable('credits', '123456789'), true);
  assert.equal(rewardGeometryAnchorDigitsAreUsable('credits', '1234567890'), false);
  assert.equal(rewardGeometryAnchorDigitsAreUsable('freeXp', '12345678'), false);
});

test('split XP geometry keeps adjacent numeric fragments inside two independent crop widths', () => {
  const anchor = {
    field: 'xp',
    source: 'localized-word-geometry-prefix-group',
    text: '13 036%',
    groupedText: '13 036%',
    groupedDigits: '13036',
    groupedWords: ['13', '036%'],
    digits: '13036',
    bbox: { x0: 805, y0: 567, x1: 936, y1: 614 },
    groupBBox: { x0: 735, y0: 567, x1: 936, y1: 614 },
    targetX: 773,
  };
  const rects = buildRewardGeometryRects('xp', anchor, {
    imageWidth: 2560, imageHeight: 1440, rowTop: 560, rowBottom: 620,
  });
  assert.equal(rects.length, 3);
  assert.ok(rects.filter(({ rect }) => rect.left + rect.width >= anchor.groupBBox.x1).length >= 2,
    'at least two widths must reach the final digit of the grouped XP token');
});

test('split Credits geometry can group a short numeric fragment with an adjacent icon-contaminated tail', () => {
  const anchor = findRewardGeometryAnchor('credits', [{
    source: 'localized-word-geometry',
    attempt: { words: [
      { text: '261', confidence: 65, bbox: { x0: 225, y0: 500, x1: 299, y1: 550 } },
      { text: '202©&', confidence: 60, bbox: { x0: 322, y0: 500, x1: 452, y1: 550 } },
    ] },
  }], { imageWidth: 1874, imageHeight: 967, baseX: 225, rowTop: 490, rowBottom: 560 });
  assert.equal(anchor?.groupedDigits, '261202');
  assert.deepEqual(anchor?.groupedWords, ['261', '202©&']);
});

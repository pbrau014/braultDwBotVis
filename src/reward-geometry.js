'use strict';

// Horizontal offsets are measured from the first Credits word, not the overall
// screenshot edge. This accommodates centered score panels while keeping the
// three reward columns separated. The neighboring-token logic below lets one
// logical field span two OCR boxes when Tesseract splits a value (e.g. `2` and
// `653` for XP, or `1` and `645%` for Free XP).
const FIELD_SPECS = Object.freeze({
    credits: { targetOffset: 0, minOffset: -0.025, maxOffset: 0.045, minDigits: 5, maxDigits: 9, minAcceptedDigits: 5, minWidthFraction: 0.075, paddingHeightFraction: 0.25 },
    xp: { targetOffset: 0.115, minOffset: 0.075, maxOffset: 0.165, minDigits: 4, maxDigits: 5, minAcceptedDigits: 1, minWidthFraction: 0.045, paddingHeightFraction: 0.12 },
    freeXp: { targetOffset: 0.21, minOffset: 0.165, maxOffset: 0.285, minDigits: 3, maxDigits: 7, minAcceptedDigits: 1, minWidthFraction: 0.045, paddingHeightFraction: 0.10 },
});

function digitsOnly(value) {
    return String(value ?? '').replace(/\D/g, '');
}

function validBox(word) {
    const box = word?.bbox;
    return Boolean(box && Number.isFinite(Number(box.x0)) && Number.isFinite(Number(box.x1)) &&
        Number.isFinite(Number(box.y0)) && Number.isFinite(Number(box.y1)) &&
        Number(box.x1) > Number(box.x0) && Number(box.y1) > Number(box.y0));
}

function rowWords(sources, context) {
    const imageHeight = Number(context?.imageHeight);
    const rowTop = Number(context?.rowTop);
    const rowBottom = Number(context?.rowBottom);
    if (![imageHeight, rowTop, rowBottom].every(Number.isFinite) || imageHeight <= 0 || rowBottom <= rowTop) return [];
    const verticalMargin = imageHeight * 0.02;
    // Word-level geometry is useful only when the box represents a token or a
    // compact row of tokens. Some OCR passes return an entire panel as one tall
    // word box; its centre can overlap this row and pull the crop across columns.
    const rowHeight = rowBottom - rowTop;
    const maximumTokenHeight = Math.max(imageHeight * 0.08, rowHeight * 1.15);
    const result = [];
    for (const source of sources || []) {
        for (const word of source?.attempt?.words || []) {
            if (!validBox(word) || !digitsOnly(word.text)) continue;
            const boxHeight = Number(word.bbox.y1) - Number(word.bbox.y0);
            const centerY = (Number(word.bbox.y0) + Number(word.bbox.y1)) / 2;
            if (boxHeight > maximumTokenHeight) continue;
            if (centerY < rowTop - verticalMargin || centerY > rowBottom + verticalMargin) continue;
            result.push({
                source: String(source?.name || 'unnamed'),
                psm: source?.attempt?.pageSegmentationMode ?? null,
                text: String(word.text || '').trim(),
                digits: digitsOnly(word.text),
                confidence: Math.max(0, Math.min(100, Number(word.confidence) || 0)),
                bbox: {
                    x0: Number(word.bbox.x0), y0: Number(word.bbox.y0),
                    x1: Number(word.bbox.x1), y1: Number(word.bbox.y1),
                },
                originalWord: word,
                sourceAttempt: source.attempt,
            });
        }
    }
    return result;
}

/** Find the first numeric token in the bounded rewards row; only its x-position is used. */
function findRewardBaseX(sources, context) {
    const words = rowWords(sources, context);
    return words.length ? Math.min(...words.map(word => word.bbox.x0)) : null;
}


/**
 * When OCR cannot locate the reward headings, use the lower portion of the
 * OpenCV reward-band proposal as a geometry-only row window. The proposal is
 * never a value source; independent OCR crops and field validation remain the
 * only acceptance path. The lower band excludes the player/heading rows while
 * retaining the numeric reward line across the supported screenshot layouts.
 */
function buildRewardRowBoundsFromCvRegion(rect, imageHeight) {
    const top = Number(rect?.top);
    const height = Number(rect?.height);
    const screenHeight = Number(imageHeight);
    const bottom = top + height;
    if (![top, height, screenHeight, bottom].every(Number.isFinite) ||
        top < 0 || height <= 0 || screenHeight <= 0 || bottom > screenHeight) return null;
    const rowTop = Math.round(top + height * 0.65);
    const rowBottom = Math.round(bottom - screenHeight * 0.015);
    if (rowBottom <= rowTop || rowBottom - rowTop < screenHeight * 0.01) return null;
    return { top: rowTop, bottom: rowBottom };
}

function fieldAllowsAnchorExtension(spec) {
    // Credits is the leftmost field and is especially vulnerable to grouping the
    // following XP token when an icon is mistaken for punctuation. Keep its
    // groups strict; XP and Free XP may retain one extra anchor digit only.
    return spec !== FIELD_SPECS.credits;
}

function neighborGroup(candidate, words, spec, context) {
    const imageWidth = Number(context.imageWidth);
    const imageHeight = Number(context.imageHeight);
    const maxGap = spec === FIELD_SPECS.credits
        ? Math.max(imageWidth * 0.018, imageHeight * 0.032)
        : Math.max(imageWidth * 0.0095, imageHeight * 0.018);
    const sameRowTolerance = Math.max(imageHeight * 0.012, (candidate.bbox.y1 - candidate.bbox.y0) * 0.65);
    let groupWords = [candidate];
    let digits = candidate.digits;
    let x1 = candidate.bbox.x1;
    let prefixedLeadingDigit = false;

    // Some reward rows split Free XP as a standalone leading digit plus the
    // remaining token (for example `2` + `856%`). Recognize this only when the
    // right-hand token is already in the Free-XP target column, the preceding
    // one-digit token is on the same baseline, and the gap is small. The joined
    // value is still only used to position independent whitelist crops; OCR crop
    // consensus remains the sole acceptance mechanism.
    if (spec === FIELD_SPECS.freeXp && candidate.digits.length >= spec.minDigits &&
        candidate.digits.length <= spec.maxDigits && Number.isFinite(imageWidth) && imageWidth > 0) {
        const baseX = Number(context?.baseX);
        const targetX = Number.isFinite(baseX) ? baseX + imageWidth * spec.targetOffset : NaN;
        const minX = Number.isFinite(baseX) ? baseX + imageWidth * spec.minOffset : NaN;
        const candidateCenterY = (candidate.bbox.y0 + candidate.bbox.y1) / 2;
        const targetAligned = Number.isFinite(targetX) && Math.abs(candidate.bbox.x0 - targetX) <= imageWidth * 0.022;
        if (targetAligned) {
            const prefix = words
                .filter(word => word.source === candidate.source && word !== candidate &&
                    /^\d$/.test(word.digits) && word.bbox.x1 <= candidate.bbox.x0 &&
                    candidate.bbox.x0 - word.bbox.x1 <= maxGap && word.bbox.x0 >= minX &&
                    Math.abs(word.bbox.x0 - targetX) <= imageWidth * 0.022 &&
                    Math.abs(((word.bbox.y0 + word.bbox.y1) / 2) - candidateCenterY) <= sameRowTolerance)
                .sort((a, b) => b.bbox.x1 - a.bbox.x1)[0];
            if (prefix) {
                groupWords.unshift(prefix);
                digits = `${prefix.digits}${digits}`;
                prefixedLeadingDigit = true;
            }
        }
    }

    let changed = true;
    while (changed) {
        changed = false;
        const next = words
            .filter(word => word.source === candidate.source && !groupWords.includes(word) &&
                word.bbox.x0 >= x1 && word.bbox.x0 - x1 <= maxGap &&
                Math.abs(((word.bbox.y0 + word.bbox.y1) / 2) - ((candidate.bbox.y0 + candidate.bbox.y1) / 2)) <= sameRowTolerance)
            .sort((a, b) => a.bbox.x0 - b.bbox.x0)[0];
        if (!next) break;
        // A complete field must never absorb a neighbouring reward column.
        // Only join adjacent tokens when this token is too short to be a valid
        // value on its own (split thousands groups such as `511` + `113@`).
        // XP/Free-XP anchors may retain one extra digit for crop positioning,
        // but Credits cannot exceed its documented maximum during grouping.
        const alreadyPlausible = digits.length >= spec.minDigits && digits.length <= spec.maxDigits;
        if (alreadyPlausible) break;
        const combined = digits + next.digits;
        const groupingLimit = spec.maxDigits + (fieldAllowsAnchorExtension(spec) ? 1 : 0);
        if (combined.length > groupingLimit) break;
        groupWords.push(next);
        digits = combined;
        x1 = next.bbox.x1;
        changed = true;
    }
    const bbox = {
        x0: Math.min(...groupWords.map(word => word.bbox.x0)),
        y0: Math.min(...groupWords.map(word => word.bbox.y0)),
        x1: Math.max(...groupWords.map(word => word.bbox.x1)),
        y1: Math.max(...groupWords.map(word => word.bbox.y1)),
    };
    return {
        digits, bbox, text: groupWords.map(word => word.text).join(' '),
        words: groupWords.map(word => word.text), prefixedLeadingDigit,
    };
}

/**
 * Locate a likely numeric field by horizontal location and OCR word geometry.
 * OCR text is used only to position crops. Returned token values are never
 * accepted as field values; the caller must obtain independent crop consensus.
 */
function findRewardGeometryAnchor(field, sources, context, options = {}) {
    const spec = FIELD_SPECS[field];
    if (!spec) throw new TypeError(`Unknown reward field: ${field}`);
    const baseX = Number(context?.baseX);
    const imageWidth = Number(context?.imageWidth);
    const imageHeight = Number(context?.imageHeight);
    if (![baseX, imageWidth, imageHeight].every(Number.isFinite) || imageWidth <= 0 || imageHeight <= 0) return null;

    const targetX = baseX + imageWidth * spec.targetOffset;
    const minX = baseX + imageWidth * spec.minOffset;
    const maxX = baseX + imageWidth * spec.maxOffset;
    const words = rowWords(sources, context);
    const candidates = [];
    for (const word of words) {
        if (word.bbox.x0 < minX || word.bbox.x0 > maxX) continue;
        const grouped = neighborGroup(word, words, spec, context);
        if (options.requireGrouped === true && grouped.words.length < 2) continue;
        const length = word.digits.length;
        let lengthPenalty = 0;
        if (length < spec.minDigits) lengthPenalty = 26 + (spec.minDigits - length) * 7;
        else if (length > spec.maxDigits) lengthPenalty = 28 + (length - spec.maxDigits) * 8;
        else if (field === 'xp' && length === 6) lengthPenalty = 2;
        const splitBonus = grouped.words.length > 1 ? 22 : 0;
        const confidencePenalty = Math.max(0, 55 - word.confidence) * 0.08;
        const distance = Math.abs(word.bbox.x0 - targetX);
        candidates.push({
            field,
            source: word.source,
            psm: word.psm,
            text: word.text,
            digits: word.digits,
            groupedText: grouped.text,
            groupedDigits: grouped.digits,
            groupedWords: grouped.words,
            prefixedLeadingDigit: grouped.prefixedLeadingDigit === true,
            bbox: word.bbox,
            groupBBox: grouped.bbox,
            confidence: word.confidence,
            score: distance + lengthPenalty + confidencePenalty - splitBonus,
            targetX,
        });
    }
    candidates.sort((a, b) => a.score - b.score || b.confidence - a.confidence || a.bbox.x0 - b.bbox.x0);
    return candidates[0] || null;
}

/** Build three nearby width variants around an OCR-geometry-derived anchor. */
function buildRewardGeometryRects(field, anchor, context) {
    const spec = FIELD_SPECS[field];
    if (!spec || !anchor?.bbox) return [];
    const imageWidth = Number(context?.imageWidth);
    const imageHeight = Number(context?.imageHeight);
    const rowTop = Number(context?.rowTop);
    const rowBottom = Number(context?.rowBottom);
    if (![imageWidth, imageHeight, rowTop, rowBottom].every(Number.isFinite) || imageWidth <= 0 || imageHeight <= 0) return [];

    const box = anchor.groupBBox || anchor.bbox;
    const boxWidth = Math.max(1, box.x1 - box.x0);
    const boxHeight = Math.max(1, box.y1 - box.y0);
    const digits = String(anchor.groupedDigits || anchor.digits || '');
    const groupedWords = Array.isArray(anchor.groupedWords) ? anchor.groupedWords : [];
    const groupedXpToken = field === 'xp' && groupedWords.length > 1;
    const groupedFreeXpToken = field === 'freeXp' && groupedWords.length > 1;
    let targetFraction = 1;
    if ((groupedXpToken && digits.length <= spec.maxDigits + 1) ||
        (groupedFreeXpToken && digits.length <= spec.maxDigits)) {
        // Split reward tokens need their full measured extent. A character-ratio
        // crop around `13` + `036%` or `2` + `856%` cuts off trailing digits.
        targetFraction = 1;
    } else if (field !== 'credits' && digits.length > spec.maxDigits) {
        targetFraction = spec.maxDigits / digits.length;
    } else {
        // An OCR token sometimes ends with a medal/coin glyph misread as another
        // character (for example `4059+`, `325%`, or `540180@`). Use that token's
        // numeric-to-text ratio to keep crop variants on the number, not the icon.
        // Credits can be split across adjacent OCR boxes (e.g. `828` + `719@`).
        // Use the grouped text to see the trailing adornment, but do not shrink a
        // multi-box crop as aggressively as a single word: the inter-token gap is
        // part of its geometry and an exact-width ratio can clip the final digit.
        // For XP/Free XP, preserve their established grouped-token crop extents.
        const tokenText = String(field === 'credits' && groupedWords.length > 1
            ? (anchor.groupedText || anchor.text || '')
            : (anchor.text || '')).trim();
        const tokenDigits = digitsOnly(tokenText);
        const tokenWidth = tokenText.replace(/\s/g, '').length;
        const hasTrailingAdornment = /[^\d\s,.'’`]+$/u.test(tokenText);
        if (hasTrailingAdornment && tokenDigits.length === digits.length && tokenWidth > tokenDigits.length) {
            const rawFraction = tokenDigits.length / tokenWidth;
            const adornmentFraction = Math.max(0.90, rawFraction);
            targetFraction = Math.min(targetFraction, adornmentFraction);
        }
    }

    const splitFourDigitFreeXp = field === 'freeXp' && digits.length === 4 &&
        ((Array.isArray(anchor.groupedWords) && anchor.groupedWords.length > 1) || /\s/.test(String(anchor.groupedText || '')));
    if (anchor.prefixedLeadingDigit || splitFourDigitFreeXp) {
        // The combined Free-XP box includes a small inter-token gap. Use three
        // bounded crops that retain both the leading fragment and the full right
        // token. Keep their right edges just beyond the measured group box so the
        // following medal/count cannot be absorbed as another digit.
        const left = Math.max(0, Math.floor(box.x0 - imageWidth * 0.002));
        const rightLimit = Math.min(imageWidth, Math.ceil(box.x1 + imageWidth * 0.006));
        const targetWidth = Math.max(5, rightLimit - left);
        const top = Math.max(0, Math.floor(box.y0 - boxHeight * 0.14));
        const verticalMargin = Math.max(5, imageHeight * 0.02);
        const safeBottom = Math.min(imageHeight, Math.max(
            rowBottom + verticalMargin,
            box.y1 + Math.max(2, boxHeight * 0.06),
        ));
        const requestedBottom = Math.max(
            top + Math.ceil(boxHeight * 1.30),
            box.y1 + Math.max(2, boxHeight * 0.06),
        );
        const height = Math.max(5, Math.min(
            Math.ceil(requestedBottom - top), Math.ceil(safeBottom - top), Math.ceil(imageHeight - top),
        ));
        const fractions = splitFourDigitFreeXp ? [0.92, 0.95, 0.98] : [0.90, 0.95, 1.00];
        return fractions.map((fraction, geometryIndex) => ({
            geometryIndex,
            rect: {
                left,
                top: Math.max(0, Math.min(top, imageHeight - 1)),
                width: Math.max(5, Math.min(Math.round(targetWidth * fraction), rightLimit - left, imageWidth - left)),
                height,
            },
        }));
    }

    // A short XP anchor can be shifted right because its leading glyph was
    // split into a preceding OCR word. Only four-digit fragments use this narrow
    // target-aligned rescue; a five-digit anchor keeps its measured box so crop
    // widths can decide whether the last glyph is an icon artifact.
    const misalignedXpAnchor = field === 'xp' && digits.length === 4 &&
        groupedWords.length <= 1 && Number.isFinite(Number(anchor.targetX)) &&
        box.x0 - Number(anchor.targetX) > imageWidth * 0.006;
    const nearXpTarget = field === 'xp' && Number.isFinite(Number(anchor.targetX)) &&
        Math.abs(box.x0 - Number(anchor.targetX)) <= imageWidth * 0.015;
    const nearFreeXpTarget = field === 'freeXp' && Number.isFinite(Number(anchor.targetX)) &&
        Math.abs(box.x0 - Number(anchor.targetX)) <= imageWidth * 0.015;
    const nominalLeft = box.x0 - imageWidth * (field === 'xp'
        ? (nearXpTarget ? 0.010 : 0.003)
        : field === 'freeXp' ? (nearFreeXpTarget ? 0.012 : 0.004) : 0.004);
    const alignedXpLeft = Number(anchor.targetX) - imageWidth * 0.01;
    const left = Math.max(0, Math.floor(misalignedXpAnchor
        ? Math.min(nominalLeft, alignedXpLeft)
        : nominalLeft));
    let baseWidth = boxWidth * targetFraction + boxHeight * spec.paddingHeightFraction;
    baseWidth = Math.max(baseWidth, imageWidth * spec.minWidthFraction);
    baseWidth += Math.max(0, box.x0 - left);
    if (misalignedXpAnchor) {
        // Include a split one/two-digit prefix at the left, but keep the right edge
        // before the Free-XP column. Three tightly spaced widths probe the full XP
        // digits while excluding the adjacent medal glyph.
        const prefixBaseWidth = Math.max(5,
            boxWidth * targetFraction + boxHeight * spec.paddingHeightFraction + Math.max(0, box.x0 - left));
        const top = Math.max(0, Math.floor(box.y0 - boxHeight * 0.14));
        const height = Math.max(5, Math.min(
            Math.ceil(Math.max(boxHeight * 1.30, box.y1 - top + boxHeight * 0.06)),
            Math.ceil(rowBottom + Math.max(5, imageHeight * 0.02) - top),
            Math.ceil(imageHeight - top),
        ));
        return [0.84, 0.86, 0.88].map((fraction, geometryIndex) => ({
            geometryIndex,
            rect: {
                left,
                top: Math.max(0, Math.min(top, imageHeight - 1)),
                width: Math.max(5, Math.min(Math.round(prefixBaseWidth * fraction), imageWidth - left)),
                height,
            },
        }));
    }
    // Use meaningfully separated, slightly narrow variants. In regression traces,
    // the previous 0.93/1.00/1.035 variants allowed two wider crops to agree on
    // an appended icon digit while the narrowest crop correctly read the number.
    // Schlieffen Credits is a single numeric token followed by a medal glyph;
    // narrower spacing keeps two independent crop widths from both swallowing
    // the adjacent icon as a spurious trailing zero. Consensus requirements and
    // accepted numeric bounds are unchanged.
    const creditToken = String(anchor.groupedText || anchor.text || '').trim();
    const creditTokenDigits = digitsOnly(anchor.groupedDigits || anchor.digits || creditToken);
    const hasCreditAdornment = field === 'credits' && /[^\d\s,.'’`]+$/u.test(creditToken) &&
        digitsOnly(creditToken).length === creditTokenDigits.length &&
        creditToken.replace(/\s/g, '').length > creditTokenDigits.length;
    const singleWordCreditAdornment = hasCreditAdornment && !/\s/.test(creditToken);
    // For a split Credits token such as `828` + `719@`, the broad word box spans
    // both numeric fragments and the coin icon. Keep all three crop widths tightly
    // clustered near the numeric glyph boundary so at least two independent widths
    // can agree without consistently ingesting the coin as an extra digit.
    const splitCreditAdornment = hasCreditAdornment && groupedWords.length > 1;
    const singleWordRewardAdornment = field === 'freeXp' && groupedWords.length <= 1 &&
        /[^\d\s,.'’`]+$/u.test(String(anchor.groupedText || anchor.text || '')) &&
        digitsOnly(String(anchor.groupedText || anchor.text || '')).length === digits.length;
    const singleWordFiveDigitXp = field === 'xp' && groupedWords.length <= 1 && digits.length === 5;
    const singleWordFourDigitXp = field === 'xp' && groupedWords.length <= 1 && digits.length === 4;
    const xpOffset = Number(box.x0) - Number(anchor.targetX);
    const fractions = singleWordCreditAdornment ? [0.86, 0.88, 0.90]
        : splitCreditAdornment ? [0.86, 0.87, 0.88]
            // Grouped XP tokens may be split across adjoining OCR boxes.
            // Two independent crop widths must span the measured right edge,
            // while selected values remain governed by the strict validators.
            : groupedXpToken ? [0.98, 1.00, 1.02]
                : singleWordRewardAdornment ? [0.82, 0.83, 0.96]
                    : singleWordFiveDigitXp ? (xpOffset > 0 ? [0.85, 0.87, 0.96] : [0.82, 0.84, 0.96])
                        : singleWordFourDigitXp ? [0.82, 0.84, 0.96]
                            : [0.86, 0.91, 0.96];
    const top = Math.max(0, Math.floor(box.y0 - boxHeight * 0.14));
    // The detected performance-heading boundary can overlap the lower part of
    // the reward glyphs (for example, Free XP `1645%` reaches y=433 while the
    // heading boundary is y=419). Clamping the crop to rowBottom cuts off the
    // digits and leaves every OCR mode seeing only a fragment. Extend only by
    // the same small row margin used when admitting word boxes, and always far
    // enough to retain the selected anchor itself.
    const verticalMargin = Math.max(5, imageHeight * 0.02);
    const safeBottom = Math.min(imageHeight, Math.max(
        rowBottom + verticalMargin,
        box.y1 + Math.max(2, boxHeight * 0.06),
    ));
    const requestedBottom = Math.max(
        top + Math.ceil(boxHeight * 1.30),
        box.y1 + Math.max(2, boxHeight * 0.06),
    );
    const height = Math.max(5, Math.min(
        Math.ceil(requestedBottom - top),
        Math.ceil(safeBottom - top),
        Math.ceil(imageHeight - top),
    ));
    if (misalignedXpAnchor && Number.isFinite(Number(anchor.targetX))) {
        // Probe two bounded XP crops with distinct left edges and widths. The
        // narrow target-aligned crop avoids the neighboring star; the second
        // crop includes additional context but still ends before the Free XP
        // column. A third wider crop remains a disagreement detector, not a
        // preferred value. Values still need the existing 4-read/2-width/2-PSM
        // quorum, so a single lucky crop cannot set XP.
        const leftA = Math.max(0, Math.floor(Number(anchor.targetX) - imageWidth * 0.029));
        const leftB = Math.max(0, Math.floor(Number(anchor.targetX) - imageWidth * 0.020));
        const variants = [
            { left: leftA, width: Math.round(imageWidth * 0.0722) },
            { left: leftB, width: Math.round(imageWidth * 0.0778) },
            { left: leftB, width: Math.round(imageWidth * 0.0828) },
        ];
        return variants.map((variant, geometryIndex) => ({
            geometryIndex,
            rect: {
                left: variant.left,
                top: Math.max(0, Math.min(top, imageHeight - 1)),
                width: Math.max(5, Math.min(variant.width, imageWidth - variant.left)),
                height,
            },
        }));
    }
    return fractions.map((fraction, geometryIndex) => ({
        geometryIndex,
        rect: {
            left,
            top: Math.max(0, Math.min(top, imageHeight - 1)),
            width: Math.max(5, Math.min(Math.round(baseWidth * fraction), imageWidth - left)),
            height,
        },
    }));
}

function rewardGeometryValueIsValid(field, value) {
    const spec = FIELD_SPECS[field];
    if (!spec) throw new TypeError(`Unknown reward field: ${field}`);
    const digits = digitsOnly(value);
    return digits.length >= spec.minAcceptedDigits && digits.length <= spec.maxDigits;
}

/**
 * Validate an OCR geometry token used only to place numeric crops. XP may carry
 * one extra geometry digit because the result-screen star icon can be merged
 * into the last token; the cropped value itself still uses the stricter
 * rewardGeometryValueIsValid() limit.
 */
function rewardGeometryAnchorDigitsAreUsable(field, value) {
    const spec = FIELD_SPECS[field];
    if (!spec) throw new TypeError(`Unknown reward field: ${field}`);
    const length = digitsOnly(value).length;
    const maxGeometryDigits = spec.maxDigits + (field === 'xp' ? 1 : 0);
    return length >= spec.minDigits && length <= maxGeometryDigits;
}

/**
 * Decide whether a localized reward read is adequately explained by its row
 * geometry anchor. A prefix match is not sufficient evidence for a clipped
 * token: e.g. `143` must not be considered equivalent to `143907`, because
 * doing so suppresses the independent crop sweep that can recover the XP value.
 *
 * The only retained prefix exception is the documented XP case where a full
 * five-digit candidate is the exact prefix of a six-digit geometry token. XP is
 * bounded to five accepted digits, so the sixth glyph may be an adjacent icon.
 */
function rewardValueMatchesAnchor(field, currentValue, anchor) {
    const current = digitsOnly(currentValue);
    const anchorDigits = digitsOnly(anchor?.groupedDigits || anchor?.digits || '');
    if (!current || !anchorDigits) return false;
    if (current === anchorDigits) return true;
    if (field === 'xp' && anchorDigits.length === 6 &&
        current.length === 5 && current === anchorDigits.slice(0, 5)) return true;
    return false;
}

/**
 * A narrow repair for an XP row where the geometry anchor has absorbed the
 * medal/star glyph immediately after the real value. This is deliberately
 * limited to a five-digit anchor plus one trailing digit, with a four-digit
 * numeric crop quorum that spans multiple rectangles and segmentation modes.
 * It never broadens the accepted XP range or permits a generic prefix guess.
 */
function rewardGeometryQuorumCanResolveXpTrailingAdornment(field, anchorValue, cropValue, evidence = {}) {
    if (field !== 'xp') return false;
    const anchorDigits = digitsOnly(anchorValue);
    const cropDigits = digitsOnly(cropValue);
    if (anchorDigits.length !== 5 || cropDigits.length !== 4 || !anchorDigits.startsWith(cropDigits)) {
        return false;
    }
    return Number(evidence.reads) >= 4 &&
        Number(evidence.geometries) >= 2 &&
        Number(evidence.psms) >= 2;
}

module.exports = {
    FIELD_SPECS,
    buildRewardRowBoundsFromCvRegion,
    findRewardBaseX,
    findRewardGeometryAnchor,
    buildRewardGeometryRects,
    rewardGeometryValueIsValid,
    rewardGeometryAnchorDigitsAreUsable,
    rewardValueMatchesAnchor,
    rewardGeometryQuorumCanResolveXpTrailingAdornment,
};

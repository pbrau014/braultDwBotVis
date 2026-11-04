'use strict';

function normaliseOcrNumber(value) {
    // Return ungrouped digits for Discord output: “899 836” becomes “899836”.
    // This is only called after a numeric field has been isolated.
    return String(value || '').replace(/[^0-9]/g, '');
}

function extractNumberTokens(text) {
    // Keep spaces/punctuation only when they are thousands separators.
    return (String(text || '').match(/\d+(?:[ ,.']\d{3})*/g) || [])
        .map((token) => normaliseOcrNumber(token))
        .filter(Boolean);
}

function extractRewardGroups(section, correctedCreditChunk = '') {
    // Common OCR output includes “899 836@ 3 776☆ 1 596☆”.
    // A focused OCR re-read can supply correctedCreditChunk when the coin icon
    // next to Credits is mistaken for a digit (e.g. “8369” instead of “836”).
    const tokens = String(section || '').match(/\d+/g) || [];
    if (
        correctedCreditChunk &&
        /^\d{3}$/.test(correctedCreditChunk) &&
        tokens.length >= 2 &&
        /^\d{3,4}$/.test(tokens[1])
    ) {
        tokens[1] = correctedCreditChunk;
    }

    const groups = [];
    for (let i = 0; i < tokens.length; i += 1) {
        let value = tokens[i];
        if (value.length <= 3 && i + 1 < tokens.length && tokens[i + 1].length === 3) {
            value += tokens[i + 1];
            i += 1;
        }
        groups.push(normaliseOcrNumber(value));
    }
    return groups.filter(Boolean);
}

function extractFocusedRewards(text, correctedCreditChunk = '') {
    // Parse the first three reward columns without shifting values when OCR
    // splits thousands groups. Standard grouping permits “1 650 259”; some OCR
    // outputs collapse a group and produce “1 237152”, which is also handled.
    const tokens = String(text || '').match(/\d+/g) || [];
    if (correctedCreditChunk && /^\d{3}$/.test(correctedCreditChunk) && tokens.length >= 2 && /^\d{3,4}$/.test(tokens[1])) {
        tokens[1] = correctedCreditChunk;
    }
    const valid = (value, field) => field === 0
        ? /^\d{5,8}$/.test(value)
        : field === 1
            ? /^\d{2,7}$/.test(value)
            : /^\d{1,7}$/.test(value);
    const candidates = [];
    function search(index, values, consumed) {
        if (values.length === 3) {
            candidates.push({ values, consumed });
            return;
        }
        if (index >= tokens.length) return;
        let joined = '';
        for (let end = index; end < Math.min(tokens.length, index + 4); end += 1) {
            const part = tokens[end];
            if (end > index) {
                const prior = tokens[end - 1];
                const isThousandsContinuation = /^\d{3}$/.test(part) && (end === index + 1 || /^\d{1,3}$/.test(prior));
                const isCollapsedFirstReward = values.length === 0 && end === index + 1 && /^\d$/.test(tokens[index]) && /^\d{4,6}$/.test(part);
                if (!isThousandsContinuation && !isCollapsedFirstReward) break;
            }
            joined += part;
            if (valid(joined, values.length)) search(end + 1, [...values, joined], end + 1);
        }
    }
    search(0, [], 0);
    if (!candidates.length) return null;
    // Prefer the candidate consuming the most tokens when the extra tokens form
    // a valid thousands group (e.g. free XP “2 110”); unrelated medal counts are
    // not joined because their token lengths do not fit the thousands pattern.
    candidates.sort((a, b) => b.consumed - a.consumed);
    const [credits, xp, freeXp] = candidates[0].values;
    return { credits, xp, freeXp };
}

function parseLocalizedNumericField(text, field) {
    // Called only on a tightly cropped numeric column. Do not pull trailing
    // digits from adjacent UI symbols/columns into an otherwise valid reward.
    const limits = field === 'credits'
        ? { min: 5, max: 9 }
        : field === 'xp'
            // OCR-only XP is intentionally limited to five digits. Six/seven-digit
            // candidates are sent to manual correction instead of being accepted
            // as a plausible-looking concatenation of XP plus a nearby glyph.
            ? { min: 1, max: 5 }
            : field === 'freeXp'
                ? { min: 1, max: 7 }
                : null;
    if (!limits) throw new TypeError(`Unknown localized numeric field: ${field}`);
    const tokens = String(text || '').match(/\d+/g) || [];
    const possibilities = [];
    for (let start = 0; start < tokens.length; start += 1) {
        const token = tokens[start];
        if (token.length >= limits.min && token.length <= limits.max) {
            possibilities.push({ value: token, span: 1 });
        }
        // Reassemble conventional thousands groups such as `1 650 259`,
        // `14 390`, or `2 110`, but never append an arbitrary adjacent digit.
        if (!/^\d{1,3}$/.test(token)) continue;
        let joined = token;
        for (let end = start + 1; end < Math.min(tokens.length, start + 3); end += 1) {
            if (!/^\d{3}$/.test(tokens[end])) break;
            joined += tokens[end];
            if (joined.length >= limits.min && joined.length <= limits.max) {
                possibilities.push({ value: joined, span: end - start + 1 });
            }
            if (joined.length >= limits.max) break;
        }
    }
    if (!possibilities.length) return '';
    // Accept the OCR text only when one conventional number/grouping accounts
    // for every numeric token. Never select the longest token from a crop that
    // contains two separate values (e.g. XP `4509` and Free XP `608`).
    const complete = possibilities.filter(candidate => candidate.span === tokens.length && candidate.value.length >= limits.min && candidate.value.length <= limits.max);
    const values = [...new Set(complete.map(candidate => candidate.value))];
    return values.length === 1 ? values[0] : '';
}


function rewardFieldLimits(field) {
    return field === 'credits' ? { min: 5, max: 9 }
        : field === 'xp' ? { min: 1, max: 5 }
            : field === 'freeXp' ? { min: 1, max: 7 } : null;
}

/**
 * Whether an OCR reward value has independent support outside the isolated crop.
 * A single high-confidence broad candidate is useful to trigger a narrow re-read;
 * otherwise two distinct segmentation/source identifiers must agree. This helper
 * does not accept or set a value; the caller still requires crop consensus.
 */
function hasIndependentRewardFieldValueSupport(field, value, candidates = []) {
    const limits = rewardFieldLimits(field);
    if (!limits) throw new TypeError(`Unknown localized numeric field: ${field}`);
    const target = normaliseOcrNumber(value);
    if (target.length < limits.min || target.length > limits.max) return false;
    const matching = (candidates || []).filter((candidate) => {
        const candidateValue = normaliseOcrNumber(candidate?.[field]);
        return candidateValue === target && candidateValue.length >= limits.min && candidateValue.length <= limits.max;
    });
    if (matching.some((candidate) => (Number(candidate.confidence) || 0) >= 75)) return true;
    const sources = new Set(matching.map((candidate) => candidate.source ?? candidate.pageSegmentationMode)
        .filter((source) => source !== undefined && source !== null && String(source).trim() !== '')
        .map(String));
    return sources.size >= 2;
}

/** True when a differently valued reward field is independently corroborated. */
function hasIndependentRewardFieldConflict(field, currentValue, candidates = []) {
    const current = normaliseOcrNumber(currentValue);
    return (candidates || []).some((candidate) => {
        const value = normaliseOcrNumber(candidate?.[field]);
        return value && value !== current && hasIndependentRewardFieldValueSupport(field, value, candidates);
    });
}

/** True when a one-digit prefix/extension conflict has independent support. */
function hasIndependentRewardFieldPrefixConflict(field, currentValue, candidates = []) {
    const current = normaliseOcrNumber(currentValue);
    if (!current) return false;
    return (candidates || []).some((candidate) => {
        const value = normaliseOcrNumber(candidate?.[field]);
        if (!value || value === current) return false;
        const oneDigitPrefixConflict =
            (current.length === value.length + 1 && current.startsWith(value)) ||
            (value.length === current.length + 1 && value.startsWith(current));
        return oneDigitPrefixConflict && hasIndependentRewardFieldValueSupport(field, value, candidates);
    });
}

function selectLocalizedRewardValue(field, localizedValues = [], legacyValues = []) {
    const limits = field === 'credits' ? { min: 5, max: 9 }
        : field === 'xp' ? { min: 1, max: 5 }
            : field === 'freeXp' ? { min: 1, max: 7 } : null;
    if (!limits) throw new TypeError(`Unknown localized numeric field: ${field}`);
    const valid = value => {
        const digits = normaliseOcrNumber(value);
        return /^\d+$/.test(digits) && digits.length >= limits.min && digits.length <= limits.max ? digits : '';
    };
    const local = localizedValues.map(valid).filter(Boolean);
    // XP is especially vulnerable to a nearby star/icon being interpreted as a
    // digit. Never fall back to the legacy broad reward band for XP: the two
    // isolated column reads must agree, or the value must be corrected manually.
    if (field === 'xp') return local.length >= 2 && new Set(local).size === 1 ? local[0] : '';

    // Credits and Free XP may contain a similar-looking leading digit in one
    // PSM. Allow a strict majority only when at least one localized read supports
    // that value; legacy candidates alone can never establish acceptance.
    const votes = [...local, ...legacyValues.map(valid).filter(Boolean)];
    const counts = new Map();
    for (const value of votes) counts.set(value, (counts.get(value) || 0) + 1);
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (!ranked.length || ranked[0][1] < 2) return '';
    if (ranked[1] && ranked[1][1] === ranked[0][1]) return '';
    if (!local.includes(ranked[0][0])) return '';
    return ranked[0][0];
}

/**
 * Recover a clipped Credits crop only when a longer one-digit extension is
 * independently supported by a high-confidence isolated column read and two
 * distinct broad OCR sources. This prevents an over-tight word-box crop from
 * dropping a true final digit without trusting a longer candidate solely because
 * it exists or has a higher confidence score.
 */
function reconcileCreditPrefix(selectedValue, localizedReads = [], broadCandidates = [], rawWordCandidates = []) {
    const current = normaliseOcrNumber(selectedValue);
    if (!/^\d{5,8}$/.test(current)) return { value: current, recovered: false, supportingSources: [] };
    const extensions = new Map();
    for (const read of localizedReads || []) {
        const value = normaliseOcrNumber(read?.value);
        if (!/^\d{5,9}$/.test(value) || value.length !== current.length + 1 || !value.startsWith(current) || (Number(read?.confidence) || 0) < 75) continue;
        const group = extensions.get(value) || { value, localizedSources: new Set(), broadSources: new Set(), geometrySources: new Set() };
        group.localizedSources.add(`localized-psm-${read.psm ?? 'unknown'}`);
        extensions.set(value, group);
    }
    for (const candidate of broadCandidates || []) {
        const value = normaliseOcrNumber(candidate?.credits);
        // Lower-confidence broad reads may contribute only when two distinct
        // segmentation modes agree; they cannot override an isolated value alone.
        if (!/^\d{5,9}$/.test(value) || value.length !== current.length + 1 || !value.startsWith(current) || (Number(candidate?.confidence) || 0) < 20) continue;
        const group = extensions.get(value) || { value, localizedSources: new Set(), broadSources: new Set(), geometrySources: new Set() };
        group.broadSources.add(`broad-${candidate.source ?? candidate.pageSegmentationMode ?? 'unknown'}`);
        extensions.set(value, group);
    }
    // When the localized crop demonstrably clips the final digit, an independently
    // OCR-derived reward-band word may preserve it. The raw token must be exactly
    // one digit longer and terminate in a non-digit UI glyph (coin/icon bleed); it
    // must also be corroborated by two broad PSM reads. This does not apply to
    // values such as Schlieffen's `317943@`, whose digits already equal the crop.
    for (const token of rawWordCandidates || []) {
        const text = String(token?.text || '');
        const match = text.match(/^(\d{5,9})(?:[^\d]+)$/);
        if (!match) continue;
        const value = match[1];
        if (value.length !== current.length + 1 || !value.startsWith(current)) continue;
        const group = extensions.get(value) || { value, localizedSources: new Set(), broadSources: new Set(), geometrySources: new Set() };
        group.geometrySources.add(`reward-band-${token?.psm ?? 'geometry'}-${Math.round(Number(token?.bbox?.x0) || 0)}`);
        extensions.set(value, group);
    }
    const eligible = [...extensions.values()].filter(group =>
        group.broadSources.size >= 2 && (
            group.localizedSources.size >= 1 ||
            group.geometrySources.size >= 1
        ));
    if (eligible.length !== 1) return { value: current, recovered: false, supportingSources: [] };
    const winner = eligible[0];
    return {
        value: winner.value,
        recovered: true,
        supportingSources: [...winner.localizedSources, ...winner.geometrySources, ...winner.broadSources],
    };
}

/**
 * Select a complete reward tuple only when independent, complete OCR reads agree.
 * This is a recovery path for layouts where a coin/star glyph splits one reward
 * into two adjacent OCR words and shifts the following values into the wrong
 * columns. It is deliberately disabled when reads disagree or any field is
 * malformed. A tuple is only used when isolated-field parsing is incomplete.
 */
function selectConsistentRewardTuple(candidates = []) {
    const groups = new Map();
    for (let index = 0; index < (candidates || []).length; index += 1) {
        const candidate = candidates[index];
        if (!candidate || typeof candidate !== 'object') continue;
        const credits = normaliseOcrNumber(candidate.credits);
        const xp = normaliseOcrNumber(candidate.xp);
        const freeXp = normaliseOcrNumber(candidate.freeXp);
        if (!/^\d{5,9}$/.test(credits) || !/^\d{1,5}$/.test(xp) || !/^\d{1,7}$/.test(freeXp)) continue;
        const key = `${credits}|${xp}|${freeXp}`;
        const group = groups.get(key) || { values: { credits, xp, freeXp }, sources: new Set(), reads: [] };
        const source = candidate.source ?? candidate.pageSegmentationMode ?? `candidate-${index}`;
        group.sources.add(String(source));
        group.reads.push({ source: String(source), confidence: Number(candidate.confidence) || 0 });
        groups.set(key, group);
    }
    const eligible = [...groups.values()].filter(group => group.sources.size >= 2);
    if (eligible.length !== 1) return null;
    const selected = eligible[0];
    return {
        ...selected.values,
        source: 'independent-complete-tuple-consensus',
        supportingSources: [...selected.sources],
        supportingReads: selected.reads,
    };
}

function extractFocusedDamage(text) {
    const firstLine = String(text || '').split(/\r?\n/).map((line) => line.trim()).find(Boolean) || '';
    // Prefer explicit thousands groups so adjacent ribbon counts/icons cannot be
    // appended to Damage. If OCR strips the separator entirely, accept a plain
    // 5–9 digit token from this Damage-only crop.
    const grouped = firstLine.match(/(?<!\d)\d{1,3}(?:[\s,.']\d{3})+(?!\d)/);
    if (grouped) return normaliseOcrNumber(grouped[0]);
    const plain = firstLine.match(/(?<!\d)\d{5,9}(?!\d)/);
    if (plain) return normaliseOcrNumber(plain[0]);
    return '';
}

module.exports = {
    normaliseOcrNumber,
    extractNumberTokens,
    extractRewardGroups,
    extractFocusedRewards,
    parseLocalizedNumericField,
    selectLocalizedRewardValue,
    hasIndependentRewardFieldValueSupport,
    hasIndependentRewardFieldConflict,
    hasIndependentRewardFieldPrefixConflict,
    selectConsistentRewardTuple,
    reconcileCreditPrefix,
    extractFocusedDamage,
};

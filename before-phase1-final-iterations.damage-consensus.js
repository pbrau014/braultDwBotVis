'use strict';

function validDamage(value) {
    return /^\d{5,9}$/.test(String(value ?? '').trim());
}

function grouped(candidates) {
    const groups = new Map();
    for (const candidate of candidates || []) {
        const value = String(candidate?.value ?? '').trim();
        if (!validDamage(value)) continue;
        const group = groups.get(value) || { value, candidates: [], confidence: 0 };
        group.candidates.push({ ...candidate, value });
        group.confidence += Number(candidate.confidence) || 0;
        groups.set(value, group);
    }
    return [...groups.values()];
}

/**
 * Prefer a two-read full-screen consensus over a conflicting focused crop.
 * Focused crops can truncate a leading digit (for example 87373 -> 87313) while
 * two independently segmented full-screen reads retain the full number. If the
 * full-screen reads do not agree, keep the evidence together so the field parser
 * marks disagreement uncertain rather than silently choosing the highest score.
 */
function selectDamageCandidates(focusedCandidates = [], fullScreenCandidates = []) {
    const fullGroups = grouped(fullScreenCandidates);
    const consensusGroup = fullGroups
        .filter((group) => group.candidates.length >= 2)
        .sort((a, b) => b.candidates.length - a.candidates.length
            || b.confidence / b.candidates.length - a.confidence / a.candidates.length)[0];

    if (consensusGroup) {
        return {
            candidates: consensusGroup.candidates,
            selectedBy: 'full-screen-consensus',
            selectedValue: consensusGroup.value,
            conflictingFocusedValues: [...new Set(grouped(focusedCandidates)
                .map((group) => group.value).filter((value) => value !== consensusGroup.value))],
        };
    }

    const combined = [...(focusedCandidates || []), ...(fullScreenCandidates || [])]
        .filter((candidate) => validDamage(candidate?.value));
    return {
        candidates: combined,
        selectedBy: fullGroups.length > 1 ? 'conflicting-evidence-fail-closed' : 'combined-evidence',
        selectedValue: null,
        conflictingFocusedValues: [],
    };
}

module.exports = { selectDamageCandidates, validDamage };

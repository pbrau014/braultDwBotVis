'use strict';

const { extractFocusedDamage } = require('./number-parser');

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

function hasIndependentGeometryQuorum(group) {
    if (!group || group.candidates.length < 3 ||
        !group.candidates.every(candidate => candidate.excludeAdjacentUi === true)) return false;
    const widths = new Set(group.candidates.map(candidate => candidate.cropWidth)
        .filter(value => value !== null && value !== undefined));
    const psms = new Set(group.candidates.map(candidate => candidate.cropPsm ?? candidate.psm ?? candidate.source));
    return widths.size >= 2 && psms.size >= 2;
}

/**
 * Two agreeing damage reads count as an initial consensus only when no other
 * valid six-to-nine digit reading conflicts. Conflicts trigger the bounded sweep.
 */
function hasUniqueDamageConsensus(values = []) {
    const counts = new Map();
    for (const raw of values || []) {
        const value = String(raw ?? '').replace(/\D/g, '');
        if (!/^\d{6,9}$/.test(value)) continue;
        counts.set(value, (counts.get(value) || 0) + 1);
    }
    // Two agreeing crops do not establish a consensus if another valid crop
    // conflicts. In that case the caller should run the cross-width sweep.
    return counts.size === 1 && [...counts.values()][0] >= 2;
}

/**
 * Extract independent PSM 3/11 damage candidates from the performance section.
 * PSM 11 sometimes omits or mangles the word "Damage" even though it reads the
 * numeric row directly beneath "Battle performance". Search only the first
 * seven non-empty lines after that heading in that case, never the entire page.
 * The caller still requires the existing independent-read consensus before a
 * full-screen value can override conflicting crop evidence.
 */
function extractFullScreenDamageCandidates(reads = []) {
    const candidates = [];
    for (const attempt of reads || []) {
        const text = String(attempt?.text || '');
        const heading = text.search(/battle\s+performance/i);
        if (heading < 0) continue;
        const afterHeading = text.slice(heading + 'battle performance'.length);
        const combatMissions = afterHeading.search(/combat\s+missions/i);
        const section = combatMissions >= 0 ? afterHeading.slice(0, combatMissions) : afterHeading;
        // The damage number is positioned immediately below the performance
        // heading in the source UI, while OCR may place the "Damage" caption
        // several lines later after reading ribbon labels/icons. Looking only
        // at the seven lines immediately before that caption can skip the value.
        // Keep the search bounded to the top of this section and stop at the
        // caption when it appears; do not scan medal/ribbon rows below it.
        const sectionLines = section.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
        const captionLineIndex = sectionLines.findIndex(line => /\bdamage\b/i.test(line));
        const candidateLines = sectionLines.slice(0, captionLineIndex >= 0
            ? Math.min(7, captionLineIndex + 1)
            : 7);

        let value = '';
        for (const line of candidateLines) {
            value = extractFocusedDamage(line);
            if (/^\d{5,9}$/.test(value)) break;
            // OCR can split a three-digit prefix from the six-digit tail and
            // append adjacent UI digits. Retain the existing narrow repair,
            // scoped to the damage row selected above.
            const split = line.match(/(?:^|\D)(\d{3})\s+(\d{6})(?:\D|$)/);
            if (split) {
                value = `${split[1]}${split[2].slice(0, 3)}`;
                break;
            }
        }
        if (/^\d{5,9}$/.test(value)) candidates.push({
            value,
            confidence: Number(attempt.confidence) || 0,
            source: `full-screen-psm-${attempt.pageSegmentationMode ?? 'unknown'}`,
        });
    }
    return candidates;
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

    // Before accepting a full-screen consensus, check for the one narrowly
    // supported exception: isolated focused crops independently recover exactly
    // one leading digit omitted by that unanimous broad read. The full rule is
    // applied later alongside the other isolated-quorum rules.
    const leadingDigitRecoveryPrecheck = fullGroups.length === 1 && fullGroups[0].value.length >= 5 &&
        fullGroups[0].confidence / fullGroups[0].candidates.length >= 60
        ? grouped(focusedCandidates).filter(group => {
            if (group.value.length !== fullGroups[0].value.length + 1 || !group.value.endsWith(fullGroups[0].value) ||
                !group.candidates.every(candidate => candidate.excludeAdjacentUi === true)) return false;
            const widths = new Set(group.candidates.map(candidate => candidate.cropWidth).filter(value => value !== null && value !== undefined));
            const psms = new Set(group.candidates.map(candidate => candidate.cropPsm ?? candidate.psm ?? candidate.source));
            const positives = group.candidates.map(candidate => Number(candidate.confidence) || 0).filter(value => value > 0);
            const mean = positives.length ? positives.reduce((sum, value) => sum + value, 0) / positives.length : 0;
            return group.candidates.length >= 4 && widths.size >= 2 && psms.size >= 2 && positives.length >= 2 && mean >= 20;
        }) : [];
    // Symmetric to the leading-digit repair: if the broad consensus adds one
    // trailing icon digit, an isolated crop quorum for its exact six-plus-digit
    // prefix must be evaluated before returning the broad consensus early.
    const trailingDigitCropPrecheck = fullGroups.length === 1 && fullGroups[0].value.length >= 7 &&
        fullGroups[0].confidence / fullGroups[0].candidates.length >= 60
        ? grouped(focusedCandidates).filter(group => {
            if (group.value.length !== fullGroups[0].value.length - 1 || !fullGroups[0].value.startsWith(group.value) ||
                !group.candidates.every(candidate => candidate.excludeAdjacentUi === true)) return false;
            const widths = new Set(group.candidates.map(candidate => candidate.cropWidth).filter(value => value !== null && value !== undefined));
            const psms = new Set(group.candidates.map(candidate => candidate.cropPsm ?? candidate.psm ?? candidate.source));
            // Numeric-whitelist crops can report zero confidence despite readable
            // digits. For this trailing-icon case, the gate is four isolated reads
            // across two widths and two PSMs plus a >=60-confidence full-screen
            // consensus, not a positive crop-confidence score.
            return group.candidates.length >= 4 && widths.size >= 2 && psms.size >= 2;
        }) : [];
    // A geometry-bounded focused crop is stronger spatial evidence than a
    // broad full-screen read when the two disagree. Do not let two correlated
    // full-screen PSMs override that conflict unless one of the explicit,
    // geometry-quorum prefix/extension repairs above has already proved it.
    const geometryBoundedConflict = consensusGroup && grouped(focusedCandidates).some(group =>
        group.value !== consensusGroup.value &&
        group.candidates.some(candidate => candidate.excludeAdjacentUi === true));
    if (consensusGroup && leadingDigitRecoveryPrecheck.length !== 1 &&
        trailingDigitCropPrecheck.length !== 1 && !geometryBoundedConflict) {
        return {
            candidates: consensusGroup.candidates,
            selectedBy: 'full-screen-consensus',
            selectedValue: consensusGroup.value,
            conflictingFocusedValues: [...new Set(grouped(focusedCandidates)
                .map((group) => group.value).filter((value) => value !== consensusGroup.value))],
        };
    }

    // If two independent geometry-bounded crops agree on a complete six-or-more
    // digit value and a full-screen read adds exactly one trailing digit, prefer the
    // crop consensus only when the crop producer explicitly marks that its right
    // edge excludes adjacent ribbon/icon UI. This is distinct from the clipped-prefix
    // repair below: a clipped five-digit focused crop never wins this rule.
    const isolatedFocusedGroups = grouped(focusedCandidates).filter(group =>
        group.candidates.length >= 2 &&
        group.value.length >= 6 &&
        group.candidates.every(candidate => candidate.excludeAdjacentUi === true),
    );

    // When broad OCR reads conflict, a crop family may adjudicate only if it
    // independently matches one of those complete broad values. Require a
    // unique geometry quorum across multiple widths and PSMs; repeat reads of
    // one crop alone must not settle a conflict.
    if (fullGroups.length > 1) {
        const geometryQuorums = grouped(focusedCandidates).filter(group =>
            group.value.length >= 5 && hasIndependentGeometryQuorum(group));
        const supported = geometryQuorums.filter(group => fullGroups.some(full => full.value === group.value));
        if (geometryQuorums.length === 1 && supported.length === 1) {
            return {
                candidates: supported[0].candidates,
                selectedBy: 'isolated-focused-crop-quorum-matches-full-screen',
                selectedValue: supported[0].value,
                conflictingFocusedValues: [...new Set([...fullGroups.map(group => group.value), ...grouped(focusedCandidates).map(group => group.value)])]
                    .filter(value => value !== supported[0].value),
            };
        }
    }

    // When full-screen OCR entirely misses the number, accept only one uniquely
    // supported crop family: >=4 reads from >=2 widths and >=2 PSMs, each crop
    // explicitly bounded before adjacent UI. Confidence is not useful for some
    // numeric-whitelist crops (Tesseract reports 0 despite a clear digit string),
    // so the geometry quorum is the evidence gate in this specific no-full-screen
    // case. If there is more than one such family, continue to fail closed.
    const noFullScreenIsolatedQuorums = fullGroups.length === 0
        ? isolatedFocusedGroups.filter(group => {
            const widths = new Set(group.candidates.map(candidate => candidate.cropWidth)
                .filter(value => value !== null && value !== undefined));
            const psms = new Set(group.candidates.map(candidate => candidate.cropPsm ?? candidate.psm ?? candidate.source));
            return group.candidates.length >= 4 && widths.size >= 2 && psms.size >= 2;
        })
        : [];
    if (noFullScreenIsolatedQuorums.length === 1) {
        const focused = noFullScreenIsolatedQuorums[0];
        return {
            candidates: focused.candidates,
            selectedBy: 'isolated-focused-crop-quorum-no-full-screen',
            selectedValue: focused.value,
            conflictingFocusedValues: [...new Set(grouped(focusedCandidates)
                .map(group => group.value).filter(value => value !== focused.value))],
        };
    }

    // Some tightly bounded sweeps clip the final digit while broad OCR reads
    // the complete six-digit number. If the only full-screen candidate is a
    // six-digit value and the isolated five-digit crop is its exact prefix,
    // return the full-screen value only when the crop quorum spans widths and
    // segmentation modes and the broad read is reasonably confident.
    if (fullGroups.length === 1 && fullGroups[0].value.length === 6 &&
        fullGroups[0].confidence / fullGroups[0].candidates.length >= 60) {
        const full = fullGroups[0];
        const prefixQuorums = grouped(focusedCandidates).filter(group =>
            group.value.length === 5 && full.value.startsWith(group.value) &&
            hasIndependentGeometryQuorum(group));
        if (prefixQuorums.length === 1) {
            return {
                candidates: full.candidates.map(candidate => ({ ...candidate, supportedByIsolatedPrefixQuorum: true })),
                selectedBy: 'isolated-focused-prefix-supports-six-digit-full-screen',
                selectedValue: full.value,
                conflictingFocusedValues: [prefixQuorums[0].value],
            };
        }
    }

    const isolatedTrims = [];
    for (const focused of isolatedFocusedGroups) {
        for (const full of fullGroups) {
            if (full.value.length === focused.value.length + 1 &&
                full.value.startsWith(focused.value) &&
                full.confidence / full.candidates.length >= 60) {
                isolatedTrims.push({ focused, full });
            }
        }
    }
    if (isolatedTrims.length === 1) {
        const { focused, full } = isolatedTrims[0];
        return {
            candidates: focused.candidates,
            selectedBy: 'isolated-focused-crop-consensus-excludes-adjacent-ui',
            selectedValue: focused.value,
            conflictingFocusedValues: [full.value],
        };
    }

    // A single broad read can be badly segmented by the adjacent ribbon row.
    // Permit an isolated crop quorum to win a non-prefix conflict only when it
    // consists of at least four reads, spans >=2 crop widths and >=2 PSMs, and
    // has one unique candidate value. This rule cannot be triggered by repeating
    // the same crop/mode and does not choose by confidence alone.
    const isolatedQuorums = isolatedFocusedGroups.filter((group) => {
        // A crop quorum can adjudicate one divergent broad value, but it must not
        // override mutually conflicting full-screen reads.
        if (fullGroups.length !== 1) return false;
        if (group.value.length === fullGroups[0].value.length + 1 && group.value.endsWith(fullGroups[0].value)) return false;
        const widths = new Set(group.candidates.map(candidate => candidate.cropWidth).filter(value => value !== null && value !== undefined));
        const psms = new Set(group.candidates.map(candidate => candidate.cropPsm ?? candidate.psm ?? candidate.source));
        const averageConfidence = group.confidence / Math.max(1, group.candidates.length);
        return group.candidates.length >= 4 && widths.size >= 2 && psms.size >= 2 && averageConfidence >= 30;
    });
    if (isolatedQuorums.length === 1) {
        const focused = isolatedQuorums[0];
        return {
            candidates: focused.candidates,
            selectedBy: 'isolated-focused-crop-quorum',
            selectedValue: focused.value,
            conflictingFocusedValues: fullGroups.map(group => group.value).filter(value => value !== focused.value),
        };
    }

    // A broad full-screen read can omit the leading damage digit (for example,
    // `71577` while several geometry-isolated focused crops read `171577`).
    // Recover only when exactly one full-screen value group exists and a crop
    // family independently supports the one-extra-leading-digit value across
    // multiple widths and PSMs. This is evidence-gated, never a generic prefix guess.
    if (fullGroups.length === 1 && fullGroups[0].value.length >= 5 &&
        fullGroups[0].confidence / fullGroups[0].candidates.length >= 60) {
        const full = fullGroups[0];
        const leadingDigitRecoveries = isolatedFocusedGroups.filter((group) => {
            if (group.value.length !== full.value.length + 1 || !group.value.endsWith(full.value)) return false;
            const widths = new Set(group.candidates.map(candidate => candidate.cropWidth).filter(value => value !== null && value !== undefined));
            const psms = new Set(group.candidates.map(candidate => candidate.cropPsm ?? candidate.psm ?? candidate.source));
            const positiveConfidence = group.candidates.map(candidate => Number(candidate.confidence) || 0).filter(value => value > 0);
            const averagePositiveConfidence = positiveConfidence.length
                ? positiveConfidence.reduce((sum, value) => sum + value, 0) / positiveConfidence.length : 0;
            return group.candidates.length >= 4 && widths.size >= 2 && psms.size >= 2 &&
                positiveConfidence.length >= 2 && averagePositiveConfidence >= 20;
        });
        if (leadingDigitRecoveries.length === 1) {
            const focused = leadingDigitRecoveries[0];
            return {
                candidates: focused.candidates,
                selectedBy: 'isolated-focused-crop-leading-digit-recovery',
                selectedValue: focused.value,
                conflictingFocusedValues: [full.value],
            };
        }
        if (leadingDigitRecoveries.length > 1) {
            return {
                candidates: [...(focusedCandidates || []), ...(fullScreenCandidates || [])]
                    .filter((candidate) => validDamage(candidate?.value)),
                selectedBy: 'conflicting-leading-digit-recoveries-fail-closed',
                selectedValue: null,
                conflictingFocusedValues: leadingDigitRecoveries.map(group => group.value),
            };
        }
    }

    // A focused crop can clip the final digit while the full-screen engine still
    // reads the complete number (e.g. focused `13182` vs full-screen `131828`).
    // Resolve this only when at least two independent focused reads agree on the
    // exact prefix, one unique full-screen value extends that prefix by one digit,
    // and the full-screen reading has a reasonable confidence score. Do not apply
    // prefix repair to arbitrary conflicts or to values that differ in the middle.
    const focusedGroups = grouped(focusedCandidates);
    const prefixRepairs = [];
    for (const full of fullGroups) {
        if (full.value.length < 6) continue;
        const prefixGroups = focusedGroups.filter((focused) =>
            focused.candidates.length >= 2 &&
            full.value.length === focused.value.length + 1 &&
            full.value.startsWith(focused.value) &&
            focused.confidence / focused.candidates.length >= 60 &&
            full.confidence / full.candidates.length >= 60,
        );
        for (const focused of prefixGroups) prefixRepairs.push({ full, focused });
    }
    if (prefixRepairs.length === 1) {
        const { full, focused } = prefixRepairs[0];
        return {
            candidates: full.candidates,
            selectedBy: 'one-digit-full-screen-extension-consensus',
            selectedValue: full.value,
            conflictingFocusedValues: [focused.value],
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

module.exports = { selectDamageCandidates, validDamage, hasUniqueDamageConsensus, extractFullScreenDamageCandidates };

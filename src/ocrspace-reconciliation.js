'use strict';

const { NOT_DETECTED, parseBattleResult, parseModeMap, parseBattleStartTime } = require('./battle-record');
const { extractFocusedRewards, extractFocusedDamage, parseLocalizedNumericField } = require('./number-parser');

const REQUIRED_FIELDS = ['result', 'player', 'map', 'mode', 'battleStart', 'credits', 'freeXp', 'damage', 'xp'];

function present(value) {
    const text = String(value ?? '').trim();
    return Boolean(text && text !== NOT_DETECTED && !text.includes('\uFFFD'));
}

function parseEvidenceItem(item) {
    const field = String(item.field || '');
    const text = String(item.text || '').trim();
    if (!text || item.status !== 'success') return {};
    if (item.source === 'azure-document-intelligence-line' && item.geometryValid !== true) return {};
    if (field === 'fullScreenshot') {
        const parsed = {};
        const result = parseBattleResult(text);
        if (present(result)) parsed.result = result;
        const metadata = parseModeMap(text);
        const battleStart = parseBattleStartTime(text);
        if (present(metadata.map)) parsed.map = metadata.map;
        if (present(metadata.mode)) parsed.mode = metadata.mode;
        if (present(battleStart)) parsed.battleStart = battleStart;
        const rewardStart = text.search(/received for the battle/i);
        if (rewardStart >= 0) {
            const afterHeading = text.slice(rewardStart + 'received for the battle'.length);
            const rewardEnd = afterHeading.search(/battle performance/i);
            const rewardText = rewardEnd >= 0 ? afterHeading.slice(0, rewardEnd) : afterHeading;
            const rewards = extractFocusedRewards(rewardText) || {};
            for (const fieldName of ['credits', 'freeXp', 'xp']) if (present(rewards[fieldName])) parsed[fieldName] = rewards[fieldName];
        }
        const damageLine = text.match(/damage(?:\s*[:\\-])?\s*([\d][\d\s,]*)/i);
        if (damageLine) {
            const damage = extractFocusedDamage(damageLine[0]);
            if (present(damage)) parsed.damage = damage;
        }
        return parsed;
    }
    if (field === 'result') {
        // Parse the remote text directly. Local candidate consensus thresholds
        // must not suppress diagnostic evidence merely because OCR.Space has no
        // comparable confidence score; this value is never accepted as local.
        const result = parseBattleResult(text);
        return present(result) ? { result } : {};
    }
    if (field === 'battleMetadata') {
        // Keep the remote parse independent from local multi-crop consensus.
        // Reconciliation below compares the parsed values but never promotes them.
        const metadata = parseModeMap(text);
        const battleStart = parseBattleStartTime(text);
        const parsed = {};
        if (present(metadata.map)) parsed.map = metadata.map;
        if (present(metadata.mode)) parsed.mode = metadata.mode;
        if (present(battleStart)) parsed.battleStart = battleStart;
        return parsed;
    }
    if (field === 'rewardBand') return extractFocusedRewards(text) || {};
    if (['credits', 'freeXp', 'xp'].includes(field)) {
        const value = parseLocalizedNumericField(text, field);
        return value ? { [field]: value } : {};
    }
    if (field === 'damage') {
        const value = extractFocusedDamage(text);
        return value ? { damage: value } : {};
    }
    return {};
}

/**
 * Compare OCR.Space's isolated diagnostic evidence to the locally accepted record.
 * This function never mutates localRecord and never promotes remote-only values.
 */
function reconcileOcrSpaceEvidence(evidenceBundle, localRecord = {}) {
    const evidence = Array.isArray(evidenceBundle?.evidence) ? evidenceBundle.evidence : [];
    const candidates = Object.fromEntries(REQUIRED_FIELDS.map(key => [key, []]));
    for (const item of evidence) {
        if (!item || item.status !== 'success') continue;
        const parsed = parseEvidenceItem(item);
        for (const [key, value] of Object.entries(parsed)) {
            if (!REQUIRED_FIELDS.includes(key) || key === 'player' || !present(value)) continue;
            candidates[key].push({
                value: String(value).trim(),
                source: String(item.source || item.field || 'ocrspace'),
                pageIndex: item.pageIndex ?? null,
                pageNumber: item.pageNumber ?? null,
                polygon: Array.isArray(item.polygon) ? item.polygon : [],
                geometryValid: item.geometryValid === true,
                geometryIssue: item.geometryIssue || null,
                pageWidth: item.pageWidth ?? null,
                pageHeight: item.pageHeight ?? null,
                pageUnit: item.pageUnit || '',
                words: Array.isArray(item.words) ? item.words.slice(0, 500) : [],
                confidenceValues: Array.isArray(item.confidenceValues) ? item.confidenceValues : [],
                originalScreenshotSha256: item.originalScreenshotSha256 || evidenceBundle?.originalScreenshotSha256 || evidenceBundle?.sourceSha256 || null,
                providerInputSha256: item.providerInputSha256 || evidenceBundle?.providerInputSha256 || null,
            });
        }
    }

    const fields = {};
    for (const key of REQUIRED_FIELDS) {
        if (key === 'player') {
            fields[key] = { status: 'excluded_by_privacy_policy', localValuePresent: present(localRecord[key]), remoteCandidates: [] };
            continue;
        }
        const values = candidates[key];
        const unique = [...new Set(values.map(item => item.value))];
        const localPresent = present(localRecord[key]);
        if (!unique.length) {
            fields[key] = { status: 'no_remote_candidate', localValuePresent: localPresent, remoteCandidates: [] };
        } else if (unique.length > 1) {
            fields[key] = { status: 'remote_conflict', localValuePresent: localPresent, remoteCandidates: values };
        } else if (!localPresent) {
            fields[key] = { status: 'remote_only_unconfirmed', localValuePresent: false, remoteValue: unique[0], remoteCandidates: values };
        } else if (String(localRecord[key]).trim() === unique[0]) {
            fields[key] = { status: 'agreement', localValuePresent: true, remoteValue: unique[0], remoteCandidates: values };
        } else {
            fields[key] = { status: 'disagreement', localValuePresent: true, localValue: String(localRecord[key]).trim(), remoteValue: unique[0], remoteCandidates: values };
        }
    }

    const compared = Object.values(fields).some(item => ['agreement', 'disagreement', 'remote_only_unconfirmed', 'remote_conflict'].includes(item.status));
    return {
        status: evidenceBundle?.status === 'disabled' ? 'disabled' : compared ? 'compared' : 'no_remote_candidates',
        diagnosticOnly: true,
        requests: Number(evidenceBundle?.requests) || 0,
        fields,
        disclaimer: 'Remote OCR evidence is a diagnostic cross-check only. It never changes the local record or accepts a remote-only value; player identity is excluded from remote reconciliation.',
    };
}

module.exports = { reconcileOcrSpaceEvidence, reconcileRemoteOcrEvidence: reconcileOcrSpaceEvidence, parseEvidenceItem, REQUIRED_FIELDS };

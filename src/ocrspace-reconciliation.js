'use strict';

const { buildBattleRecord, NOT_DETECTED } = require('./battle-record');
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
    if (field === 'result') {
        const parsed = buildBattleRecord(text, { resultCandidates: [{ text, confidence: 0, source: item.source }] });
        return { result: parsed.result };
    }
    if (field === 'battleMetadata') {
        const parsed = buildBattleRecord(text, { metadataCandidates: [{ text, confidence: 0, source: item.source }] });
        return { map: parsed.map, mode: parsed.mode, battleStart: parsed.battleStart };
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
            candidates[key].push({ value: String(value).trim(), source: String(item.source || item.field || 'ocrspace') });
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
        disclaimer: 'OCR.Space evidence is a diagnostic cross-check only. It never changes the local record or accepts a remote-only value; player identity is excluded by design.',
    };
}

module.exports = { reconcileOcrSpaceEvidence, parseEvidenceItem, REQUIRED_FIELDS };

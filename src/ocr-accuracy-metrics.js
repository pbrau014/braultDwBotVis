'use strict';

const REQUIRED_FIELDS = Object.freeze([
    'result', 'player', 'map', 'mode', 'battleStart',
    'credits', 'freeXp', 'damage', 'xp',
]);
const NUMERIC_FIELDS = new Set(['credits', 'freeXp', 'damage', 'xp']);

function present(value) {
    return value !== null && value !== undefined && String(value).trim() !== '' &&
        String(value).trim().toLowerCase() !== 'not detected';
}

function canonical(field, value) {
    if (!present(value)) return null;
    let text = String(value).normalize('NFC').trim();
    if (NUMERIC_FIELDS.has(field)) {
        const compact = text.replace(/[\s,._']/g, '');
        return /^\d+$/.test(compact) ? compact : text;
    }
    if (field === 'player') return text;
    return text.replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}

function getRecord(item) {
    return item?.record || item?.fullRecord || item?.recordReview?.fullRecord || null;
}

function isAccepted(item) {
    if (typeof item?.accepted === 'boolean') return item.accepted;
    return item?.recordReview?.acceptedByCurrentApplicationValidator === true;
}

function unresolvedSet(item) {
    const values = item?.unresolvedFields || item?.recordReview?.unresolvedFields || [];
    return new Set(values.map(value => typeof value === 'string' ? value : value?.field).filter(Boolean));
}

function createAccuracyReport({ predictions, groundTruth, createdAt = new Date().toISOString() } = {}) {
    if (!Array.isArray(predictions) || !Array.isArray(groundTruth)) {
        throw new TypeError('Predictions and groundTruth must both be arrays.');
    }
    const truthByHash = new Map();
    for (const item of groundTruth) {
        const hash = String(item?.sourceSha256 || item?.originalScreenshotSha256 || '').trim();
        const record = getRecord(item);
        if (!hash || !record) continue;
        if (truthByHash.has(hash)) throw new Error('Duplicate ground-truth source hash: ' + hash);
        truthByHash.set(hash, record);
    }

    const fields = Object.fromEntries(REQUIRED_FIELDS.map(field => [field, {
        samples: 0, exactMatches: 0, wrongAccepted: 0, unresolved: 0, missing: 0, coverage: 0, exactMatchRate: null,
    }]));
    let fullRecordExactMatches = 0;
    let falseAcceptanceRecords = 0;
    let falseRejectionRecords = 0;
    let readerDisagreementFields = 0;
    let matchedImages = 0;
    const unmatchedPredictions = [];
    const usedTruth = new Set();
    const providerAvailability = {};
    let totalProviderRequests = 0;

    for (const prediction of predictions) {
        const hash = String(prediction?.sourceSha256 || prediction?.originalScreenshotSha256 || prediction?.source?.sha256 || '').trim();
        const truth = truthByHash.get(hash);
        if (!hash || !truth) {
            unmatchedPredictions.push(hash || '[missing source hash]');
            continue;
        }
        matchedImages++;
        usedTruth.add(hash);
        const record = getRecord(prediction) || {};
        const unresolved = unresolvedSet(prediction);
        const accepted = isAccepted(prediction);
        let recordExact = true;
        let recordHasWrongAccepted = false;
        let recordHasUnresolved = false;
        for (const field of REQUIRED_FIELDS) {
            const expected = canonical(field, truth[field]);
            const actual = canonical(field, record[field]);
            const stat = fields[field];
            stat.samples++;
            if (actual === null) stat.missing++;
            if (actual !== null && expected !== null && actual === expected) stat.exactMatches++;
            else recordExact = false;
            if (unresolved.has(field) || actual === null) {
                stat.unresolved++;
                recordHasUnresolved = true;
                readerDisagreementFields += unresolved.has(field) ? 1 : 0;
            }
            if (accepted && actual !== null && expected !== null && actual !== expected) {
                stat.wrongAccepted++;
                recordHasWrongAccepted = true;
            }
        }
        if (recordExact) fullRecordExactMatches++;
        if (accepted && (!recordExact || recordHasWrongAccepted)) falseAcceptanceRecords++;
        if (!accepted && recordExact && !recordHasUnresolved) falseRejectionRecords++;
        for (const [provider, value] of Object.entries(prediction?.providers || {})) {
            const item = providerAvailability[provider] || (providerAvailability[provider] = { success: 0, failed: 0, blocked: 0, requests: 0 });
            if (value?.status === 'success') item.success++;
            else if (value?.status === 'failed') item.failed++;
            else if (value?.status === 'blocked') item.blocked++;
            const requests = Number(value?.httpRequestCount ?? value?.requestCount ?? value?.requests) || 0;
            item.requests += requests;
            totalProviderRequests += requests;
        }
    }

    for (const stat of Object.values(fields)) {
        stat.coverage = stat.samples ? (stat.samples - stat.missing) / stat.samples : null;
        stat.exactMatchRate = stat.samples ? stat.exactMatches / stat.samples : null;
    }
    const unmatchedGroundTruth = [...truthByHash.keys()].filter(hash => !usedTruth.has(hash));
    const denominator = matchedImages || 0;
    return {
        schemaVersion: 1,
        createdAt,
        fieldOrder: [...REQUIRED_FIELDS],
        sampleCounts: {
            predictions: predictions.length,
            groundTruth: groundTruth.length,
            matchedImages,
            unmatchedPredictions: unmatchedPredictions.length,
            unmatchedGroundTruth: unmatchedGroundTruth.length,
        },
        metrics: {
            fields,
            fullNineFieldExactRecords: fullRecordExactMatches,
            fullNineFieldExactRecordRate: denominator ? fullRecordExactMatches / denominator : null,
            falseAcceptanceRecords,
            falseRejectionRecords,
            readerDisagreementFields,
            totalProviderRequests,
            providerAvailability,
        },
        unmatchedPredictions,
        unmatchedGroundTruth,
        interpretation: 'Exact-match rates are computed only for source hashes present in both inputs. Wrong accepted values are counted only when the application marked the prediction accepted. Missing or explicitly unresolved values are reported separately. No accuracy claim is valid for unmatched images or absent ground truth.',
    };
}

module.exports = { REQUIRED_FIELDS, canonical, createAccuracyReport };

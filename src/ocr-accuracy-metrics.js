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
    if (typeof item?.recordReview?.acceptedByCurrentApplicationValidator === 'boolean') {
        return item.recordReview.acceptedByCurrentApplicationValidator;
    }
    return null;
}

function unresolvedSet(item) {
    const values = item?.unresolvedFields || item?.recordReview?.unresolvedFields || [];
    return new Set(values.map(value => typeof value === 'string' ? value : value?.field).filter(Boolean));
}

function normalizeRegion(region) {
    const value = region?.bbox || region;
    if (Array.isArray(value) && value.length >= 4) {
        const [left, top, right, bottom] = value.map(Number);
        return [left, top, right, bottom].every(Number.isFinite) && right >= left && bottom >= top
            ? { left, top, right, bottom, pageIndex: region?.pageIndex ?? null } : null;
    }
    if (!value || typeof value !== 'object') return null;
    const left = Number(value.left ?? value.x);
    const top = Number(value.top ?? value.y);
    const right = Number(value.right ?? (Number(value.x) + Number(value.width)));
    const bottom = Number(value.bottom ?? (Number(value.y) + Number(value.height)));
    if (![left, top, right, bottom].every(Number.isFinite) || right < left || bottom < top) return null;
    return { left, top, right, bottom, pageIndex: value.pageIndex ?? region?.pageIndex ?? null };
}

function polygonCenter(polygon) {
    if (!Array.isArray(polygon) || polygon.length < 8 || polygon.length % 2) return null;
    const values = polygon.map(Number);
    if (!values.every(Number.isFinite)) return null;
    const xs = values.filter((_, index) => index % 2 === 0);
    const ys = values.filter((_, index) => index % 2 === 1);
    return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
}

function createAccuracyReport({ predictions, groundTruth, createdAt = new Date().toISOString() } = {}) {
    if (!Array.isArray(predictions) || !Array.isArray(groundTruth)) {
        throw new TypeError('Predictions and groundTruth must both be arrays.');
    }
    const truthByHash = new Map();
    for (const item of groundTruth) {
        const hash = String(item?.sourceSha256 || item?.originalScreenshotSha256 || '').trim();
        const record = getRecord(item);
        if (!hash || !record) throw new Error('Each ground-truth entry must include sourceSha256 and a complete record.');
        const missingTruth = REQUIRED_FIELDS.filter(field => !present(record[field]));
        if (missingTruth.length) throw new Error('Ground truth for ' + hash + ' is missing mandatory fields: ' + missingTruth.join(', '));
        if (truthByHash.has(hash)) throw new Error('Duplicate ground-truth source hash: ' + hash);
        truthByHash.set(hash, { record, item });
    }

    const fields = Object.fromEntries(REQUIRED_FIELDS.map(field => [field, {
        samples: 0, exactMatches: 0, wrongAccepted: 0, unresolved: 0, missing: 0, coverage: 0, exactMatchRate: null,
    }]));
    let fullRecordExactMatches = 0;
    let falseAcceptanceRecords = 0;
    let falseRejectionRecords = 0;
    let predictionsWithoutAcceptanceState = 0;
    let readerDisagreementFields = 0;
    let matchedImages = 0;
    const unmatchedPredictions = [];
    const usedTruth = new Set();
    const providerAvailability = {};
    let totalProviderRequests = 0;
    let totalPredictionElapsedMs = 0;
    let predictionRuntimeSamples = 0;
    const regionMetrics = { expectedFields: 0, candidatesAssessed: 0, correctCandidates: 0, fieldsWithoutGeometry: 0, fields: {} };

    for (const prediction of predictions) {
        const hash = String(prediction?.sourceSha256 || prediction?.originalScreenshotSha256 || prediction?.source?.sha256 || '').trim();
        const truthEntry = truthByHash.get(hash);
        if (!hash || !truthEntry) {
            unmatchedPredictions.push(hash || '[missing source hash]');
            continue;
        }
        matchedImages++;
        usedTruth.add(hash);
        const truth = truthEntry.record;
        const record = getRecord(prediction) || {};
        const unresolved = unresolvedSet(prediction);
        const accepted = isAccepted(prediction);
        if (accepted === null) predictionsWithoutAcceptanceState++;
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
            if (accepted === true && actual !== null && expected !== null && actual !== expected) {
                stat.wrongAccepted++;
                recordHasWrongAccepted = true;
            }
        }
        if (recordExact) fullRecordExactMatches++;
        if (accepted === true && (!recordExact || recordHasWrongAccepted)) falseAcceptanceRecords++;
        if (accepted === false && recordExact && !recordHasUnresolved) falseRejectionRecords++;
        const runtimeMs = Number(prediction?.elapsedMs);
        if (Number.isFinite(runtimeMs) && runtimeMs >= 0) {
            totalPredictionElapsedMs += runtimeMs;
            predictionRuntimeSamples++;
        }
        const expectedRegions = truthEntry.item?.fieldRegions || truthEntry.item?.regions || truth.fieldRegions || truth.regions || {};
        const reconciliations = [
            prediction?.azureReconciliation || prediction?.recordReview?.azureReconciliation,
            prediction?.ocrSpaceReconciliation || prediction?.recordReview?.ocrSpaceReconciliation,
        ].filter(Boolean);
        for (const field of REQUIRED_FIELDS) {
            const expectedRegion = normalizeRegion(expectedRegions[field]);
            if (!expectedRegion) continue;
            regionMetrics.expectedFields++;
            const candidates = reconciliations.flatMap(bundle => bundle?.fields?.[field]?.remoteCandidates || [])
                .filter(candidate => candidate?.geometryValid === true && candidate?.originalCoordinateGeometryValid === true &&
                    candidate?.coordinateSpace === 'original-screenshot-pixels' && Array.isArray(candidate.polygon));
            if (!candidates.length) {
                regionMetrics.fieldsWithoutGeometry++;
                continue;
            }
            const fieldStat = regionMetrics.fields[field] || (regionMetrics.fields[field] = { assessed: 0, correct: 0 });
            for (const candidate of candidates) {
                const center = polygonCenter(candidate.polygon);
                if (!center) continue;
                regionMetrics.candidatesAssessed++;
                fieldStat.assessed++;
                const pageMatches = expectedRegion.pageIndex === null || candidate.pageIndex === null ||
                    Number(candidate.pageIndex) === Number(expectedRegion.pageIndex);
                const inside = center.x >= expectedRegion.left && center.x <= expectedRegion.right &&
                    center.y >= expectedRegion.top && center.y <= expectedRegion.bottom;
                if (pageMatches && inside) {
                    regionMetrics.correctCandidates++;
                    fieldStat.correct++;
                }
            }
        }
        for (const [provider, value] of Object.entries(prediction?.providers || {})) {
            const item = providerAvailability[provider] || (providerAvailability[provider] = {
                success: 0, failed: 0, blocked: 0, requests: 0,
                totalElapsedMs: 0, elapsedSamples: 0, quotaReservationStates: {},
            });
            if (value?.status === 'success') item.success++;
            else if (value?.status === 'failed') item.failed++;
            else if (value?.status === 'blocked') item.blocked++;
            const requests = Number(value?.httpRequestCount ?? value?.requestCount ?? value?.requests) || 0;
            item.requests += requests;
            totalProviderRequests += requests;
            const elapsed = Number(value?.elapsedMs);
            if (Number.isFinite(elapsed) && elapsed >= 0) {
                item.totalElapsedMs += elapsed;
                item.elapsedSamples++;
            }
            if (value?.quotaReservationStatus) {
                const status = value.quotaReservationStatus;
                item.quotaReservationStates[status] = (item.quotaReservationStates[status] || 0) + 1;
            }
        }
    }

    for (const stat of Object.values(fields)) {
        stat.coverage = stat.samples ? (stat.samples - stat.missing) / stat.samples : null;
        stat.exactMatchRate = stat.samples ? stat.exactMatches / stat.samples : null;
    }
    const unmatchedGroundTruth = [...truthByHash.keys()].filter(hash => !usedTruth.has(hash));
    const denominator = matchedImages || 0;
    for (const provider of Object.values(providerAvailability)) {
        provider.meanElapsedMs = provider.elapsedSamples ? provider.totalElapsedMs / provider.elapsedSamples : null;
    }
    regionMetrics.candidateAccuracy = regionMetrics.candidatesAssessed
        ? regionMetrics.correctCandidates / regionMetrics.candidatesAssessed : null;
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
            predictionsWithoutAcceptanceState,
            readerDisagreementFields,
            totalProviderRequests,
            providerAvailability,
            runtime: {
                samples: predictionRuntimeSamples,
                totalElapsedMs: totalPredictionElapsedMs,
                meanElapsedMs: predictionRuntimeSamples ? totalPredictionElapsedMs / predictionRuntimeSamples : null,
            },
            sourceRegionCorrectness: regionMetrics,
        },
        unmatchedPredictions,
        unmatchedGroundTruth,
        interpretation: 'Exact-match rates are computed only for source hashes present in both inputs. Wrong accepted values are counted only when the application marked the prediction accepted. Missing or explicitly unresolved values are reported separately. No accuracy claim is valid for unmatched images or absent ground truth.',
    };
}

module.exports = { REQUIRED_FIELDS, canonical, createAccuracyReport };

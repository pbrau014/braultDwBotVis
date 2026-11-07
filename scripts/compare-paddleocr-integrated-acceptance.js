#!/usr/bin/env node
'use strict';

// Compare an integrated fallback run against the pinned Tesseract-only baseline.
// Mandatory and auxiliary fields are reported separately; XP is mandatory and
// changes mandatory-record completeness or the human-review count.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function unresolved(value) { return value === null || value === undefined || String(value).trim() === '' || /^not detected$/i.test(String(value).trim()); }
function normalize(field, value) {
    if (unresolved(value)) return null;
    if (['credits', 'xp', 'freeXp', 'damage'].includes(field)) {
        const text = String(value).trim();
        return /^\d+$/.test(text) ? `N:${text.replace(/^0+(?=\d)/, '')}` : `S:${text}`;
    }
    return String(value).trim().toLowerCase().replace(/\s+/g, ' ');
}
function exact(field, expected, actual) { return !unresolved(expected) && normalize(field, expected) === normalize(field, actual); }
function percentile(values, p) {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
}
function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function average(values) { return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null; }
function groupMetrics(fields, perField) {
    const rows = fields.map(field => perField[field]).filter(Boolean);
    const total = rows.reduce((sum, row) => sum + row.total, 0);
    const correct = rows.reduce((sum, row) => sum + row.correct, 0);
    const unresolvedCount = rows.reduce((sum, row) => sum + row.unresolved, 0);
    const acceptedWrong = rows.reduce((sum, row) => sum + row.acceptedWrong, 0);
    return {
        fields,
        totalFields: total,
        exactFields: correct,
        exactFieldAccuracy: total ? correct / total : null,
        acceptedWrongFields: acceptedWrong,
        unresolvedFields: unresolvedCount,
        criticalFalseAcceptanceRate: (total - unresolvedCount) ? acceptedWrong / (total - unresolvedCount) : null,
        byField: rows.map(row => ({ ...row, exactAccuracy: row.total ? row.correct / row.total : null })),
    };
}
function summarizePipeline(name, report, manifest) {
    const resultRows = Array.isArray(report.results) ? report.results : [];
    const byKey = new Map(resultRows.map(row => [row.fixtureKey || row.key, row]));
    const mandatoryFields = manifest.requiredComparedFields || manifest.comparedFields || ['result', 'player', 'map', 'mode', 'battleStart', 'credits', 'freeXp', 'damage', 'xp'];
    const optionalFields = manifest.optionalComparedFields || [];
    const fields = manifest.comparedFields || [...mandatoryFields, ...optionalFields];
    const metricRows = fields.map(field => ({ field, total: 0, correct: 0, unresolved: 0, acceptedWrong: 0 }));
    const perField = Object.fromEntries(metricRows.map(row => [row.field, row]));
    let exactFields = 0; let totalFields = 0; let completeRecords = 0; let mandatoryCompleteRecords = 0;
    let acceptedWrong = 0; let unresolvedFields = 0; let mandatoryAcceptedWrong = 0; let mandatoryUnresolved = 0;
    let optionalAcceptedWrong = 0; let optionalUnresolved = 0; let reviewRequiredRecords = 0;
    const latencies = []; const fallbackLatencies = []; const cropLatencies = [];
    let fallbackAttemptedImages = 0; let fallbackCrops = 0; let fallbackFailures = 0;
    let failedCropResults = 0; let returnedCropResults = 0; let networkAttempts = 0;
    const records = [];

    for (const fixture of manifest.records) {
        const row = byKey.get(fixture.key);
        if (!row) throw new Error(`${name}: missing record ${fixture.key}`);
        if (row.imageSha256 !== fixture.sha256) throw new Error(`${name}: SHA-256 mismatch for ${fixture.key}`);
        if (Number.isFinite(Number(row.elapsedMs))) latencies.push(Number(row.elapsedMs));
        const diag = row.paddleOcrFallback || null;
        if (diag) {
            if (diag.enabled && ['complete', 'partial', 'failed-open', 'blocked', 'no-valid-crops'].includes(diag.status)) fallbackAttemptedImages++;
            if (Number.isFinite(Number(diag.elapsedMs)) && Number(diag.elapsedMs) > 0) fallbackLatencies.push(Number(diag.elapsedMs));
            fallbackCrops += (diag.attemptedCrops || []).length;
            for (const crop of (diag.cropResults || [])) {
                returnedCropResults++;
                if (Number.isFinite(Number(crop.elapsedMs)) && Number(crop.elapsedMs) >= 0) cropLatencies.push(Number(crop.elapsedMs));
                if (crop.status === 'failed') failedCropResults++;
            }
            if (['failed-open', 'blocked'].includes(diag.status)) fallbackFailures++;
            networkAttempts += Number(diag.networkAttemptCount) || 0;
        }
        const actual = row.actual || {};
        const fieldChecks = {};
        for (const field of fields) {
            const metric = perField[field]; metric.total++; totalFields++;
            const value = actual[field];
            const correct = exact(field, fixture.expected[field], value);
            fieldChecks[field] = { expected: fixture.expected[field], actual: value ?? null, exact: correct,
                kind: correct ? 'correct' : unresolved(value) ? 'unresolved' : 'accepted-wrong' };
            if (correct) { metric.correct++; exactFields++; }
            else if (unresolved(value)) { metric.unresolved++; unresolvedFields++; }
            else { metric.acceptedWrong++; acceptedWrong++; }
            if (mandatoryFields.includes(field) && !correct) {
                if (unresolved(value)) mandatoryUnresolved++;
                else mandatoryAcceptedWrong++;
            }
            if (optionalFields.includes(field) && !correct) {
                if (unresolved(value)) optionalUnresolved++;
                else optionalAcceptedWrong++;
            }
        }
        const pipelineCompleted = row.pipelineCompleted !== false;
        const allComparedExact = pipelineCompleted && fields.every(field => fieldChecks[field]?.exact === true);
        const mandatoryExact = pipelineCompleted && mandatoryFields.every(field => fieldChecks[field]?.exact === true);
        const optionalExact = optionalFields.every(field => fieldChecks[field]?.exact === true);
        if (allComparedExact) completeRecords++;
        if (mandatoryExact) mandatoryCompleteRecords++;
        const explicitAmbiguities = row.ambiguities && typeof row.ambiguities === 'object'
            ? Object.keys(row.ambiguities).some(key => mandatoryFields.includes(key)) : false;
        const requiredUnresolved = mandatoryFields.some(field => fieldChecks[field]?.kind === 'unresolved');
        const needsHumanReview = requiredUnresolved || explicitAmbiguities || !pipelineCompleted;
        if (needsHumanReview) reviewRequiredRecords++;
        records.push({ key: fixture.key, elapsedMs: row.elapsedMs ?? null, pipelineCompleted,
            exactRecord: allComparedExact, mandatoryExactRecord: mandatoryExact, optionalExact,
            needsHumanReview, fallback: diag ? { status: diag.status, elapsedMs: diag.elapsedMs ?? 0,
                requestedFields: diag.requestedFields || [], attemptedCrops: (diag.attemptedCrops || []).map(crop => crop.id),
                decisions: diag.decisions || [], cropLatency: diag.cropLatency || null,
                cropResults: (diag.cropResults || []).map(crop => ({ fieldGroup: crop.fieldGroup,
                    status: crop.status, fields: crop.fields, elapsedMs: crop.elapsedMs, reason: crop.reason })) } : null,
            fields: fieldChecks, error: row.error || null });
    }

    const mandatory = groupMetrics(mandatoryFields, perField);
    mandatory.completeRecords = mandatoryCompleteRecords;
    mandatory.totalRecords = manifest.records.length;
    mandatory.completeRecordAccuracy = manifest.records.length ? mandatoryCompleteRecords / manifest.records.length : null;
    mandatory.acceptedWrongFields = mandatoryAcceptedWrong;
    mandatory.unresolvedFields = mandatoryUnresolved;
    mandatory.criticalFalseAcceptanceRate = (mandatory.totalFields - mandatoryUnresolved)
        ? mandatoryAcceptedWrong / (mandatory.totalFields - mandatoryUnresolved) : null;
    const optional = groupMetrics(optionalFields, perField);
    optional.acceptedWrongFields = optionalAcceptedWrong;
    optional.unresolvedFields = optionalUnresolved;

    return {
        name, fixtureCount: manifest.records.length, reportedCount: resultRows.length,
        comparedFields: fields, mandatoryFields, optionalFields,
        exactFieldAccuracy: totalFields ? exactFields / totalFields : null, exactFields, totalFields,
        completeRecordAccuracy: manifest.records.length ? completeRecords / manifest.records.length : null,
        completeRecords, totalRecords: manifest.records.length,
        criticalFalseAcceptanceRate: (totalFields - unresolvedFields) ? acceptedWrong / (totalFields - unresolvedFields) : null,
        acceptedWrongFields: acceptedWrong, unresolvedRate: totalFields ? unresolvedFields / totalFields : null,
        falseRejectionRate: totalFields ? unresolvedFields / totalFields : null,
        unresolvedFields, humanReviewRecords: reviewRequiredRecords,
        humanReviewRate: manifest.records.length ? reviewRequiredRecords / manifest.records.length : null,
        mandatory, optional,
        byField: metricRows.map(row => ({ ...row, exactAccuracy: row.total ? row.correct / row.total : null })),
        latency: { count: latencies.length, medianMs: percentile(latencies, .5), p95Ms: percentile(latencies, .95), meanMs: average(latencies) },
        fallback: { attemptedImages: fallbackAttemptedImages, attemptedCrops: fallbackCrops, failures: fallbackFailures,
            returnedCropResults, failedCropResults, networkAttemptCount: networkAttempts,
            latency: { count: fallbackLatencies.length, medianMs: percentile(fallbackLatencies, .5), p95Ms: percentile(fallbackLatencies, .95), meanMs: average(fallbackLatencies) },
            perCropLatency: { count: cropLatencies.length, medianMs: percentile(cropLatencies, .5), p95Ms: percentile(cropLatencies, .95), meanMs: average(cropLatencies) } },
        records,
    };
}
function main() {
    const root = path.resolve(__dirname, '..');
    const baselinePath = path.resolve(process.argv[2] || path.join(root, 'testdata', 'ocr-acceptance', 'tesseract-only-baseline-iteration19.json'));
    const candidatePath = path.resolve(process.argv[3] || path.join(root, 'testdata', 'ocr-acceptance', 'paddleocr-integrated-acceptance.json'));
    const outputPath = path.resolve(process.argv[4] || path.join(root, 'testdata', 'ocr-acceptance', 'paddleocr-integrated-comparison.json'));
    const manifestPath = path.resolve(process.argv[5] || path.join(root, 'testdata', 'additional-screenshot-ground-truth.json'));
    const baseline = readJson(baselinePath); const candidate = readJson(candidatePath); const manifest = readJson(manifestPath);
    const baseSummary = summarizePipeline('tesseract-only-baseline', baseline, manifest);
    const candidateSummary = summarizePipeline('tesseract-plus-paddle-local-field-crop', candidate, manifest);
    if (candidate.networkBlocked !== true || candidate.networkIsolation?.ocrSpaceNetworkAllowed !== true || candidate.networkIsolation?.nonOcrNetworkRestricted !== true) throw new Error('Candidate run must prove OCR.Space provider access was allowed while unrelated outbound traffic was restricted.');
    if (candidateSummary.fallback.networkAttemptCount !== 0) throw new Error('PaddleOCR fallback report recorded blocked network attempts.');
    const baseByField = new Map(baseSummary.byField.map(row => [row.field, row]));
    const deltas = candidateSummary.byField.map(next => ({ field: next.field, baselineCorrect: baseByField.get(next.field).correct,
        candidateCorrect: next.correct, deltaCorrectFields: next.correct - baseByField.get(next.field).correct,
        baselineAccuracy: baseByField.get(next.field).exactAccuracy, candidateAccuracy: next.exactAccuracy,
        accuracyDelta: next.exactAccuracy - baseByField.get(next.field).exactAccuracy }));
    const baseMandatoryByField = new Map(baseSummary.mandatory.byField.map(row => [row.field, row]));
    const mandatoryDeltas = candidateSummary.mandatory.byField.map(next => ({ field: next.field,
        baselineCorrect: baseMandatoryByField.get(next.field).correct, candidateCorrect: next.correct,
        deltaCorrectFields: next.correct - baseMandatoryByField.get(next.field).correct,
        baselineAccuracy: baseMandatoryByField.get(next.field).exactAccuracy, candidateAccuracy: next.exactAccuracy,
        accuracyDelta: next.exactAccuracy - baseMandatoryByField.get(next.field).exactAccuracy }));
    const baseOptionalByField = new Map(baseSummary.optional.byField.map(row => [row.field, row]));
    const optionalDeltas = candidateSummary.optional.byField.map(next => ({ field: next.field,
        baselineCorrect: baseOptionalByField.get(next.field).correct, candidateCorrect: next.correct,
        deltaCorrectFields: next.correct - baseOptionalByField.get(next.field).correct }));
    const result = {
        schemaVersion: 2, status: 'complete', createdAt: new Date().toISOString(),
        approvedManifestPath: path.relative(root, manifestPath), approvedManifestSha256: sha256(manifestPath),
        baselinePath: path.relative(root, baselinePath), baselineReportSha256: sha256(baselinePath),
        candidatePath: path.relative(root, candidatePath), candidateReportSha256: sha256(candidatePath),
        datasetPolicy: '16 screenshots are the tuning/development corpus, not an untouched holdout; no ground-truth values are altered',
        fieldPolicy: { mandatoryFields: baseSummary.mandatoryFields, optionalFields: baseSummary.optionalFields,
            note: 'Optional fields are compared diagnostically but do not affect mandatory-record completeness or required-field review.' },
        baseline: baseSummary, candidate: candidateSummary,
        deltas: {
            exactFields: candidateSummary.exactFields - baseSummary.exactFields,
            exactFieldAccuracy: candidateSummary.exactFieldAccuracy - baseSummary.exactFieldAccuracy,
            completeRecords: candidateSummary.completeRecords - baseSummary.completeRecords,
            completeRecordAccuracy: candidateSummary.completeRecordAccuracy - baseSummary.completeRecordAccuracy,
            acceptedWrongFields: candidateSummary.acceptedWrongFields - baseSummary.acceptedWrongFields,
            unresolvedFields: candidateSummary.unresolvedFields - baseSummary.unresolvedFields,
            humanReviewRecords: candidateSummary.humanReviewRecords - baseSummary.humanReviewRecords,
            medianLatencyMs: candidateSummary.latency.medianMs - baseSummary.latency.medianMs,
            p95LatencyMs: candidateSummary.latency.p95Ms - baseSummary.latency.p95Ms,
        },
        mandatoryDeltas: {
            exactFields: candidateSummary.mandatory.exactFields - baseSummary.mandatory.exactFields,
            completeRecords: candidateSummary.mandatory.completeRecords - baseSummary.mandatory.completeRecords,
            acceptedWrongFields: candidateSummary.mandatory.acceptedWrongFields - baseSummary.mandatory.acceptedWrongFields,
            unresolvedFields: candidateSummary.mandatory.unresolvedFields - baseSummary.mandatory.unresolvedFields,
        },
        optionalDeltas: {
            exactFields: candidateSummary.optional.exactFields - baseSummary.optional.exactFields,
            acceptedWrongFields: candidateSummary.optional.acceptedWrongFields - baseSummary.optional.acceptedWrongFields,
            unresolvedFields: candidateSummary.optional.unresolvedFields - baseSummary.optional.unresolvedFields,
        },
        byFieldDelta: deltas, mandatoryByFieldDelta: mandatoryDeltas, optionalByFieldDelta: optionalDeltas,
        interpretation: 'Keep PaddleOCR disabled for production: XP is a mandatory field, and required-field acceptance uses all nine mandatory fields. The current paired candidate worsens mandatory accuracy and false acceptance; the 16-image development corpus is not an untouched holdout.',
    };
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
    console.log(`Comparison written: ${outputPath}`);
    console.log(JSON.stringify({ baseline: { mandatory: baseSummary.mandatory, optional: baseSummary.optional, latency: baseSummary.latency },
        candidate: { mandatory: candidateSummary.mandatory, optional: candidateSummary.optional, latency: candidateSummary.latency,
            fallback: candidateSummary.fallback }, mandatoryDeltas: result.mandatoryDeltas, optionalDeltas: result.optionalDeltas }, null, 2));
}
if (require.main === module) {
    try { main(); } catch (error) { console.error(`[PaddleOCR comparison] ${error.message}`); process.exitCode = 2; }
}
module.exports = { summarizePipeline, exact, normalize, unresolved };

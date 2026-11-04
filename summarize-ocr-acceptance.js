#!/usr/bin/env node
'use strict';

// Compute transparent field/record metrics from an existing sequence report.
// This tool performs no OCR and never modifies source fixtures or ground truth.
const fs = require('node:fs');
const path = require('node:path');

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function unresolved(value) {
    return value === null || value === undefined || String(value).trim() === '' || /^not detected$/i.test(String(value).trim());
}
function normalize(field, value) {
    if (unresolved(value)) return null;
    if (['credits', 'xp', 'freeXp', 'damage'].includes(field)) {
        if (typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value)) return `N:${value}`;
        const digits = String(value).trim();
        if (/^\d+$/.test(digits)) return `N:${Number(digits)}`;
        return `S:${digits}`;
    }
    return String(value).trim();
}
function exact(field, expected, actual) {
    return normalize(field, expected) === normalize(field, actual) && !unresolved(expected);
}
function percentile(values, p) {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const rank = Math.max(1, Math.ceil(p * sorted.length));
    return sorted[rank - 1];
}
function summarizeGroup(fields, observations) {
    const rows = fields.map(field => observations[field]).filter(Boolean);
    const total = rows.reduce((sum, item) => sum + item.total, 0);
    const correct = rows.reduce((sum, item) => sum + item.correct, 0);
    const unresolvedCount = rows.reduce((sum, item) => sum + item.unresolved, 0);
    const acceptedWrong = rows.reduce((sum, item) => sum + item.acceptedWrong, 0);
    return {
        fields,
        totalFieldObservations: total,
        correctFieldObservations: correct,
        exactFieldAccuracy: total ? correct / total : null,
        acceptedWrongFieldObservations: acceptedWrong,
        unresolvedFieldObservations: unresolvedCount,
        criticalFalseAcceptanceRate: (total - unresolvedCount) ? acceptedWrong / (total - unresolvedCount) : null,
        byField: rows.map(item => ({ ...item,
            exactAccuracy: item.total ? item.correct / item.total : null,
            unresolvedRate: item.total ? item.unresolved / item.total : null,
            acceptedWrongRateAmongResolved: (item.total - item.unresolved) ? item.acceptedWrong / (item.total - item.unresolved) : null,
        })),
    };
}

function summarize(report, manifest) {
    const reportedRows = Array.isArray(report.results) ? report.results : Array.isArray(report.records) ? report.records : [];
    const requiredFields = manifest.requiredComparedFields || ['result', 'player', 'map', 'mode', 'battleStart', 'credits', 'freeXp', 'damage', 'xp'];
    const optionalFields = manifest.optionalComparedFields || [];
    const fields = manifest.comparedFields || [...requiredFields, ...optionalFields];
    const byKey = new Map(reportedRows.map(row => [row.fixtureKey || row.key, row]));
    const observations = Object.fromEntries(fields.map(field => [field, { field, required: requiredFields.includes(field), total: 0, correct: 0, unresolved: 0, acceptedWrong: 0 }]));
    const rows = (manifest.records || []).map(entry => {
        const row = byKey.get(entry.key);
        return row ? { ...row, fixtureKey: entry.key, expected: entry.expected, _missingReportRow: false }
            : { fixtureKey: entry.key, filename: entry.filename, expected: entry.expected, actual: {}, pipelineCompleted: false, allExpectedFieldsPass: false, allRequiredFieldsPass: false, requiredMissing: [], _missingReportRow: true };
    });
    let mandatoryCompleteRecordCount = 0;
    let allComparedCompleteRecordCount = 0;
    let totalRequiredObservations = 0;
    let correctRequiredObservations = 0;
    let unresolvedRequiredObservations = 0;
    let acceptedWrongRequiredObservations = 0;
    let totalComparedObservations = 0;
    let correctComparedObservations = 0;
    let unresolvedComparedObservations = 0;
    let acceptedWrongComparedObservations = 0;
    const latencies = [];
    const failures = [];
    const optionalMismatches = [];

    for (const row of rows) {
        const expected = row.expected || {};
        const actual = row.actual || {};
        if (Number.isFinite(Number(row.elapsedMs)) && !row._missingReportRow) latencies.push(Number(row.elapsedMs));
        const requiredMissing = Array.isArray(row.requiredMissing) ? row.requiredMissing : [];
        let requiredExact = !row._missingReportRow && row.pipelineCompleted !== false && requiredMissing.length === 0;
        let allComparedExact = !row._missingReportRow && row.pipelineCompleted !== false;
        const mismatches = [];
        const optionalDiffs = [];

        for (const field of fields) {
            const metric = observations[field];
            metric.total += 1;
            totalComparedObservations += 1;
            const matches = exact(field, expected[field], actual[field]);
            if (requiredFields.includes(field)) totalRequiredObservations += 1;
            if (matches) {
                metric.correct += 1;
                correctComparedObservations += 1;
                if (requiredFields.includes(field)) correctRequiredObservations += 1;
            } else {
                allComparedExact = false;
                if (unresolved(actual[field])) {
                    metric.unresolved += 1;
                    unresolvedComparedObservations += 1;
                    if (requiredFields.includes(field)) unresolvedRequiredObservations += 1;
                } else {
                    metric.acceptedWrong += 1;
                    acceptedWrongComparedObservations += 1;
                    if (requiredFields.includes(field)) acceptedWrongRequiredObservations += 1;
                }
                if (requiredFields.includes(field)) {
                    requiredExact = false;
                    mismatches.push({ field, expected: expected[field] ?? null, actual: actual[field] ?? null,
                        kind: unresolved(actual[field]) ? 'unresolved' : 'accepted-wrong-value' });
                } else if (optionalFields.includes(field)) {
                    optionalDiffs.push({ field, expected: expected[field] ?? null, actual: actual[field] ?? null,
                        kind: unresolved(actual[field]) ? 'unresolved' : 'accepted-wrong-value' });
                }
            }
        }
        if (requiredExact) mandatoryCompleteRecordCount += 1;
        if (allComparedExact) allComparedCompleteRecordCount += 1;
        if (!requiredExact) failures.push({
            key: row.fixtureKey || row.key,
            elapsedMs: row.elapsedMs,
            pipelineCompleted: row.pipelineCompleted,
            missingReportRow: row._missingReportRow || false,
            requiredMissing: requiredMissing.map(item => item.key || item),
            mismatches,
            error: row.error || null,
        });
        if (optionalDiffs.length) optionalMismatches.push({ key: row.fixtureKey || row.key, mismatches: optionalDiffs });
    }

    const required = summarizeGroup(requiredFields, observations);
    required.completeRecords = mandatoryCompleteRecordCount;
    required.totalRecords = (manifest.records || []).length;
    required.completeRecordAccuracy = required.totalRecords ? mandatoryCompleteRecordCount / required.totalRecords : null;
    const optional = summarizeGroup(optionalFields, observations);
    const allCompared = summarizeGroup(fields, observations);
    allCompared.completeRecords = allComparedCompleteRecordCount;
    allCompared.totalRecords = (manifest.records || []).length;
    allCompared.completeRecordAccuracy = allCompared.totalRecords ? allComparedCompleteRecordCount / allCompared.totalRecords : null;

    const totalRecords = (manifest.records || []).length;
    return {
        schemaVersion: 2,
        manifestImageCount: totalRecords,
        reportedImageCount: reportedRows.length,
        comparedFields: fields,
        requiredComparedFields: requiredFields,
        optionalComparedFields: optionalFields,
        metricDefinitions: {
            exactFieldAccuracy: 'exact mandatory-field observations / all mandatory-field observations; unresolved mandatory values count as incorrect',
            completeRecordAccuracy: 'records where all nine mandatory fields match the approved ground truth and requiredMissing is empty / all manifest records',
            allComparedCompleteRecordAccuracy: 'records where every compared field matches exactly / all manifest records',
            criticalFalseAcceptanceRate: 'wrong non-empty mandatory values / all resolved mandatory field outputs',
            optionalFields: 'only non-contract auxiliary fields are optional; XP is mandatory and blocks acceptance when unresolved or incorrect',
            latency: 'record elapsedMs from the supplied acceptance report; p95 uses nearest-rank ceil(0.95*n), do not over-interpret with fewer than 20 records',
        },
        summary: {
            exactFieldAccuracy: totalRequiredObservations ? correctRequiredObservations / totalRequiredObservations : null,
            correctFieldObservations: correctRequiredObservations,
            totalFieldObservations: totalRequiredObservations,
            completeRecordAccuracy: totalRecords ? mandatoryCompleteRecordCount / totalRecords : null,
            completeRecords: mandatoryCompleteRecordCount,
            totalRecords,
            criticalFalseAcceptanceRate: (totalRequiredObservations - unresolvedRequiredObservations)
                ? acceptedWrongRequiredObservations / (totalRequiredObservations - unresolvedRequiredObservations) : null,
            acceptedWrongFieldObservations: acceptedWrongRequiredObservations,
            unresolvedRate: totalRequiredObservations ? unresolvedRequiredObservations / totalRequiredObservations : null,
            unresolvedFieldObservations: unresolvedRequiredObservations,
            falseRejectionProxy: totalRequiredObservations ? unresolvedRequiredObservations / totalRequiredObservations : null,
            allComparedExactFieldAccuracy: totalComparedObservations ? correctComparedObservations / totalComparedObservations : null,
            allComparedCorrectFieldObservations: correctComparedObservations,
            allComparedTotalFieldObservations: totalComparedObservations,
            allComparedAcceptedWrongFieldObservations: acceptedWrongComparedObservations,
            allComparedUnresolvedFieldObservations: unresolvedComparedObservations,
            allComparedCompleteRecordAccuracy: totalRecords ? allComparedCompleteRecordCount / totalRecords : null,
            allComparedCompleteRecords: allComparedCompleteRecordCount,
            allComparedAcceptedWrongRateAmongResolved: (totalComparedObservations - unresolvedComparedObservations)
                ? acceptedWrongComparedObservations / (totalComparedObservations - unresolvedComparedObservations) : null,
            medianLatencyMs: percentile(latencies, .5),
            p95LatencyMs: percentile(latencies, .95),
            timedRecordCount: latencies.length,
        },
        required,
        optional,
        allCompared,
        byField: fields.map(field => ({
            ...observations[field],
            exactAccuracy: observations[field].total ? observations[field].correct / observations[field].total : null,
            unresolvedRate: observations[field].total ? observations[field].unresolved / observations[field].total : null,
            acceptedWrongRateAmongResolved: (observations[field].total - observations[field].unresolved)
                ? observations[field].acceptedWrong / (observations[field].total - observations[field].unresolved) : null,
        })),
        recordFailures: failures,
        optionalMismatches,
    };
}

function main() {
    const args = process.argv.slice(2);
    const reportPath = args[0];
    if (!reportPath) {
        console.error('Usage: node scripts/summarize-ocr-acceptance.js <sequence-report.json> [output.json] [manifest.json]');
        process.exit(2);
    }
    const root = path.resolve(__dirname, '..');
    const outPath = path.resolve(args[1] || path.join(root, 'testdata', 'ocr-acceptance', 'metrics-latest.json'));
    const manifestPath = path.resolve(args[2] || path.join(root, 'testdata', 'additional-screenshot-ground-truth.json'));
    const report = readJson(path.resolve(reportPath));
    const manifest = readJson(manifestPath);
    const result = summarize(report, manifest);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
    console.log(`Metrics saved: ${outPath}`);
    console.log(JSON.stringify({ mandatory: result.summary, optional: result.optional, allCompared: result.allCompared }, null, 2));
}

if (require.main === module) main();
module.exports = { summarize, exact, normalize, unresolved };

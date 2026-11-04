'use strict';

// Runs the exact three URLs in the user-provided corpus, downloaded locally by
// fetch-reference-corpus.js. This runner does not use or substitute other images.
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const {
    extractText,
    validateWorldOfWarshipsScreenshot,
    terminateOcrWorker,
} = require('../src/bot');
const { REQUIRED_FIELD_KEYS } = require('../src/acceptance-checks');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'testdata', 'reference-corpus.json');
const IMAGE_DIR = path.join(ROOT, 'testdata', 'reference-images');
const RESULT_PATH = path.join(ROOT, 'testdata', 'regression-results.json');
const FIELD_MAP = {
    result: 'result', player: 'player', map: 'map', mode: 'mode', battleStart: 'battleStart',
    credits: 'credits', freeXp: 'freeXp', damage: 'damage', ship: 'ship', description: 'description', xp: 'xp',
};

function compareValue(field, actual, expected) {
    if (expected === null || expected === undefined) return null;
    if (['credits', 'freeXp', 'damage', 'xp'].includes(field)) {
        return String(actual ?? '').replace(/\D/g, '') === String(expected).replace(/\D/g, '');
    }
    if (field === 'result' || field === 'mode') return String(actual ?? '').toLowerCase() === String(expected).toLowerCase();
    if (field === 'player') return String(actual ?? '').replace(/\s+/g, '').toLowerCase() === String(expected).replace(/\s+/g, '').toLowerCase();
    if (field === 'battleStart') return String(actual ?? '') === String(expected);
    return String(actual ?? '').trim().toLowerCase() === String(expected).trim().toLowerCase();
}

async function main() {
    const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));
    const results = [];
    let localMissing = 0;
    let expectedComparisons = 0;
    let correctComparisons = 0;
    let completeGroundTruthImages = 0;

    for (const item of manifest.records) {
        const imagePath = path.join(IMAGE_DIR, item.filename);
        if (!fsSync.existsSync(imagePath)) {
            localMissing += 1;
            results.push({ id: item.id, sourceUrl: item.sourceUrl, status: 'image-not-downloaded', extracted: null });
            console.error(`[${item.id}] Image missing. Run: npm run corpus:fetch`);
            continue;
        }
        try {
            const buffer = await fs.readFile(imagePath);
            const ocr = await extractText(buffer);
            const validations = ocr.attempts
                .map((attempt) => validateWorldOfWarshipsScreenshot(attempt, ocr.fields))
                .sort((a, b) => a.missing.length - b.missing.length || b.confidence - a.confidence);
            const best = validations[0];
            const record = best.record;
            const required = REQUIRED_FIELD_KEYS;
            const actual = {};
            for (const key of required) actual[key] = record[key] ?? 'Not detected';
            const missingRequired = best.missing.map((field) => field.key || field.label);
            for (const key of ['ship', 'description']) actual[key] = record[key] ?? 'Not detected';
            actual.ribbons = Array.isArray(record.ribbons) ? record.ribbons : [];

            const comparisons = {};
            for (const [key, expected] of Object.entries(item.expected || {})) {
                if (expected === null || expected === undefined) continue;
                const actualValue = key === 'ribbons' ? actual.ribbons : actual[FIELD_MAP[key] || key];
                const ok = key === 'ribbons'
                    ? JSON.stringify(actualValue) === JSON.stringify(expected)
                    : compareValue(key, actualValue, expected);
                comparisons[key] = { expected, actual: actualValue, passed: ok };
                expectedComparisons += 1;
                if (ok) correctComparisons += 1;
            }
            const allRequiredAnnotated = required.every((key) => item.expected?.[key] !== null && item.expected?.[key] !== undefined);
            const anyAnnotated = Object.keys(item.expected || {}).some((key) => item.expected[key] !== null && item.expected[key] !== undefined);
            if (allRequiredAnnotated) completeGroundTruthImages += 1;
            const status = allRequiredAnnotated
                ? (Object.values(comparisons).every((check) => check.passed) && missingRequired.length === 0 ? 'passed' : 'failed')
                : (anyAnnotated ? 'partial-ground-truth-not-scoreable' : 'ocr-ran-ground-truth-unannotated');
            results.push({
                id: item.id,
                sourceUrl: item.sourceUrl,
                status,
                confidence: best.confidence,
                attempts: validations.map((value) => ({ pageSegmentationMode: value.pageSegmentationMode, missing: value.missing.map((f) => f.key || f.label), confidence: value.confidence })),
                extracted: actual,
                missingRequired,
                ambiguities: record.ambiguities || {},
                comparisons,
            });
            console.log(`[${item.id}] ${status}; missing required fields: ${missingRequired.length ? missingRequired.join(', ') : 'none'}; annotated comparisons: ${Object.keys(comparisons).length}.`);
        } catch (error) {
            results.push({ id: item.id, sourceUrl: item.sourceUrl, status: 'ocr-error', error: String(error.message || error) });
            console.error(`[${item.id}] OCR ERROR: ${error.message || error}`);
        }
    }

    const annotated = results.filter((item) => Object.keys(item.comparisons || {}).length > 0).length;
    const summary = {
        runAt: new Date().toISOString(),
        allowedSourcesOnly: manifest.records.map((item) => item.sourceUrl),
        imagesInCorpus: manifest.records.length,
        imagesNotDownloaded: localMissing,
        imagesWithAnyGroundTruth: annotated,
        imagesWithCompleteRequiredGroundTruth: completeGroundTruthImages,
        annotatedFieldComparisons: expectedComparisons,
        correctFieldComparisons: correctComparisons,
        fieldAccuracy: expectedComparisons ? correctComparisons / expectedComparisons : null,
        note: completeGroundTruthImages === manifest.records.length ? 'Accuracy is scored only where all required values were manually annotated.' : 'At least one screenshot does not have all nine required values visually confirmed in the manifest. OCR output for it is diagnostic and cannot count as an accuracy success.',
        results,
    };
    await fs.writeFile(RESULT_PATH, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
    console.log(`\nWrote ${path.relative(ROOT, RESULT_PATH)}.`);
    if (localMissing) process.exitCode = 2;
    else if (completeGroundTruthImages !== manifest.records.length) {
        console.warn('No full-corpus accuracy claim possible until all nine required values are visually confirmed for every screenshot in testdata/reference-corpus.json.');
        process.exitCode = 3;
    } else if (results.some((item) => item.status === 'failed' || item.status === 'ocr-error')) process.exitCode = 1;
} 

main().finally(async () => {
    await terminateOcrWorker().catch(() => {});
}).catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
});

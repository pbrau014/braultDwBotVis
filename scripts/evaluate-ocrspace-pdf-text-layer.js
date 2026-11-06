'use strict';

// Offline evaluation of OCR.Space's searchable PDF text layer against the
// approved manual reference. This is diagnostic only: it never accepts,
// mutates, or persists a battle record and never contacts OCR.Space.

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { extractPdfText } = require('./verify-ocrspace-imagesF-21-artifacts');
const { parseEvidenceItem } = require('../src/ocrspace-reconciliation');

const FIELDS = ['result', 'player', 'map', 'mode', 'battleStart', 'credits', 'freeXp', 'damage', 'xp'];
const NUMERIC = new Set(['credits', 'freeXp', 'damage', 'xp']);
const GATE_B_19 = 'gate-b-complete-ground-truth-19';
const ANALYSIS_21 = 'complete-ground-truth-21';

function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function norm(field, value) {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    if (!text || /^(not detected|none|null|n\/a)$/i.test(text)) return null;
    if (NUMERIC.has(field)) return text.replace(/\D/g, '') || null;
    return text.replace(/\s+/g, ' ').replace(/[—–]/g, '-').toLocaleLowerCase('en-US');
}
function selectRecords(gt, inventory) {
    const eligible = gt.records.filter(row => row.recordStatus === 'COMPLETE_9_FIELD_TRANSCRIPTION'
        && FIELDS.every(field => row.fieldStatus?.[field]?.eligible_for_exact_match === true
            && String(row.expected?.[field] ?? '').trim() !== ''));
    if (inventory === GATE_B_19) {
        if (eligible.length < 19 || eligible.slice(0, 19).some((row, index) => row !== gt.records[index])) {
            throw new Error('Gate B requires the first 19 complete nine-field reference records.');
        }
        return eligible.slice(0, 19);
    }
    if (inventory === ANALYSIS_21) {
        if (eligible.length !== 21 || eligible.some((row, index) => row !== gt.records[index])) {
            throw new Error('21-image analysis requires exactly the first 21 complete nine-field reference records.');
        }
        return eligible;
    }
    throw new Error('Unsupported inventory: ' + inventory);
}
function parseTextLayer(text) {
    const evidence = [
        ['result', 'result'],
        ['battleMetadata', 'metadata'],
        ['rewardBand', 'rewards'],
        ['damage', 'damage'],
    ].map(([field, source]) => ({ field, source: 'searchable-pdf-text-layer:' + source, status: 'success', text }));
    const output = {};
    for (const item of evidence) Object.assign(output, parseEvidenceItem(item));
    // Player identity is deliberately not sourced from OCR.Space/PDF text.
    delete output.player;
    return output;
}
function parseProviderText(text) {
    return parseTextLayer(String(text || ''));
}
function score(expected, actual, fields) {
    const metrics = { eligible: 0, exact: 0, wrong: 0, unresolved: 0, exactMatchRate: null };
    const perField = {};
    for (const field of fields) {
        const e = norm(field, expected[field]);
        const a = norm(field, actual[field]);
        if (e === null) continue;
        metrics.eligible++;
        let status;
        if (a === null) { status = 'UNRESOLVED'; metrics.unresolved++; }
        else if (a === e) { status = 'EXACT_MATCH'; metrics.exact++; }
        else { status = 'WRONG_CANDIDATE'; metrics.wrong++; }
        perField[field] = { status, expected: expected[field] ?? null, actual: actual[field] ?? null };
    }
    metrics.exactMatchRate = metrics.eligible ? metrics.exact / metrics.eligible : null;
    return { metrics, perField };
}
function consensus(values, field) {
    const candidates = values.filter(value => norm(field, value) !== null);
    const groups = new Map();
    for (const value of candidates) {
        const key = norm(field, value);
        groups.set(key, [...(groups.get(key) || []), value]);
    }
    const winner = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)[0];
    return winner && winner[1].length >= 2 ? winner[1][0] : null;
}
async function main() {
    const args = process.argv.slice(2);
    const arg = name => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : null; };
    const runPath = arg('--run-report');
    const gtPath = arg('--ground-truth');
    const artifactRoot = arg('--artifact-root');
    const outputPath = arg('--output');
    const inventory = arg('--inventory') || GATE_B_19;
    if (![runPath, gtPath, artifactRoot, outputPath].every(Boolean)) {
        throw new Error('Usage: node scripts/evaluate-ocrspace-pdf-text-layer.js --run-report FILE --ground-truth FILE --artifact-root DIR --output FILE [--inventory gate-b-complete-ground-truth-19|complete-ground-truth-21]');
    }
    const runBytes = await fs.readFile(runPath);
    const gtBytes = await fs.readFile(gtPath);
    const run = JSON.parse(runBytes.toString('utf8'));
    const gt = JSON.parse(gtBytes.toString('utf8'));
    if (run.sourceArchiveSha256 !== gt.candidateArchive?.sha256) throw new Error('Run archive fingerprint does not match the ground-truth corpus.');
    const selected = selectRecords(gt, inventory);
    const byName = new Map((run.results || []).map(row => [row.filename, row]));
    if (byName.size !== (run.results || []).length) throw new Error('Duplicate run rows are not eligible for analysis.');

    const aggregate = {
        pdfTextLayer: { fields: ['result', 'map', 'mode', 'battleStart', 'credits', 'freeXp', 'damage', 'xp'], eligible: 0, exact: 0, wrong: 0, unresolved: 0 },
        providerParsedText: { fields: ['result', 'map', 'mode', 'battleStart', 'credits', 'freeXp', 'damage', 'xp'], eligible: 0, exact: 0, wrong: 0, unresolved: 0 },
        pdfTextPlusTesseractJsPlayer: { fields: FIELDS, eligible: 0, exact: 0, wrong: 0, unresolved: 0 },
        pdfTextPlusNativePlayer: { fields: FIELDS, eligible: 0, exact: 0, wrong: 0, unresolved: 0 },
        strictThreeSourceConsensus: { fields: FIELDS, eligible: 0, exact: 0, wrong: 0, unresolved: 0 },
    };
    const images = [];
    for (const expectedRow of selected) {
        const row = byName.get(expectedRow.filename);
        const image = { filename: expectedRow.filename, sourceSha256: expectedRow.sourceImage.sha256, pdfSha256: row?.pdfSha256 || null };
        if (!row || row.sourceSha256 !== expectedRow.sourceImage.sha256) {
            image.status = 'MISSING_OR_SOURCE_HASH_MISMATCH';
            images.push(image);
            for (const metric of Object.values(aggregate)) {
                for (const field of metric.fields) if (expectedRow.fieldStatus?.[field]?.eligible_for_exact_match) {
                    metric.eligible++; metric.unresolved++;
                }
            }
            continue;
        }
        const pdfPath = path.resolve(artifactRoot, row.pdfPath || '');
        const relative = path.relative(path.resolve(artifactRoot), pdfPath);
        if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Unsafe PDF artifact path: ' + expectedRow.filename);
        const pdfBytes = await fs.readFile(pdfPath);
        if (!pdfBytes.subarray(0, 5).equals(Buffer.from('%PDF-')) || pdfBytes.length !== row.pdfBytes || sha256(pdfBytes) !== row.pdfSha256) {
            image.status = 'PDF_HASH_OR_SIGNATURE_MISMATCH';
            images.push(image);
            for (const metric of Object.values(aggregate)) {
                for (const field of metric.fields) if (expectedRow.fieldStatus?.[field]?.eligible_for_exact_match) {
                    metric.eligible++; metric.unresolved++;
                }
            }
            continue;
        }
        const text = await extractPdfText(pdfPath);
        const pdfCandidates = parseTextLayer(text);
        const providerCandidates = parseProviderText(row.providerResponse?.parsedText || '');
        const readers = Object.fromEntries(['tesseractjs', 'native'].map(engine => [
            engine, (row.localReaders || []).find(reader => reader.engine === engine)?.record || {}
        ]));
        const combined = {
            pdfTextLayer: score(expectedRow.expected, pdfCandidates, aggregate.pdfTextLayer.fields),
            providerParsedText: score(expectedRow.expected, providerCandidates, aggregate.providerParsedText.fields),
            pdfTextPlusTesseractJsPlayer: score(expectedRow.expected, { ...pdfCandidates, player: readers.tesseractjs.player }, FIELDS),
            pdfTextPlusNativePlayer: score(expectedRow.expected, { ...pdfCandidates, player: readers.native.player }, FIELDS),
        };
        const consensusRecord = {};
        for (const field of FIELDS) {
            if (field === 'player') consensusRecord[field] = consensus([readers.tesseractjs.player, readers.native.player], field);
            else consensusRecord[field] = consensus([pdfCandidates[field], readers.tesseractjs[field], readers.native[field]], field);
        }
        combined.strictThreeSourceConsensus = score(expectedRow.expected, consensusRecord, FIELDS);
        for (const [key, value] of Object.entries(combined)) {
            const target = aggregate[key];
            for (const metric of ['eligible', 'exact', 'wrong', 'unresolved']) target[metric] += value.metrics[metric];
        }
        image.status = 'ANALYZED';
        image.pdfTextSha256 = sha256(Buffer.from(text, 'utf8'));
        image.pdfTextCharacters = text.length;
        image.pdfTextLayerCandidates = pdfCandidates;
        image.providerParsedTextCandidates = providerCandidates;
        image.localReaderAvailability = {
            tesseractjs: Boolean((row.localReaders || []).some(reader => reader.engine === 'tesseractjs')),
            native: Boolean((row.localReaders || []).some(reader => reader.engine === 'native')),
        };
        image.comparisons = Object.fromEntries(Object.entries(combined).map(([key, value]) => [key, value]));
        image.strictThreeSourceConsensus = consensusRecord;
        images.push(image);
    }
    for (const metric of Object.values(aggregate)) metric.exactMatchRate = metric.eligible ? metric.exact / metric.eligible : null;
    const report = {
        schemaVersion: 1,
        status: images.every(image => image.status === 'ANALYZED') ? 'COMPLETED_DIAGNOSTIC_ANALYSIS' : 'COMPLETED_WITH_MISSING_OR_INVALID_ARTIFACTS',
        diagnosticOnly: true,
        noProviderRequests: true,
        noBattleRecordMutation: true,
        playerIdentityPolicy: 'PDF/OCR.Space text-layer player identity is excluded; player may come only from local readers.',
        runReportSha256: sha256(runBytes),
        groundTruthSha256: sha256(gtBytes),
        sourceArchiveSha256: run.sourceArchiveSha256,
        inventorySelection: { id: inventory, imageCount: selected.length, filenames: selected.map(row => row.filename) },
        parser: 'parseEvidenceItem from src/ocrspace-reconciliation.js applied to Ghostscript txtwrite output from each verified searchable PDF',
        combinationRules: {
            pdfTextPlusTesseractJsPlayer: 'PDF text-layer candidates for eight non-identity fields plus local Tesseract.js player candidate',
            pdfTextPlusNativePlayer: 'PDF text-layer candidates for eight non-identity fields plus local native Tesseract player candidate',
            strictThreeSourceConsensus: 'Two matching candidates required; PDF text layer + Tesseract.js + native Tesseract for non-identity fields; local Tesseract.js + native Tesseract for player',
            acceptance: 'No candidate in this report is accepted or written to the production battle record; all results are diagnostic only.',
        },
        aggregate,
        images,
    };
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(report, null, 2) + '\n');
    await fs.writeFile(outputPath + '.sha256', sha256(await fs.readFile(outputPath)) + '  ' + path.basename(outputPath) + '\n');
    console.log(JSON.stringify({ output: outputPath, status: report.status, inventory: inventory, aggregate }, null, 2));
}
if (require.main === module) {
    main().catch(error => { console.error('[DWBOT-PDF-TEXT-LAYER] FAILED:', String(error.message || error).slice(0, 1000)); process.exitCode = 1; });
}
module.exports = { parseTextLayer, parseProviderText, score, consensus, selectRecords, GATE_B_19, ANALYSIS_21 };

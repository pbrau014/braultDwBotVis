'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const imageProcessor = require('../src/image-processor');

const FIELDS = ['result', 'player', 'map', 'mode', 'battleStart', 'credits', 'freeXp', 'damage', 'xp'];
const root = path.resolve(__dirname, '..');
function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function valuePresent(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'number') return Number.isFinite(value);
    return String(value).trim().length > 0;
}
async function main() {
    const args = process.argv.slice(2);
    const arg = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
    const candidateSha = String(arg('--candidate-sha') || '').toLowerCase();
    const gateBRunId = String(arg('--gateb-run-id') || '');
    const gateBSha = String(arg('--gateb-source-sha') || '').toLowerCase();
    const output = arg('--output');
    if (!/^[a-f0-9]{40}$/.test(candidateSha) || !/^\d+$/.test(gateBRunId) || !/^[a-f0-9]{40}$/.test(gateBSha) || !output) {
        throw new Error('Usage: node scripts/preflight-additional-screenshot-corpus.js --candidate-sha SHA --gateb-run-id ID --gateb-source-sha SHA --output FILE');
    }
    const manifestPath = path.join(root, 'testdata', 'additional-screenshot-ground-truth.json');
    const manifestBytes = await fs.readFile(manifestPath);
    const manifest = JSON.parse(manifestBytes.toString('utf8'));
    if (manifest.imageCount !== 16 || manifest.records?.length !== 16
        || JSON.stringify(manifest.requiredComparedFields) !== JSON.stringify(FIELDS)) {
        throw new Error('Gate A requires exactly 16 source images and the unchanged nine-field ground-truth contract.');
    }
    const rows = [];
    const seen = new Set();
    for (const item of manifest.records) {
        const file = path.join(root, 'fixtures', 'additional-screenshots', item.filename);
        const bytes = await fs.readFile(file);
        const hash = sha256(bytes);
        if (hash !== String(item.sha256).toLowerCase()) throw new Error('Gate A source image hash mismatch: ' + item.filename);
        if (seen.has(hash)) throw new Error('Gate A source image duplicates another corpus member: ' + item.filename);
        seen.add(hash);
        if (!item.expected || !FIELDS.every(field => valuePresent(item.expected[field]))) {
            throw new Error('Gate A ground truth is missing one or more mandatory fields: ' + item.filename);
        }
        const metadata = await imageProcessor.metadata(bytes);
        if (!metadata || !(metadata.width > 0) || !(metadata.height > 0)) throw new Error('Gate A source image dimensions are invalid: ' + item.filename);
        rows.push({ filename: item.filename, sha256: hash, bytes: bytes.length, width: metadata.width, height: metadata.height, fieldsPresent: FIELDS.length });
    }
    const corpusFingerprint = sha256(Buffer.from(rows.map(row => row.filename + ':' + row.sha256).join('\n'), 'utf8'));
    const report = {
        schemaVersion: 1,
        status: 'PREFLIGHT_PASS_NO_PROVIDER_REQUESTS',
        providerRequests: 0,
        imageCount: rows.length,
        requiredFields: FIELDS,
        candidateFingerprint: candidateSha,
        candidateFingerprintMatchesGateBSource: candidateSha === gateBSha,
        gateBSourceRunId: gateBRunId,
        gateBSourceCommitSha: gateBSha,
        manifestSha256: sha256(manifestBytes),
        corpusFingerprint,
        duplicateSourceHashes: 0,
        rows,
    };
    if (!report.candidateFingerprintMatchesGateBSource) throw new Error('Gate A candidate source fingerprint does not match the completed Gate B source run.');
    await fs.mkdir(path.dirname(path.resolve(output)), { recursive: true });
    await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n');
    console.log('[DWBOT-GATE-A-PREFLIGHT] PASS; 16 unique source images; nine fields present; source commit matches Gate B; no provider requests.');
}
main().catch(error => { console.error('[DWBOT-GATE-A-PREFLIGHT] FAILED:', String(error.message || error).slice(0, 1000)); process.exitCode = 1; });

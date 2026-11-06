'use strict';

// Independent local PaddleOCR reader. Input is only a verified PDF-derived raster.
process.env.OCRSPACE_ENABLED = '0';
process.env.OCRSPACE_NETWORK_ALLOWLIST = '0';
process.env.OCR_NON_OCR_NETWORK_RESTRICTED = '1';
if (process.env.OCR_NON_OCR_NETWORK_LOG) require('./block-network');

const fs = require('node:fs/promises');
const imageProcessor = require('../src/image-processor');
const opencv = require('../src/opencv-field-isolation');
const paddle = require('../src/paddleocr-field-fallback');

const FIELDS = ['result', 'player', 'map', 'mode', 'battleStart', 'credits', 'freeXp', 'damage', 'xp'];
const outputPath = process.argv[2];
function key(field, value) {
    const text = String(value ?? '').trim();
    if (!text) return '';
    return ['credits', 'freeXp', 'damage', 'xp'].includes(field)
        ? text.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
        : text.replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}
async function main() {
    const chunks = []; let total = 0;
    for await (const chunk of process.stdin) {
        total += chunk.length;
        if (total > 80_000_000) throw new Error('PaddleOCR raster exceeds 80 MB.');
        chunks.push(Buffer.from(chunk));
    }
    const imageBuffer = Buffer.concat(chunks);
    if (!imageBuffer.length) throw new Error('PaddleOCR received an empty raster.');
    const dimensions = await imageProcessor.metadata(imageBuffer);
    let cvAnalysis;
    try { cvAnalysis = await opencv.analyze(imageBuffer, { force: true, timeoutMs: 5000 }); }
    catch (error) { cvAnalysis = { status: 'failed', error: String(error.message || error).slice(0, 300), regions: {} }; }
    const fields = { cvFieldIsolation: cvAnalysis };
    await paddle.applyFieldFallback({
        imageBuffer, rawText: '', fields,
        sourceWidth: dimensions.width, sourceHeight: dimensions.height,
        preparedWidth: dimensions.width, preparedHeight: dimensions.height,
        timeoutMs: Number(process.env.PADDLEOCR_FIELD_FALLBACK_TIMEOUT_MS) || 15000,
        env: process.env
    });
    const fallback = fields.paddleOcrFallback || { status: 'missing-result' };
    const record = {}; const candidatesByField = {}; const conflicts = {};
    for (const field of FIELDS) {
        const values = (fallback.cropResults || []).map(item => item.fields?.[field])
            .filter(value => value !== null && value !== undefined && String(value).trim() !== '');
        const distinct = new Map(values.map(value => [key(field, value), value]));
        candidatesByField[field] = [...distinct.values()];
        record[field] = distinct.size === 1 ? [...distinct.values()][0] : null;
        if (distinct.size > 1) conflicts[field] = [...distinct.values()];
    }
    const output = {
        engine: 'paddleocr', status: fallback.status || 'unknown',
        available: ['complete', 'partial'].includes(fallback.status),
        record, candidatesByField, conflicts,
        cvAnalysis: { status: cvAnalysis.status, opencvVersion: cvAnalysis.opencvVersion,
            regionNames: Object.keys(cvAnalysis.regions || {}), preprocessing: cvAnalysis.preprocessing || [] },
        modelVersions: fallback.modelVersions || null,
        networkAttemptCount: Number(fallback.networkAttemptCount) || 0,
        cropResults: fallback.cropResults || [],
        acceptancePolicy: 'diagnostic candidates only; no standalone PaddleOCR candidate is accepted'
    };
    await fs.writeFile(outputPath, JSON.stringify({ ok: true, output }));
}
main().catch(async error => {
    try { await fs.writeFile(outputPath, JSON.stringify({ ok: false, error: String(error.message || error), code: error.code || null })); } catch {}
    console.error('[DWBOT-PADDLE-READER] ' + String(error.message || error).slice(0, 500));
    process.exitCode = 1;
});

'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

process.env.OCRSPACE_ENABLED = '1';
process.env.OCRSPACE_NETWORK_ALLOWLIST = '1';
require('./block-network');

const inventory = require('../dwbotStuff/DWBOT_64_IMAGE_INVENTORY_REVIEWED.json');
const { createOcrSpacePdfFirst } = require('../src/ocrspace-pdf-first');
const bot = require('../src/bot');

const root = path.resolve(__dirname, '..');
const sourceRoot = process.env.OCRSPACE_64_IMAGE_ROOT
    ? path.resolve(process.env.OCRSPACE_64_IMAGE_ROOT) : null;
const outputRoot = path.resolve(process.env.OCRSPACE_64_OUTPUT_DIR
    || path.join(root, 'testdata', 'ocrspace-64-image-acceptance'));
const requiredEngines = ['tesseractjs', 'native'];

function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }
function inside(parent, candidate) {
    const relative = path.relative(parent, candidate);
    return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}
function validateInventory() {
    if (inventory.imageCount !== 64 || !Array.isArray(inventory.records) || inventory.records.length !== 64) {
        throw new Error('Reviewed 64-image inventory must contain exactly 64 records.');
    }
    const hashes = inventory.records.map(item => String(item.sha256 || '').toLowerCase());
    if (hashes.some(value => !/^[a-f0-9]{64}$/.test(value)) || new Set(hashes).size !== 64) {
        throw new Error('Reviewed 64-image inventory has missing or duplicate SHA-256 values.');
    }
    if (inventory.records.some(item => item.decodeVerified !== true)) {
        throw new Error('Reviewed inventory includes an image that was not decode-verified.');
    }
}
async function extractWithEngine(rasterBuffer, engine) {
    process.env.OCRSPACE_ENABLED = '0';
    process.env.OCR_ENGINE = engine;
    process.env.OCR_CV_ASSIST = '0';
    process.env.PADDLEOCR_FIELD_FALLBACK = '0';
    const output = await bot.extractText(rasterBuffer);
    const finalAttempt = output.attempts?.[output.attempts.length - 1] || output.attempts?.[0] || { text: '' };
    const validation = bot.validateWorldOfWarshipsScreenshot(finalAttempt, output.fields || {});
    return {
        engine, record: validation.record, missing: validation.missing,
        accepted: validation.accepted, textCharacters: String(finalAttempt.text || '').length,
        confidence: validation.confidence, pageSegmentationMode: validation.pageSegmentationMode,
        ambiguities: validation.record?.ambiguities || {},
    };
}

async function main() {
    validateInventory();
    if (!String(process.env.OCRSPACE_API_KEY || '').trim()) {
        throw new Error('OCRSPACE_API_KEY is required for the 64-image OCR.Space-first inventory run.');
    }
    if (!sourceRoot) {
        throw new Error('OCRSPACE_64_IMAGE_ROOT must point to the verified extraction root of imgsHalf1.zip.');
    }
    const resolvedRoot = await fs.realpath(sourceRoot);
    await fs.mkdir(outputRoot, { recursive: true });
    const run = {
        schemaVersion: 1, status: 'running', createdAt: new Date().toISOString(),
        sourceArchive: inventory.sourceArchive, sourceArchiveSha256: process.env.OCRSPACE_64_ARCHIVE_SHA256 || null,
        inventorySha256: sha256(Buffer.from(JSON.stringify(inventory))),
        imageCount: 64, groundTruthStatus: 'not_transcribed_or_independently_reviewed',
        eligibleCount: inventory.records.filter(x => x.corpusDisposition === 'eligible_user_verified_visible_fields').length,
        excludedCount: inventory.records.filter(x => x.corpusDisposition === 'exclude_user_verified').length,
        engines: requiredEngines, results: [],
    };
    for (let index = 0; index < inventory.records.length; index++) {
        const item = inventory.records[index];
        const sourcePath = path.resolve(resolvedRoot, item.archivePath);
        if (!inside(resolvedRoot, sourcePath)) throw new Error(`Inventory path escapes source root: ${item.archivePath}`);
        const source = await fs.readFile(sourcePath);
        const actualHash = sha256(source);
        if (source.length !== Number(item.bytes) || actualHash !== String(item.sha256).toLowerCase()) {
            throw new Error(`Source archive member fingerprint mismatch: ${item.filename}; expected ${item.bytes}/${item.sha256}, got ${source.length}/${actualHash}`);
        }
        const pdfFirst = await createOcrSpacePdfFirst({
            imageBuffer: source, filename: item.filename, env: process.env,
        });
        if (pdfFirst.status !== 'complete') throw new Error(`OCR.Space PDF-first failed for ${item.filename}: ${pdfFirst.reason || pdfFirst.status}`);
        const safeStem = String(index + 1).padStart(2, '0') + '-' + path.basename(item.filename).replace(/[^a-z0-9_.-]/gi, '_');
        const pdfPath = path.join(outputRoot, safeStem + '.ocrspace.pdf');
        const rasterPath = path.join(outputRoot, safeStem + '.ocrspace-page.png');
        await fs.writeFile(pdfPath, pdfFirst.pdfBuffer);
        await fs.writeFile(rasterPath, pdfFirst.rasterBuffer);
        const localResults = [];
        for (const engine of requiredEngines) {
            localResults.push(await extractWithEngine(pdfFirst.rasterBuffer, engine));
        }
        run.results.push({
            index: index + 1, filename: item.filename, archivePath: item.archivePath,
            corpusDisposition: item.corpusDisposition, groundTruthStatus: item.groundTruthStatus,
            sourceBytes: source.length, sourceSha256: actualHash,
            uploadBytes: pdfFirst.uploadBytes, uploadSha256: pdfFirst.uploadSha256,
            uploadResized: pdfFirst.uploadResized, uploadQuality: pdfFirst.uploadQuality,
            pdfBytes: pdfFirst.pdfBytes, pdfSha256: pdfFirst.pdfSha256,
            rasterBytes: pdfFirst.rasterBytes, rasterWidth: pdfFirst.rasterWidth,
            rasterHeight: pdfFirst.rasterHeight, provider: pdfFirst.provider,
            providerEngine: pdfFirst.engine, providerExitCode: pdfFirst.providerExitCode,
            providerPartial: pdfFirst.partial, processingTimeMs: pdfFirst.processingTimeMs,
            artifacts: { pdf: path.basename(pdfPath), raster: path.basename(rasterPath) },
            localReaders: localResults,
            exactAccuracy: 'NOT_EVALUABLE_NO_INDEPENDENT_GROUND_TRUTH',
        });
        if ((index + 1) % 4 === 0) {
            run.completedImages = index + 1;
            run.updatedAt = new Date().toISOString();
            await fs.writeFile(path.join(outputRoot, 'progress.json'), JSON.stringify(run, null, 2));
        }
        console.log(`[OCRSPACE-64] ${index + 1}/64 ${item.filename} Engine2 PDF ${pdfFirst.pdfSha256}`);
    }
    run.status = 'completed-extraction-not-accuracy-accepted';
    run.completedImages = 64;
    run.updatedAt = new Date().toISOString();
    run.reportSha256 = null;
    const reportPath = path.join(outputRoot, 'ocrspace-64-inventory-report.json');
    await fs.writeFile(reportPath, JSON.stringify(run, null, 2));
    run.reportSha256 = sha256(await fs.readFile(reportPath));
    await fs.writeFile(reportPath, JSON.stringify(run, null, 2));
    await fs.writeFile(reportPath + '.sha256', run.reportSha256 + '  ' + path.basename(reportPath) + '\n');
    await bot.terminateOcrWorker().catch(() => {});
    console.log(`[OCRSPACE-64] COMPLETE: 64 PDFs generated and processed by local readers; exact accuracy NOT EVALUABLE without independent ground truth. Report: ${reportPath}`);
}
main().catch(async error => {
    await bot.terminateOcrWorker().catch(() => {});
    console.error('[OCRSPACE-64] BLOCKED/FAILED:', error.stack || error.message);
    process.exitCode = 1;
});

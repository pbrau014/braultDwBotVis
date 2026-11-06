'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

async function verifyCompletedSequenceArtifacts(row, imageSha256, artifactRoot) {
    const evidence = row?.ocrSpacePdfFirst || {};
    const fail = reason => ({ valid: false, reason });
    if (row?.pipelineCompleted !== true || evidence.status !== 'complete'
        || evidence.provider !== 'ocr.space' || evidence.engine !== 2
        || evidence.sourceSha256 !== imageSha256) {
        return fail('Prior row is not a completed Engine 2 PDF-first result for this exact source image.');
    }
    if (!artifactRoot) return fail('OCRSPACE_ARTIFACT_DIR is required to verify resumed artifacts.');
    try {
        const root = await fs.realpath(path.resolve(artifactRoot));
        const resolveInside = async value => {
            if (typeof value !== 'string' || !value.trim()) return null;
            const real = await fs.realpath(path.resolve(value));
            const relative = path.relative(root, real);
            if (!relative || relative === '.' || relative.startsWith('..') || path.isAbsolute(relative)) return null;
            return real;
        };
        const [pdfPath, rasterPath] = await Promise.all([
            resolveInside(evidence.artifacts?.pdf), resolveInside(evidence.artifacts?.raster)
        ]);
        if (!pdfPath || !rasterPath) return fail('Prior PDF/raster paths are missing, symlinked outside, or outside the configured artifact directory.');
        const [pdf, raster] = await Promise.all([fs.readFile(pdfPath), fs.readFile(rasterPath)]);
        const pdfSha256 = crypto.createHash('sha256').update(pdf).digest('hex');
        const rasterSha256 = crypto.createHash('sha256').update(raster).digest('hex');
        const pdfOk = pdf.length > 8 && pdf.subarray(0, 5).toString('ascii') === '%PDF-'
            && pdf.subarray(Math.max(0, pdf.length - 1024)).includes(Buffer.from('%%EOF'))
            && Number(evidence.pdfBytes) === pdf.length && evidence.pdfSha256 === pdfSha256;
        const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        const rasterOk = raster.length >= 24 && raster.subarray(0, 8).equals(pngSignature)
            && raster.subarray(12, 16).toString('ascii') === 'IHDR'
            && Number(evidence.rasterBytes) === raster.length && evidence.rasterSha256 === rasterSha256
            && Number(evidence.rasterWidth) === raster.readUInt32BE(16)
            && Number(evidence.rasterHeight) === raster.readUInt32BE(20);
        if (!pdfOk || !rasterOk) return fail('Prior PDF/raster failed signature, EOF, byte-count, dimensions or SHA-256 verification.');
        return { valid: true, pdfPath, rasterPath, pdfBytes: pdf.length, rasterBytes: raster.length,
            pdfSha256, rasterSha256, sourceSha256: imageSha256 };
    } catch (error) {
        return fail('Prior PDF/raster artifact could not be read or resolved: ' + String(error.message || error).slice(0, 300));
    }
}

function validateSequenceResume(progress, { entries, packageName, packageVersion, sourceMetadata }) {
    const fixtureOrder = entries.map(entry => entry.key);
    const stableMetadata = value => JSON.stringify({
        package: value?.package,
        sourceBuild: value?.sourceBuild,
        runtime: value?.runtime,
        engineVersions: value?.engineVersions,
        languageModel: value?.languageModel,
        localAssets: value?.localAssets,
        ocrConfiguration: value?.ocrConfiguration,
    });
    if (!progress || progress.schemaVersion !== 1
        || progress.recordType !== 'dwbot-ocr-sequence-progress'
        || progress.status === 'completed'
        || progress.acceptanceStatus === 'passed'
        || progress.packageName !== packageName
        || progress.packageVersion !== packageVersion
        || JSON.stringify(progress.fixtureOrder) !== JSON.stringify(fixtureOrder)
        || stableMetadata(progress.sourceMetadata) !== stableMetadata(sourceMetadata)
        || !Array.isArray(progress.results)
        || progress.results.length > entries.length) {
        const error = new Error('Prior OCR sequence progress does not match this exact source build, runtime, configuration, package or fixture inventory.');
        error.code = 'OCR_SEQUENCE_RESUME_FINGERPRINT_MISMATCH';
        throw error;
    }
    const rows = new Map();
    for (let index = 0; index < progress.results.length; index += 1) {
        const row = progress.results[index];
        const entry = entries[index];
        if (!row || row.fixtureKey !== entry.key || row.filename !== entry.filename || rows.has(row.fixtureKey)) {
            const error = new Error('Prior OCR sequence rows are duplicated, reordered or do not match the exact fixture list.');
            error.code = 'OCR_SEQUENCE_RESUME_ROW_MISMATCH';
            throw error;
        }
        rows.set(row.fixtureKey, row);
    }
    if (progress.currentJob) {
        const next = entries[progress.results.length];
        if (!next || progress.currentJob.fixtureKey !== next.key
            || progress.currentJob.filename !== next.filename
            || Number(progress.currentJob.index) !== progress.results.length + 1) {
            const error = new Error('Prior in-flight OCR job does not match the next unrecorded fixture; refusing to resume.');
            error.code = 'OCR_SEQUENCE_RESUME_ROW_MISMATCH';
            throw error;
        }
    }
    return { rows, currentJob: progress.currentJob || null };
}

function classifySequenceResumeRow(row, currentJob, fixtureKey) {
    if (row) {
        if (row.pipelineCompleted === true
            && row.ocrSpacePdfFirst?.status === 'complete'
            && row.ocrSpacePdfFirst?.provider === 'ocr.space'
            && row.ocrSpacePdfFirst?.engine === 2
            && /^[0-9a-f]{64}$/.test(String(row.imageSha256 || ''))
            && row.ocrSpacePdfFirst?.sourceSha256 === row.imageSha256
            && /^[0-9a-f]{64}$/.test(String(row.ocrSpacePdfFirst?.pdfSha256 || ''))
            && /^[0-9a-f]{64}$/.test(String(row.ocrSpacePdfFirst?.rasterSha256 || ''))) {
            return 'verify-and-skip-complete';
        }
        return 'skip-ambiguous-no-provider-retry';
    }
    if (currentJob?.fixtureKey === fixtureKey) return 'skip-ambiguous-no-provider-retry';
    return 'submit-unprocessed';
}

module.exports = { validateSequenceResume, classifySequenceResumeRow, verifyCompletedSequenceArtifacts };

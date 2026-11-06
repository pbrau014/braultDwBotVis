'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const imageProcessor = require('../src/image-processor');

const sha256 = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const SOURCE_SIMILARITY_LIMITS = Object.freeze({ meanAbsoluteError: 3, rootMeanSquareError: 8 });

function compareRgbaPixels(left, right) {
    if (!Buffer.isBuffer(left) || !Buffer.isBuffer(right) || left.length !== right.length || left.length === 0 || left.length % 4 !== 0) {
        throw new Error('Source-to-normalized raster comparison requires equal, non-empty RGBA pixel buffers.');
    }
    let absoluteSum = 0;
    let squaredSum = 0;
    for (let index = 0; index < left.length; index += 1) {
        const difference = Math.abs(left[index] - right[index]);
        absoluteSum += difference;
        squaredSum += difference * difference;
    }
    const channelCount = left.length;
    return {
        pixelCount: channelCount / 4,
        channelCount,
        meanAbsoluteError: absoluteSum / channelCount,
        rootMeanSquareError: Math.sqrt(squaredSum / channelCount),
    };
}

function safeResolve(root, relative) {
    if (typeof relative !== 'string' || !relative.trim() || path.isAbsolute(relative)) return null;
    const resolvedRoot = path.resolve(root);
    const resolved = path.resolve(resolvedRoot, relative);
    const rel = path.relative(resolvedRoot, resolved);
    if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return null;
    return resolved;
}

async function normalizeInventory({
    runReport, groundTruth, sourceImageRoot, artifactRoot, output,
    renderPdf = imageProcessor.renderSearchablePdfPage,
    readMetadata = imageProcessor.metadata,
    normalizeRaster = imageProcessor.normalizeSearchablePdfPageRaster,
    resizeSource = (buffer, width, height) => imageProcessor.cropResize(buffer, { left: 0, top: 0, width, height }, width),
    requiredImageCount = 63,
    toRawRgba = buffer => imageProcessor.__test.runImageMagick(
        ['png:-', '-depth', '8', 'rgba:-'], buffer,
        { timeoutMs: 60000, maxOutputBytes: 80_000_000 }
    ),
}) {
    const run = typeof runReport === 'string' ? JSON.parse(await fs.readFile(runReport, 'utf8')) : runReport;
    const gt = typeof groundTruth === 'string' ? JSON.parse(await fs.readFile(groundTruth, 'utf8')) : groundTruth;
    const results = Array.isArray(run?.results) ? run.results : [];
    const records = Array.isArray(gt?.records) ? gt.records : [];
    const expectedByName = new Map(records.map(item => [item.filename, item]));
    const report = {
        schemaVersion: 1,
        status: 'RUNNING',
        method: 'source-aspect-top-aligned-crop-v1',
        sourceRunSha: run?.sourceCommitSha || run?.sourceBuild?.sha256 || null,
        sourceResultCount: results.length,
        expectedGroundTruthCount: records.length,
        providerRequests: 0,
        networkAccessRequired: false,
        verifiedCount: 0,
        failedCount: 0,
        missingArtifactCount: 0,
        normalizedCount: 0,
        images: [],
    };
    const normalizedRoot = path.join(artifactRoot, 'normalized-63');
    await fs.mkdir(normalizedRoot, { recursive: true });

    for (let index = 0; index < results.length; index += 1) {
        const row = results[index];
        const image = { index: row.index || index + 1, filename: row.filename, status: 'FAIL', checks: {} };
        try {
            if (!row.filename || typeof row.filename !== 'string') throw new Error('Run row has no valid source filename.');
            const expected = expectedByName.get(row.filename);
            if (!expected?.sourceImage?.sha256) throw new Error('Ground-truth source image identity is missing.');
            const sourcePath = safeResolve(sourceImageRoot, row.filename);
            const pdfPath = safeResolve(artifactRoot, row.pdfPath);
            const pageRasterPath = safeResolve(artifactRoot, row.pageRasterPath || row.rasterPath);
            if (!sourcePath || !pdfPath || !pageRasterPath) throw new Error('Source, PDF or page-raster path is missing or unsafe.');

            const [sourceBuffer, pdfBuffer, pageRasterBuffer] = await Promise.all([
                fs.readFile(sourcePath), fs.readFile(pdfPath), fs.readFile(pageRasterPath),
            ]);
            const sourceHash = sha256(sourceBuffer);
            const pdfHash = sha256(pdfBuffer);
            const pageRasterHash = sha256(pageRasterBuffer);
            const sourceMetadata = await readMetadata(sourceBuffer);
            const sourceWidth = Number(expected.sourceImage.width || sourceMetadata.width);
            const sourceHeight = Number(expected.sourceImage.height || sourceMetadata.height);
            const sourceOk = sourceHash === expected.sourceImage.sha256
                && (!row.sourceSha256 || sourceHash === row.sourceSha256)
                && (!row.sourceBytes || sourceBuffer.length === row.sourceBytes)
                && sourceMetadata.width === sourceWidth && sourceMetadata.height === sourceHeight;
            if (!sourceOk) throw new Error('Original source image hash, byte count or dimensions do not match the approved manifest/ground truth.');
            image.checks.sourceImage = 'PASS';

            const pdfOk = pdfBuffer.subarray(0, 5).toString('ascii') === '%PDF-'
                && pdfBuffer.length === row.pdfBytes && pdfHash === row.pdfSha256;
            if (!pdfOk) throw new Error('Preserved searchable PDF signature, size or SHA-256 does not match the source run report.');
            image.checks.pdfIntegrity = 'PASS';

            const pageRasterMetadata = await readMetadata(pageRasterBuffer);
            const pageRasterOk = pageRasterBuffer.length === row.rasterBytes
                && pageRasterHash === row.rasterSha256
                && pageRasterMetadata.width === row.rasterWidth
                && pageRasterMetadata.height === row.rasterHeight;
            if (!pageRasterOk) throw new Error('Preserved full-page raster size, dimensions or SHA-256 does not match the source run report.');
            image.checks.pageRasterIntegrity = 'PASS';

            const renderedPage = await renderPdf(pdfBuffer);
            const renderedMetadata = await readMetadata(renderedPage);
            const renderedHash = sha256(renderedPage);
            if (renderedHash !== row.rasterSha256
                || renderedMetadata.width !== row.rasterWidth
                || renderedMetadata.height !== row.rasterHeight) {
                throw new Error('Fresh PDF page raster does not match the recorded full-page raster fingerprint.');
            }
            const [savedPixels, renderedPixels] = await Promise.all([
                toRawRgba(pageRasterBuffer), toRawRgba(renderedPage),
            ]);
            if (!Buffer.isBuffer(savedPixels) || !Buffer.isBuffer(renderedPixels) || !savedPixels.equals(renderedPixels)) {
                throw new Error('Saved full-page raster is not pixel-identical to a fresh rendering of the preserved PDF.');
            }
            image.checks.pdfPageProvenance = 'PASS';

            const normalized = await normalizeRaster(renderedPage, { sourceWidth, sourceHeight });
            if (!Buffer.isBuffer(normalized?.buffer) || !normalized.buffer.length
                || normalized.normalization?.method !== 'source-aspect-top-aligned-crop-v1') {
                throw new Error('Source-aspect normalizer did not return the verified normalization method and bytes.');
            }
            const normalizedMetadata = await readMetadata(normalized.buffer);
            if (normalizedMetadata.width !== normalized.normalization.normalizedWidth
                || normalizedMetadata.height !== normalized.normalization.normalizedHeight) {
                throw new Error('Normalized raster dimensions do not match the recorded normalization transform.');
            }
            const resizedSource = await resizeSource(sourceBuffer, sourceWidth, sourceHeight, normalizedMetadata.width);
            const resizedSourceMetadata = await readMetadata(resizedSource);
            if (resizedSourceMetadata.width !== normalizedMetadata.width
                || resizedSourceMetadata.height !== normalizedMetadata.height) {
                throw new Error('Resized original screenshot dimensions do not match the normalized PDF crop.');
            }
            const [normalizedPixels, sourcePixels] = await Promise.all([
                toRawRgba(normalized.buffer), toRawRgba(resizedSource),
            ]);
            const sourceSimilarity = compareRgbaPixels(normalizedPixels, sourcePixels);
            sourceSimilarity.limits = SOURCE_SIMILARITY_LIMITS;
            sourceSimilarity.sourceResizedSha256 = sha256(resizedSource);
            sourceSimilarity.sourceResizedWidth = resizedSourceMetadata.width;
            sourceSimilarity.sourceResizedHeight = resizedSourceMetadata.height;
            if (sourceSimilarity.meanAbsoluteError > SOURCE_SIMILARITY_LIMITS.meanAbsoluteError
                || sourceSimilarity.rootMeanSquareError > SOURCE_SIMILARITY_LIMITS.rootMeanSquareError) {
                throw new Error(`Normalized PDF crop does not sufficiently match the original screenshot (MAE=${sourceSimilarity.meanAbsoluteError.toFixed(3)}, RMSE=${sourceSimilarity.rootMeanSquareError.toFixed(3)}; limits MAE<=${SOURCE_SIMILARITY_LIMITS.meanAbsoluteError}, RMSE<=${SOURCE_SIMILARITY_LIMITS.rootMeanSquareError}).`);
            }
            const outputName = String(index + 1).padStart(2, '0') + '-'
                + path.basename(row.filename).replace(/[^a-z0-9_.-]/gi, '_') + '.pdf-content.png';
            const destination = path.join(normalizedRoot, outputName);
            try {
                await fs.writeFile(destination, normalized.buffer, { flag: 'wx' });
            } catch (error) {
                if (error.code !== 'EEXIST') throw error;
                const existing = await fs.readFile(destination);
                if (!existing.equals(normalized.buffer)) {
                    throw new Error('Existing normalized-raster path contains different bytes; refusing overwrite.');
                }
            }
            image.checks.sourceAspectNormalization = 'PASS';
            image.checks.sourceSimilarity = 'PASS';
            image.sourceSimilarity = sourceSimilarity;
            image.status = 'PASS';
            image.source = {
                bytes: sourceBuffer.length, sha256: sourceHash, width: sourceWidth, height: sourceHeight,
            };
            image.pdf = { bytes: pdfBuffer.length, sha256: pdfHash };
            image.pageRaster = {
                path: path.relative(artifactRoot, pageRasterPath).split(path.sep).join('/'),
                bytes: pageRasterBuffer.length, sha256: pageRasterHash,
                width: pageRasterMetadata.width, height: pageRasterMetadata.height,
            };
            image.normalizedRaster = {
                path: path.relative(artifactRoot, destination).split(path.sep).join('/'),
                bytes: normalized.buffer.length, sha256: sha256(normalized.buffer),
                width: normalizedMetadata.width, height: normalizedMetadata.height,
                normalization: normalized.normalization,
            };
            report.verifiedCount += 1;
            report.normalizedCount += 1;
        } catch (error) {
            image.error = String(error.message || error).slice(0, 500);
            if (/ENOENT|missing/i.test(image.error)) report.missingArtifactCount += 1;
            report.failedCount += 1;
        }
        report.images.push(image);
    }

    report.status = report.sourceResultCount === requiredImageCount && report.verifiedCount === requiredImageCount
        && report.failedCount === 0 ? 'PASS' : 'FAIL';
    report.completedAt = new Date().toISOString();
    if (output) {
        await fs.mkdir(path.dirname(path.resolve(output)), { recursive: true });
        await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n', { flag: 'w' });
    }
    return report;
}

function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i += 1) {
        if (argv[i].startsWith('--')) {
            const key = argv[i].slice(2);
            if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('Missing value for --' + key);
            args[key] = argv[++i];
        }
    }
    return args;
}

if (require.main === module) {
    (async () => {
        const args = parseArgs(process.argv.slice(2));
        for (const key of ['run-report', 'ground-truth', 'source-image-root', 'artifact-root', 'output']) {
            if (!args[key]) throw new Error('Required argument missing: --' + key);
        }
        const report = await normalizeInventory({
            runReport: args['run-report'],
            groundTruth: args['ground-truth'],
            sourceImageRoot: args['source-image-root'],
            artifactRoot: args['artifact-root'],
            output: args.output,
        });
        console.log(JSON.stringify({
            output: args.output, status: report.status, sourceResultCount: report.sourceResultCount,
            verifiedCount: report.verifiedCount, failedCount: report.failedCount,
            missingArtifactCount: report.missingArtifactCount, normalizedCount: report.normalizedCount,
            providerRequests: report.providerRequests, networkAccessRequired: report.networkAccessRequired,
        }, null, 2));
        if (report.status !== 'PASS') process.exitCode = 1;
    })().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
}

module.exports = { normalizeInventory, safeResolve, compareRgbaPixels, SOURCE_SIMILARITY_LIMITS };

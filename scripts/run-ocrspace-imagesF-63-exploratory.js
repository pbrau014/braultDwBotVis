'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

process.env.OCRSPACE_ENABLED = '1';
process.env.OCRSPACE_NETWORK_ALLOWLIST = '1';
require('./block-network');

const { createOcrSpacePdfFirst } = require('../src/ocrspace-pdf-first');
const { validateResumeState, classifyResumeRow } = require('../src/ocrspace-exploratory-resume');
const bot = require('../src/bot');
const root = path.resolve(__dirname, '..');
const imageRoot = path.resolve(process.env.OCRSPACE_63_IMAGE_ROOT || '');
const preflightPath = path.resolve(process.env.OCRSPACE_63_PREFLIGHT_REPORT || '');
const outputRoot = path.resolve(process.env.OCRSPACE_63_OUTPUT_DIR || path.join(root, 'testdata', 'ocrspace-imagesF-63-exploratory'));
const expectedArchiveSha = '6294944fbad9df05feeeac57b68acaf12642f8c883697748cad3b1a88f8bcba3';
const requiredFields = ['result', 'player', 'map', 'mode', 'battleStart', 'credits', 'freeXp', 'damage', 'xp'];
const engines = ['tesseractjs', 'native'];

function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }

async function writeProgress(outputRoot, run) {
    run.completedImages = run.results.length;
    run.updatedAt = new Date().toISOString();
    const target = path.join(outputRoot, 'progress.json');
    const temp = target + '.' + process.pid + '.tmp';
    try {
        await fs.writeFile(temp, JSON.stringify(run, null, 2) + '\n', { flag: 'wx' });
        await fs.rename(temp, target);
    } catch (error) {
        await fs.rm(temp, { force: true }).catch(() => {});
        throw error;
    }
}

function syncResults(run, rows) {
    run.results = [...rows.values()].sort((a, b) => a.index - b.index);
}

async function extractWithEngine(rasterBuffer, engine) {
    process.env.OCRSPACE_ENABLED = '0';
    process.env.OCR_ENGINE = engine;
    process.env.OCR_CV_ASSIST = '0';
    process.env.PADDLEOCR_FIELD_FALLBACK = '0';
    const output = await bot.extractText(rasterBuffer);
    const attempt = output.attempts?.[output.attempts.length - 1] || output.attempts?.[0] || { text: '' };
    const validation = bot.validateWorldOfWarshipsScreenshot(attempt, output.fields || {});
    return {
        engine,
        record: validation.record,
        missing: validation.missing,
        accepted: validation.accepted,
        textCharacters: String(attempt.text || '').length,
        confidence: validation.confidence,
        pageSegmentationMode: validation.pageSegmentationMode,
        ambiguities: validation.record?.ambiguities || {},
    };
}

async function main() {
    if (!String(process.env.OCRSPACE_API_KEY || '').trim()) throw new Error('OCRSPACE_API_KEY is missing; no provider submission permitted.');
    if (!imageRoot || !preflightPath) throw new Error('63-image verified preflight paths are required.');
    const preflight = JSON.parse(await fs.readFile(preflightPath, 'utf8'));
    if (preflight.status !== 'verified-imagesF-63-exploratory'
        || preflight.providerRequestsPermitted !== true
        || preflight.archiveSha256 !== expectedArchiveSha
        || preflight.imageMemberCount !== 63
        || preflight.allImageMemberHashesVerified !== true
        || preflight.groundTruthStatus !== 'NOT_EVALUABLE_NO_INDEPENDENT_GROUND_TRUTH') {
        throw new Error('63-image archive preflight is missing, incomplete, or mismatched; provider submissions are blocked.');
    }
    const verifiedRoot = await fs.realpath(imageRoot);
    if (preflight.verifiedMembers.length !== 63) throw new Error('Preflight does not contain 63 verified member records.');
    await fs.mkdir(outputRoot, { recursive: true });
    const progressPath = path.join(outputRoot, 'progress.json');
    const reportPath = path.join(outputRoot, 'ocrspace-imagesF-63-exploratory-report.json');
    const preflightReportSha256 = sha256(await fs.readFile(preflightPath));
    const resume = process.env.OCRSPACE_63_RESUME === '1';
    let run;
    let resultByName;
    if (resume) {
        try { await fs.access(reportPath); throw new Error('The prior batch already has a final report; it is complete and must be evaluated, not resumed.'); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
        let saved;
        try { saved = JSON.parse(await fs.readFile(progressPath, 'utf8')); }
        catch (error) { throw new Error('Resume requested but the prior progress.json is missing or unreadable: ' + error.message); }
        resultByName = validateResumeState(saved, {
            sourceArchiveSha256: expectedArchiveSha,
            preflightReportSha256,
            verifiedMembers: preflight.verifiedMembers,
            requiredFields
        });
        run = saved;
        run.status = 'resuming-exploratory';
        run.resumeStartedAt = new Date().toISOString();
    } else {
        for (const existing of [progressPath, reportPath]) {
            try { await fs.access(existing); throw new Error('Existing OCR.Space output found at ' + existing + '; use OCRSPACE_63_RESUME=1 with its exact verified progress instead of starting a duplicate batch.'); }
            catch (error) { if (error.code !== 'ENOENT') throw error; }
        }
        run = {
            schemaVersion: 1,
            status: 'running-exploratory',
            createdAt: new Date().toISOString(),
            sourceArchiveSha256: expectedArchiveSha,
            preflightReportSha256,
            imageCount: 63,
            requiredFields,
            groundTruthStatus: 'NOT_EVALUABLE_NO_INDEPENDENT_GROUND_TRUTH',
            accuracy: 'NOT_EVALUABLE_NO_INDEPENDENT_GROUND_TRUTH',
            gateB: 'NOT_PASSED',
            provider: 'OCR.Space',
            providerEngine: 2,
            pipeline: 'source screenshot -> OCR.Space Engine 2 searchable PDF -> validated PDF -> local PDF raster -> local readers',
            originalScreenshotFallback: false,
            results: [],
            missingGroundTruthRegister: {
                status: 'preserved-in-repository',
                workbookCounts: { populatedRows: 46, completeNineFieldRows: 36, partialRows: 10, imagesWithoutRows: 10 },
                missingCells: { damage: 8, xp: 2, map: 1 },
                note: 'No missing expected values were inferred or fabricated. These are exploratory outputs, not Gate B accuracy evidence.'
            }
        };
        resultByName = new Map();
    }
    for (let i = 0; i < preflight.verifiedMembers.length; i++) {
        const item = preflight.verifiedMembers[i];
        const index = i + 1;
        const prior = resultByName.get(item.filename);
        const decision = classifyResumeRow(prior, { ...item, index });
        if (decision === 'skip-complete') {
            const pdfPath = path.resolve(outputRoot, String(prior.pdfPath || ''));
            const rasterPath = path.resolve(outputRoot, String(prior.rasterPath || ''));
            const safeArtifactPath = (target, relative) => path.dirname(target) === outputRoot && !path.isAbsolute(relative) && path.basename(relative) === relative;
            let artifactsValid = safeArtifactPath(pdfPath, prior.pdfPath) && safeArtifactPath(rasterPath, prior.rasterPath);
            if (artifactsValid) {
                try {
                    artifactsValid = sha256(await fs.readFile(pdfPath)) === prior.pdfSha256
                        && sha256(await fs.readFile(rasterPath)) === prior.rasterSha256;
                } catch { artifactsValid = false; }
            }
            if (artifactsValid) {
                console.log('[OCRSPACE-IMAGESF-63] ' + index + '/63 ' + item.filename + ' already complete; provider skipped');
                continue;
            }
            prior.resumeDisposition = 'artifact-integrity-failure-no-provider-retry';
            prior.status = 'artifact-integrity-failure-no-resubmit';
            prior.failure = { code: 'OCRSPACE_RESUME_ARTIFACT_INVALID', message: 'Previously completed PDF/raster artifact is missing, unsafe, or hash-mismatched; provider submission was not repeated.' };
            syncResults(run, resultByName);
            await writeProgress(outputRoot, run);
            console.log('[OCRSPACE-IMAGESF-63] ' + index + '/63 ' + item.filename + ' artifact integrity failure; provider skipped');
            continue;
        }
        if (decision === 'skip-ambiguous') {
            prior.resumeDisposition = 'ambiguous-provider-submission-not-retried';
            prior.previousStatus = prior.status;
            prior.status = 'ambiguous-provider-submission-not-retried';
            prior.failure = prior.failure || { code: 'OCRSPACE_RESUME_AMBIGUOUS_SUBMISSION', message: 'A prior provider request may have been sent. Automatic resubmission is prohibited; reconcile provider/artifact evidence manually.' };
            syncResults(run, resultByName);
            await writeProgress(outputRoot, run);
            console.log('[OCRSPACE-IMAGESF-63] ' + index + '/63 ' + item.filename + ' ambiguous prior request; provider skipped');
            continue;
        }

        const sourcePath = path.resolve(verifiedRoot, item.filename);
        const relative = path.relative(verifiedRoot, sourcePath);
        if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Unsafe verified member path: ' + item.filename);
        const realSourcePath = await fs.realpath(sourcePath);
        if (!realSourcePath.startsWith(verifiedRoot + path.sep)) throw new Error('Source member resolved outside verified root: ' + item.filename);
        const source = await fs.readFile(realSourcePath);
        const sourceSha = sha256(source);
        if (source.length !== item.bytes || sourceSha !== item.sha256) throw new Error('Source member changed after preflight: ' + item.filename);
        const row = prior || {
            index, filename: item.filename, sourceBytes: source.length, sourceSha256: sourceSha,
            exactAccuracy: 'NOT_EVALUABLE_NO_INDEPENDENT_GROUND_TRUTH', providerSubmissionAttempted: false
        };
        row.status = 'prepared';
        row.providerSubmissionAttempted = false;
        delete row.failure;
        delete row.resumeDisposition;
        resultByName.set(item.filename, row);
        syncResults(run, resultByName);
        await writeProgress(outputRoot, run);

        try {
            const pdfFirst = await createOcrSpacePdfFirst({
                imageBuffer: source,
                filename: item.filename,
                env: process.env,
                onProviderRequestStarted: async detail => {
                    row.providerSubmissionAttempted = true;
                    row.status = 'provider-submission-started';
                    row.providerRequestStartedAt = new Date().toISOString();
                    row.uploadBytes = detail.uploadBytes;
                    row.uploadSha256 = detail.uploadSha256;
                    syncResults(run, resultByName);
                    await writeProgress(outputRoot, run);
                }
            });
            if (pdfFirst.status !== 'complete') throw new Error(pdfFirst.reason || 'PDF-first provider step did not complete');
            const stem = String(index).padStart(2, '0') + '-' + path.basename(item.filename).replace(/[^a-z0-9_.-]/gi, '_');
            const pdfName = stem + '.ocrspace.pdf';
            const rasterName = stem + '.pdf-page.png';
            const pdfPath = path.join(outputRoot, pdfName);
            const rasterPath = path.join(outputRoot, rasterName);
            row.status = 'pdf-first-complete';
            row.uploadBytes = pdfFirst.uploadBytes;
            row.uploadSha256 = pdfFirst.uploadSha256;
            row.uploadResized = pdfFirst.uploadResized;
            row.uploadQuality = pdfFirst.uploadQuality;
            row.pdfBytes = pdfFirst.pdfBytes;
            row.pdfSha256 = pdfFirst.pdfSha256;
            row.rasterBytes = pdfFirst.rasterBytes;
            row.rasterSha256 = sha256(pdfFirst.rasterBuffer);
            row.rasterWidth = pdfFirst.rasterWidth;
            row.rasterHeight = pdfFirst.rasterHeight;
            row.pdfPath = pdfName;
            row.rasterPath = rasterName;
            row.providerResponse = {
                engine: pdfFirst.engine,
                exitCode: pdfFirst.providerExitCode,
                partial: pdfFirst.partial,
                processingTimeMs: pdfFirst.processingTimeMs,
                searchablePdfUrlHost: pdfFirst.searchablePdfUrlHost,
                parsedText: pdfFirst.providerText
            };
            await fs.writeFile(pdfPath, pdfFirst.pdfBuffer, { flag: 'wx' });
            await fs.writeFile(rasterPath, pdfFirst.rasterBuffer, { flag: 'wx' });
            row.localReaders = [];
            row.localReaderFailures = [];
            for (const engine of engines) {
                try { row.localReaders.push(await extractWithEngine(pdfFirst.rasterBuffer, engine)); }
                catch (readerError) {
                    row.localReaderFailures.push({ engine, code: readerError.code || null, message: String(readerError.message || readerError).slice(0, 400) });
                }
            }
        } catch (error) {
            row.status = 'failed';
            row.failure = { code: error.code || null, message: String(error.message || error).slice(0, 500) };
        }
        if (row.status === 'failed' && row.pdfSha256) row.status = 'pdf-first-complete-local-artifact-error';
        syncResults(run, resultByName);
        await writeProgress(outputRoot, run);
        console.log('[OCRSPACE-IMAGESF-63] ' + index + '/63 ' + item.filename + ' ' + row.status);
    }
    run.status = run.results.every(row => row.status === 'pdf-first-complete')
        ? 'completed-exploratory-extraction'
        : 'completed-with-per-image-failures';
    run.successfulPdfExtractions = run.results.filter(row => row.status === 'pdf-first-complete').length;
    run.failedImages = run.results.filter(row => row.status !== 'pdf-first-complete').length;
    run.accuracy = 'NOT_EVALUABLE_NO_INDEPENDENT_GROUND_TRUTH';
    run.gateB = 'NOT_PASSED';
    run.updatedAt = new Date().toISOString();
    const reportPath = path.join(outputRoot, 'ocrspace-imagesF-63-exploratory-report.json');
    await fs.writeFile(reportPath, JSON.stringify(run, null, 2) + '\n');
    await fs.writeFile(reportPath + '.sha256', sha256(await fs.readFile(reportPath)) + '  ' + path.basename(reportPath) + '\n');
    await bot.terminateOcrWorker().catch(() => {});
    console.log('[OCRSPACE-IMAGESF-63] ' + run.status + '; successful PDFs=' + run.successfulPdfExtractions + '; failures=' + run.failedImages + '; accuracy NOT EVALUABLE; Gate B NOT PASSED.');
}
main().catch(async error => {
    await bot.terminateOcrWorker().catch(() => {});
    console.error('[OCRSPACE-IMAGESF-63] BLOCKED/FAILED:', error.stack || error.message);
    process.exitCode = 1;
});

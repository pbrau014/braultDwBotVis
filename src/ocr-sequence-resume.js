'use strict';

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

module.exports = { validateSequenceResume, classifySequenceResumeRow };

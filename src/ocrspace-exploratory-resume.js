'use strict';

const HASH = /^[0-9a-f]{64}$/;

function validateResumeState(run, { sourceArchiveSha256, preflightReportSha256, verifiedMembers, requiredFields }) {
    if (!run || run.schemaVersion !== 1 || run.sourceArchiveSha256 !== sourceArchiveSha256
        || run.preflightReportSha256 !== preflightReportSha256 || run.imageCount !== verifiedMembers.length
        || run.imageCount !== 63 || JSON.stringify(run.requiredFields) !== JSON.stringify(requiredFields)
        || !Array.isArray(run.results)) {
        const error = new Error('Existing OCR.Space progress does not match this exact archive, preflight, inventory, or required-field contract.');
        error.code = 'OCRSPACE_RESUME_FINGERPRINT_MISMATCH';
        throw error;
    }
    const expected = new Map(verifiedMembers.map((item, index) => [item.filename, { ...item, index: index + 1 }]));
    const rows = new Map();
    for (const row of run.results) {
        const item = expected.get(row?.filename);
        if (!item || rows.has(row.filename) || row.index !== item.index || row.sourceSha256 !== item.sha256) {
            const error = new Error('Existing OCR.Space progress contains an unknown, duplicate, reordered, or source-hash-mismatched image row.');
            error.code = 'OCRSPACE_RESUME_ROW_MISMATCH';
            throw error;
        }
        rows.set(row.filename, row);
    }
    return rows;
}

function classifyResumeRow(row, item) {
    if (!row) return 'submit';
    if (row.sourceSha256 !== item.sha256 || row.index !== item.index) {
        const error = new Error('Resume row does not match the verified source image: ' + item.filename);
        error.code = 'OCRSPACE_RESUME_ROW_MISMATCH';
        throw error;
    }
    const hasVerifiedArtifactReferences = HASH.test(String(row.pdfSha256 || ''))
        && HASH.test(String(row.rasterSha256 || ''))
        && typeof row.pdfPath === 'string' && row.pdfPath.length > 0
        && typeof row.rasterPath === 'string' && row.rasterPath.length > 0;
    if (row.status === 'pdf-first-complete' && hasVerifiedArtifactReferences) {
        const readerNames = new Set((row.localReaders || []).map(reader => reader.engine));
        const readerFailures = Array.isArray(row.localReaderFailures) && row.localReaderFailures.length > 0;
        if (readerNames.has('tesseractjs') && readerNames.has('native') && !readerFailures) return 'skip-complete';
    }
    if (row.providerSubmissionAttempted === true && hasVerifiedArtifactReferences) return 'resume-local-only';
    if (row.providerSubmissionAttempted === true || row.status === 'provider-submission-started') return 'skip-ambiguous';
    return 'submit';
}

module.exports = { validateResumeState, classifyResumeRow };

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateSequenceResume, classifySequenceResumeRow, verifyCompletedSequenceArtifacts } = require('../src/ocr-sequence-resume');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const entries = [
    { key: 'one.png', filename: 'one.png' },
    { key: 'two.png', filename: 'two.png' },
    { key: 'three.png', filename: 'three.png' },
];
const metadata = {
    package: { name: 'dwbot', version: '1.0.0' },
    sourceBuild: { sha256: 'a'.repeat(64), files: 12 },
    runtime: { node: 'v24.17.0', platform: 'win32', arch: 'x64' },
    engineVersions: { tesseractJs: '6.0.1', tesseractJsCore: '6.1.2' },
    languageModel: { sha256: 'b'.repeat(64) },
    localAssets: [{ role: 'wasm', sha256: 'c'.repeat(64) }],
    ocrConfiguration: { engine: 'tesseractjs', networkPolicy: 'restricted' },
};
function progress(results = [], currentJob = null) {
    return {
        schemaVersion: 1, recordType: 'dwbot-ocr-sequence-progress',
        status: 'failed', acceptanceStatus: 'not-evaluated',
        packageName: 'dwbot', packageVersion: '1.0.0',
        fixtureOrder: entries.map(entry => entry.key),
        sourceMetadata: metadata, results, currentJob,
    };
}
function completedRow(entry, index) {
    const hash = String(index + 1).repeat(64);
    return {
        fixtureKey: entry.key, filename: entry.filename, imageSha256: hash,
        pipelineCompleted: true, allExpectedFieldsPass: true, allRequiredFieldsPass: true,
        ocrSpacePdfFirst: {
            status: 'complete', provider: 'ocr.space', engine: 2,
            sourceSha256: hash, pdfSha256: 'd'.repeat(64), rasterSha256: 'e'.repeat(64),
        },
    };
}

test('resume binds progress to exact fixture order, source build, runtime and OCR configuration', () => {
    const rows = [completedRow(entries[0], 0)];
    const validated = validateSequenceResume(progress(rows), {
        entries, packageName: 'dwbot', packageVersion: '1.0.0', sourceMetadata: metadata,
    });
    assert.equal(validated.rows.size, 1);
    assert.throws(() => validateSequenceResume(progress(rows), {
        entries, packageName: 'dwbot', packageVersion: '1.0.0',
        sourceMetadata: { ...metadata, sourceBuild: { sha256: 'f'.repeat(64), files: 12 } },
    }), { code: 'OCR_SEQUENCE_RESUME_FINGERPRINT_MISMATCH' });
    assert.throws(() => validateSequenceResume(progress(rows), {
        entries: [...entries].reverse(), packageName: 'dwbot', packageVersion: '1.0.0', sourceMetadata: metadata,
    }), { code: 'OCR_SEQUENCE_RESUME_FINGERPRINT_MISMATCH' });
});

test('resume rejects completed progress and non-prefix/reordered result rows', () => {
    const finished = progress([completedRow(entries[0], 0)]);
    finished.status = 'completed';
    assert.throws(() => validateSequenceResume(finished, {
        entries, packageName: 'dwbot', packageVersion: '1.0.0', sourceMetadata: metadata,
    }), { code: 'OCR_SEQUENCE_RESUME_FINGERPRINT_MISMATCH' });
    assert.throws(() => validateSequenceResume(progress([completedRow(entries[1], 1)]), {
        entries, packageName: 'dwbot', packageVersion: '1.0.0', sourceMetadata: metadata,
    }), { code: 'OCR_SEQUENCE_RESUME_ROW_MISMATCH' });
});

test('verified completed provider rows are skipped; uncertain rows are never resubmitted', () => {
    const complete = completedRow(entries[0], 0);
    assert.equal(classifySequenceResumeRow(complete, null, entries[0].key), 'verify-and-skip-complete');
    assert.equal(classifySequenceResumeRow({ ...complete, ocrSpacePdfFirst: { ...complete.ocrSpacePdfFirst, rasterSha256: null } }, null, entries[0].key), 'skip-ambiguous-no-provider-retry');
    assert.equal(classifySequenceResumeRow({ fixtureKey: entries[0].key, pipelineCompleted: false }, null, entries[0].key), 'skip-ambiguous-no-provider-retry');
    assert.equal(classifySequenceResumeRow(null, { fixtureKey: entries[1].key }, entries[1].key), 'skip-ambiguous-no-provider-retry');
    assert.equal(classifySequenceResumeRow(null, null, entries[2].key), 'submit-unprocessed');
});


test('completed resume artifacts are verified by exact path, signature, size, dimensions and SHA-256', async t => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dwbot-resume-artifacts-'));
    t.after(() => fs.rm(root, { recursive: true, force: true }));
    const pdf = Buffer.from('%PDF-1.7\\nresume fixture\\n%%EOF');
    const png = Buffer.alloc(24);
    Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]).copy(png,0);
    Buffer.from('IHDR').copy(png,12);
    png.writeUInt32BE(1600,16); png.writeUInt32BE(900,20);
    const pdfPath = path.join(root,'one.pdf'), rasterPath = path.join(root,'one.png');
    await fs.writeFile(pdfPath,pdf); await fs.writeFile(rasterPath,png);
    const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
    const row = completedRow(entries[0],0);
    row.ocrSpacePdfFirst = {
        status:'complete',provider:'ocr.space',engine:2,sourceSha256:row.imageSha256,
        pdfBytes:pdf.length,pdfSha256:digest(pdf),rasterBytes:png.length,rasterSha256:digest(png),
        rasterWidth:1600,rasterHeight:900,artifacts:{pdf:pdfPath,raster:rasterPath}
    };
    const result = await verifyCompletedSequenceArtifacts(row,row.imageSha256,root);
    assert.equal(result.valid,true);
    assert.equal(result.pdfSha256,digest(pdf));
    assert.equal(result.rasterSha256,digest(png));
});

test('resume artifact verification rejects tampering and paths outside the artifact root', async t => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dwbot-resume-artifacts-bad-'));
    t.after(() => fs.rm(root, { recursive: true, force: true }));
    const pdf = Buffer.from('%PDF-1.7\\nresume fixture\\n%%EOF');
    const png = Buffer.alloc(24);
    Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]).copy(png,0);
    Buffer.from('IHDR').copy(png,12); png.writeUInt32BE(1600,16); png.writeUInt32BE(900,20);
    const pdfPath=path.join(root,'one.pdf'),rasterPath=path.join(root,'one.png');
    await fs.writeFile(pdfPath,pdf); await fs.writeFile(rasterPath,png);
    const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
    const row=completedRow(entries[0],0);
    row.ocrSpacePdfFirst={status:'complete',provider:'ocr.space',engine:2,sourceSha256:row.imageSha256,
      pdfBytes:pdf.length,pdfSha256:digest(pdf),rasterBytes:png.length,rasterSha256:digest(png),
      rasterWidth:1600,rasterHeight:900,artifacts:{pdf:pdfPath,raster:rasterPath}};
    await fs.writeFile(pdfPath,Buffer.from('%PDF-1.7\\nchanged\\n%%EOF'));
    assert.equal((await verifyCompletedSequenceArtifacts(row,row.imageSha256,root)).valid,false);
    await fs.writeFile(pdfPath,pdf);
    const outside=path.join(path.dirname(root),'outside.pdf');
    await fs.writeFile(outside,pdf);
    row.ocrSpacePdfFirst.artifacts.pdf=outside;
    assert.equal((await verifyCompletedSequenceArtifacts(row,row.imageSha256,root)).valid,false);
});

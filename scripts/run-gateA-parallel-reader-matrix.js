'use strict';

// Diagnostic-only parallel reader matrix for Gate A. Reuses only existing,
// verified OCR.Space PDFs and PDF-derived rasters; never calls OCR.Space.
process.env.OCRSPACE_ENABLED = '0';
process.env.OCRSPACE_NETWORK_ALLOWLIST = '0';
process.env.OCR_NON_OCR_NETWORK_RESTRICTED = '1';
process.env.OCRSPACE_API_KEY = '';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { extractLocalReader } = require('./recover-ocrspace-imagesF-21-local-readers');
const { extractPdfText } = require('./verify-ocrspace-imagesF-21-artifacts');
const { parseTextLayer, score, consensus } = require('./evaluate-ocrspace-pdf-text-layer');
const imageProcessor = require('../src/image-processor');
const imageProcessor = require('../src/image-processor');

const FIELDS = ['result', 'player', 'map', 'mode', 'battleStart', 'credits', 'freeXp', 'damage', 'xp'];
const NON_IDENTITY = FIELDS.filter(field => field !== 'player');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const newMetric = () => ({ eligible: 0, exact: 0, wrong: 0, unresolved: 0, exactMatchRate: null });

async function main() {
    const args = process.argv.slice(2);
    const arg = name => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : null; };
    const runPath = arg('--run-report'), manifestPath = arg('--manifest'), auditPath = arg('--pdf-audit');
    const artifactRoot = arg('--artifact-root'), outputPath = arg('--output'), networkLogPath = arg('--network-log');
    if (![runPath, manifestPath, auditPath, artifactRoot, outputPath, networkLogPath].every(Boolean)) throw new Error('Missing Gate A matrix arguments.');
    const [runBytes, manifestBytes, auditBytes] = await Promise.all([fs.readFile(runPath), fs.readFile(manifestPath), fs.readFile(auditPath)]);
    const run = JSON.parse(runBytes.toString('utf8')), manifest = JSON.parse(manifestBytes.toString('utf8')), audit = JSON.parse(auditBytes.toString('utf8'));
    if (manifest.records?.length !== 16 || audit.sourceCount !== 16) throw new Error('Gate A matrix requires the exact 16-image manifest and PDF audit.');
    await fs.mkdir(path.dirname(networkLogPath), { recursive: true });
    try { await fs.access(networkLogPath); } catch { await fs.writeFile(networkLogPath, '', { flag: 'wx' }); }

    const methodNames = ['pdfTextLayer','tesseractjs','native','paddleocr','fourSourceMajority','threeLocalReaderConsensus'];
    const aggregate = Object.fromEntries(methodNames.map(name => [name, newMetric()]));
    const images = [];
    for (const expected of manifest.records) {
        const result = (run.results || []).find(row => row.fixtureKey === expected.key);
        const verified = (audit.images || []).find(row => row.key === expected.key);
        const image = { key: expected.key, filename: expected.filename, sourceSha256: expected.sha256, status: 'PENDING' };
        const eligible = field => expected.expected?.[field] !== undefined && expected.expected[field] !== null && String(expected.expected[field]).trim() !== '';
        if (!result || result.imageSha256 !== expected.sha256 || !verified?.valid || verified.sourceSha256 !== expected.sha256
            || !verified.pdf?.file || !verified.raster?.file || path.basename(verified.pdf.file) !== verified.pdf.file
            || path.basename(verified.raster.file) !== verified.raster.file
            || result.ocrSpacePdfFirst?.pdfSha256 !== verified.pdf.sha256
            || result.ocrSpacePdfFirst?.rasterSha256 !== verified.raster.sha256) {
            image.status = 'MISSING_OR_SOURCE_HASH_MISMATCH';
            for (const name of methodNames) {
                const fields = name === 'pdfTextLayer' ? NON_IDENTITY : FIELDS;
                for (const field of fields) if (eligible(field)) { aggregate[name].eligible++; aggregate[name].unresolved++; }
            }
            images.push(image); continue;
        }
        const pdfPath = path.join(artifactRoot, verified.pdf.file), rasterPath = path.join(artifactRoot, verified.raster.file);
        const [pdfBytes, rasterBytes] = await Promise.all([fs.readFile(pdfPath), fs.readFile(rasterPath)]);
        if (pdfBytes.subarray(0,5).toString('ascii') !== '%PDF-' || sha256(pdfBytes) !== verified.pdf.sha256
            || pdfBytes.length !== verified.pdf.bytes || sha256(rasterBytes) !== verified.raster.sha256
            || rasterBytes.length !== verified.raster.bytes) {
            image.status = 'PDF_OR_RASTER_HASH_MISMATCH';
            for (const name of methodNames) { const fields = name === 'pdfTextLayer' ? NON_IDENTITY : FIELDS; for (const field of fields) if (eligible(field)) { aggregate[name].eligible++; aggregate[name].unresolved++; } }
            images.push(image); continue;
        }
        try {
            const rendered = await imageProcessor.renderSearchablePdfPage(pdfBytes);
            const toPixels = buffer => imageProcessor.__test.runImageMagick(['png:-','-depth','8','rgba:-'],buffer,{timeoutMs:60000,maxOutputBytes:80_000_000});
            const [savedPixels,renderedPixels] = await Promise.all([toPixels(rasterBytes),toPixels(rendered)]);
            if (!Buffer.isBuffer(savedPixels) || !Buffer.isBuffer(renderedPixels) || !savedPixels.equals(renderedPixels)) throw new Error('Saved raster is not pixel-identical to a fresh rendering of its PDF.');
        } catch (error) {
            image.status = 'PDF_DERIVED_RASTER_PROVENANCE_FAILED';
            image.failure = String(error.message || error).slice(0,400);
            images.push(image); continue;
        }
        try {
            const rendered = await imageProcessor.renderSearchablePdfPage(pdfBytes);
            const toPixels = buffer => imageProcessor.__test.runImageMagick(['png:-','-depth','8','rgba:-'],buffer,{timeoutMs:60000,maxOutputBytes:80_000_000});
            const [savedPixels,renderedPixels] = await Promise.all([toPixels(rasterBytes),toPixels(rendered)]);
            if (!Buffer.isBuffer(savedPixels) || !Buffer.isBuffer(renderedPixels) || !savedPixels.equals(renderedPixels)) throw new Error('Saved raster is not pixel-identical to a fresh rendering of its PDF.');
        } catch (error) {
            image.status = 'PDF_DERIVED_RASTER_PROVENANCE_FAILED';
            image.failure = String(error.message || error).slice(0,400);
            for (const name of methodNames) { const fields = name === 'pdfTextLayer' ? NON_IDENTITY : FIELDS; for (const field of fields) if (eligible(field)) { aggregate[name].eligible++; aggregate[name].unresolved++; } }
            images.push(image); continue;
        }
        const startedAt = new Date().toISOString();
        const tasks = [
            ...['tesseractjs','native','paddleocr'].map(engine => ({engine,run:()=>extractLocalReader(rasterBytes,engine,networkLogPath)})),
            {engine:'pdf-text-layer',run:async()=>{const text=await extractPdfText(pdfPath);if(!text.trim())throw Object.assign(new Error('Searchable PDF text layer is empty.'),{code:'PDF_TEXT_LAYER_EMPTY'});return {record:parseTextLayer(text),textCharacters:text.length,textSha256:sha256(Buffer.from(text,'utf8'))};}}
        ];
        const settled = await Promise.allSettled(tasks.map(task=>task.run()));
        const readers = {}, failures = []; let pdfText = {};
        for (let i=0;i<tasks.length;i++) {
            const outcome=settled[i], engine=tasks[i].engine;
            if (outcome.status==='fulfilled') { if(engine==='pdf-text-layer')pdfText=outcome.value;else readers[engine]=outcome.value; }
            else failures.push({engine,code:outcome.reason?.code||'READER_FAILED',message:String(outcome.reason?.message||outcome.reason).slice(0,400)});
        }
        const pdfCandidates=pdfText.record||{}, four={}, local={};
        for(const field of FIELDS){
            const localCandidates=[readers.tesseractjs?.record?.[field],readers.native?.record?.[field],readers.paddleocr?.record?.[field]];
            four[field]=field==='player'?consensus(localCandidates,field,2):consensus([pdfCandidates[field],...localCandidates],field,3);
            local[field]=consensus(localCandidates,field,2);
        }
        const comparisons={
            pdfTextLayer:score(expected.expected,pdfCandidates,NON_IDENTITY),
            tesseractjs:score(expected.expected,readers.tesseractjs?.record||{},FIELDS),
            native:score(expected.expected,readers.native?.record||{},FIELDS),
            paddleocr:score(expected.expected,readers.paddleocr?.record||{},FIELDS),
            fourSourceMajority:score(expected.expected,four,FIELDS),
            threeLocalReaderConsensus:score(expected.expected,local,FIELDS)
        };
        for(const [name,value] of Object.entries(comparisons))for(const key of ['eligible','exact','wrong','unresolved'])aggregate[name][key]+=value.metrics[key];
        image.status=failures.length?'PARTIAL':'ANALYZED';
        image.startedAt=startedAt; image.pdfSha256=verified.pdf.sha256; image.rasterSha256=verified.raster.sha256;
        image.pdfTextLayer={textCharacters:pdfText.textCharacters||0,textSha256:pdfText.textSha256||null};
        image.readerAvailability=Object.fromEntries(['tesseractjs','native','paddleocr'].map(name=>[name,Boolean(readers[name])]));
        image.modelManifestSha256=readers.paddleocr?.modelManifestSha256||null;
        image.readers=readers; image.failures=failures; image.comparisons=comparisons; images.push(image);
    }
    for(const value of Object.values(aggregate))value.exactMatchRate=value.eligible?value.exact/value.eligible:null;
    const networkLog=await fs.readFile(networkLogPath);
    const blocked=networkLog.toString('utf8').split(/\r?\n/).filter(line=>line.trim()).length;
    let modelManifestSha256=null;
    if(process.env.PADDLEOCR_MODEL_MANIFEST){try{modelManifestSha256=sha256(await fs.readFile(process.env.PADDLEOCR_MODEL_MANIFEST));}catch{}}
    const report={
        schemaVersion:1,diagnosticOnly:true,noProviderRequests:true,originalScreenshotFallback:false,
        status:images.length===16&&images.every(item=>item.status==='ANALYZED')&&blocked===0?'COMPLETED_DIAGNOSTIC_MATRIX':blocked?'FAILED_NETWORK_RESTRICTION':'PARTIAL_DIAGNOSTIC_MATRIX',
        runReportSha256:sha256(runBytes),manifestSha256:sha256(manifestBytes),pdfAuditSha256:sha256(auditBytes),
        inventory:{id:'gate-a-16',imageCount:16,files:manifest.records.map(item=>item.filename)},
        network:{blockedAttempts:blocked,logSha256:sha256(networkLog)},
        modelManifestSha256,engines:['OCR.Space searchable PDF text layer','Tesseract.js','native Tesseract','PaddleOCR'],
        geometry:'OpenCV proposes PaddleOCR crop geometry; it is not counted as an OCR text reader.',
        combinationRules:{fourSourceMajority:'3 of PDF text layer, Tesseract.js, native Tesseract and PaddleOCR; player uses at least 2 local readers',
            threeLocalReaderConsensus:'2 of Tesseract.js, native Tesseract and PaddleOCR; player uses local readers only'},
        aggregate,images
    };
    await fs.mkdir(path.dirname(outputPath),{recursive:true});
    const payload=JSON.stringify(report,null,2)+'\n';
    await fs.writeFile(outputPath,payload);
    await fs.writeFile(outputPath+'.sha256',sha256(Buffer.from(payload))+'  '+path.basename(outputPath)+'\n');
    console.log('[DWBOT-GATEA-PARALLEL-MATRIX] '+report.status+'; analyzed='+images.filter(x=>x.status==='ANALYZED').length+'/16; provider requests=0; blocked network attempts='+blocked);
    if(report.status!=='COMPLETED_DIAGNOSTIC_MATRIX')process.exitCode=1;
}
main().catch(error=>{console.error('[DWBOT-GATEA-PARALLEL-MATRIX] FAILED:',String(error.message||error).slice(0,1000));process.exitCode=1;});

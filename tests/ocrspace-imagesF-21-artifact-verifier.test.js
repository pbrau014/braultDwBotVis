'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { verifyArtifacts } = require('../scripts/verify-ocrspace-imagesF-21-artifacts');

const FIELDS = ['result', 'player', 'map', 'mode', 'battleStart', 'credits', 'freeXp', 'damage', 'xp'];
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function png(width, height) {
  const b = Buffer.alloc(24);
  Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]).copy(b,0);
  Buffer.from('IHDR').copy(b,12);
  b.writeUInt32BE(width,16); b.writeUInt32BE(height,20);
  return b;
}
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dwbot-artifact-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const artifactRoot = path.join(root, 'artifacts');
  await fs.mkdir(artifactRoot);
  const sourceArchiveSha256 = 'a'.repeat(64);
  const records = [];
  const verifiedMembers = [];
  const results = [];
  for (let i=0;i<63;i++) {
    const filename = `image-${String(i+1).padStart(2,'0')}.png`;
    const sourceBytes = 1000+i;
    const sourceSha = sha(Buffer.from('source-'+i));
    const complete = i < 21;
    const expected = Object.fromEntries(FIELDS.map(field=>[field, complete ? field+'-'+i : '']));
    const fieldStatus = Object.fromEntries(FIELDS.map(field=>[field,{eligible_for_exact_match:complete}]));
    records.push({ filename, recordStatus:complete?'COMPLETE_9_FIELD_TRANSCRIPTION':'PARTIAL_TRANSCRIPTION',
      sourceImage:{bytes:sourceBytes,sha256:sourceSha,width:1920,height:1080}, expected, fieldStatus });
    verifiedMembers.push({filename,bytes:sourceBytes,sha256:sourceSha});
    if (!complete) continue;
    const pdf = Buffer.from('%PDF-1.7\\nmock searchable document '+i+'\\n%%EOF');
    const raster = png(1600,900);
    const pdfPath = `item-${i+1}.pdf`, rasterPath = `item-${i+1}.png`;
    await fs.writeFile(path.join(artifactRoot,pdfPath),pdf);
    await fs.writeFile(path.join(artifactRoot,rasterPath),raster);
    results.push({index:i+1,filename,sourceBytes,sourceSha256:sourceSha,status:'pdf-first-complete',
      providerSubmissionAttempted:true,pdfBytes:pdf.length,pdfSha256:sha(pdf),pdfPath,
      rasterBytes:raster.length,rasterSha256:sha(raster),rasterPath,rasterWidth:1600,rasterHeight:900,
      localReaders:[{engine:'tesseractjs'},{engine:'native'}],localReaderFailures:[]});
  }
  const gt={schemaVersion:2,requiredFields:FIELDS,candidateArchive:{sha256:sourceArchiveSha256},records};
  const preflight={status:'verified-imagesF-63-exploratory',archiveSha256:sourceArchiveSha256,
    imageMemberCount:63,allImageMemberHashesVerified:true,verifiedMembers};
  const gtPath=path.join(root,'ground-truth.json'), preflightPath=path.join(root,'preflight.json');
  await fs.writeFile(gtPath,JSON.stringify(gt));
  await fs.writeFile(preflightPath,JSON.stringify(preflight));
  const run={sourceArchiveSha256,preflightReportSha256:sha(await fs.readFile(preflightPath)),
    originalScreenshotFallback:false,results};
  const runPath=path.join(root,'run-report.json');
  await fs.writeFile(runPath,JSON.stringify(run));
  const networkLogPath=path.join(root,'blocked-network.log');
  await fs.writeFile(networkLogPath,'');
  return {root,artifactRoot,gtPath,preflightPath,runPath,networkLogPath};
}
const workflowSourceText="OCR_NON_OCR_NETWORK_RESTRICTED: '1'\\nOCR_NON_OCR_NETWORK_LOG: logs/blocked.log";

test('verifies all 21 PDF/raster pairs, searchable text, source fingerprints, local readers and security evidence', async t => {
  const f=await fixture(t);
  const raster=png(1600,900);
  const report=await verifyArtifacts({...f,workflowSourceText,apiKey:'not-a-real-secret',
    renderPdf:async()=>raster,readMetadata:async()=>({width:1600,height:900}),readPdfText:async()=> 'searchable text'});
  assert.equal(report.status,'VERIFIED');
  assert.equal(report.inventorySelection.verifiedImageCount,21);
  assert.equal(report.checks.pdfIntegrity,'PASS');
  assert.equal(report.checks.searchablePdfTextLayer,'PASS');
  assert.equal(report.checks.pdfDerivedRasterProvenance,'PASS');
  assert.equal(report.checks.networkRestriction,'PASS');
  assert.equal(report.checks.secretLeakScan,'PASS');
  assert.equal(report.gateA.status,'PENDING');
});

test('does not pass when the saved raster cannot be reproduced from its PDF', async t => {
  const f=await fixture(t);
  const report=await verifyArtifacts({...f,workflowSourceText,apiKey:'not-a-real-secret',
    renderPdf:async()=>png(1599,900),readMetadata:async()=>({width:1600,height:900}),readPdfText:async()=> 'searchable text'});
  assert.equal(report.status,'FAILED');
  assert.equal(report.checks.pdfDerivedRasterProvenance,'FAIL');
});

test('missing network log or secret is not treated as a clean security result', async t => {
  const f=await fixture(t);
  const report=await verifyArtifacts({...f,networkLogPath:path.join(f.root,'missing.log'),
    workflowSourceText,apiKey:'',renderPdf:async()=>png(1600,900),
    readMetadata:async()=>({width:1600,height:900}),readPdfText:async()=> 'searchable text'});
  assert.equal(report.status,'FAILED');
  assert.equal(report.checks.networkRestriction,'FAIL');
  assert.equal(report.checks.secretLeakScan,'NOT_VERIFIED');
  assert.equal(report.checks.unauthorizedNetworkAttempts,null);
});

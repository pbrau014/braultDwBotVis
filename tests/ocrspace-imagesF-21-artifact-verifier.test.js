'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { verifyArtifacts, parseJsonUtf8 } = require('../scripts/verify-ocrspace-imagesF-21-artifacts');

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
  const sourceImageRoot = path.join(root, 'source-images');
  await fs.mkdir(artifactRoot); await fs.mkdir(sourceImageRoot);
  const sourceArchiveSha256 = 'a'.repeat(64);
  const records = [];
  const verifiedMembers = [];
  const results = [];
  for (let i=0;i<63;i++) {
    const filename = `image-${String(i+1).padStart(2,'0')}.png`;
    const sourceBuffer = Buffer.from('source-image-bytes-'+i);
    const sourceBytes = sourceBuffer.length;
    const sourceSha = sha(sourceBuffer);
    await fs.writeFile(path.join(sourceImageRoot,filename),sourceBuffer);
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
      localReaders:[{engine:'tesseractjs',status:'complete'},{engine:'native',status:'complete'},{engine:'paddleocr',status:'complete'}],localReaderFailures:[]});
  }
  const gt={schemaVersion:2,requiredFields:FIELDS,candidateArchive:{sha256:sourceArchiveSha256},records};
  const preflight={status:'verified-imagesF-63-exploratory',archiveSha256:sourceArchiveSha256,
    imageMemberCount:63,allImageMemberHashesVerified:true,verifiedMembers};
  const gtPath=path.join(root,'ground-truth.json'), preflightPath=path.join(root,'preflight.json'), freshPreflightPath=path.join(root,'fresh-preflight.json');
  await fs.writeFile(gtPath,JSON.stringify(gt));
  await fs.writeFile(preflightPath,JSON.stringify(preflight));
  await fs.writeFile(freshPreflightPath,JSON.stringify(preflight));
  const networkLogPath=path.join(root,'blocked-network.log');
  const recoveryNetworkLogPath=path.join(root,'recovery-network.log');
  await fs.writeFile(networkLogPath,'');
  await fs.writeFile(recoveryNetworkLogPath,'');
  const recoveryNetworkLogBytes=await fs.readFile(recoveryNetworkLogPath);
  const run={sourceArchiveSha256,preflightReportSha256:sha(await fs.readFile(preflightPath)),
    imageCount:63,requiredFields:FIELDS,originalScreenshotFallback:false,
    localReaderRecovery:{networkBlockedAttempts:0,networkLogSha256:sha(recoveryNetworkLogBytes)},results};
  const runPath=path.join(root,'run-report.json');
  await fs.writeFile(runPath,JSON.stringify(run));
  return {root,artifactRoot,sourceImageRoot,gtPath,preflightPath,freshPreflightPath,runPath,networkLogPath,recoveryNetworkLogPath};
}
const workflowSourceText="OCRSPACE_ENABLED: '0'\\nOCRSPACE_NETWORK_ALLOWLIST: '1'\\nOCR_NON_OCR_NETWORK_RESTRICTED: '1'\\nOCR_NON_OCR_NETWORK_LOG: logs/blocked.log";
const metadataFor = async buffer => buffer.toString('utf8').startsWith('source-image-bytes-')
  ? {width:1920,height:1080} : {width:1600,height:900};

test('verifies all 19 Gate B PDF/raster pairs, searchable text, source fingerprints, local readers and security evidence', async t => {
  const f=await fixture(t);
  const raster=png(1600,900);
  const report=await verifyArtifacts({...f,preflightReport:f.preflightPath,freshPreflightReport:f.freshPreflightPath,groundTruth:f.gtPath,runReport:f.runPath,workflowSourceText,apiKey:'not-a-real-secret',
    renderPdf:async()=>raster,readMetadata:metadataFor,toRawRgba:async()=>Buffer.from('same-pixels'),readPdfText:async()=> 'searchable text'});
  assert.equal(report.status,'VERIFIED', JSON.stringify(report.checks));
  assert.equal(report.inventorySelection.verifiedImageCount,19);
  assert.equal(report.checks.pdfIntegrity,'PASS');
  assert.equal(report.checks.searchablePdfTextLayer,'PASS');
  assert.equal(report.checks.pdfDerivedRasterProvenance,'PASS');
  assert.equal(report.checks.networkRestriction,'PASS');
  assert.equal(report.checks.localRecoveryNetworkRestriction,'PASS');
  assert.equal(report.checks.secretLeakScan,'PASS');
  assert.equal(report.checks.originalScreenshotFallback,false);
  assert.equal(report.gateA.status,'PENDING');
  const gateAReport = {
    status:'PASS', reportSha256:'a'.repeat(64), candidateFingerprint:'b'.repeat(40),
    fingerprintLocked:true, matchesGateBRunSource:true, completeImages:16,
    exactCompleteRecords:16, wronglyAcceptedMandatoryFieldValues:0,
    unresolvedMandatoryFieldValues:0, unauthorizedNetworkAttempts:0, networkRestriction:'PASS'
  };
  const withGateA = await verifyArtifacts({...f,preflightReport:f.preflightPath,freshPreflightReport:f.freshPreflightPath,
    groundTruth:f.gtPath,runReport:f.runPath,workflowSourceText,apiKey:'not-a-real-secret',gateAReport,
    renderPdf:async()=>raster,readMetadata:metadataFor,toRawRgba:async()=>Buffer.from('same-pixels'),readPdfText:async()=> 'searchable text'});
  assert.equal(withGateA.gateA.status,'PASS');
  assert.equal(withGateA.gateA.candidateFingerprint,'b'.repeat(40));
  assert.equal(withGateA.gateA.reportSha256,'a'.repeat(64));
});

test('does not pass when the saved raster cannot be reproduced from its PDF', async t => {
  const f=await fixture(t);
  const report=await verifyArtifacts({...f,preflightReport:f.preflightPath,freshPreflightReport:f.freshPreflightPath,groundTruth:f.gtPath,runReport:f.runPath,workflowSourceText,apiKey:'not-a-real-secret',
    renderPdf:async()=>png(1599,900),readMetadata:metadataFor,toRawRgba:async()=>Buffer.from('same-pixels'),readPdfText:async()=> 'searchable text'});
  assert.equal(report.status,'FAILED');
  assert.equal(report.checks.pdfDerivedRasterProvenance,'FAIL');
});

test('missing network log or secret is not treated as a clean security result', async t => {
  const f=await fixture(t);
  const report=await verifyArtifacts({...f,preflightReport:f.preflightPath,freshPreflightReport:f.freshPreflightPath,groundTruth:f.gtPath,runReport:f.runPath,networkLogPath:path.join(f.root,'missing.log'),
    workflowSourceText,apiKey:'',renderPdf:async()=>png(1600,900),
    readMetadata:metadataFor,toRawRgba:async()=>Buffer.from('same-pixels'),readPdfText:async()=> 'searchable text'});
  assert.equal(report.status,'FAILED');
  assert.equal(report.checks.networkRestriction,'NOT_VERIFIED_MISSING_ORIGINAL_LOG');
  assert.equal(report.checks.originalNetworkLogStatus,'MISSING_FROM_SOURCE_ARTIFACT');
  assert.equal(report.checks.secretLeakScan,'NOT_VERIFIED');
  assert.equal(report.checks.unauthorizedNetworkAttempts,null);
  assert.equal(report.inventorySelection.pdfRasterVerifiedImageCount,19);
  assert.equal(report.inventorySelection.localReaderVerifiedImageCount,19);
  assert.equal(report.inventorySelection.verifiedImageCount,19);
});


test('missing local-recovery network log fails closed even when original log is present', async t => {
  const f=await fixture(t);
  const report=await verifyArtifacts({...f,recoveryNetworkLogPath:path.join(f.root,'missing-recovery.log'),
    preflightReport:f.preflightPath,freshPreflightReport:f.freshPreflightPath,groundTruth:f.gtPath,runReport:f.runPath,
    workflowSourceText,apiKey:'not-a-real-secret',renderPdf:async()=>png(1600,900),
    readMetadata:metadataFor,toRawRgba:async()=>Buffer.from('same-pixels'),readPdfText:async()=> 'searchable text'});
  assert.equal(report.status,'FAILED');
  assert.equal(report.checks.localRecoveryNetworkRestriction,'FAIL');
  assert.equal(report.checks.localRecoveryNetworkLogMatchesReport,false);
});


test('preserves BOM-prefixed reconstructed network evidence without upgrading it to a zero-attempt claim', async t => {
  const f=await fixture(t);
  const networkReconciliationPath=path.join(f.root,'network-log-reconciliation.json');
  await fs.writeFile(networkReconciliationPath,String.fromCharCode(0xFEFF)+JSON.stringify({
    status:'RECONSTRUCTED_LIMITED_EVIDENCE', originalBlockedAttemptCount:null, zeroAttemptsClaimed:false
  }));
  const report=await verifyArtifacts({...f,networkReconciliationPath,
    preflightReport:f.preflightPath,freshPreflightReport:f.freshPreflightPath,
    groundTruth:f.gtPath,runReport:f.runPath,workflowSourceText,apiKey:'not-a-real-secret',
    renderPdf:async()=>png(1600,900),readMetadata:metadataFor,
    toRawRgba:async()=>Buffer.from('same-pixels'),readPdfText:async()=> 'searchable text'});
  assert.equal(report.checks.networkLogReconciliationStatus,'RECONSTRUCTED_LIMITED_EVIDENCE');
  assert.equal(report.networkLogReconciliation.zeroAttemptsClaimed,false);
  assert.equal(report.checks.originalScreenshotFallback,false);
});


test('artifact verifier parses BOM-prefixed Gate A and reconciliation JSON without changing provenance', () => {
  const bytes = Buffer.from('\uFEFF{"status":"FAIL","originalBlockedAttemptCount":null,"zeroAttemptsClaimed":false}', 'utf8');
  assert.deepEqual(parseJsonUtf8(bytes), {
    status: 'FAIL', originalBlockedAttemptCount: null, zeroAttemptsClaimed: false
  });
  assert.deepEqual(parseJsonUtf8(Buffer.from('{"status":"PASS"}', 'utf8')), { status: 'PASS' });
});

test('artifact verifier uses canonical JSON fingerprints and preserves raw working-tree hashes', async t => {
  const f=await fixture(t);
  const runBefore=await fs.readFile(f.runPath);
  const gtBefore=await fs.readFile(f.gtPath);
  const reportBefore=await verifyArtifacts({...f,
    preflightReport:f.preflightPath,freshPreflightReport:f.freshPreflightPath,
    groundTruth:f.gtPath,runReport:f.runPath,workflowSourceText,apiKey:'not-a-real-secret',
    renderPdf:async()=>png(1600,900),readMetadata:metadataFor,
    toRawRgba:async()=>Buffer.from('same-pixels'),readPdfText:async()=> 'searchable text'});
  const runObject=JSON.parse(runBefore.toString('utf8'));
  const gtObject=JSON.parse(gtBefore.toString('utf8'));
  const runReformatted=Buffer.from('\uFEFF'+JSON.stringify(runObject,null,2).replace(/\n/g,'\r\n'),'utf8');
  const gtReformatted=Buffer.from('\uFEFF'+JSON.stringify(gtObject,null,2).replace(/\n/g,'\r\n'),'utf8');
  await fs.writeFile(f.runPath,runReformatted);
  await fs.writeFile(f.gtPath,gtReformatted);
  const reportAfter=await verifyArtifacts({...f,
    preflightReport:f.preflightPath,freshPreflightReport:f.freshPreflightPath,
    groundTruth:f.gtPath,runReport:f.runPath,workflowSourceText,apiKey:'not-a-real-secret',
    renderPdf:async()=>png(1600,900),readMetadata:metadataFor,
    toRawRgba:async()=>Buffer.from('same-pixels'),readPdfText:async()=> 'searchable text'});
  assert.equal(reportAfter.runReportSha256,reportBefore.runReportSha256);
  assert.equal(reportAfter.groundTruthSha256,reportBefore.groundTruthSha256);
  assert.notEqual(reportAfter.runReportRawSha256,reportBefore.runReportRawSha256);
  assert.notEqual(reportAfter.groundTruthRawSha256,reportBefore.groundTruthRawSha256);
  assert.match(reportAfter.verifierWorkingTreeRawSha256,/^[0-9a-f]{64}$/);
});

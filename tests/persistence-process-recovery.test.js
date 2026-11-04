'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
test('process-level JSON and SQLite recovery works across child process restarts',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'dwbot-process-recovery-'));
 try {
  const r=spawnSync(process.execPath,[path.join(__dirname,'..','scripts','run-persistence-recovery.js')],{
   cwd:path.join(__dirname,'..'),encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:10*1024*1024,
   env:{...process.env,PERSISTENCE_REPORT_DIR:dir}
  });
  assert.equal(r.error,undefined,r.error?.message); assert.equal(r.signal,null,r.stderr); assert.equal(r.status,0,(r.stdout||'')+'\n'+(r.stderr||''));
  const report=JSON.parse(await fs.readFile(path.join(dir,'persistence-recovery-report.json'),'utf8'));
  assert.equal(report.passed,true); assert.equal(report.stages.length,11);
  assert.ok(report.stages.every(x=>x.passed),JSON.stringify(report.stages));
  assert.equal(report.runtime.platform,process.platform);
  assert.ok(report.outputs.find(x=>x.name==='state.sqlite')?.sizeBytes>0);
  assert.ok(report.outputs.find(x=>x.name==='full-private-backup.json')?.sizeBytes>0);
 } finally { await fs.rm(dir,{recursive:true,force:true}); }
});

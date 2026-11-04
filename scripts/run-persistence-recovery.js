'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');

function makeState(T) {
  const s = T.createState();
  for (let i=1;i<=50;i++) {
    const p=T.addPlayer(s,'Recovery Participant '+String(i).padStart(2,'0'));
    T.recordResult(s,{player:p.id,event:'damage',gameNumber:1,shipClass:'DD',tier:5,damage:10000+i*991});
    T.recordResult(s,{player:p.id,event:'kills',gameNumber:1,shipClass:'CA',tier:7,kills:i%8});
    T.recordResult(s,{player:p.id,event:'race',gameNumber:1,shipClass:'BB',tier:6,time:90+i});
    T.recordResult(s,{player:p.id,event:'grand',gameNumber:1,shipClass:'DD',tier:5,damage:20000+i*733,kills:i%7,time:80+i});
  }
  T.linkPlayerDiscordAccount(s,1,'12345678901234567');
  s.battleRecords=[{id:'synthetic-private-record',status:'pending',desktop_owner_id:'12345678901234567',desktop_owner_role:'player'}];
  s.pendingSubmissions=[{id:'synthetic-pending-submission',user_id:'12345678901234567'}];
  s.pendingOcrCorrections=[{id:'synthetic-pending-correction',user_id:'12345678901234567',field:'damage'}];
  return s;
}
function verify(T,s,label) {
  assert.equal(s.players.length,50,label+' 50 players');
  assert.equal(s.players[49].name,'Recovery Participant 50');
  assert.equal(s.players[0].events.damage[0].metric,10991);
  assert.equal(s.players[0].events.kills[0].metric,1);
  assert.equal(s.players[0].events.race[0].metric,91);
  assert.equal(s.players[0].events.grand[0].damage,20733);
  assert.equal(s.settings.events.grand.tierWeight,0.9);
  assert.equal(s.playerAccountLinks['1'],'12345678901234567');
  assert.equal(s.battleRecords[0].desktop_owner_id,'12345678901234567');
  assert.equal(s.pendingSubmissions[0].user_id,'12345678901234567');
  assert.equal(s.pendingOcrCorrections[0].user_id,'12345678901234567');
  assert.ok(T.standings(s).some(x=>x.id===1&&x.total>0));
}
async function child(stage,dir) {
  const T=require(path.join(ROOT,'src','tournament'));
  const json=path.join(dir,'state.json'), sqlite=path.join(dir,'state.sqlite');
  const archive=path.join(dir,'full-private-backup.json');
  if(stage==='seed-json') {
    const store=T.createStore(json); await store.load(); const s=makeState(T);
    await store.save(s); await fs.writeFile(archive,await store.exportSnapshot(s),'utf8');
    return {stage,players:50};
  }
  if(stage==='verify-json') {
    const s=await T.createStore(json).load(); verify(T,s,stage);
    const raw=JSON.parse(await fs.readFile(archive,'utf8')); verify(T,T.importBackup(raw),'private import');
    const pub=T.makePublicArchiveSnapshot(s);
    assert.deepEqual(pub.player_account_links,{});
    assert.equal(pub.pending_submissions.length,0);
    assert.equal(pub.pending_ocr_corrections.length,0);
    assert.equal(pub.pending_workflow_counts.pending_submissions,1);
    assert.equal(pub.battle_records[0].desktop_owner_id,undefined);
    await fs.writeFile(path.join(dir,'public-redacted-snapshot.json'),JSON.stringify(pub,null,2));
    return {stage,privateArchive:true,publicRedaction:true};
  }
  if(stage==='restore-json') {
    const raw=JSON.parse(await fs.readFile(archive,'utf8'));
    const store=T.createStore(path.join(dir,'restored-state.json'));
    await store.save(T.importBackup(raw)); return {stage,players:50};
  }
  if(stage==='verify-restored-json') {
    const s=await T.createStore(path.join(dir,'restored-state.json')).load(); verify(T,s,stage); return {stage,players:50};
  }
  if(stage==='seed-sqlite') {
    const store=T.createSqliteStore(sqlite,{mirrorPath:path.join(dir,'sqlite-mirror.json')});
    await store.load(); const s=makeState(T); await store.save(s);
    await fs.writeFile(archive,await store.exportSnapshot(s),'utf8'); await store.close();
    return {stage,players:50,walClosed:true};
  }
  if(stage==='verify-sqlite'||stage==='verify-sqlite-copy') {
    const target=stage==='verify-sqlite'?sqlite:path.join(dir,'physical-copy.sqlite');
    const store=T.createSqliteStore(target,{mirrorPath:path.join(dir,stage+'-mirror.json')});
    const s=await store.load(); verify(T,s,stage);
    const {DatabaseSync}=require('node:sqlite'); const db=new DatabaseSync(target);
    const integrity=db.prepare('PRAGMA integrity_check').get().integrity_check;
    assert.equal(integrity,'ok');
    db.close();
    if(stage==='verify-sqlite-copy') await fs.writeFile(path.join(dir,'copied-full-private-backup.json'),await store.exportSnapshot(s),'utf8');
    await store.close(); return {stage,players:50,integrity};
  }
  if(stage==='restore-sqlite') {
    const store=T.createSqliteStore(path.join(dir,'restored.sqlite'),{legacyJsonPath:archive,mirrorPath:path.join(dir,'restored-mirror.json')});
    const s=await store.load(); verify(T,s,stage); await store.close(); return {stage,players:50};
  }
  if(stage==='verify-restored-sqlite') {
    const store=T.createSqliteStore(path.join(dir,'restored.sqlite'),{mirrorPath:path.join(dir,'restored-mirror.json')});
    const s=await store.load(); verify(T,s,stage); await store.close(); return {stage,players:50};
  }
  if(stage==='restore-json-from-copy') {
    const raw=JSON.parse(await fs.readFile(path.join(dir,'copied-full-private-backup.json'),'utf8'));
    const store=T.createStore(path.join(dir,'restored-from-copy.json'));
    await store.save(T.importBackup(raw)); return {stage,players:50};
  }
  if(stage==='verify-json-from-copy') {
    const s=await T.createStore(path.join(dir,'restored-from-copy.json')).load(); verify(T,s,stage); return {stage,players:50};
  }
  throw new Error('Unknown stage '+stage);
}
async function main() {
  const isChild=process.argv[2]==='--child';
  const dir=isChild?path.resolve(process.argv[4]):path.resolve(process.env.PERSISTENCE_REPORT_DIR||path.join(ROOT,'testdata','persistence-recovery',new Date().toISOString().replace(/[:.]/g,'-')+'-'+process.pid));
  await fs.mkdir(dir,{recursive:true});
  if(isChild){const r=await child(process.argv[3],dir);console.log(JSON.stringify(r));return;}
  const stages=[];
  const run=stage=>{
    const r=spawnSync(process.execPath,[__filename,'--child',stage,dir],{cwd:ROOT,encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:5*1024*1024});
    stages.push({stage,exitCode:r.status,signal:r.signal||null,error:r.error?.message||null,stdout:(r.stdout||'').trim(),stderr:(r.stderr||'').trim(),passed:r.status===0&&!r.error});
    return stages[stages.length-1].passed;
  };
  for(const stage of ['seed-json','verify-json','restore-json','verify-restored-json','seed-sqlite','verify-sqlite']) if(!run(stage)) break;
  if(stages.length===6&&stages.every(x=>x.passed)) {
    await fs.copyFile(path.join(dir,'state.sqlite'),path.join(dir,'physical-copy.sqlite'));
    for(const stage of ['verify-sqlite-copy','restore-sqlite','verify-restored-sqlite','restore-json-from-copy','verify-json-from-copy']) if(!run(stage)) break;
  }
  const outputs=['state.json','full-private-backup.json','restored-state.json','state.sqlite','physical-copy.sqlite','restored.sqlite','public-redacted-snapshot.json','copied-full-private-backup.json']
    .filter(n=>{try{return require('node:fs').statSync(path.join(dir,n)).isFile()}catch{return false}})
    .map(n=>({name:n,sizeBytes:require('node:fs').statSync(path.join(dir,n)).size,sha256:crypto.createHash('sha256').update(require('node:fs').readFileSync(path.join(dir,n))).digest('hex')}));
  const report={schemaVersion:1,createdAt:new Date().toISOString(),runtime:{node:process.version,platform:process.platform,arch:process.arch},sqliteAvailable:(()=>{try{require('node:sqlite');return true}catch{return false}})(),stages,outputs,passed:stages.length===11&&stages.every(x=>x.passed)};
  const rp=path.join(dir,'persistence-recovery-report.json');
  await fs.writeFile(rp,JSON.stringify(report,null,2)+'\n');
  const hash=crypto.createHash('sha256').update(await fs.readFile(rp)).digest('hex');
  await fs.writeFile(path.join(dir,'persistence-recovery-report.sha256'),hash+'  persistence-recovery-report.json\n');
  console.log(JSON.stringify(report,null,2)); if(!report.passed) process.exitCode=1;
}
main().catch(e=>{console.error('[PERSISTENCE-RECOVERY] Fatal:',e.stack||e.message);process.exitCode=1;});

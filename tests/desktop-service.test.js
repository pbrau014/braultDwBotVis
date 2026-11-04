'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const Tournament=require('../src/tournament');
const {createDesktopService}=require('../src/desktop-service');
const ADMIN='12345678901234567', PLAYER='22345678901234567', OTHER='32345678901234567';

function record(player='[WOLF]Alpha',complete=true) {
  return {
    result:'Victory',player,ship:'X Yamato',description:'Our team won by points.',
    map:'Estuary',mode:'Random Battle',battleStart:'04.11.2026 18:20',
    credits:'123456',xp:complete?'7890':'Not detected',freeXp:'123',damage:'45678',
    ribbons:[{label:'Destroyed',count:2}],ambiguities:{},
  };
}

const RULE_HASH='a'.repeat(64);
function pilotSettings(){return{timezone:'America/Chicago',startAt:'2026-11-10T18:00:00-06:00',endAt:'2026-11-10T21:00:00-06:00',entryClosesAt:'2026-11-10T17:00:00-06:00',lineupLocksAt:'2026-11-10T17:30:00-06:00',gameCount:7,mapPolicy:'approved pool',modePolicy:'verified standard modes',shipPolicy:'approved list',prizePolicy:'approved awards',disputePolicy:'published review'};}
function fullSettings(){return{timezone:'America/Chicago',duration:'8 weeks',cadence:'weekly',regularSeasonStart:'2026-11-01',regularSeasonEnd:'2026-12-27',postseasonStart:'2027-01-03',postseasonEnd:'2027-01-17',finaleStart:'2027-01-24',finaleEnd:'2027-01-31',postseasonPolicy:'top four by approved method',finalePolicy:'published final series',teamPolicy:'locked rosters',matchOutcomeMethodId:'M1',matchOutcomeMethodVersion:'1',matchOutcomeMethodHash:RULE_HASH,tieBreakPolicy:'published tie-breaks',disputePolicy:'published review'};}
function approval(){return{approvedBy:'Organizer',approvedAt:'2026-10-30T12:00:00Z',rulesVersion:'1.0',rulesHash:RULE_HASH};}

function fixture(options={}) {
  const state=Tournament.createState();
  const alpha=Tournament.addPlayer(state,'[WOLF]Alpha');
  Tournament.addPlayer(state,'[BEAR]Bravo');
  Tournament.linkPlayerDiscordAccount(state,alpha.id,PLAYER);
  const service=createDesktopService({
    getState:()=>state,saveState:async()=>{},
    isAdminId:id=>id===ADMIN,
    extractImage:async buffer=>({attempts:[{text:buffer.toString('utf8')},{text:buffer.toString('utf8')+' alternate'}],fields:{}}),
    validateScreenshot:attempt=>({record:record(attempt.text.includes('[BEAR]Bravo')?'[BEAR]Bravo':(options.player||'[WOLF]Alpha'),options.complete!==false),missing:[],confidence:92,pageSegmentationMode:6}),
  });
  return {state,alpha,service};
}
test('desktop role lookup trusts Discord account IDs and administrator-managed roster links',async()=>{
  const f=fixture();
  assert.equal((await f.service.resolvePrincipal({id:ADMIN})).role,'admin');
  const p=await f.service.resolvePrincipal({id:PLAYER});
  assert.equal(p.role,'player');assert.equal(p.player.name,'[WOLF]Alpha');
  assert.equal((await f.service.resolvePrincipal({id:OTHER})).role,'unlinked');
});
test('player can view only owned submissions and only their own roster identity',async()=>{
  const f=fixture(),p=await f.service.resolvePrincipal({id:PLAYER}),a=await f.service.resolvePrincipal({id:ADMIN});
  const owned=await f.service.submitImage(p,{buffer:Buffer.from('synthetic screenshot'),filename:'one.png',contentType:'image/png'});
  const admin=await f.service.submitImage(a,{buffer:Buffer.from('[BEAR]Bravo admin screenshot'),filename:'two.png',contentType:'image/png'});
  assert.equal(owned.status,'awaiting-mapping');assert.equal(admin.status,'admin-review');
  const ownRows=await f.service.listSubmissions(p);
  assert.equal(ownRows.items.length,1);
  assert.equal(ownRows.items[0].requiredValues.player,'[WOLF]Alpha');
  assert.equal(ownRows.items[0].requiredValues.xp,'7890');
  await assert.rejects(f.service.correctSubmission(p,admin.submissionId,{values:{xp:'100'}}),e=>e.status===404);
  await assert.rejects(f.service.correctSubmission(p,owned.submissionId,{values:{player:'[BEAR]Bravo'}}),e=>e.status===403&&e.code==='PLAYER_IDENTITY_MISMATCH');
});
test('mandatory OCR fields remain exact and corrections only fill unresolved values',async()=>{
  const f=fixture({complete:false}),p=await f.service.resolvePrincipal({id:PLAYER});
  const upload=await f.service.submitImage(p,{buffer:Buffer.from('incomplete screenshot'),filename:'missing.png',contentType:'image/png'});
  assert.equal(upload.status,'needs-correction');
  assert.ok(upload.missingFields.some(x=>x.key==='xp'));
  const corrected=await f.service.correctSubmission(p,upload.submissionId,{values:{xp:'7890'}});
  assert.equal(corrected.status,'awaiting-mapping');
  assert.equal(corrected.missingFields.length,0);
});
test('a player can map a complete record only to their linked player and valid slot',async()=>{
  const f=fixture(),p=await f.service.resolvePrincipal({id:PLAYER});
  const upload=await f.service.submitImage(p,{buffer:Buffer.from('valid screenshot'),filename:'valid.png',contentType:'image/png'});
  const mapped=await f.service.mapSubmission(p,upload.submissionId,{event:'damage',gameNumber:1,shipClass:'DD',tier:8});
  assert.equal(mapped.status,'mapped');assert.equal(mapped.player.name,'[WOLF]Alpha');
  assert.equal(f.state.players[0].events.damage[0].metric,45678);
  await assert.rejects(f.service.mapSubmission(p,upload.submissionId,{event:'damage',gameNumber:2,shipClass:'DD',tier:8}),e=>e.code==='RECORD_ALREADY_MAPPED');
});
test('desktop mapping clears a matching pending Discord-guided submission',async()=>{
  const f=fixture(),p=await f.service.resolvePrincipal({id:PLAYER});
  const upload=await f.service.submitImage(p,{buffer:Buffer.from('pending Discord path'),filename:'discord.png',contentType:'image/png'});
  f.state.pendingSubmissions.push({record_id:upload.submissionId,userId:PLAYER,channelId:'33333333333333333'});
  f.state.pendingOcrCorrections.push({record_id:upload.submissionId});
  const result=await f.service.mapSubmission(p,upload.submissionId,{event:'damage',gameNumber:1,shipClass:'DD',tier:8});
  assert.equal(result.status,'mapped');
  assert.equal(f.state.pendingSubmissions.length,0);
  assert.equal(f.state.pendingOcrCorrections.length,0);
});
test('admin can map a screenshot to a different roster player after review',async()=>{
  const f=fixture({player:'[BEAR]Bravo'}),a=await f.service.resolvePrincipal({id:ADMIN});
  const upload=await f.service.submitImage(a,{buffer:Buffer.from('[BEAR]Bravo admin image'),filename:'admin.png',contentType:'image/png'});
  assert.equal(upload.status,'admin-review');
  const result=await f.service.mapSubmission(a,upload.submissionId,{playerId:2,event:'kills',gameNumber:1,shipClass:'CA',tier:7,kills:2});
  assert.equal(result.status,'mapped');assert.equal(f.state.players[1].events.kills[0].metric,2);
});
test('participant is denied admin-only roster and scoring changes',async()=>{
  const f=fixture(),p=await f.service.resolvePrincipal({id:PLAYER});
  await assert.rejects(f.service.addPlayer(p,{name:'Charlie'}),e=>e.status===403);
  await assert.rejects(f.service.setSetting(p,{event:'grand',field:'tierWeight',value:0.9}),e=>e.status===403);
});


test('authenticated Admin backup retains private roster links and pending correction workflows',async()=>{
  const f=fixture(),admin=await f.service.resolvePrincipal({id:ADMIN});
  f.state.pendingSubmissions.push({record_id:'pending-1',userId:PLAYER,channelId:'33333333333333333'});
  f.state.pendingOcrCorrections.push({key:'33333333333333333:'+PLAYER,userId:PLAYER});
  const backup=JSON.parse(await f.service.exportBackup(admin));
  assert.equal(backup.player_account_links[String(f.alpha.id)],PLAYER);
  assert.equal(backup.pending_submissions[0].userId,PLAYER);
  assert.equal(backup.pending_ocr_corrections.length,1);
});

test('desktop service creates Pilot drafts and binds check-in to the authenticated linked player',async()=>{
  const f=fixture(),admin=await f.service.resolvePrincipal({id:ADMIN}),player=await f.service.resolvePrincipal({id:PLAYER});
  const created=await f.service.createLifecycle(admin,{title:'One-night Pilot',format:'pilot',settings:pilotSettings()});
  await f.service.publishLifecycle(admin,{tournamentId:created.id,approval:approval()});
  await assert.rejects(f.service.createLifecycle(admin,{id:created.id,title:'Duplicate',format:'pilot',settings:pilotSettings()}),e=>e.status===409&&e.code==='LIFECYCLE_ID_CONFLICT');
  const overview=await f.service.getOverview(player);
  assert.equal(overview.yoloTournaments[0].format,'pilot');
  const checked=await f.service.checkInPilotLifecycle(player,{tournamentId:created.id});
  assert.equal(checked.playerId,f.alpha.id);
  await assert.rejects(f.service.registerLifecycle(player,{tournamentId:created.id}),e=>e.status===400);
  await assert.rejects(f.service.createLifecycle(player,{title:'Nope',format:'pilot',settings:pilotSettings()}),e=>e.status===403);
});

test('desktop Full YOLO service supports linked registration, teams, fixtures, evidence and verified progression',async()=>{
  const f=fixture(),admin=await f.service.resolvePrincipal({id:ADMIN});
  Tournament.linkPlayerDiscordAccount(f.state,2,OTHER);
  const alpha=await f.service.resolvePrincipal({id:PLAYER}),bravo=await f.service.resolvePrincipal({id:OTHER});
  const created=await f.service.createLifecycle(admin,{title:'Full season',format:'full',settings:fullSettings()});
  await f.service.publishLifecycle(admin,{tournamentId:created.id,approval:approval()});
  await f.service.registerLifecycle(alpha,{tournamentId:created.id});
  await f.service.registerLifecycle(bravo,{tournamentId:created.id});
  await f.service.startLifecycle(admin,{tournamentId:created.id});
  for(const team of [{id:'A',name:'Alpha'},{id:'B',name:'Bravo'}]){
    await f.service.lifecycleAction(admin,{tournamentId:created.id,action:'team',team});
  }
  await f.service.lifecycleAction(admin,{tournamentId:created.id,action:'assign',playerId:f.alpha.id,teamId:'A'});
  await f.service.lifecycleAction(admin,{tournamentId:created.id,action:'assign',playerId:2,teamId:'B'});
  await f.service.lifecycleAction(admin,{tournamentId:created.id,action:'lock-roster',teamId:'A'});
  await f.service.lifecycleAction(admin,{tournamentId:created.id,action:'lock-roster',teamId:'B'});
  const night=await f.service.lifecycleAction(admin,{tournamentId:created.id,action:'event-night',night:{id:'n1',title:'Week One',startsAt:'2026-11-10T18:00:00Z',endsAt:'2026-11-10T21:00:00Z'}});
  await f.service.lifecycleAction(admin,{tournamentId:created.id,action:'fixture',fixture:{id:'f1',eventNightId:night.result.id,teamAId:'A',teamBId:'B',startsAt:'2026-11-10T18:30:00Z'}});
  const uploaded=await f.service.submitImage(alpha,{buffer:Buffer.from('source evidence screenshot'),filename:'source.png',contentType:'image/png'});
  await f.service.lifecycleAction(admin,{tournamentId:created.id,action:'game',game:{id:'g1',fixtureId:'f1',playerId:f.alpha.id,teamId:'A',evidenceRecordId:uploaded.submissionId,result:{damage:50000,kills:2}}});
  const completed=await f.service.lifecycleAction(admin,{tournamentId:created.id,action:'complete-fixture',fixtureId:'f1',outcome:{status:'verified',methodId:'M1',methodVersion:'1',methodHash:RULE_HASH,winnerTeamId:'A',evidenceRecordId:uploaded.submissionId}});
  assert.equal(completed.result.winnerTeamId,'A');
  const advanced=await f.service.lifecycleAction(admin,{tournamentId:created.id,action:'advance-stage',nextStage:'postseason',qualification:{approved:true,methodId:'M1',methodVersion:'1',methodHash:RULE_HASH,evidenceRecordId:uploaded.submissionId,qualifiedTeamIds:['A','B']}});
  assert.equal(advanced.tournament.stage,'postseason');
  assert.equal(f.state.yoloTournaments[0].stageSettingsSnapshots.length,2);
});

test('desktop lifecycle admin actions reject unlinked or participant actors',async()=>{
  const f=fixture(),player=await f.service.resolvePrincipal({id:PLAYER});
  await assert.rejects(f.service.lifecycleAction(player,{tournamentId:'missing',action:'team'}),e=>e.status===403);
});

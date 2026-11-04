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

test('admin can create Pilot and Full YOLO records; players cannot administer formats',async()=>{
 const f=fixture(),admin=await f.service.resolvePrincipal({id:ADMIN}),player=await f.service.resolvePrincipal({id:PLAYER});
 const pilot=await f.service.createYoloTournament(admin,{id:'pilot-2026',name:'Pilot',format:'pilot'});
 assert.equal(pilot.season,null);
 const full=await f.service.createYoloTournament(admin,{id:'full-2026',name:'Full',format:'full',season:{id:'season-2026',durationWeeks:12}});
 assert.deepEqual(full.stages.map(s=>s.type),['regular-season','postseason','grand-finale']);
 await assert.rejects(f.service.createYoloTournament(player,{id:'bad',name:'Bad',format:'pilot'}),e=>e.status===403);
 await assert.rejects(f.service.createYoloTournament(admin,{id:'pilot-2026',name:'Duplicate',format:'pilot'}),e=>e.code==='DUPLICATE_TOURNAMENT');
});
test('event-night stage association is format-validated and registration is identity-scoped',async()=>{
 const f=fixture(),admin=await f.service.resolvePrincipal({id:ADMIN}),player=await f.service.resolvePrincipal({id:PLAYER});
 await f.service.createYoloTournament(admin,{id:'pilot',name:'Pilot',format:'pilot'});
 await assert.rejects(f.service.createYoloEventNight(admin,{id:'bad-night',tournamentId:'pilot',startsAt:'2026-11-05T18:00:00Z',stage:'regular-season'}),e=>e.code==='PILOT_HAS_NO_STAGES');
 await f.service.createYoloEventNight(admin,{id:'pilot-night',tournamentId:'pilot',startsAt:'2026-11-05T18:00:00Z'});
 const result=await f.service.registerYoloParticipant(player,'pilot-night');
 assert.equal(result.participantId,f.alpha.id);
 await assert.rejects(f.service.registerYoloParticipant(player,'pilot-night'),/already registered/);
});
test('Full YOLO event nights require a declared stage and full private archive preserves it',async()=>{
 const f=fixture(),admin=await f.service.resolvePrincipal({id:ADMIN});
 await f.service.createYoloTournament(admin,{id:'full',name:'Full',format:'full',season:{id:'s',durationWeeks:12}});
 await assert.rejects(f.service.createYoloEventNight(admin,{id:'bad',tournamentId:'full',startsAt:'2026-11-05T18:00:00Z'}),e=>e.code==='FULL_STAGE_REQUIRED');
 await f.service.createYoloEventNight(admin,{id:'night',tournamentId:'full',stage:'regular-season',startsAt:'2026-11-05T18:00:00Z'});
 const backup=JSON.parse(await f.service.exportBackup(admin));
 assert.equal(backup.yolo_tournaments[0].format,'full');
 assert.equal(backup.event_nights[0].stage,'regular-season');
});

test('Full YOLO cannot close until every season stage is completed in order',async()=>{
 const f=fixture(),admin=await f.service.resolvePrincipal({id:ADMIN});
 await f.service.createYoloTournament(admin,{id:'full-stage',name:'Full Stage',format:'full',season:{id:'season',durationWeeks:8}});
 await f.service.transitionYoloTournament(admin,'full-stage',{status:'published'});
 await f.service.transitionYoloTournament(admin,'full-stage',{status:'active'});
 await assert.rejects(f.service.transitionYoloTournament(admin,'full-stage',{status:'completed'}),/cannot complete/);
 for(const stage of ['regular-season','postseason','grand-finale']){
  await f.service.transitionYoloStage(admin,'full-stage',{stage,status:'published'});
  await f.service.transitionYoloStage(admin,'full-stage',{stage,status:'active'});
  await f.service.transitionYoloStage(admin,'full-stage',{stage,status:'completed'});
 }
 const final=await f.service.transitionYoloTournament(admin,'full-stage',{status:'completed'});
 assert.equal(final.status,'completed');
});

test('participant overview exposes only aggregate event registration state, not other roster identities',async()=>{
 const f=fixture(),admin=await f.service.resolvePrincipal({id:ADMIN}),player=await f.service.resolvePrincipal({id:PLAYER});
 await f.service.createYoloTournament(admin,{id:'pilot-public',name:'Public Pilot',format:'pilot'});
 await f.service.createYoloEventNight(admin,{id:'night-public',tournamentId:'pilot-public',startsAt:'2026-11-06T18:00:00Z'});
 await f.service.registerYoloParticipant(player,'night-public');
 const overview=await f.service.getOverview(player);
 assert.equal(overview.eventNights[0].isRegistered,true);
 assert.equal(overview.eventNights[0].registrationCount,1);
 assert.equal(Object.hasOwn(overview.eventNights[0],'registrations'),false);
});

test('Full operations preserve registered roster, fixture, match, game and reviewed evidence relationships',async()=>{
 const f=fixture(),admin=await f.service.resolvePrincipal({id:ADMIN});
 await f.service.createYoloTournament(admin,{id:'full-ops',name:'Full Ops',format:'full',season:{id:'season-ops',durationWeeks:10}});
 await f.service.createYoloEventNight(admin,{id:'ops-night',tournamentId:'full-ops',stage:'regular-season',startsAt:'2026-11-07T18:00:00Z'});
 await f.service.registerYoloParticipant(admin,'ops-night',{playerId:f.alpha.id});
 await f.service.registerYoloParticipant(admin,'ops-night',{playerId:2});
 const teamA=await f.service.createYoloTeam(admin,'ops-night',{id:'team-a',name:'Team A',participantIds:[String(f.alpha.id)]});
 const teamB=await f.service.createYoloTeam(admin,'ops-night',{id:'team-b',name:'Team B',participantIds:['2']});
 assert.equal(teamA.eventNightId,'ops-night');
 await assert.rejects(f.service.createYoloTeam(admin,'ops-night',{id:'team-c',name:'Duplicate member',participantIds:[String(f.alpha.id)]}),e=>e.code==='PARTICIPANT_ALREADY_ASSIGNED');
 const fixtureRow=await f.service.createYoloFixture(admin,'ops-night',{id:'fixture-1',homeTeamId:teamA.id,awayTeamId:teamB.id,scheduledAt:'2026-11-07T19:00:00Z'});
 const match=await f.service.createYoloMatch(admin,fixtureRow.id,{id:'match-1',matchNumber:1});
 const game=await f.service.createYoloGame(admin,match.id,{id:'game-1',gameNumber:1});
 const upload=await f.service.submitImage(admin,{buffer:Buffer.from('verified evidence'),filename:'evidence.png',contentType:'image/png'});
 await f.service.mapSubmission(admin,upload.submissionId,{playerId:f.alpha.id,event:'damage',gameNumber:1,shipClass:'DD',tier:8});
 const linked=await f.service.linkYoloGameEvidence(admin,game.id,{recordId:upload.submissionId});
 assert.equal(linked.status,'awaiting-evidence-review');
 const reviewed=await f.service.reviewYoloGameEvidence(admin,game.id,{accepted:true});
 assert.equal(reviewed.status,'evidence-accepted');
});

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

test('Admin manages Pilot and Full lifecycles; match outcomes require a stored organizer approval',async()=>{
  const f=fixture(),admin=await f.service.resolvePrincipal({id:ADMIN}),player=await f.service.resolvePrincipal({id:PLAYER});
  const pilot=await f.service.createTournament(admin,{id:'pilot-1',name:'Pilot Night',format:'pilot'});
  assert.equal(pilot.format,'pilot');
  await assert.rejects(f.service.createSeason(admin,{tournamentId:pilot.id}),/Full YOLO/);
  const full=await f.service.createTournament(admin,{id:'full-1',name:'Full Season',format:'full'});
  const season=await f.service.createSeason(admin,{tournamentId:full.id,id:'season-1',name:'Season 1'});
  const regular=await f.service.addStage(admin,{seasonId:season.id,type:'regular_season'});
  const postseason=await f.service.addStage(admin,{seasonId:season.id,type:'postseason'});
  const finale=await f.service.addStage(admin,{seasonId:season.id,type:'grand_finale'});
  await assert.rejects(f.service.activateStage(admin,{seasonId:season.id,stageId:finale.id}),/preceding/);
  await f.service.activateStage(admin,{seasonId:season.id,stageId:regular.id});
  await f.service.completeStage(admin,{seasonId:season.id,stageId:regular.id});
  await f.service.activateStage(admin,{seasonId:season.id,stageId:postseason.id});
  const a=await f.service.createTeam(admin,{seasonId:season.id,name:'Red'});
  const b=await f.service.createTeam(admin,{seasonId:season.id,name:'Blue'});
  await f.service.registerParticipant(admin,{seasonId:season.id,participantId:'p1',displayName:'Alpha'});
  const night=await f.service.createEventNight(admin,{seasonId:season.id,stageId:postseason.id});
  await f.service.assignRoster(admin,{seasonId:season.id,participantId:'p1',teamId:a.id,eventNightId:night.id});
  const fixture=await f.service.createFixture(admin,{seasonId:season.id,stageId:postseason.id,teamA:a.id,teamB:b.id});
  const match=await f.service.createMatch(admin,{seasonId:season.id,fixtureId:fixture.id});
  await assert.rejects(f.service.recordMatchOutcome(admin,{seasonId:season.id,matchId:match.id,id:'o0',teamA:a.id,teamB:b.id,scoreA:2,scoreB:1,methodId:'missing'}),e=>e.code==='SCORING_APPROVAL_REQUIRED');
  const approval=await f.service.createApprovalRecord(admin,{id:'D21-v1',scope:'match outcome scoring',version:'1',approvedAt:'2026-11-04T12:00:00.000Z'});
  const outcome=await f.service.recordMatchOutcome(admin,{seasonId:season.id,matchId:match.id,id:'o1',teamA:a.id,teamB:b.id,scoreA:2,scoreB:1,methodId:approval.id});
  assert.equal(outcome.winnerTeamId,a.id);
  const c=await f.service.createTeam(admin,{seasonId:season.id,name:'Green'});
  const nextFixture=await f.service.createFixture(admin,{seasonId:season.id,stageId:postseason.id,teamA:a.id,teamB:c.id});
  const progression=await f.service.advanceBracket(admin,{seasonId:season.id,outcomeId:outcome.id,toFixtureId:nextFixture.id,methodId:approval.id});
  assert.equal(progression.winnerTeamId,a.id);
  await assert.rejects(f.service.createAward(admin,{id:'bad-award',tournamentId:full.id,recipientId:'p1',label:'Winner',approvalId:approval.id}),e=>e.code==='AWARD_APPROVAL_REQUIRED');
  const awardApproval=await f.service.createApprovalRecord(admin,{id:'award-v1',scope:'award authorization',version:'1',approvedAt:'2026-11-04T12:01:00.000Z'});
  const award=await f.service.createAward(admin,{id:'award-1',tournamentId:full.id,recipientId:'p1',label:'Winner',approvalId:awardApproval.id});
  assert.equal(award.status,'approved');
  assert.ok(f.state.lifecycle.auditLog.some(x=>x.action==='tournament.created'&&x.actor===ADMIN));
  assert.ok(f.state.lifecycle.auditLog.some(x=>x.action==='match.outcome.recorded'));
  await assert.rejects(f.service.createTournament(player,{id:'unauthorized',format:'pilot'}),e=>e.status===403);
});

test('Pilot scores are stored in a per-event ledger and do not alter legacy category totals',async()=>{
  const f=fixture(),admin=await f.service.resolvePrincipal({id:ADMIN});
  const pilot=await f.service.createTournament(admin,{id:'pilot-ledger',name:'Pilot Ledger',format:'pilot'});
  await f.service.registerPilotParticipant(admin,{tournamentId:pilot.id,participantId:String(f.alpha.id)});
  const night=await f.service.createPilotEventNight(admin,{tournamentId:pilot.id});
  await f.service.transitionTournament(admin,{tournamentId:pilot.id,status:'registration_open'});
  await f.service.transitionTournament(admin,{tournamentId:pilot.id,status:'locked'});
  await f.service.transitionTournament(admin,{tournamentId:pilot.id,status:'active'});
  const result=await f.service.recordTournamentScore(admin,{tournamentId:pilot.id,participantId:String(f.alpha.id),category:'damage',gameNumber:1,shipClass:'DD',tier:8,damage:12345,eventNightId:night.id,evidenceId:'pilot-evidence-1'});
  assert.equal(result.entry.tournamentId,pilot.id);
  assert.equal(f.state.players[0].events.damage[0].metric,0);
  const overview=await f.service.getOverview(admin);
  const summary=overview.tournaments.find(x=>x.id===pilot.id);
  assert.equal(summary.standings[0].id,f.alpha.id);
});

test('screenshot mapping can target a Pilot ledger without altering legacy score buckets',async()=>{
  const f=fixture(),admin=await f.service.resolvePrincipal({id:ADMIN});
  const pilot=await f.service.createTournament(admin,{id:'pilot-ocr',name:'Pilot OCR',format:'pilot'});
  await f.service.registerPilotParticipant(admin,{tournamentId:pilot.id,participantId:String(f.alpha.id)});
  const night=await f.service.createPilotEventNight(admin,{tournamentId:pilot.id});
  await f.service.transitionTournament(admin,{tournamentId:pilot.id,status:'registration_open'});
  await f.service.transitionTournament(admin,{tournamentId:pilot.id,status:'locked'});
  await f.service.transitionTournament(admin,{tournamentId:pilot.id,status:'active'});
  const upload=await f.service.submitImage(admin,{buffer:Buffer.from('pilot synthetic evidence'),filename:'pilot.png',contentType:'image/png'});
  const mapped=await f.service.mapSubmission(admin,upload.submissionId,{playerId:f.alpha.id,event:'damage',gameNumber:1,shipClass:'DD',tier:8,tournamentId:pilot.id,eventNightId:night.id});
  assert.equal(mapped.tournamentId,pilot.id);
  assert.equal(f.state.players[0].events.damage[0].metric,0);
  assert.equal(f.state.lifecycle.tournaments.find(x=>x.id===pilot.id).scoreEntries.length,1);
});

test('Race standings rank shorter elapsed time ahead of longer elapsed time',async()=>{
  const f=fixture(),admin=await f.service.resolvePrincipal({id:ADMIN});
  const pilot=await f.service.createTournament(admin,{id:'pilot-race',name:'Pilot Race',format:'pilot'});
  await f.service.registerPilotParticipant(admin,{tournamentId:pilot.id,participantId:String(f.alpha.id)});
  await f.service.registerPilotParticipant(admin,{tournamentId:pilot.id,participantId:'2'});
  const night=await f.service.createPilotEventNight(admin,{tournamentId:pilot.id});
  for(const status of ['registration_open','locked','active'])await f.service.transitionTournament(admin,{tournamentId:pilot.id,status});
  await f.service.recordTournamentScore(admin,{tournamentId:pilot.id,participantId:String(f.alpha.id),category:'race',gameNumber:1,shipClass:'DD',tier:8,time:90,eventNightId:night.id,evidenceId:'race-90'});
  await f.service.recordTournamentScore(admin,{tournamentId:pilot.id,participantId:'2',category:'race',gameNumber:1,shipClass:'DD',tier:8,time:120,eventNightId:night.id,evidenceId:'race-120'});
  const summary=(await f.service.getOverview(admin)).tournaments.find(x=>x.id===pilot.id);
  assert.equal(summary.standings[0].id,f.alpha.id);
});

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../src/tournament-lifecycle');

test('creates Pilot and Full tournaments with distinct lifecycle constraints', () => {
  const pilot = L.createTournament({ id: 'p1', name: 'Pilot Night', format: 'pilot' });
  const full = L.createTournament({ id: 'f1', name: 'Full Season', format: 'full' });
  assert.equal(pilot.format, 'pilot');
  assert.equal(pilot.seasonId, null);
  assert.equal(full.format, 'full');
  assert.equal(full.seasonId, null);
  assert.throws(() => L.createSeason(pilot.id, { tournament: pilot }), /Full YOLO/);
  const season = L.createSeason(full.id, { id: 's1', name: '2027 Season', tournament: full });
  assert.equal(season.id, 's1');
});

test('validates tournament format and lifecycle transitions', () => {
  assert.throws(() => L.createTournament({ id: 'x', format: 'hybrid' }), /format/);
  const t = L.createTournament({ id: 'p2', format: 'pilot' });
  L.transitionTournament(t, 'registration_open', { actor: 'admin' });
  L.transitionTournament(t, 'locked', { actor: 'admin' });
  L.transitionTournament(t, 'active', { actor: 'admin' });
  t.acceptedResultCount = 1;
  assert.throws(() => L.transitionTournament(t, 'draft', { actor: 'admin' }), /transition/);
  assert.throws(() => L.changeFormat(t, 'full'), /immutable/);
  assert.equal(t.auditLog.length, 3);
});

test('Full season stages progress in order and Grand Finale cannot be skipped', () => {
  const t = L.createTournament({ id: 'f2', format: 'full' });
  const s = L.createSeason(t.id, { id: 's2', tournament: t });
  const regular = L.createStage(s.id, 'regular_season', { id: 'r' });
  const post = L.createStage(s.id, 'postseason', { id: 'po' });
  const finale = L.createStage(s.id, 'grand_finale', { id: 'gf' });
  assert.equal(regular.order, 1);
  assert.equal(post.order, 2);
  assert.equal(finale.order, 3);
  s.stages.push(regular, post, finale);
  assert.throws(() => L.activateStage(s, finale.id), /preceding/);
  L.activateStage(s, regular.id);
  L.completeStage(s, regular.id);
  L.activateStage(s, post.id);
  L.completeStage(s, post.id);
  L.activateStage(s, finale.id);
  assert.equal(finale.status, 'active');
});

test('roster assignments reject duplicates and cross-season references', () => {
  const t = L.createTournament({ id: 'f3', format: 'full' });
  const s = L.createSeason(t.id, { id: 's3', tournament: t });
  L.registerParticipant(s, { participantId: 'u1', displayName: 'Alpha' });
  L.createTeam(s,{id:'red',name:'Red'});L.createTeam(s,{id:'blue',name:'Blue'});
  const stage=L.createStage(s.id,'regular_season',{id:'regular'});s.stages.push(stage);
  const night1=L.createEventNight(s,{id:'night-1',stageId:stage.id});
  const night2=L.createEventNight(s,{id:'night-2',stageId:stage.id});
  L.assignRoster(s,{participantId:'u1',teamId:'red',eventNightId:night1.id});
  assert.throws(()=>L.assignRoster(s,{participantId:'u1',teamId:'blue',eventNightId:night1.id}),/already assigned/);
  assert.equal(L.assignRoster(s,{participantId:'u1',teamId:'blue',eventNightId:night2.id}).teamId,'blue');
  assert.throws(()=>L.assignRoster(s,{participantId:'u2',teamId:'red',eventNightId:night1.id}),/registered/);
});

test('match outcomes require an approved, identified scoring method and exact positive inputs', () => {
  const t = L.createTournament({ id: 'f4', format: 'full' });
  const s = L.createSeason(t.id, { id: 's4', tournament: t });
  L.createTeam(s, { id: 'a', name: 'Alpha' });
  L.createTeam(s, { id: 'b', name: 'Bravo' });
  const stage = L.createStage(s.id, 'regular_season', { id: 'regular' });
  s.stages.push(stage);
  const night=L.createEventNight(s,{id:'match-night',stageId:stage.id});
  for(const status of ['registration_open','locked','active'])L.transitionEventNight(night,status,{actor:'admin'});
  const fixture = L.createFixture(s, { id: 'fx', stageId: stage.id, eventNightId:night.id, teamA: 'a', teamB: 'b' });
  const match = L.createMatch(s, fixture.id, { id: 'match-1' });
  assert.throws(() => L.recordMatchOutcome(s, { id: 'm1', matchId: match.id, method: { approved: false }, teamA: 'a', teamB: 'b', scoreA: 1, scoreB: 0 }), /approved/);
  const result = L.recordMatchOutcome(s, { id: 'm2', matchId: match.id, method: { approved: true, methodId: 'D21-approved-v1', approvedAt: '2026-11-04T12:00:00Z', approvedBy: 'organizer-1' }, teamA: 'a', teamB: 'b', scoreA: 12.5, scoreB: 9 });
  assert.equal(result.winnerTeamId, 'a');
  assert.throws(() => L.recordMatchOutcome(s, { id: 'm3', method: { approved: true, methodId: 'D21-approved-v1' }, matchId: match.id, teamA: 'a', teamB: 'b', scoreA: '', scoreB: 0 }), /finite/);
});

test('Race side-event and Grand Finale are not aliases for scoring categories', () => {
  assert.equal(L.STAGE_TYPES.includes('grand_finale'), true);
  assert.equal(L.SCORING_CATEGORIES.includes('grand'), true);
  assert.equal(L.createRaceSideEvent({ id: 'race-1', seasonId: 's', eventNightId: 'night-1', map: 'Big Race' }).map, 'Big Race');
  assert.throws(() => L.createRaceSideEvent({ id: 'race-2', seasonId: 's', eventNightId: 'night-1', elapsedSeconds: 0 }), /positive/);
});

test('legacy state receives empty lifecycle with no invented format assignment', () => {
  const state = L.normalizeLifecycleState({ players: [{ id: 1, name: 'Legacy' }], battleRecords: [{ record_id: 'x' }] });
  assert.deepEqual(state.tournaments, []);
  assert.deepEqual(state.seasons, []);
  assert.equal(state.legacyProvenance.format, 'legacyUnassigned');
  assert.equal(state.legacyProvenance.recordCount, 1);
});

test('event nights, fixtures, matches and awards are season-scoped', () => {
  const t = L.createTournament({ id: 'f5', format: 'full' });
  const s = L.createSeason(t.id, { id: 's5', tournament: t });
  const stage = L.createStage(s.id, 'regular_season', { id: 'regular' });
  s.stages.push(stage);
  L.createTeam(s, { id: 'a', name: 'Alpha' });
  L.createTeam(s, { id: 'b', name: 'Bravo' });
  const night=L.createEventNight(s, { id: 'n1', stageId: stage.id });
  assert.equal(night.seasonId,s.id);
  const fixture = L.createFixture(s, { id: 'fx1', stageId: stage.id, eventNightId:night.id, teamA: 'a', teamB: 'b' });
  assert.equal(L.createMatch(s, fixture.id, { id: 'm1', gameNumber: 1 }).fixtureId, fixture.id);
  assert.throws(() => L.createFixture(s, { id: 'fx2', stageId: stage.id, eventNightId:night.id, teamA: 'a', teamB: 'missing' }), /two different teams/);
  assert.equal(L.createAward({ id: 'award-1', tournamentId: t.id, recipientId: 'u1', label: 'Winner', approvalId: 'PUB-1' }).status, 'approved');
});

test('Pilot registration, single event night and score ledger are format-scoped', () => {
  const t=L.createTournament({id:'pilot-score',format:'pilot'});
  L.registerPilotParticipant(t,{participantId:'17',displayName:'Alpha'});
  assert.throws(()=>L.registerPilotParticipant(t,{participantId:'17',displayName:'Alpha'}),/already registered/);
  const night=L.createPilotEventNight(t,{id:'pilot-night'});
  for(const status of ['registration_open','locked','active'])L.transitionEventNight(night,status,{actor:'admin'});
  assert.equal(night.tournamentId,t.id);
  assert.throws(()=>L.createPilotEventNight(t,{id:'pilot-night-2'}),/one single-evening/);
  assert.throws(()=>L.recordScoreEntry(t,{participantId:'17',category:'damage',gameNumber:1,shipClass:'DD',tier:8,eventNightId:night.id,evidenceId:'e1',damage:100}),/active/);
  L.transitionTournament(t,'registration_open',{actor:'admin'});
  L.transitionTournament(t,'locked',{actor:'admin'});
  L.transitionTournament(t,'active',{actor:'admin'});
  const entry=L.recordScoreEntry(t,{participantId:'17',category:'damage',gameNumber:1,shipClass:'DD',tier:8,eventNightId:night.id,evidenceId:'e1',damage:100});
  assert.equal(entry.tournamentId,t.id);
  assert.equal(entry.metric,100);
  assert.throws(()=>L.recordScoreEntry(t,{participantId:'17',category:'damage',gameNumber:1,shipClass:'DD',tier:8,eventNightId:night.id,evidenceId:'e2',damage:200}),/already has/);
});
test('Full score entry requires a season registration and positive Race time', () => {
  const t=L.createTournament({id:'full-score',format:'full'});
  const season=L.createSeason(t.id,{id:'season-score',tournament:t});
  L.registerParticipant(season,{participantId:'u1',displayName:'Alpha'});
  const stage=L.createStage(season.id,'regular_season',{id:'rs'});season.stages.push(stage);
  const night=L.createEventNight(season,{id:'full-night',stageId:stage.id});
  for(const status of ['registration_open','locked','active'])L.transitionEventNight(night,status,{actor:'admin'});
  L.transitionTournament(t,'registration_open',{actor:'admin'});
  L.transitionTournament(t,'locked',{actor:'admin'});
  L.transitionTournament(t,'active',{actor:'admin'});
  assert.throws(()=>L.recordScoreEntry(t,{participantId:'u2',category:'race',gameNumber:1,shipClass:'DD',tier:8,eventNightId:night.id,evidenceId:'e1',time:90},season),/registered/);
  const entry=L.recordScoreEntry(t,{participantId:'u1',category:'race',gameNumber:1,shipClass:'DD',tier:8,eventNightId:night.id,evidenceId:'e2',time:90},season);
  assert.equal(entry.elapsedSeconds,90);
  assert.equal(entry.metric,1/90);
  assert.throws(()=>L.recordScoreEntry(t,{participantId:'u1',category:'race',gameNumber:2,shipClass:'DD',tier:8,eventNightId:night.id,evidenceId:'e3',time:0},season),/positive/);
});
test('organizer approval records require a valid timestamp and attribution', () => {
  assert.throws(()=>L.createApprovalRecord({id:'a',scope:'match outcome scoring',version:'1',approvedBy:'admin',approvedAt:'invalid'}),/valid ISO/);
  const approval=L.createApprovalRecord({id:'a',scope:'match outcome scoring',version:'1',approvedBy:'admin',approvedAt:'2026-11-04T12:00:00Z'});
  assert.equal(approval.status,'approved');
});

test('event-night status locks roster and only accepts results while active',()=>{
 const t=L.createTournament({id:'f-night',format:'full'}),season=L.createSeason(t.id,{id:'s-night',tournament:t});
 const stage=L.createStage(season.id,'regular_season',{id:'rs'});season.stages.push(stage);
 const night=L.createEventNight(season,{id:'n',stageId:stage.id});
 L.registerParticipant(season,{participantId:'u',displayName:'User'});L.createTeam(season,{id:'red',name:'Red'});
 L.assignRoster(season,{participantId:'u',teamId:'red',eventNightId:night.id});
 L.transitionEventNight(night,'registration_open',{actor:'admin'});L.transitionEventNight(night,'locked',{actor:'admin'});
 assert.throws(()=>L.assignRoster(season,{participantId:'u',teamId:'red',eventNightId:night.id}),/locked/);
 assert.throws(()=>L.recordScoreEntry(t,{participantId:'u',category:'damage',gameNumber:1,shipClass:'DD',tier:8,evidenceId:'e',eventNightId:night.id,damage:10},season),/only while the event night is active/);
 L.transitionEventNight(night,'active',{actor:'admin'});
 assert.equal(L.recordScoreEntry(t,{participantId:'u',category:'damage',gameNumber:1,shipClass:'DD',tier:8,evidenceId:'e',eventNightId:night.id,damage:10},season).metric,10);
});

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Y = require('../src/yolo-formats');
test('Pilot has no season or multi-stage lifecycle',()=>{const t=Y.createTournament({id:'p',name:'Pilot',format:'pilot'});assert.equal(t.season,null);assert.deepEqual(t.stages,[]);});
test('Full requires a declared duration and all three stages',()=>{assert.throws(()=>Y.createTournament({id:'f',name:'Full',format:'full'}),/duration/);const t=Y.createTournament({id:'f',name:'Full',format:'full',season:{id:'s',durationWeeks:12},settings:{approvedSettingsId:'approved-full'}});assert.deepEqual(t.stages.map(x=>x.type),['regular-season','postseason','grand-finale']);});
test('invalid format, time and participant cap fail closed',()=>{assert.throws(()=>Y.createTournament({id:'x',name:'X',format:'both'}),/pilot or full/);assert.throws(()=>Y.createTournament({id:'x',name:'X',format:'pilot',startsAt:'bad'}),/valid ISO/);assert.throws(()=>Y.createTournament({id:'x',name:'X',format:'pilot',settings:{participantCap:51}}),/1 to 50/);});
test('status transitions append audit entries',()=>{let t=Y.createTournament({id:'p',name:'Pilot',format:'pilot',settings:{approvedSettingsId:'approved-pilot'}});t=Y.transitionTournament(t,'published','admin','2026-11-04T12:00:00Z');t=Y.transitionTournament(t,'active','admin','2026-11-04T13:00:00Z');assert.equal(t.audit.length,2);assert.throws(()=>Y.transitionTournament(t,'draft','admin'),/Invalid lifecycle/);});
test('event-night registration prevents duplicates and closes after event',()=>{let n=Y.createEventNight({id:'n',tournamentId:'p',startsAt:'2026-11-04T18:00:00Z'});n=Y.registerParticipant(n,'player-1');assert.throws(()=>Y.registerParticipant(n,'player-1'),/already registered/);assert.throws(()=>Y.registerParticipant({...n,status:'completed'},'player-2'),/closed/);});
test('rules freeze after event starts',()=>{assert.deepEqual(Y.freezeRules({x:1},false),{x:1});assert.throws(()=>Y.freezeRules({x:2},true),/frozen/);});
test('race metric differs from separately scheduled side-event',()=>{assert.equal(Y.raceMetric(60).normalizedMetric,1/60);assert.throws(()=>Y.raceMetric(0),/positive/);assert.equal(Y.createRaceSideEvent({id:'r',eventNightId:'n'}).type,'race-side-event');});
test('Grand Yolo scoring category differs from Grand YOLO finale',()=>{assert.equal(Y.grandYoloScore({eventNightId:'n'}).type,'grand-yolo-score');assert.equal(Y.grandYoloFinale({stageId:'s',matchId:'m'}).type,'grand-yolo-finale');});
test('official match outcome requires approved formula and accepted evidence',()=>{assert.throws(()=>Y.validateMatchOutcome({}),/Approved scoring-method/);assert.equal(Y.validateMatchOutcome({approvedScoringMethodId:'v1',acceptedPerformanceRecordIds:['r1'],aggregation:'approved',rounding:'approved',tieBreakOrder:['head-to-head']}).status,'pending-calculation');});

test('Full stages activate and complete in order; season cannot close early',()=>{
 let t=Y.createTournament({id:'full',name:'Full',format:'full',season:{id:'s',durationWeeks:12}});
 t=Y.transitionStage(t,'postseason','published','admin');
 assert.throws(()=>Y.transitionStage(t,'postseason','active','admin'),/preceding/);
 t=Y.transitionStage(t,'regular-season','published','admin');
 t=Y.transitionStage(t,'regular-season','active','admin');
 t=Y.transitionStage(t,'regular-season','completed','admin');
 t=Y.transitionStage(t,'postseason','active','admin');
 t=Y.transitionStage(t,'postseason','completed','admin');
 t=Y.transitionStage(t,'grand-finale','published','admin');
 t=Y.transitionStage(t,'grand-finale','active','admin');
 assert.throws(()=>Y.transitionTournament({...t,status:'active'},'completed','admin'),/cannot complete/);
 t=Y.transitionStage(t,'grand-finale','completed','admin');
 assert.equal(t.stages.every(s=>s.status==='completed'),true);
});

test('lifecycle identifiers and event times are validated',()=>{
 assert.throws(()=>Y.createTournament({id:'bad/id',name:'Bad',format:'pilot'}),/must use/);
 assert.throws(()=>Y.createEventNight({id:'night',tournamentId:'p',startsAt:'2026-11-05T18:00:00Z',endsAt:'2026-11-05T17:00:00Z'}),/after its start/);
});
test('teams, fixtures, matches and games enforce distinct identities and valid structure',()=>{
 const teamA=Y.createTeam({id:'team-a',eventNightId:'night-1',name:'A',participantIds:['1','2']});
 assert.equal(teamA.participantIds.length,2);
 assert.throws(()=>Y.createTeam({id:'team-b',eventNightId:'night-1',name:'B',participantIds:['1','1']}),/twice/);
 assert.throws(()=>Y.createFixture({id:'fx',eventNightId:'night-1',homeTeamId:'team-a',awayTeamId:'team-a',scheduledAt:'2026-11-05T18:00:00Z'}),/distinct/);
 const fixture=Y.createFixture({id:'fx',eventNightId:'night-1',homeTeamId:'team-a',awayTeamId:'team-b',scheduledAt:'2026-11-05T18:00:00Z',seriesLength:3});
 const match=Y.createMatch({id:'m1',fixtureId:fixture.id,matchNumber:1});
 const game=Y.createGame({id:'g1',matchId:match.id,gameNumber:1});
 assert.equal(game.status,'pending-evidence');
 assert.throws(()=>Y.createFixture({id:'fx2',eventNightId:'night-1',homeTeamId:'a',awayTeamId:'b',scheduledAt:'2026-11-05T18:00:00Z',seriesLength:2}),/odd integer/);
});
test('official outcome requires non-empty unique accepted records and tie-breaks',()=>{
 assert.throws(()=>Y.validateMatchOutcome({approvedScoringMethodId:'v1',acceptedPerformanceRecordIds:['r1','r1'],aggregation:'sum',rounding:'nearest',tieBreakOrder:['head-to-head']}),/Unique accepted/);
 assert.throws(()=>Y.validateMatchOutcome({approvedScoringMethodId:'v1',acceptedPerformanceRecordIds:['r1'],aggregation:'sum',rounding:'nearest',tieBreakOrder:[]}),/tie-break order/);
});

test('tournament, stages and event nights cannot publish without approval records',()=>{
 const pilot=Y.createTournament({id:'pilot-approval',name:'Pilot',format:'pilot'});
 assert.throws(()=>Y.transitionTournament(pilot,'published','admin'),/approved tournament settings/);
 const approved=Y.createTournament({id:'pilot-approved',name:'Pilot',format:'pilot',settings:{approvedSettingsId:'approval-1'}});
 const night=Y.createEventNight({id:'night-approval',tournamentId:'pilot-approved',startsAt:'2026-11-06T18:00:00Z'});
 assert.throws(()=>Y.transitionEventNight(night,'published','admin'),/approved event settings/);
 const ready=Y.createEventNight({id:'night-ready',tournamentId:'pilot-approved',startsAt:'2026-11-06T18:00:00Z',approvedSettingsId:'approval-1'});
 const published=Y.transitionEventNight(ready,'published','admin');
 const active=Y.transitionEventNight(published,'active','admin');
 assert.ok(active.rosterLockedAt);
});

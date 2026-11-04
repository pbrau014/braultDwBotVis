'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Y = require('../src/yolo-formats');
test('Pilot has no season or multi-stage lifecycle',()=>{const t=Y.createTournament({id:'p',name:'Pilot',format:'pilot'});assert.equal(t.season,null);assert.deepEqual(t.stages,[]);});
test('Full requires a declared duration and all three stages',()=>{assert.throws(()=>Y.createTournament({id:'f',name:'Full',format:'full'}),/duration/);const t=Y.createTournament({id:'f',name:'Full',format:'full',season:{id:'s',durationWeeks:12}});assert.deepEqual(t.stages.map(x=>x.type),['regular-season','postseason','grand-finale']);});
test('invalid format, time and participant cap fail closed',()=>{assert.throws(()=>Y.createTournament({id:'x',name:'X',format:'both'}),/pilot or full/);assert.throws(()=>Y.createTournament({id:'x',name:'X',format:'pilot',startsAt:'bad'}),/valid ISO/);assert.throws(()=>Y.createTournament({id:'x',name:'X',format:'pilot',settings:{participantCap:51}}),/1 to 50/);});
test('status transitions append audit entries',()=>{let t=Y.createTournament({id:'p',name:'Pilot',format:'pilot'});t=Y.transitionTournament(t,'published','admin','2026-11-04T12:00:00Z');t=Y.transitionTournament(t,'active','admin','2026-11-04T13:00:00Z');assert.equal(t.audit.length,2);assert.throws(()=>Y.transitionTournament(t,'draft','admin'),/Invalid lifecycle/);});
test('event-night registration prevents duplicates and closes after event',()=>{let n=Y.createEventNight({id:'n',tournamentId:'p',startsAt:'2026-11-04T18:00:00Z'});n=Y.registerParticipant(n,'player-1');assert.throws(()=>Y.registerParticipant(n,'player-1'),/already registered/);assert.throws(()=>Y.registerParticipant({...n,status:'completed'},'player-2'),/closed/);});
test('rules freeze after event starts',()=>{assert.deepEqual(Y.freezeRules({x:1},false),{x:1});assert.throws(()=>Y.freezeRules({x:2},true),/frozen/);});
test('race metric differs from separately scheduled side-event',()=>{assert.equal(Y.raceMetric(60).normalizedMetric,1/60);assert.throws(()=>Y.raceMetric(0),/positive/);assert.equal(Y.createRaceSideEvent({id:'r',eventNightId:'n'}).type,'race-side-event');});
test('Grand Yolo scoring category differs from Grand YOLO finale',()=>{assert.equal(Y.grandYoloScore({eventNightId:'n'}).type,'grand-yolo-score');assert.equal(Y.grandYoloFinale({stageId:'s',matchId:'m'}).type,'grand-yolo-finale');});
test('official match outcome requires approved formula and accepted evidence',()=>{assert.throws(()=>Y.validateMatchOutcome({}),/approved scoring-method/);assert.equal(Y.validateMatchOutcome({approvedScoringMethodId:'v1',acceptedPerformanceRecordIds:['r1'],aggregation:'approved',rounding:'approved',tieBreakOrder:['head-to-head']}).status,'pending-calculation');});

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

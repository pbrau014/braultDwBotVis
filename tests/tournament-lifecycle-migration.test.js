'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const T=require('../src/tournament');

test('v2 legacy state remains unassigned and preserves records and scoring buckets',()=>{
 const legacy={version:2,players:[{id:7,name:'Legacy',events:{damage:[{class:'DD',tier:6,metric:12000}],kills:[],race:[],grand:[]}}],settings:{events:{damage:{pool:500}}},battleRecords:[{record_id:'b-1'}],pendingSubmissions:[{record_id:'b-1'}],pendingOcrCorrections:[{key:'k'}],playerAccountLinks:{'7':'12345678901234567'}};
 const state=T.normalizeState(legacy);
 assert.equal(state.lifecycle.legacyProvenance.format,'legacyUnassigned');
 assert.equal(state.lifecycle.legacyProvenance.recordCount,1);
 assert.equal(state.players[0].events.damage[0].metric,12000);
 assert.equal(state.pendingSubmissions[0].record_id,'b-1');
 assert.equal(state.pendingOcrCorrections[0].key,'k');
 assert.equal(state.playerAccountLinks['7'],'12345678901234567');
 assert.deepEqual(state.lifecycle.tournaments,[]);
});
test('private archive round-trip preserves lifecycle while public archive omits it',()=>{
 const state=T.createState();
 state.lifecycle.tournaments.push({id:'p1',format:'pilot',status:'draft'});
 state.lifecycle.seasons.push({id:'s1',tournamentId:'f1'});
 const archive=T.makeArchiveSnapshot(state);
 const restored=T.importBackup(archive);
 assert.deepEqual(restored.lifecycle.tournaments,state.lifecycle.tournaments);
 assert.deepEqual(restored.lifecycle.seasons,state.lifecycle.seasons);
 const pub=T.makePublicArchiveSnapshot(state);
 assert.equal(Object.hasOwn(pub,'lifecycle'),false);
 assert.ok(pub.private_data_omitted.includes('lifecycle'));
});

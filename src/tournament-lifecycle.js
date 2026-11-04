'use strict';
const FORMATS=Object.freeze(['pilot','full']);
const TOURNAMENT_STATUSES=Object.freeze(['draft','registration_open','locked','active','completed','archived']);
const STAGE_TYPES=Object.freeze(['regular_season','postseason','grand_finale']);
const SCORING_CATEGORIES=Object.freeze(['damage','kills','race','grand']);
const TRANSITIONS=Object.freeze({draft:['registration_open','archived'],registration_open:['locked','archived'],locked:['active','archived'],active:['completed'],completed:['archived'],archived:[]});
const STAGE_ORDER=Object.freeze({regular_season:1,postseason:2,grand_finale:3});
const clone=v=>JSON.parse(JSON.stringify(v));
function text(v,label){const s=String(v??'').trim();if(!s)throw new TypeError(label+' is required.');return s;}
function score(v,label){if(v===''||v===null||v===undefined||!Number.isFinite(Number(v))||Number(v)<0)throw new TypeError(label+' must be finite and non-negative.');return Number(v);}
function createLifecycleState(raw={}){return normalizeLifecycleState(raw);}
function normalizeLifecycleState(raw={}){
 const s=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const records=Array.isArray(s.battleRecords)?s.battleRecords:[];
 const arrays=['tournaments','seasons','eventNights','teams','registrations','rosterAssignments','fixtures','matches','matchOutcomes','bracketProgression','raceSideEvents','awards','approvals','auditLog'];
 const out={schemaVersion:1};
 for(const key of arrays)out[key]=Array.isArray(s[key])?clone(s[key]):[];
 out.legacyProvenance=s.legacyProvenance?clone(s.legacyProvenance):{format:'legacyUnassigned',recordCount:records.length,reason:'Pre-dual-format records are not automatically assigned.'};
 return out;
}
function createTournament(input={}){
 const id=text(input.id,'Tournament id'),format=text(input.format,'Tournament format').toLowerCase();
 if(!FORMATS.includes(format))throw new TypeError('Tournament format must be pilot or full.');
 return {id,name:String(input.name||id).trim(),format,status:'draft',seasonId:null,acceptedResultCount:0,registrations:[],eventNights:[],scoreEntries:[],settings:{duration:format==='pilot'?'single_evening':'multi_week_or_month',carryover:false},configFrozenAt:null,auditLog:[],createdAt:input.createdAt||new Date().toISOString()};
}
function audit(target,action,context={},details={}){const row={action,actor:text(context.actor,'Audit actor'),at:context.at||new Date().toISOString(),reason:String(context.reason||''),details:clone(details)};target.auditLog||=[];target.auditLog.push(row);return row;}
function transitionTournament(t,next,context={}){if(!TOURNAMENT_STATUSES.includes(next))throw new TypeError('Unknown tournament status.');if(!TRANSITIONS[t.status]?.includes(next))throw new Error('Invalid tournament lifecycle transition.');audit(t,'tournament.status.changed',context,{from:t.status,to:next});t.status=next;if(next==='active')t.configFrozenAt=context.at||new Date().toISOString();return t;}
function changeFormat(t,next){if(t.acceptedResultCount>0||t.status!=='draft')throw new Error('Tournament format is immutable after registration opens or results are accepted.');if(!FORMATS.includes(next))throw new TypeError('Tournament format must be pilot or full.');t.format=next;t.settings.duration=next==='pilot'?'single_evening':'multi_week_or_month';return t;}

function registerPilotParticipant(tournament,input={}) {
  if(tournament.format!=='pilot') throw new Error('Pilot registration applies only to Pilot YOLO.');
  if(tournament.registrations.length>=50) throw new Error('Pilot registration limit is 50 participants.');
  const participantId=text(input.participantId,'Participant id');
  if(tournament.registrations.some(x=>x.participantId===participantId)) throw new Error('Participant is already registered for this Pilot.');
  const row={participantId,displayName:text(input.displayName,'Display name'),status:'registered',registeredAt:new Date().toISOString()};
  tournament.registrations.push(row); return row;
}
function createPilotEventNight(tournament,input={}) {
  if(tournament.format!=='pilot') throw new Error('Pilot event-night operation requires Pilot YOLO.');
  if(tournament.eventNights.length) throw new Error('Pilot YOLO has one single-evening event night.');
  const row={id:text(input.id,'Event night id'),tournamentId:tournament.id,startsAt:input.startsAt||null,status:'planned',settings:clone(input.settings||{})};
  tournament.eventNights.push(row); return row;
}
function recordScoreEntry(tournament,input={},season=null) {
  if(tournament.status!=='active') throw new Error('Tournament must be active before accepting score entries.');
  const participantId=text(input.participantId,'Participant id');
  const registered=tournament.format==='pilot'
    ? tournament.registrations.some(x=>x.participantId===participantId)
    : Boolean(season&&season.registrations.some(x=>x.participantId===participantId));
  if(!registered) throw new Error('Participant must be registered in this tournament before scoring.');
  const category=text(input.category,'Scoring category').toLowerCase();
  if(!SCORING_CATEGORIES.includes(category)) throw new TypeError('Unknown scoring category.');
  const gameNumber=Number(input.gameNumber);
  if(!Number.isInteger(gameNumber)||gameNumber<1||gameNumber>7) throw new TypeError('Game number must be an integer from 1 to 7.');
  const shipClass=text(input.shipClass,'Ship class').toUpperCase();
  if(!['DD','CA','BB'].includes(shipClass)) throw new TypeError('Ship class must be DD, CA, or BB.');
  const tier=Number(input.tier);
  if(!Number.isInteger(tier)||tier<1||tier>11) throw new TypeError('Ship tier must be an integer from 1 to 11.');
  const evidenceId=text(input.evidenceId,'Evidence id');
  const eventNightId=text(input.eventNightId,'Event night id');
  const nights=tournament.format==='pilot'?tournament.eventNights:(season?.eventNights||[]);
  if(!nights.some(x=>x.id===eventNightId)) throw new Error('Score entry must reference an event night in this tournament.');
  if(tournament.scoreEntries.some(x=>x.participantId===participantId&&x.eventNightId===eventNightId&&x.category===category&&x.gameNumber===gameNumber)) throw new Error('This participant/category/game slot already has a score entry for this event night.');
  const entry={id:text(input.id||evidenceId,'Score entry id'),tournamentId:tournament.id,seasonId:season?.id||null,eventNightId,participantId,category,gameNumber,shipClass,tier,evidenceId,recordedAt:new Date().toISOString()};
  if(category==='grand') {
    entry.damage=score(input.damage,'Damage');entry.kills=score(input.kills,'Kills');entry.time=Number(input.time);
    if(!Number.isFinite(entry.time)||entry.time<=0) throw new TypeError('Grand Yolo time must be positive.');
  } else if(category==='race') {
    entry.elapsedSeconds=Number(input.time);if(!Number.isFinite(entry.elapsedSeconds)||entry.elapsedSeconds<=0)throw new TypeError('Race elapsed time must be positive.');entry.metric=1/entry.elapsedSeconds;
  } else {
    entry.metric=score(category==='damage'?input.damage:input.kills,category==='damage'?'Damage':'Kills');
  }
  tournament.scoreEntries.push(entry);tournament.acceptedResultCount+=1;return entry;
}
function createSeason(tournamentId,input={}){if(input.tournament?.format!=='full')throw new Error('Season entities are available only to Full YOLO; provide its owning Full YOLO tournament.');return {id:text(input.id,'Season id'),tournamentId:text(tournamentId,'Tournament id'),name:String(input.name||input.id).trim(),status:'planned',stages:[],eventNights:[],teams:[],registrations:[],rosterAssignments:[],fixtures:[],matches:[],matchOutcomes:[],bracketProgression:[],awards:[],createdAt:new Date().toISOString()};}
function createStage(seasonId,type,input={}){if(!Object.hasOwn(STAGE_ORDER,type))throw new TypeError('Unknown stage type.');return {id:text(input.id,'Stage id'),seasonId:text(seasonId,'Season id'),type,order:STAGE_ORDER[type],status:'planned'};}
function activateStage(season,id){const s=season.stages.find(x=>x.id===id);if(!s)throw new Error('Stage is not registered in this season.');const prev=season.stages.find(x=>x.order===s.order-1);if(s.order>1&&!prev)throw new Error('A preceding stage must exist before this stage.');if(prev&&prev.status!=='completed')throw new Error('A preceding stage must be completed first.');if(s.status!=='planned')throw new Error('Only planned stages can be activated.');s.status='active';return s;}
function completeStage(season,id){const s=season.stages.find(x=>x.id===id);if(!s||s.status!=='active')throw new Error('Only an active stage can be completed.');s.status='completed';return s;}
function registerParticipant(season,p){const id=text(p.participantId,'Participant id');if(season.registrations.length>=50)throw new Error('Season registration limit is 50 participants.');if(season.registrations.some(x=>x.participantId===id))throw new Error('Participant is already registered in this season.');const r={participantId:id,displayName:text(p.displayName,'Display name'),status:'registered'};season.registrations.push(r);return r;}
function assignRoster(season,a){const participantId=text(a.participantId,'Participant id'),teamId=text(a.teamId,'Team id'),eventNightId=text(a.eventNightId,'Event night id');if(!season.registrations.some(x=>x.participantId===participantId))throw new Error('Participant must be registered before roster assignment.');if(!season.eventNights?.some(x=>x.id===eventNightId))throw new Error('Roster assignment must reference an event night in this season.');if(!season.teams?.some(x=>x.id===teamId))throw new Error('Roster assignment must reference a team in this season.');if(season.rosterAssignments.some(x=>x.participantId===participantId&&x.eventNightId===eventNightId&&x.status==='active'))throw new Error('Participant is already assigned to a team for this event night.');const r={participantId,teamId,eventNightId,status:'active',assignedAt:new Date().toISOString()};season.rosterAssignments.push(r);return r;}

function createEventNight(season,input={}) {
  const row={id:text(input.id,'Event night id'),seasonId:season.id,stageId:text(input.stageId,'Stage id'),startsAt:input.startsAt||null,status:'planned',settings:clone(input.settings||{}),createdAt:new Date().toISOString()};
  if(!season.stages.some(x=>x.id===row.stageId)) throw new Error('Event night must reference a stage in its season.');
  season.eventNights||=[]; if(season.eventNights.some(x=>x.id===row.id)) throw new Error('Event night id already exists.');
  season.eventNights.push(row); return row;
}
function createTeam(season,input={}) {
  const row={id:text(input.id,'Team id'),seasonId:season.id,name:text(input.name,'Team name'),status:'active'};
  season.teams||=[]; if(season.teams.some(x=>x.id===row.id||x.name.toLowerCase()===row.name.toLowerCase())) throw new Error('Team id or name already exists.');
  season.teams.push(row); return row;
}
function createFixture(season,input={}) {
  const stageId=text(input.stageId,'Stage id'),teamA=text(input.teamA,'Team A'),teamB=text(input.teamB,'Team B');
  if(!season.stages.some(x=>x.id===stageId)) throw new Error('Fixture must reference a stage in its season.');
  if(teamA===teamB||![teamA,teamB].every(id=>season.teams.some(x=>x.id===id))) throw new Error('Fixture must reference two different teams in its season.');
  const row={id:text(input.id,'Fixture id'),seasonId:season.id,stageId,teamA,teamB,status:'scheduled',scheduledAt:input.scheduledAt||null};
  season.fixtures||=[]; if(season.fixtures.some(x=>x.id===row.id)) throw new Error('Fixture id already exists.');
  season.fixtures.push(row); return row;
}
function createMatch(season,fixtureId,input={}) {
  const fixture=season.fixtures.find(x=>x.id===fixtureId); if(!fixture) throw new Error('Match must reference a fixture in its season.');
  const row={id:text(input.id,'Match id'),seasonId:season.id,fixtureId,gameNumber:Number(input.gameNumber||1),status:'scheduled',evidenceIds:[]};
  if(!Number.isInteger(row.gameNumber)||row.gameNumber<1) throw new TypeError('Match game number must be a positive integer.');
  season.matches||=[]; if(season.matches.some(x=>x.id===row.id)) throw new Error('Match id already exists.');
  season.matches.push(row); return row;
}
function createApprovalRecord(input={}) { const approvedAt=text(input.approvedAt,'Approval timestamp'); if(!Number.isFinite(Date.parse(approvedAt))) throw new TypeError('Approval timestamp must be a valid ISO date/time.'); return {id:text(input.id,'Approval id'),scope:text(input.scope,'Approval scope'),version:text(input.version,'Approved version'),approvedBy:text(input.approvedBy,'Approver id'),approvedAt:new Date(approvedAt).toISOString(),status:'approved',notes:String(input.notes||'')}; }
function createAward(input={}) {
  return {id:text(input.id,'Award id'),tournamentId:text(input.tournamentId,'Tournament id'),recipientId:text(input.recipientId,'Recipient id'),label:text(input.label,'Award label'),amount:input.amount==null?null:score(input.amount,'Award amount'),currency:input.currency||null,approvalId:text(input.approvalId,'Award approval id'),status:'approved'};
}
function recordMatchOutcome(season,input){const m=input.method||{};const match=season.matches?.find(x=>x.id===input.matchId);if(!match)throw new Error('Match outcome must reference a match in its season.');if(m.approved!==true||!text(m.methodId,'Approved scoring method id')||!text(m.approvedAt,'Approval timestamp')||!text(m.approvedBy,'Approver id'))throw new Error('Match outcome requires a recorded, approved scoring method and approver.');const a=text(input.teamA,'Team A'),b=text(input.teamB,'Team B');if(a===b)throw new Error('A match must contain two different teams.');const fixture=season.fixtures?.find(x=>x.id===match.fixtureId);if(!fixture||![fixture.teamA,fixture.teamB].includes(a)||![fixture.teamA,fixture.teamB].includes(b))throw new Error('Match outcome teams must match the scheduled fixture.');if(!season.teams?.some(x=>x.id===a)||!season.teams?.some(x=>x.id===b))throw new Error('Match outcome teams must exist in the season.');const sa=score(input.scoreA,'Team A score'),sb=score(input.scoreB,'Team B score');if(sa===sb)throw new Error('A tied match requires the published tie-break procedure.');const r={id:text(input.id,'Match outcome id'),seasonId:season.id,matchId:match.id,teamA:a,teamB:b,scoreA:sa,scoreB:sb,winnerTeamId:sa>sb?a:b,methodId:m.methodId,approvedAt:text(m.approvedAt,'Approval timestamp'),approvedBy:text(m.approvedBy,'Approver id'),recordedAt:new Date().toISOString()};season.matchOutcomes||=[];season.matchOutcomes.push(r);return r;}
function advanceBracket(season,input){if(input.method?.approved!==true||!input.method.methodId||!input.method.approvedAt||!input.method.approvedBy)throw new Error('Bracket advancement requires a recorded, approved scoring method and approver.');const outcome=season.matchOutcomes.find(x=>x.id===input.outcomeId);if(!outcome)throw new Error('A verified match outcome is required before bracket advancement.');if(outcome.methodId!==input.method.methodId)throw new Error('Bracket advancement must use the same approved method as the match outcome.');const toFixtureId=text(input.toFixtureId,'Next fixture id');const fixture=season.fixtures?.find(x=>x.id===toFixtureId);if(!fixture)throw new Error('Bracket advancement must target a fixture in this season.');if(![fixture.teamA,fixture.teamB].includes(outcome.winnerTeamId))throw new Error('The advancing winner must be a participant in the target fixture.');if(season.bracketProgression?.some(x=>x.fromOutcomeId===outcome.id))throw new Error('This match outcome has already advanced the bracket.');const row={seasonId:season.id,fromOutcomeId:outcome.id,winnerTeamId:outcome.winnerTeamId,toFixtureId,methodId:input.method.methodId,advancedAt:new Date().toISOString()};season.bracketProgression||=[];season.bracketProgression.push(row);return row;}
function createRaceSideEvent(input={}){const elapsed=input.elapsedSeconds===undefined?null:Number(input.elapsedSeconds);if(elapsed!==null&&(!Number.isFinite(elapsed)||elapsed<=0))throw new TypeError('Race side-event elapsed seconds must be positive.');return {id:text(input.id,'Race side-event id'),seasonId:text(input.seasonId,'Season id'),eventNightId:text(input.eventNightId,'Event night id'),map:String(input.map||''),elapsedSeconds:elapsed,ordinaryMatchScoreContribution:0};}
module.exports={FORMATS,TOURNAMENT_STATUSES,STAGE_TYPES,SCORING_CATEGORIES,createLifecycleState,normalizeLifecycleState,createTournament,transitionTournament,changeFormat,createSeason,createStage,activateStage,completeStage,registerParticipant,assignRoster,recordMatchOutcome,advanceBracket,createEventNight,createTeam,createFixture,createMatch,createAward,createApprovalRecord,registerPilotParticipant,createPilotEventNight,recordScoreEntry,createRaceSideEvent};

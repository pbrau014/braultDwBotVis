'use strict';

// Pilot and Full YOLO share one domain model. Legacy score buckets remain untouched.
const FORMATS = Object.freeze({ PILOT: 'pilot', FULL: 'full' });
const STAGES = Object.freeze(['regular-season', 'postseason', 'grand-finale']);
const STATUSES = Object.freeze(['draft', 'published', 'active', 'completed', 'cancelled']);
function requiredText(value, label) { const text = String(value ?? '').trim(); if (!text) throw new Error(label + ' is required.'); return text; }
function identifier(value, label) { const id = requiredText(value, label); if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(id)) throw new Error(label + ' must use 1-64 letters, numbers, dots, underscores or hyphens.'); return id; }
function timestamp(value, label) { if (value == null || value === '') return null; const n = Date.parse(value); if (!Number.isFinite(n)) throw new Error(label + ' must be a valid ISO date/time.'); return new Date(n).toISOString(); }
function createTournament(input = {}) {
 const format = String(input.format || '').toLowerCase();
 if (!Object.values(FORMATS).includes(format)) throw new Error('Format must be pilot or full.');
 const id = identifier(input.id, 'Tournament ID'), name = requiredText(input.name, 'Tournament name');
 const startsAt = timestamp(input.startsAt, 'Start time'), endsAt = timestamp(input.endsAt, 'End time');
 if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) throw new Error('End time must be after start time.');
 const settings = { timezone: input.settings?.timezone || null, participantCap: input.settings?.participantCap ?? 50, rosterLockAt: timestamp(input.settings?.rosterLockAt, 'Roster lock time'), rulesVersion: input.settings?.rulesVersion || null, approvedSettingsId: input.settings?.approvedSettingsId || null };
 if (!Number.isInteger(settings.participantCap) || settings.participantCap < 1 || settings.participantCap > 50) throw new Error('Participant cap must be an integer from 1 to 50.');
 const t = { id, name, format, status: input.status || 'draft', createdAt: timestamp(input.createdAt, 'Created time') || new Date().toISOString(), startsAt, endsAt, settings, season: null, eventNights: [], stages: [], audit: [] };
 if (!STATUSES.includes(t.status)) throw new Error('Invalid tournament status.');
 if (format === FORMATS.FULL) {
  const s = input.season || {}, durationWeeks = s.durationWeeks;
  if (!Number.isInteger(durationWeeks) || durationWeeks < 2 || durationWeeks > 52) throw new Error('Full YOLO requires a declared season duration from 2 to 52 weeks.');
  const seasonStart = timestamp(s.startsAt, 'Season start'), seasonEnd = timestamp(s.endsAt, 'Season end');
  if (seasonStart && seasonEnd && Date.parse(seasonEnd) <= Date.parse(seasonStart)) throw new Error('Season end must be after season start.');
  t.season = { id: identifier(s.id, 'Season ID'), startsAt: seasonStart, endsAt: seasonEnd, durationWeeks, regularSeasonEventCount: s.regularSeasonEventCount ?? null, postseasonFormat: s.postseasonFormat || null, finaleFormat: s.finaleFormat || null };
  t.stages = STAGES.map((type, i) => ({ id: t.season.id + ':' + type, type, order: i + 1, status: 'draft' }));
 }
 return t;
}
function assertTransition(from, to, format, stageType) {
 const allowed = { draft: ['published', 'cancelled'], published: ['active', 'cancelled'], active: ['completed', 'cancelled'], completed: [], cancelled: [] };
 if (!allowed[from] || !allowed[from].includes(to)) throw new Error('Invalid lifecycle transition: ' + from + ' -> ' + to + '.');
}
function transitionStage(t, stageType, nextStatus, actor, at = new Date().toISOString()) {
 if (!t || t.format !== FORMATS.FULL || !Array.isArray(t.stages)) throw new Error('Stage transitions apply only to Full YOLO.');
 const index = t.stages.findIndex(stage => stage.type === stageType);
 if (index < 0) throw new Error('Season stage was not found.');
 const stage = t.stages[index];
 assertTransition(stage.status, nextStatus, t.format, stageType);
 if(nextStatus==='published'&&!t.settings?.approvedSettingsId) throw new Error('An approved tournament settings record ID is required before publishing Full YOLO stages.');
 if (nextStatus === 'active' && index > 0 && t.stages[index - 1].status !== 'completed')
  throw new Error('The preceding Full YOLO stage must be completed first.');
 const stages = t.stages.map((item,i)=>i===index?{...item,status:nextStatus}:item);
 return { ...t, stages, audit:[...(t.audit||[]),{type:'stage-status',stageType,from:stage.status,to:nextStatus,actor:requiredText(actor,'Actor'),at:timestamp(at,'Transition time')}] };
}
function transitionTournament(t, nextStatus, actor, at = new Date().toISOString()) {
 if (!t || !STATUSES.includes(t.status) || !STATUSES.includes(nextStatus)) throw new Error('A valid tournament and status are required.');
 assertTransition(t.status, nextStatus, t.format, null);
 if(nextStatus==='published'&&!t.settings?.approvedSettingsId) throw new Error('An approved tournament settings record ID is required before publishing.');
 if (t.format === FORMATS.FULL && nextStatus === 'completed' && t.stages.some(stage=>stage.status!=='completed'))
  throw new Error('Full YOLO cannot complete until regular season, postseason and Grand YOLO finale are completed.');
 return { ...t, status: nextStatus, audit: [...(t.audit || []), { type: 'tournament-status', from: t.status, to: nextStatus, actor: requiredText(actor, 'Actor'), at: timestamp(at, 'Transition time') }] };
}
function transitionEventNight(n,nextStatus,actor,at=new Date().toISOString()) {
 if(!n||!STATUSES.includes(n.status)||!STATUSES.includes(nextStatus)) throw new Error('A valid event night and status are required.');
 assertTransition(n.status,nextStatus,null,null);
 if(nextStatus==='published'&&!n.approvedSettingsId) throw new Error('An approved event settings record ID is required before publishing this event night.');
 const rosterLockedAt=nextStatus==='active'?(timestamp(at,'Event start time')):(n.rosterLockedAt||null);
 return {...n,status:nextStatus,rosterLockedAt,audit:[...(n.audit||[]),{type:'event-night-status',from:n.status,to:nextStatus,actor:requiredText(actor,'Actor'),at:timestamp(at,'Transition time')}]};
}
function createEventNight(input = {}) {
 const startsAt = timestamp(input.startsAt, 'Event-night start'); if (!startsAt) throw new Error('Event-night start time is required.');
 const endsAt = timestamp(input.endsAt, 'Event-night end'); if (endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) throw new Error('Event-night end must be after its start.');
 const stage = input.stage || null; if (stage && !STAGES.includes(stage)) throw new Error('Unknown Full YOLO stage.');
 const status=input.status || 'draft'; if(!STATUSES.includes(status)) throw new Error('Invalid event-night status.');
 return { id: identifier(input.id, 'Event-night ID'), tournamentId: identifier(input.tournamentId, 'Tournament ID'), stage, sequence: Number.isInteger(input.sequence) && input.sequence > 0 ? input.sequence : 1, startsAt, endsAt, status, approvedSettingsId:input.approvedSettingsId||null, rosterLockedAt:null, registrations: [], teams: [], fixtures: [], matches: [], games: [], evidenceIds: [], audit: [] };
}
function registerParticipant(n, participantId, at = new Date().toISOString()) {
 const id = requiredText(participantId, 'Participant ID'); if (!['draft', 'published'].includes(n.status)) throw new Error('Registration is closed for this event night.');
 if (n.registrations.some(r => r.participantId === id)) throw new Error('Participant is already registered.');
 return { ...n, registrations: [...n.registrations, { participantId: id, registeredAt: timestamp(at, 'Registration time'), status: 'registered' }] };
}
function freezeRules(settings, eventStarted) { if (eventStarted) throw new Error('Published event rules are frozen after event start; changes apply prospectively to future/unplayed games only.'); return structuredClone(settings); }
function raceMetric(seconds) { const n = Number(seconds); if (!Number.isFinite(n) || n <= 0) throw new Error('Race elapsed time must be a positive number of seconds.'); return { type: 'race-time-metric', elapsedSeconds: n, normalizedMetric: 1 / n, ordering: 'lower-elapsed-time-is-better' }; }
function createTeam(input = {}) {
 const participantIds = input.participantIds;
 if (!Array.isArray(participantIds) || !participantIds.length || participantIds.some(id=>!String(id||'').trim()))
  throw new Error('A team requires one or more participant IDs.');
 const members = participantIds.map(id=>String(id).trim());
 if (new Set(members).size !== members.length) throw new Error('A team cannot contain the same participant twice.');
 return { id:identifier(input.id,'Team ID'),eventNightId:identifier(input.eventNightId,'Event-night ID'),
  name:requiredText(input.name,'Team name'),participantIds:members,status:'draft',rosterLockedAt:null };
}
function createFixture(input = {}) {
 const homeTeamId=identifier(input.homeTeamId,'Home team ID'),awayTeamId=identifier(input.awayTeamId,'Away team ID');
 if(homeTeamId===awayTeamId) throw new Error('A fixture requires two distinct teams.');
 const seriesLength=input.seriesLength??1;
 if(!Number.isInteger(seriesLength)||seriesLength<1||seriesLength>9||seriesLength%2===0)
  throw new Error('Series length must be an odd integer from 1 to 9.');
 const scheduledAt=timestamp(input.scheduledAt,'Fixture schedule');
 if(!scheduledAt) throw new Error('Fixture schedule time is required.');
 return {id:identifier(input.id,'Fixture ID'),eventNightId:identifier(input.eventNightId,'Event-night ID'),
  homeTeamId,awayTeamId,scheduledAt,seriesLength,status:'draft',matchIds:[]};
}
function createMatch(input = {}) {
 const number=input.matchNumber??1;
 if(!Number.isInteger(number)||number<1||number>9) throw new Error('Match number must be an integer from 1 to 9.');
 return {id:identifier(input.id,'Match ID'),fixtureId:identifier(input.fixtureId,'Fixture ID'),
  matchNumber:number,status:'draft',gameIds:[],outcome:null,acceptedPerformanceRecordIds:[]};
}
function createGame(input = {}) {
 return {id:identifier(input.id,'Game ID'),matchId:identifier(input.matchId,'Match ID'),
  gameNumber:(()=>{const n=input.gameNumber??1;if(!Number.isInteger(n)||n<1||n>99)throw new Error('Game number must be an integer from 1 to 99.');return n;})(),
  status:'pending-evidence',evidenceRecordIds:[],acceptedAt:null};
}
function createRaceSideEvent(input = {}) { const offset = input.scheduleOffsetMinutes ?? 60; if (!Number.isInteger(offset) || offset < 0 || offset > 1440) throw new Error('Race side-event offset must be from 0 to 1440 minutes.'); return { id: identifier(input.id, 'Race side-event ID'), type: 'race-side-event', eventNightId: identifier(input.eventNightId, 'Event-night ID'), scheduleOffsetMinutes: offset, scoringPolicyId: input.scoringPolicyId || null, approved: input.approved === true }; }
function grandYoloScore(input = {}) { return { type: 'grand-yolo-score', scoringCategory: 'grand', eventNightId: requiredText(input.eventNightId, 'Event-night ID') }; }
function grandYoloFinale(input = {}) { return { type: 'grand-yolo-finale', stageId: requiredText(input.stageId, 'Finale stage ID'), matchId: requiredText(input.matchId, 'Finale match ID') }; }
function validateMatchOutcome(input = {}) {
 const approvedScoringMethodId = requiredText(input.approvedScoringMethodId, 'Approved scoring-method ID');
 const ids = input.acceptedPerformanceRecordIds;
 if (!Array.isArray(ids) || !ids.length || ids.some(id=>!String(id||'').trim()) || new Set(ids).size!==ids.length)
  throw new Error('Unique accepted individual-performance record IDs are required.');
 if (!requiredText(input.aggregation, 'Published aggregation') || !requiredText(input.rounding, 'Published rounding'))
  throw new Error('Published aggregation and rounding rules are required.');
 if (!Array.isArray(input.tieBreakOrder) || !input.tieBreakOrder.length || input.tieBreakOrder.some(rule=>!String(rule||'').trim()))
  throw new Error('A non-empty published tie-break order is required.');
 return { status:'pending-calculation',approvedScoringMethodId,acceptedPerformanceRecordIds:[...ids],aggregation:input.aggregation,rounding:input.rounding,tieBreakOrder:[...input.tieBreakOrder] };
}
module.exports = { FORMATS, STAGES, STATUSES, createTournament, assertTransition, transitionTournament, transitionStage, transitionEventNight, createEventNight, registerParticipant, freezeRules, raceMetric, createTeam, createFixture, createMatch, createGame, createRaceSideEvent, grandYoloScore, grandYoloFinale, validateMatchOutcome };

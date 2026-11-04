'use strict';

// Pilot and Full YOLO share one domain model. Legacy score buckets remain untouched.
const FORMATS = Object.freeze({ PILOT: 'pilot', FULL: 'full' });
const STAGES = Object.freeze(['regular-season', 'postseason', 'grand-finale']);
const STATUSES = Object.freeze(['draft', 'published', 'active', 'completed', 'cancelled']);
function requiredText(value, label) { const text = String(value ?? '').trim(); if (!text) throw new Error(label + ' is required.'); return text; }
function timestamp(value, label) { if (value == null || value === '') return null; const n = Date.parse(value); if (!Number.isFinite(n)) throw new Error(label + ' must be a valid ISO date/time.'); return new Date(n).toISOString(); }
function createTournament(input = {}) {
 const format = String(input.format || '').toLowerCase();
 if (!Object.values(FORMATS).includes(format)) throw new Error('Format must be pilot or full.');
 const id = requiredText(input.id, 'Tournament ID'), name = requiredText(input.name, 'Tournament name');
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
  t.season = { id: requiredText(s.id, 'Season ID'), startsAt: seasonStart, endsAt: seasonEnd, durationWeeks, regularSeasonEventCount: s.regularSeasonEventCount ?? null, postseasonFormat: s.postseasonFormat || null, finaleFormat: s.finaleFormat || null };
  t.stages = STAGES.map((type, i) => ({ id: t.season.id + ':' + type, type, order: i + 1, status: 'draft' }));
 }
 return t;
}
function assertTransition(from, to, format, stageType) {
 const allowed = { draft: ['published', 'cancelled'], published: ['active', 'cancelled'], active: ['completed', 'cancelled'], completed: [], cancelled: [] };
 if (!allowed[from] || !allowed[from].includes(to)) throw new Error('Invalid lifecycle transition: ' + from + ' -> ' + to + '.');
 if (format === FORMATS.FULL && to === 'completed' && stageType === 'regular-season') throw new Error('A Full YOLO season cannot complete before postseason and Grand YOLO finale are resolved.');
}
function transitionTournament(t, nextStatus, actor, at = new Date().toISOString()) {
 if (!t || !STATUSES.includes(t.status) || !STATUSES.includes(nextStatus)) throw new Error('A valid tournament and status are required.');
 assertTransition(t.status, nextStatus, t.format, null);
 return { ...t, status: nextStatus, audit: [...(t.audit || []), { type: 'tournament-status', from: t.status, to: nextStatus, actor: requiredText(actor, 'Actor'), at: timestamp(at, 'Transition time') }] };
}
function createEventNight(input = {}) {
 const startsAt = timestamp(input.startsAt, 'Event-night start'); if (!startsAt) throw new Error('Event-night start time is required.');
 const stage = input.stage || null; if (stage && !STAGES.includes(stage)) throw new Error('Unknown Full YOLO stage.');
 return { id: requiredText(input.id, 'Event-night ID'), tournamentId: requiredText(input.tournamentId, 'Tournament ID'), stage, sequence: Number.isInteger(input.sequence) && input.sequence > 0 ? input.sequence : 1, startsAt, endsAt: timestamp(input.endsAt, 'Event-night end'), status: input.status || 'draft', registrations: [], teams: [], fixtures: [], matches: [], games: [], evidenceIds: [] };
}
function registerParticipant(n, participantId, at = new Date().toISOString()) {
 const id = requiredText(participantId, 'Participant ID'); if (!['draft', 'published'].includes(n.status)) throw new Error('Registration is closed for this event night.');
 if (n.registrations.some(r => r.participantId === id)) throw new Error('Participant is already registered.');
 return { ...n, registrations: [...n.registrations, { participantId: id, registeredAt: timestamp(at, 'Registration time'), status: 'registered' }] };
}
function freezeRules(settings, eventStarted) { if (eventStarted) throw new Error('Published event rules are frozen after event start; changes apply prospectively to future/unplayed games only.'); return structuredClone(settings); }
function raceMetric(seconds) { const n = Number(seconds); if (!Number.isFinite(n) || n <= 0) throw new Error('Race elapsed time must be a positive number of seconds.'); return { type: 'race-time-metric', elapsedSeconds: n, normalizedMetric: 1 / n, ordering: 'lower-elapsed-time-is-better' }; }
function createRaceSideEvent(input = {}) { return { id: requiredText(input.id, 'Race side-event ID'), type: 'race-side-event', eventNightId: requiredText(input.eventNightId, 'Event-night ID'), scheduleOffsetMinutes: Number.isInteger(input.scheduleOffsetMinutes) ? input.scheduleOffsetMinutes : 60, scoringPolicyId: input.scoringPolicyId || null, approved: input.approved === true }; }
function grandYoloScore(input = {}) { return { type: 'grand-yolo-score', scoringCategory: 'grand', eventNightId: requiredText(input.eventNightId, 'Event-night ID') }; }
function grandYoloFinale(input = {}) { return { type: 'grand-yolo-finale', stageId: requiredText(input.stageId, 'Finale stage ID'), matchId: requiredText(input.matchId, 'Finale match ID') }; }
function validateMatchOutcome(input = {}) { if (!input.approvedScoringMethodId) throw new Error('An approved scoring-method ID is required before calculating an official match outcome.'); if (!Array.isArray(input.acceptedPerformanceRecordIds) || !input.acceptedPerformanceRecordIds.length) throw new Error('Accepted individual-performance record IDs are required.'); if (!input.aggregation || !input.rounding || !Array.isArray(input.tieBreakOrder)) throw new Error('Published aggregation, rounding, and tie-break rules are required.'); return { status: 'pending-calculation', approvedScoringMethodId: input.approvedScoringMethodId, acceptedPerformanceRecordIds: [...input.acceptedPerformanceRecordIds], aggregation: input.aggregation, rounding: input.rounding, tieBreakOrder: [...input.tieBreakOrder] }; }
module.exports = { FORMATS, STAGES, STATUSES, createTournament, assertTransition, transitionTournament, createEventNight, registerParticipant, freezeRules, raceMetric, createRaceSideEvent, grandYoloScore, grandYoloFinale, validateMatchOutcome };

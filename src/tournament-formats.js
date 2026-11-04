'use strict';

/**
 * Format-aware YOLO competition lifecycle.
 *
 * This module is deliberately additive: legacy scoring buckets remain untouched,
 * and historical rows are never silently assigned to Pilot or Full.
 */
const FORMAT = Object.freeze({ PILOT: 'pilot', FULL: 'full' });
const STAGES = Object.freeze({
  PILOT_EVENT: 'pilot_event',
  REGULAR_SEASON: 'regular_season',
  POSTSEASON: 'postseason',
  GRAND_FINALE: 'grand_finale',
});
const STAGE_ORDER = Object.freeze([STAGES.REGULAR_SEASON, STAGES.POSTSEASON, STAGES.GRAND_FINALE]);
const STATUS = Object.freeze({ DRAFT: 'draft', PUBLISHED: 'published', ACTIVE: 'active', COMPLETE: 'complete', FORFEIT: 'forfeit', CANCELLED: 'cancelled' });
const clone = value => JSON.parse(JSON.stringify(value));
const cleanText = (value, label) => {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(label + ' is required.');
  return text;
};
const now = () => new Date().toISOString();

function normalizeCompetition(raw = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Competition state must be an object.');
  const tournaments = Array.isArray(raw.tournaments) ? raw.tournaments.map(normalizeTournament) : [];
  const ids = new Set();
  for (const tournament of tournaments) {
    if (ids.has(tournament.id)) throw new Error('Duplicate tournament ID: ' + tournament.id);
    ids.add(tournament.id);
  }
  return { schemaVersion: 1, tournaments, audit: Array.isArray(raw.audit) ? raw.audit : [] };
}

function normalizeTournament(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Tournament record must be an object.');
  const format = String(raw.format || '').toLowerCase();
  if (!Object.values(FORMAT).includes(format)) throw new Error('Tournament format must be pilot or full.');
  const stages = Array.isArray(raw.stages) ? raw.stages : [];
  const expected = format === FORMAT.PILOT ? [STAGES.PILOT_EVENT] : [...STAGE_ORDER];
  if (stages.length && (stages.length !== expected.length || stages.some((stage, index) => stage.key !== expected[index]))) {
    throw new Error(format === FORMAT.PILOT
      ? 'Pilot must contain exactly one Pilot Event stage.'
      : 'Full YOLO stages must be Regular Season, Postseason, then Grand Finale.');
  }
  return {
    id: cleanText(raw.id, 'Tournament ID'),
    name: cleanText(raw.name, 'Tournament name'),
    format,
    status: Object.values(STATUS).includes(raw.status) ? raw.status : STATUS.DRAFT,
    createdAt: raw.createdAt || now(),
    config: {
      seasonWeeks: format === FORMAT.FULL && Number.isInteger(raw.config?.seasonWeeks) && raw.config.seasonWeeks > 0
        ? raw.config.seasonWeeks : null,
      timezone: raw.config?.timezone || null,
      eventStart: raw.config?.eventStart || null,
      eventEnd: raw.config?.eventEnd || null,
      rosterCapacity: Number.isInteger(raw.config?.rosterCapacity) && raw.config.rosterCapacity > 0 ? raw.config.rosterCapacity : 50,
      matchOutcomeMethod: raw.config?.matchOutcomeMethod || null,
      matchOutcomeApprovedBy: raw.config?.matchOutcomeApprovedBy || null,
      matchOutcomeApprovedAt: raw.config?.matchOutcomeApprovedAt || null,
      settingsFreeze: raw.config?.settingsFreeze !== false,
      registrationOpen: raw.config?.registrationOpen !== false,
      registrationClosedAt: raw.config?.registrationClosedAt || null,
    },
    stages: stages.length ? stages.map(clone) : expected.map((key, index) => ({
      id: raw.id + ':' + key, key, order: index + 1,
      status: STATUS.DRAFT, startsAt: null, endsAt: null,
    })),
    registrations: Array.isArray(raw.registrations) ? raw.registrations.map(clone) : [],
    teams: Array.isArray(raw.teams) ? raw.teams.map(clone) : [],
    fixtures: Array.isArray(raw.fixtures) ? raw.fixtures.map(clone) : [],
    matches: Array.isArray(raw.matches) ? raw.matches.map(clone) : [],
    raceSideEvents: Array.isArray(raw.raceSideEvents) ? raw.raceSideEvents.map(clone) : [],
    awards: Array.isArray(raw.awards) ? raw.awards.map(clone) : [],
    audit: Array.isArray(raw.audit) ? raw.audit.map(clone) : [],
  };
}

function audit(tournament, action, details = {}, actor = 'system') {
  const entry = { id: 'audit-' + (tournament.audit.length + 1), action, actor, at: now(), details: clone(details) };
  tournament.audit.push(entry);
  return entry;
}

function createTournament(state, input) {
  const format = String(input?.format || '').toLowerCase();
  if (!Object.values(FORMAT).includes(format)) throw new Error('Choose Pilot YOLO or Full YOLO.');
  const tournament = normalizeTournament({
    id: cleanText(input.id, 'Tournament ID'),
    name: cleanText(input.name, 'Tournament name'),
    format, status: STATUS.DRAFT, config: input.config || {},
  });
  if (state.tournaments.some(item => item.id === tournament.id)) throw new Error('Tournament ID already exists.');
  state.tournaments.push(tournament);
  audit(tournament, 'tournament_created', { format });
  return tournament;
}

function getTournament(state, id) {
  const item = state.tournaments.find(t => t.id === String(id));
  if (!item) throw new Error('Tournament was not found.');
  return item;
}

function registerParticipant(tournament, participant, actor = 'organizer') {
  if (![STATUS.DRAFT, STATUS.PUBLISHED, STATUS.ACTIVE].includes(tournament.status) || !tournament.config.registrationOpen) throw new Error('Registration is closed for this tournament.');
  const playerId = cleanText(participant?.playerId, 'Participant player ID');
  if (tournament.registrations.some(r => r.playerId === playerId && r.status !== 'withdrawn')) throw new Error('Participant is already registered.');
  if (tournament.registrations.filter(r => r.status !== 'withdrawn').length >= tournament.config.rosterCapacity) throw new Error('Tournament registration capacity reached.');
  const entry = { id: tournament.id + ':registration:' + (tournament.registrations.length + 1), playerId,
    displayName: cleanText(participant.displayName, 'Participant display name'), status: 'registered', registeredAt: now() };
  tournament.registrations.push(entry);
  audit(tournament, 'participant_registered', { playerId }, actor);
  return entry;
}

function closeRegistration(tournament, actor = 'organizer') {
  if (!tournament.config.registrationOpen) throw new Error('Registration is already closed.');
  tournament.config.registrationOpen = false;
  tournament.config.registrationClosedAt = now();
  audit(tournament, 'registration_closed', {}, actor);
  return tournament.config.registrationClosedAt;
}

function withdrawParticipant(tournament, playerId, reason, actor = 'organizer') {
  const registration = tournament.registrations.find(r => r.playerId === String(playerId) && r.status === 'registered');
  if (!registration) throw new Error('Active participant registration was not found.');
  const cleanReason = cleanText(reason, 'Withdrawal reason');
  registration.status = 'withdrawn'; registration.withdrawnAt = now(); registration.withdrawalReason = cleanReason;
  audit(tournament, 'participant_withdrawn', { playerId: String(playerId), reason: cleanReason }, actor);
  return registration;
}

function assignTeam(tournament, teamInput, actor = 'organizer') {
  const stageKey = tournament.format === FORMAT.PILOT ? STAGES.PILOT_EVENT : STAGES.REGULAR_SEASON;
  if (tournament.teams.some(t => t.id === String(teamInput.id))) throw new Error('Team ID already exists.');
  const members = [...new Set((teamInput.playerIds || []).map(String))];
  if (!members.length) throw new Error('A team must contain at least one registered participant.');
  for (const id of members) {
    const registration = tournament.registrations.find(r => r.playerId === id && r.status === 'registered');
    if (!registration) throw new Error('Every team member must have an active registration: ' + id);
  }
  const team = { id: cleanText(teamInput.id, 'Team ID'), name: cleanText(teamInput.name, 'Team name'),
    stageKey, playerIds: members, rosterLocked: false, createdAt: now() };
  tournament.teams.push(team);
  audit(tournament, 'team_created', { teamId: team.id, playerIds: members }, actor);
  return team;
}

function lockRoster(tournament, teamId, actor = 'organizer') {
  if (tournament.config.registrationOpen) throw new Error('Close registration before locking team rosters.');
  const team = tournament.teams.find(t => t.id === String(teamId));
  if (!team) throw new Error('Team was not found.');
  team.rosterLocked = true;
  team.rosterLockedAt = now();
  audit(tournament, 'team_roster_locked', { teamId: team.id }, actor);
  return team;
}

function publishTournament(tournament, approval = {}, actor = 'organizer') {
  if (tournament.status !== STATUS.DRAFT) throw new Error('Only a draft tournament can be published.');
  if (!tournament.config.timezone) throw new Error('Set the event/season timezone before publication.');
  if (tournament.format === FORMAT.PILOT && !tournament.config.eventStart) throw new Error('Set the Pilot event start before publication.');
  if (tournament.format === FORMAT.FULL && !tournament.config.seasonWeeks) throw new Error('Set the Full YOLO season duration in weeks before publication.');
  if (tournament.format === FORMAT.FULL && (!approval.matchOutcomeMethod || !approval.approvedBy)) {
    throw new Error('Full YOLO publication requires an approved, published match-outcome method and named approver.');
  }
  if (tournament.format === FORMAT.FULL) {
    const method = approval.matchOutcomeMethod;
    if (method.approved !== true || !method.version || !method.publishedAt || !['sum','average'].includes(method.aggregation))
      throw new Error('Full YOLO match method must include approval, version, publication timestamp and explicit sum/average aggregation.');
    if (!method.weights || !Number.isFinite(method.weights.damage) || !Number.isFinite(method.weights.kills) ||
        method.weights.damage < 0 || method.weights.kills < 0 || method.weights.damage + method.weights.kills === 0)
      throw new Error('Full YOLO match method must publish valid non-zero Damage/Kills weights.');
    tournament.config.matchOutcomeMethod = clone(approval.matchOutcomeMethod);
    tournament.config.matchOutcomeApprovedBy = cleanText(approval.approvedBy, 'Match outcome approver');
    tournament.config.matchOutcomeApprovedAt = now();
  }
  tournament.status = STATUS.PUBLISHED;
  tournament.stages[0].status = STATUS.PUBLISHED;
  audit(tournament, 'tournament_published', { format: tournament.format }, actor);
  return tournament;
}

function activateStage(tournament, stageKey, actor = 'organizer') {
  const index = tournament.stages.findIndex(s => s.key === stageKey);
  if (index < 0) throw new Error('Stage does not belong to this tournament format.');
  if (index > 0 && tournament.stages[index - 1].status !== STATUS.COMPLETE) throw new Error('The preceding stage must be complete before this stage begins.');
  if (![STATUS.PUBLISHED, STATUS.ACTIVE].includes(tournament.status)) throw new Error('Tournament must be published before a stage can begin.');
  if (tournament.config.registrationOpen) throw new Error('Close registration before starting the event stage.');
  if (tournament.format === FORMAT.FULL && stageKey === STAGES.REGULAR_SEASON && (!tournament.teams.length || tournament.teams.some(team => !team.rosterLocked)))
    throw new Error('Full YOLO regular season requires all team rosters to be locked.');
  const stage = tournament.stages[index];
  stage.status = STATUS.ACTIVE;
  stage.startedAt = now();
  tournament.status = STATUS.ACTIVE;
  audit(tournament, 'stage_activated', { stageKey }, actor);
  return stage;
}

function completeStage(tournament, stageKey, actor = 'organizer') {
  const stage = tournament.stages.find(s => s.key === stageKey);
  if (!stage || stage.status !== STATUS.ACTIVE) throw new Error('Only an active stage can be completed.');
  if (tournament.format === FORMAT.FULL && !tournament.fixtures.some(f => f.stageKey === stageKey))
    throw new Error('A Full YOLO stage requires at least one resolved fixture before completion.');
  if (tournament.fixtures.some(f => f.stageKey === stageKey && (!f.matchId || !['complete','forfeit','bye'].includes(f.status)))) {
    throw new Error('All fixtures in the stage must have a resolved match or approved bye before completion.');
  }
  if (tournament.matches.some(m => m.stageKey === stageKey && m.status !== STATUS.COMPLETE && m.status !== STATUS.FORFEIT)) {
    throw new Error('All fixtures in the stage must be resolved before completion.');
  }
  stage.status = STATUS.COMPLETE;
  stage.completedAt = now();
  if (tournament.stages.every(s => s.status === STATUS.COMPLETE)) tournament.status = STATUS.COMPLETE;
  audit(tournament, 'stage_completed', { stageKey }, actor);
  return stage;
}

function createFixture(tournament, input, actor = 'organizer') {
  const stage = tournament.stages.find(s => s.key === input.stageKey);
  if (!stage || stage.status !== STATUS.ACTIVE) throw new Error('Fixtures can only be created for an active stage.');
  const home = tournament.teams.find(t => t.id === String(input.homeTeamId));
  const away = tournament.teams.find(t => t.id === String(input.awayTeamId));
  if (!home || !away || home.id === away.id) throw new Error('Fixture requires two distinct registered teams.');
  if (!home.rosterLocked || !away.rosterLocked) throw new Error('Both team rosters must be locked before scheduling a fixture.');
  if (tournament.fixtures.some(f => f.id === String(input.id))) throw new Error('Fixture ID already exists.');
  const fixture = { id: cleanText(input.id, 'Fixture ID'), stageKey: input.stageKey,
    homeTeamId: home.id, awayTeamId: away.id, scheduledAt: input.scheduledAt || null,
    status: 'scheduled', matchId: null };
  tournament.fixtures.push(fixture);
  audit(tournament, 'fixture_created', { fixtureId: fixture.id, stageKey: fixture.stageKey }, actor);
  return fixture;
}

function createMatch(tournament, fixtureId, actor = 'organizer') {
  const fixture = tournament.fixtures.find(f => f.id === String(fixtureId));
  if (!fixture) throw new Error('Fixture was not found.');
  if (fixture.matchId) throw new Error('Fixture already has a match.');
  const match = { id: tournament.id + ':match:' + (tournament.matches.length + 1), fixtureId: fixture.id,
    stageKey: fixture.stageKey, homeTeamId: fixture.homeTeamId, awayTeamId: fixture.awayTeamId,
    status: 'scheduled', games: [], outcome: null };
  tournament.matches.push(match);
  fixture.matchId = match.id;
  audit(tournament, 'match_created', { matchId: match.id, fixtureId }, actor);
  return match;
}

function recordGame(match, game, teams = [], registrations = []) {
  if (match.status !== 'scheduled' && match.status !== 'active') throw new Error('Match is not open for game results.');
  const gameNumber = Number(game.gameNumber);
  if (!Number.isInteger(gameNumber) || gameNumber < 1) throw new Error('Game number must be a positive integer.');
  if (match.games.some(g => g.gameNumber === gameNumber)) throw new Error('Game number already recorded for this match.');
  const metrics = game.metrics;
  const explicit = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;
  if (!metrics || !explicit(metrics.damage) || !explicit(metrics.kills)) {
    throw new Error('Match game requires explicit non-negative Damage and Kills values.');
  }
  const result = { gameNumber, teamId: cleanText(game.teamId, 'Performing team ID'),
    playerId: cleanText(game.playerId, 'Player ID'), metrics: { damage: Number(metrics.damage), kills: Number(metrics.kills) },
    evidenceId: cleanText(game.evidenceId, 'Evidence reference'), recordedAt: now() };
  if (![match.homeTeamId, match.awayTeamId].includes(result.teamId)) throw new Error('Game result team is not part of this match.');
  if (teams.length) {
    const team = teams.find(item => item.id === result.teamId);
    if (!team || !team.rosterLocked || !team.playerIds.includes(result.playerId)) throw new Error('Game player must belong to the locked roster of the recorded team.');
    if (registrations.length && !registrations.some(item => item.playerId === result.playerId && item.status === 'registered'))
      throw new Error('Game player must have an active registration.');
  }
  match.games.push(result);
  match.status = 'active';
  return result;
}

function aggregateMatchMetrics(match, method) {
  if (!method || method.approved !== true || !method.publishedAt || !method.version || !['sum','average'].includes(method.aggregation)) {
    throw new Error('Match-outcome method is not approved and published; advancement cannot be calculated.');
  }
  const weights = method.weights;
  if (!weights || !Number.isFinite(weights.damage) || !Number.isFinite(weights.kills) ||
      weights.damage < 0 || weights.kills < 0 || weights.damage + weights.kills === 0) {
    throw new Error('Approved match-outcome method requires valid Damage/Kills weights.');
  }
  const totals = { [match.homeTeamId]: 0, [match.awayTeamId]: 0 };
  const counts = { [match.homeTeamId]: 0, [match.awayTeamId]: 0 };
  for (const game of match.games) {
    totals[game.teamId] += game.metrics.damage * weights.damage + game.metrics.kills * weights.kills;
    counts[game.teamId] += 1;
  }
  if (method.aggregation === 'average') {
    for (const teamId of Object.keys(totals)) if (counts[teamId]) totals[teamId] /= counts[teamId];
  }
  return totals;
}

function resolveMatch(match, method, options = {}) {
  const totals = aggregateMatchMetrics(match, method);
  const [home, away] = [totals[match.homeTeamId], totals[match.awayTeamId]];
  if (home === away) {
    const tie = options.tieBreak || {};
    if (tie.headToHeadWinnerTeamId === match.homeTeamId || tie.headToHeadWinnerTeamId === match.awayTeamId) return { winnerTeamId: tie.headToHeadWinnerTeamId, totals, decidedBy: 'head_to_head' };
    if (Number.isFinite(tie.seasonRecordHome) && Number.isFinite(tie.seasonRecordAway) && tie.seasonRecordHome !== tie.seasonRecordAway)
      return { winnerTeamId: tie.seasonRecordHome > tie.seasonRecordAway ? match.homeTeamId : match.awayTeamId, totals, decidedBy: 'season_record' };
    if (Number.isFinite(tie.pointDifferentialHome) && Number.isFinite(tie.pointDifferentialAway) && tie.pointDifferentialHome !== tie.pointDifferentialAway)
      return { winnerTeamId: tie.pointDifferentialHome > tie.pointDifferentialAway ? match.homeTeamId : match.awayTeamId, totals, decidedBy: 'point_differential' };
    if (tie.decidingGame?.winnerTeamId && [match.homeTeamId, match.awayTeamId].includes(tie.decidingGame.winnerTeamId))
      return { winnerTeamId: tie.decidingGame.winnerTeamId, totals, decidedBy: 'deciding_game' };
    if (tie.randomDrawAuthorized === true && tie.randomDrawWinner && [match.homeTeamId, match.awayTeamId].includes(tie.randomDrawWinner))
      return { winnerTeamId: tie.randomDrawWinner, totals, decidedBy: 'authorized_random_draw' };
    throw new Error('Match is tied. No approved tie-breaker resolves it; do not advance either team.');
  }
  return { winnerTeamId: home > away ? match.homeTeamId : match.awayTeamId, totals, decidedBy: 'approved_metric' };
}

function completeMatch(tournament, matchId, options = {}, actor = 'organizer') {
  const match = tournament.matches.find(m => m.id === String(matchId));
  if (!match) throw new Error('Match was not found.');
  if (match.status === STATUS.COMPLETE || match.status === STATUS.FORFEIT) throw new Error('Match is already resolved.');
  if (!match.games.length) throw new Error('A match with no recorded games cannot be completed.');
  if (tournament.format === FORMAT.FULL) {
    const method = tournament.config.matchOutcomeMethod;
    const outcome = resolveMatch(match, method, options);
    match.outcome = { ...outcome, completedAt: now(), methodVersion: method.version };
  }
  match.status = STATUS.COMPLETE;
  const fixture = tournament.fixtures.find(item => item.id === match.fixtureId);
  if (fixture) fixture.status = 'complete';
  audit(tournament, 'match_completed', { matchId, outcome: match.outcome }, actor);
  return match;
}

function resolveForfeit(tournament, matchId, winnerTeamId, reason, evidenceId, actor = 'organizer') {
  const match = tournament.matches.find(item => item.id === String(matchId));
  if (!match) throw new Error('Match was not found.');
  if (![match.homeTeamId, match.awayTeamId].includes(String(winnerTeamId))) throw new Error('Forfeit winner must be one of the teams in the match.');
  const cleanReason = cleanText(reason, 'Forfeit reason');
  const proof = cleanText(evidenceId, 'Forfeit evidence reference');
  if (match.status === STATUS.COMPLETE || match.status === STATUS.FORFEIT) throw new Error('Match is already resolved.');
  match.status = STATUS.FORFEIT;
  const fixture = tournament.fixtures.find(item => item.id === match.fixtureId);
  if (fixture) fixture.status = 'forfeit';
  match.outcome = { winnerTeamId: String(winnerTeamId), decidedBy: 'forfeit', reason: cleanReason, evidenceId: proof, completedAt: now() };
  audit(tournament, 'match_forfeit_resolved', { matchId, winnerTeamId: String(winnerTeamId), reason: cleanReason, evidenceId: proof }, actor);
  return match;
}

function recordRaceSideEvent(tournament, input, actor = 'organizer') {
  if (tournament.format !== FORMAT.FULL) throw new Error('Race side-events are only configured for Full YOLO.');
  const seconds = Number(input.elapsedSeconds);
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('Race elapsed time must be positive seconds.');
  const event = { id: cleanText(input.id, 'Race side-event ID'), seasonWeek: Number(input.seasonWeek),
    playerId: cleanText(input.playerId, 'Player ID'), elapsedSeconds: seconds,
    raceMetric: 1 / seconds, evidenceId: cleanText(input.evidenceId, 'Evidence reference'), recordedAt: now() };
  if (!Number.isInteger(event.seasonWeek) || event.seasonWeek < 1) throw new Error('Race side-event week must be a positive integer.');
  if (tournament.raceSideEvents.some(e => e.id === event.id)) throw new Error('Race side-event ID already exists.');
  tournament.raceSideEvents.push(event);
  audit(tournament, 'race_side_event_recorded', { id: event.id, playerId: event.playerId, seasonWeek: event.seasonWeek }, actor);
  return event;
}

function freezeSettings(tournament, changes, actor = 'organizer') {
  const active = tournament.stages.find(s => s.status === STATUS.ACTIVE);
  if (active && tournament.config.settingsFreeze) {
    audit(tournament, 'settings_change_blocked', { stageKey: active.key, changes }, actor);
    return { blocked: true, reason: 'Settings are frozen for the active stage. Apply changes prospectively to a future stage or event.' };
  }
  audit(tournament, 'settings_changed', { changes, effectiveScope: 'future_unplayed_games' }, actor);
  return { effectiveScope: 'future_unplayed_games' };
}

module.exports = {
  FORMAT, STAGES, STAGE_ORDER, STATUS, normalizeCompetition, normalizeTournament,
  createTournament, getTournament, registerParticipant, closeRegistration, withdrawParticipant, assignTeam, lockRoster,
  publishTournament, activateStage, completeStage, createFixture, createMatch,
  recordGame, aggregateMatchMetrics, resolveMatch, completeMatch, resolveForfeit, recordRaceSideEvent, freezeSettings, audit,
};

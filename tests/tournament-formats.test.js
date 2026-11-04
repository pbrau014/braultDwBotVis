'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../src/tournament');
const F = T.TournamentFormats;

function state() { return T.createState(); }
function pilot() {
  return F.createTournament(state().competition, { id: 'pilot-1', name: 'Pilot Night', format: 'pilot',
    config: { timezone: 'America/Chicago', eventStart: '2026-12-01T18:00:00-06:00' } });
}
function qualify(t, stageKey) {
  return F.setStageQualifiers(t,stageKey,['home','away'],{
    approved:true,approvedBy:'Organizer',methodVersion:'qualification-v1',publishedAt:'2026-11-04T00:00:00Z',
  });
}
function playStage(t, stageKey) {
  const suffix=stageKey.replace(/_/g,'-');
  const fixture=F.createFixture(t,{id:'fixture-'+suffix,stageKey,homeTeamId:'home',awayTeamId:'away'});
  const match=F.createMatch(t,fixture.id);
  F.recordGame(match,{gameNumber:1,teamId:'home',playerId:'p1',metrics:{damage:9000,kills:2},evidenceId:'ev-'+suffix+'-h'},t.teams,t.registrations);
  F.recordGame(match,{gameNumber:2,teamId:'away',playerId:'p2',metrics:{damage:4000,kills:1},evidenceId:'ev-'+suffix+'-a'},t.teams,t.registrations);
  F.completeMatch(t,match.id);
}

function full() {
  const competition = state().competition;
  const t = F.createTournament(competition, { id: 'full-1', name: 'Full Season', format: 'full',
    config: { timezone: 'America/Chicago', seasonWeeks: 12 } });
  F.registerParticipant(t, { playerId: 'p1', displayName: 'Alpha' });
  F.registerParticipant(t, { playerId: 'p2', displayName: 'Bravo' });
  F.closeRegistration(t);
  F.assignTeam(t, { id: 'home', name: 'Home', playerIds: ['p1'] });
  F.assignTeam(t, { id: 'away', name: 'Away', playerIds: ['p2'] });
  F.lockRoster(t, 'home'); F.lockRoster(t, 'away');
  F.publishTournament(t, { approvedBy: 'Organizer A', matchOutcomeMethod: {
    approved: true, publishedAt: '2026-11-01T00:00:00Z', version: 'v1',
    weights: { damage: 1, kills: 1000 }, aggregation: 'sum',
  } });
  return t;
}

test('legacy state migration adds empty competition without assigning Pilot or Full', () => {
  const legacy = T.normalizeState({ players: [{ id: 1, name: 'Legacy', events: {} }], settings: {} });
  assert.deepEqual(legacy.competition, { schemaVersion: 1, tournaments: [], audit: [] });
  assert.equal(legacy.players[0].name, 'Legacy');
});

test('format state persists in full archive round-trip while legacy scoring remains unchanged', () => {
  const s = state();
  T.addPlayer(s, 'Legacy');
  F.createTournament(s.competition, { id: 'pilot-1', name: 'Pilot', format: 'pilot',
    config: { timezone: 'America/Chicago', eventStart: '2026-12-01T18:00:00-06:00' } });
  const restored = T.importBackup(T.makeArchiveSnapshot(s));
  assert.equal(restored.players[0].name, 'Legacy');
  assert.equal(restored.competition.tournaments[0].format, 'pilot');
});

test('Pilot is one single-evening stage and does not create a season or carryover', () => {
  const t = pilot();
  assert.deepEqual(t.stages.map(s => s.key), [F.STAGES.PILOT_EVENT]);
  assert.equal(t.config.seasonWeeks, null);
  F.publishTournament(t);
  F.closeRegistration(t);
  F.activateStage(t, F.STAGES.PILOT_EVENT);
  F.completeStage(t, F.STAGES.PILOT_EVENT);
  assert.equal(t.status, F.STATUS.COMPLETE);
  assert.equal(t.stages.length, 1);
});

test('Full YOLO requires explicit season duration and approved published match method', () => {
  const s = state().competition;
  const t = F.createTournament(s, { id: 'full-1', name: 'Full', format: 'full',
    config: { timezone: 'America/Chicago' } });
  assert.deepEqual(t.stages.map(x => x.key), [F.STAGES.REGULAR_SEASON, F.STAGES.POSTSEASON, F.STAGES.GRAND_FINALE]);
  assert.throws(() => F.publishTournament(t, {}), /season duration/);
  t.config.seasonWeeks = 12;
  assert.throws(() => F.publishTournament(t, {}), /approved, published match-outcome/);
});

test('Full regular season advances in order through postseason and Grand Finale', () => {
  const t = full();
  F.activateStage(t, F.STAGES.REGULAR_SEASON);
  const fixture = F.createFixture(t, { id: 'f1', stageKey: F.STAGES.REGULAR_SEASON, homeTeamId: 'home', awayTeamId: 'away' });
  const match = F.createMatch(t, fixture.id);
  F.recordGame(match, { gameNumber: 1, teamId: 'home', playerId: 'p1', metrics: { damage: 10000, kills: 2 }, evidenceId: 'ev1' }, t.teams,t.registrations);
  F.recordGame(match, { gameNumber: 2, teamId: 'away', playerId: 'p2', metrics: { damage: 5000, kills: 1 }, evidenceId: 'ev2' }, t.teams,t.registrations);
  F.completeMatch(t, match.id);
  assert.equal(match.outcome.winnerTeamId, 'home');
  F.completeStage(t, F.STAGES.REGULAR_SEASON);
  qualify(t,F.STAGES.POSTSEASON);
  F.activateStage(t, F.STAGES.POSTSEASON);
  playStage(t,F.STAGES.POSTSEASON);
  F.completeStage(t, F.STAGES.POSTSEASON);
  qualify(t,F.STAGES.GRAND_FINALE);
  F.activateStage(t, F.STAGES.GRAND_FINALE);
  playStage(t,F.STAGES.GRAND_FINALE);
  F.completeStage(t, F.STAGES.GRAND_FINALE);
  assert.equal(t.status, F.STATUS.COMPLETE);
});

test('match advancement refuses unapproved method and does not substitute raw W/L', () => {
  const match = { id: 'm', homeTeamId: 'a', awayTeamId: 'b', status: 'active', games: [] };
  assert.throws(() => F.resolveMatch(match, null), /not approved and published/);
});

test('tie-break order is explicit and unresolved ties block advancement', () => {
  const match = { id: 'm', homeTeamId: 'a', awayTeamId: 'b', status: 'active', games: [
    { teamId: 'a', metrics: { damage: 100, kills: 1 } },
    { teamId: 'b', metrics: { damage: 100, kills: 1 } },
  ] };
  const method = { approved: true, publishedAt: '2026-11-01', version: 'v1', weights: { damage: 1, kills: 1 }, aggregation: 'sum' };
  assert.throws(() => F.resolveMatch(match, method), /No approved tie-breaker/);
  assert.equal(F.resolveMatch(match, method, { tieBreak: { seasonRecordHome: 5, seasonRecordAway: 3 } }).winnerTeamId, 'a');
  assert.equal(F.resolveMatch(match, method, { tieBreak: { randomDrawAuthorized: true, randomDrawWinner: 'b' } }).decidedBy, 'authorized_random_draw');
});

test('Race side-event is a separate Full YOLO record using inverse elapsed seconds', () => {
  const t = full();
  const race = F.recordRaceSideEvent(t, { id: 'race-1', seasonWeek: 3, playerId: 'p1', elapsedSeconds: 120, evidenceId: 'ev-race' });
  assert.equal(race.raceMetric, 1 / 120);
  assert.equal(t.matches.length, 0);
  assert.throws(() => F.recordRaceSideEvent(pilot(), { id: 'race-2', seasonWeek: 3, playerId: 'p1', elapsedSeconds: 120, evidenceId: 'e' }), /only configured for Full/);
  assert.throws(() => F.recordRaceSideEvent(t, { id: 'race-3', seasonWeek: 3, playerId: 'p1', elapsedSeconds: 0, evidenceId: 'e' }), /positive seconds/);
});

test('active-stage settings freeze is prospective and audited', () => {
  const t = pilot();
  F.publishTournament(t); F.activateStage(t, F.STAGES.PILOT_EVENT);
  assert.equal(F.freezeSettings(t, { damagePool: 600 }).blocked,true);
  assert.equal(t.audit.at(-1).action, 'settings_change_blocked');
});

test('registrations, team rosters and fixture references are validated', () => {
  const t = full();
  assert.throws(() => F.registerParticipant(t, { playerId: 'p1', displayName: 'Alpha' }), /Registration is closed/);
  assert.throws(() => F.assignTeam(t, { id: 'bad', name: 'Bad', playerIds: ['unknown'] }), /active registration/);
  assert.throws(() => F.createFixture(t, { id: 'f', stageKey: F.STAGES.REGULAR_SEASON, homeTeamId: 'home', awayTeamId: 'missing' }), /two distinct registered teams/);
});

test('registration close prevents late entry and withdrawal remains auditable', () => {
  const t = full();
  F.closeRegistration(t);
  assert.throws(() => F.registerParticipant(t, { playerId: 'p3', displayName: 'Charlie' }), /Registration is closed/);
  const withdrawn = F.withdrawParticipant(t, 'p1', 'Participant request');
  assert.equal(withdrawn.status, 'withdrawn');
  assert.equal(t.audit.at(-1).action, 'participant_withdrawn');
  assert.ok(t.teams.find(team => team.id === 'home').playerIds.includes('p1'), 'locked historical roster membership is preserved');
});

test('match game must be supported by locked team roster and non-empty match', () => {
  const t = full();
  F.activateStage(t, F.STAGES.REGULAR_SEASON);
  const fixture = F.createFixture(t, { id: 'f1', stageKey: F.STAGES.REGULAR_SEASON, homeTeamId: 'home', awayTeamId: 'away' });
  const match = F.createMatch(t, fixture.id);
  assert.throws(() => F.recordGame(match, { gameNumber: 1, teamId: 'home', playerId: 'p2', metrics: { damage: 1, kills: 0 }, evidenceId: 'ev' }, t.teams,t.registrations), /locked roster/);
  assert.throws(() => F.completeMatch(t, match.id), /no recorded games/);
});

test('forfeit requires a team winner, reason and evidence and is auditable', () => {
  const t = full();
  F.activateStage(t, F.STAGES.REGULAR_SEASON);
  const fixture = F.createFixture(t, { id: 'f1', stageKey: F.STAGES.REGULAR_SEASON, homeTeamId: 'home', awayTeamId: 'away' });
  const match = F.createMatch(t, fixture.id);
  const result = F.resolveForfeit(t, match.id, 'home', 'Opponent no-show', 'evidence-1');
  assert.equal(result.status, F.STATUS.FORFEIT);
  assert.equal(result.outcome.decidedBy, 'forfeit');
  assert.equal(t.audit.at(-1).action, 'match_forfeit_resolved');
});

test('head-to-head tie-break is explicit and has precedence over later criteria', () => {
  const match = { id: 'm', homeTeamId: 'a', awayTeamId: 'b', status: 'active', games: [
    { teamId: 'a', metrics: { damage: 100, kills: 1 } },
    { teamId: 'b', metrics: { damage: 100, kills: 1 } },
  ] };
  const method = { approved: true, publishedAt: '2026-11-01', version: 'v1', weights: { damage: 1, kills: 1 }, aggregation: 'sum' };
  const result = F.resolveMatch(match, method, { tieBreak: {
    headToHeadWinnerTeamId: 'b', seasonRecordHome: 10, seasonRecordAway: 1,
  } });
  assert.equal(result.winnerTeamId, 'b');
  assert.equal(result.decidedBy, 'head_to_head');
});

test('public archive redacts Discord actor snowflakes but retains audit events', () => {
  const s = state();
  const t = F.createTournament(s.competition, { id: 'pilot-privacy', name: 'Pilot Privacy', format: 'pilot',
    config: { timezone: 'America/Chicago', eventStart: '2026-12-01T18:00:00-06:00' } });
  F.audit(t, 'sensitive-actor-check', {}, '12345678901234567');
  const archive = T.makePublicArchiveSnapshot(s);
  const saved = archive.workbook_backup.competition.tournaments[0];
  assert.equal(saved.audit.at(-1).action, 'sensitive-actor-check');
  assert.equal(saved.audit.at(-1).actor, 'redacted');
});

test('Full YOLO cannot activate postseason without approved published qualifiers', () => {
  const t=full();
  F.activateStage(t,F.STAGES.REGULAR_SEASON);
  playStage(t,F.STAGES.REGULAR_SEASON);
  F.completeStage(t,F.STAGES.REGULAR_SEASON);
  assert.throws(()=>F.activateStage(t,F.STAGES.POSTSEASON),/qualification list/);
  assert.throws(()=>F.setStageQualifiers(t,F.STAGES.POSTSEASON,['home','away'],{}),/approved, versioned and published/);
  qualify(t,F.STAGES.POSTSEASON);
  F.activateStage(t,F.STAGES.POSTSEASON);
});

test('stage bye requires a valid team, reason and evidence and resolves a fixture', () => {
  const t=full();
  F.activateStage(t,F.STAGES.REGULAR_SEASON);
  const bye=F.recordBye(t,F.STAGES.REGULAR_SEASON,'home','Odd number of teams','bye-evidence');
  assert.equal(bye.status,'bye');
  assert.equal(bye.outcome.decidedBy,'bye');
  F.completeStage(t,F.STAGES.REGULAR_SEASON);
});

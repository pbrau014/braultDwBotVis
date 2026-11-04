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
  L.assignRoster(s, { participantId: 'u1', teamId: 'red' });
  assert.throws(() => L.assignRoster(s, { participantId: 'u1', teamId: 'blue' }), /already assigned/);
  assert.throws(() => L.assignRoster(s, { participantId: 'u2', teamId: 'red' }), /registered/);
});

test('match outcomes require an approved, identified scoring method and exact positive inputs', () => {
  const t = L.createTournament({ id: 'f4', format: 'full' });
  const s = L.createSeason(t.id, { id: 's4', tournament: t });
  L.createTeam(s, { id: 'a', name: 'Alpha' });
  L.createTeam(s, { id: 'b', name: 'Bravo' });
  const stage = L.createStage(s.id, 'regular_season', { id: 'regular' });
  s.stages.push(stage);
  const fixture = L.createFixture(s, { id: 'fx', stageId: stage.id, teamA: 'a', teamB: 'b' });
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
  assert.equal(L.createEventNight(s, { id: 'n1', stageId: stage.id }).seasonId, s.id);
  const fixture = L.createFixture(s, { id: 'fx1', stageId: stage.id, teamA: 'a', teamB: 'b' });
  assert.equal(L.createMatch(s, fixture.id, { id: 'm1', gameNumber: 1 }).fixtureId, fixture.id);
  assert.throws(() => L.createFixture(s, { id: 'fx2', stageId: stage.id, teamA: 'a', teamB: 'missing' }), /two different teams/);
  assert.equal(L.createAward({ id: 'award-1', tournamentId: t.id, recipientId: 'u1', label: 'Winner', approvalId: 'PUB-1' }).status, 'approved');
});

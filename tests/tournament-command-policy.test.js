'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isAdminOnlyCommand } = require('../src/tournament-command-policy');

test('read-only settings inspection is restricted to tournament admins', () => {
    assert.equal(isAdminOnlyCommand('settings'), true);
});

test('settings mutation and all score/state mutation commands are admin-only', () => {
    for (const command of [
        'setting', 'add-player', 'rename-player', 'remove-player', 'result',
        'import', 'map', 'clear-slot', 'clear-event', 'clear-results',
        'finalize', 'export', 'export-workbook', 'snapshot', 'lifecycle-create', 'lifecycle-publish', 'lifecycle-start', 'lifecycle-finish', 'lifecycle-night', 'lifecycle-team', 'lifecycle-assign', 'lifecycle-lock', 'lifecycle-fixture', 'lifecycle-game', 'lifecycle-complete-fixture', 'lifecycle-resolve', 'lifecycle-stage', 'lifecycle-pilot-result', 'lifecycle-race-schedule', 'lifecycle-race',
    ]) {
        assert.equal(isAdminOnlyCommand(command), true, command);
    }
});

test('public read-only commands remain available to participants', () => {
    for (const command of ['help', 'players', 'player', 'standings', 'totals', 'status', 'missing', 'records', 'panel', 'download-workbook', 'workbook', 'formats', 'lifecycle', 'lifecycle-register', 'lifecycle-checkin']) {
        assert.equal(isAdminOnlyCommand(command), false, command);
    }
});

test('command policy normalizes case and surrounding whitespace', () => {
    assert.equal(isAdminOnlyCommand(' SETTINGS '), true);
    assert.equal(isAdminOnlyCommand(' ADD-PLAYER '), true);
});

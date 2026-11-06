'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { isAdminOnlyCommand } = require('../src/tournament-command-policy');

test('read-only settings inspection is restricted to tournament admins', () => {
    assert.equal(isAdminOnlyCommand('settings'), true);
});

test('settings mutation and all score/state mutation commands are admin-only', () => {
    for (const command of [
        'setting', 'add-player', 'rename-player', 'remove-player', 'result',
        'import', 'map', 'clear-slot', 'clear-event', 'clear-results',
        'finalize', 'export', 'export-workbook', 'download-workbook', 'workbook', 'snapshot',
    ]) {
        assert.equal(isAdminOnlyCommand(command), true, command);
    }
});

test('public read-only commands remain available to participants', () => {
    for (const command of ['help', 'players', 'player', 'standings', 'totals', 'status', 'missing', 'records', 'panel']) {
        assert.equal(isAdminOnlyCommand(command), false, command);
    }
});

test('command policy normalizes case and surrounding whitespace', () => {
    assert.equal(isAdminOnlyCommand(' SETTINGS '), true);
    assert.equal(isAdminOnlyCommand(' ADD-PLAYER '), true);
});


test('public Discord standings and totals contain doubloons only', () => {
    const bot = fs.readFileSync(path.join(__dirname, '..', 'src', 'bot.js'), 'utf8');
    const section = (start, end) => {
        const a = bot.indexOf(start);
        const b = bot.indexOf(end, a);
        assert.ok(a >= 0 && b > a, start + ' section must exist');
        return bot.slice(a, b);
    };
    for (const [start, end] of [
        ['function tournamentStandingsText()', 'function tournamentTotalsText()'],
        ['function tournamentTotalsText()', 'function slotIsFilled('],
        ['function tournamentPanelText(', 'function compactStandingsText()'],
        ['function compactStandingsText()', 'const YOLO_SLASH_COMMAND'],
    ]) {
        const output = section(start, end);
        assert.doesNotMatch(output, /estimatedValue|\\$\\{|Estimated value|H12-equivalent|totalDollars/);
    }
    const help = section('function tournamentHelp()', 'function tournamentStandingsText()');
    assert.match(help, /download the Excel source workbook \(admin only\)/);
    assert.doesNotMatch(help, /estimated dollar value|doubloon and dollar totals/);
});

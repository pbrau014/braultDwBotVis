'use strict';

const ADMIN_ONLY_COMMANDS = new Set([
    'add-player',
    'rename-player',
    'remove-player',
    'result',
    'setting',
    'settings',
    'import',
    'map',
    'clear-slot',
    'clear-event',
    'clear-results',
    'finalize',
    'export',
    'export-workbook',
    'snapshot',
    'lifecycle-create','lifecycle-publish','lifecycle-start','lifecycle-finish','lifecycle-team','lifecycle-assign','lifecycle-lock','lifecycle-fixture','lifecycle-game','lifecycle-complete-fixture','lifecycle-resolve','lifecycle-stage','lifecycle-pilot-result','lifecycle-race',
]);

function isAdminOnlyCommand(command) {
    return ADMIN_ONLY_COMMANDS.has(String(command || '').trim().toLowerCase());
}

module.exports = { isAdminOnlyCommand };

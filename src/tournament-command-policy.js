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
    'download-workbook',
    'workbook',
    'snapshot',
]);

function isAdminOnlyCommand(command) {
    return ADMIN_ONLY_COMMANDS.has(String(command || '').trim().toLowerCase());
}

module.exports = { isAdminOnlyCommand };

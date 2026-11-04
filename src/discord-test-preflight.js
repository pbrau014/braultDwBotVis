'use strict';
const path = require('node:path');
const SNOWFLAKE_PATTERN = /^\d{17,20}$/;
const DISABLED_VALUES = new Set(['0', 'false', 'no', 'off']);
function isWithinDirectory(parent, candidate) {
    const relative = path.relative(parent, candidate);
    return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}
function nodeVersionSupported(version) {
    const match = String(version || '').replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match) return false;
    const major = Number(match[1]), minor = Number(match[2]);
    return major > 22 || (major === 22 && minor >= 16);
}
/** Credential-safe, offline preflight. Never contacts Discord or returns secret values. */
function validateDiscordTestConfig(env = process.env, options = {}) {
    const projectRoot = path.resolve(options.projectRoot || process.cwd());
    const nodeVersion = options.nodeVersion || process.version;
    const errors = [], checks = [];
    const check = (name, ok, message) => { checks.push({ name, ok: Boolean(ok) }); if (!ok) errors.push(message); };
    check('node-runtime', nodeVersionSupported(nodeVersion), 'Use Node.js v22.16.0 or newer.');
    const environment = String(env.NODE_ENV || '').trim().toLowerCase();
    check('development-environment', ['development', 'test'].includes(environment), 'NODE_ENV must be development or test.');
    const token = String(env.DISCORD_BOT_TOKEN || '').trim();
    const tokenLooksConfigured = token.length > 20 && !/^(paste_|your_|<|replace)/i.test(token) && !/\s/.test(token);
    check('bot-token-present', tokenLooksConfigured, 'DISCORD_BOT_TOKEN is missing or still contains a placeholder.');
    const channelId = String(env.TARGET_CHANNEL_ID || '').trim();
    check('target-channel-id', SNOWFLAKE_PATTERN.test(channelId), 'TARGET_CHANNEL_ID must be a 17–20 digit Discord snowflake.');
    const adminIds = String(env.TOURNAMENT_ADMIN_IDS || '').split(',').map(value => value.trim()).filter(Boolean);
    check('admin-allowlist', adminIds.length > 0 && adminIds.every(value => SNOWFLAKE_PATTERN.test(value)), 'TOURNAMENT_ADMIN_IDS must contain one or more comma-separated 17–20 digit Discord user IDs.');
    check('json-test-storage', String(env.TOURNAMENT_STORAGE || '').trim().toLowerCase() === 'json', 'TOURNAMENT_STORAGE must be json for the isolated first live test.');
    const testDataRoot = path.resolve(projectRoot, 'testdata', 'live-discord-state');
    for (const variable of ['TOURNAMENT_STATE_PATH', 'TOURNAMENT_SQLITE_PATH']) {
        const configured = String(env[variable] || '').trim();
        const safe = configured ? isWithinDirectory(testDataRoot, path.resolve(projectRoot, configured)) : false;
        check(`isolated-${variable.toLowerCase()}`, safe, `${variable} must remain inside ./testdata/live-discord-state/.`);
    }
    for (const variable of ['ENABLE_SLASH_COMMANDS', 'OCRSPACE_ENABLED', 'PADDLEOCR_FIELD_FALLBACK', 'OCR_CV_ASSIST']) {
        const value = String(env[variable] ?? '0').trim().toLowerCase();
        check(`disabled-${variable.toLowerCase()}`, DISABLED_VALUES.has(value), `${variable} must be disabled for the first isolated Discord smoke test.`);
    }
    const statePath = String(env.TOURNAMENT_STATE_PATH || '').trim(), sqlitePath = String(env.TOURNAMENT_SQLITE_PATH || '').trim();
    if (statePath && sqlitePath) check('distinct-state-paths', path.resolve(projectRoot, statePath) !== path.resolve(projectRoot, sqlitePath), 'TOURNAMENT_STATE_PATH and TOURNAMENT_SQLITE_PATH must be different files.');
    return { ok: errors.length === 0, checks, errors, credentialPresent: tokenLooksConfigured };
}
module.exports = { validateDiscordTestConfig, nodeVersionSupported, isWithinDirectory };

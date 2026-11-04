'use strict';
require('dotenv').config();
const { validateDiscordTestConfig } = require('../src/discord-test-preflight');
const result = validateDiscordTestConfig(process.env, { projectRoot: process.cwd() });
for (const item of result.checks) console.log(`[Discord test preflight] ${item.ok ? 'PASS' : 'FAIL'}: ${item.name}`);
console.log(`[Discord test preflight] Bot token present: ${result.credentialPresent ? 'yes (value hidden)' : 'no'}`);
if (!result.ok) {
    for (const error of result.errors) console.error(`[Discord test preflight] ${error}`);
    console.error('[Discord test preflight] Failed. No Discord request was made; correct local configuration before starting the bot.');
    process.exitCode = 1;
} else {
    console.log('[Discord test preflight] PASS. Configuration is locally consistent; token validity, portal intents and live channel permissions are not verified by this offline check.');
}

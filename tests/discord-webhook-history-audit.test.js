'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { containsDiscordWebhookUrl, parseHistoryMatches } = require('../scripts/audit-discord-webhook-history');

test('detects a synthetic Discord webhook URL without returning its value', () => {
  const synthetic = 'https://discord.com/api/webhooks/123456789012345678/' + 'A'.repeat(68);
  assert.equal(containsDiscordWebhookUrl(synthetic), true);
});

test('does not flag an ordinary Discord API URL or a variable name', () => {
  assert.equal(containsDiscordWebhookUrl('https://discord.com/api/v10/users/@me'), false);
  assert.equal(containsDiscordWebhookUrl('DISCORD_WEBHOOK_URL'), false);
});

test('parses only commit IDs and paths from Git history output', () => {
  const parsed = parseHistoryMatches(
    'a'.repeat(40) + '\n' +
    'src/old-webhook.js\n' +
    '\n' +
    'b'.repeat(40) + '\n' +
    'docs/incident.md\n' +
    '\n'
  );
  assert.deepEqual(parsed, [
    { commit: 'a'.repeat(40), path: 'src/old-webhook.js' },
    { commit: 'b'.repeat(40), path: 'docs/incident.md' },
  ]);
  assert.equal(JSON.stringify(parsed).includes('A'.repeat(20)), false);
});

'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateDesktopTestConfig } = require('../src/desktop-test-preflight');

const valid = {
  ENABLE_DESKTOP_UI: '1',
  DESKTOP_UI_PORT: '8787',
  DISCORD_OAUTH_CLIENT_ID: '123456789012345678',
  DISCORD_OAUTH_CLIENT_SECRET: 'a-secret-value-that-is-not-a-placeholder',
  DISCORD_OAUTH_REDIRECT_URI: 'http://127.0.0.1:8787/auth/discord/callback',
  TOURNAMENT_ADMIN_IDS: '223456789012345678,323456789012345678',
};

test('desktop UI is opt-in and disabled configuration needs no OAuth credentials', () => {
  const result = validateDesktopTestConfig({ ENABLE_DESKTOP_UI: '0' });
  assert.equal(result.ok, true);
  assert.equal(result.enabled, false);
});
test('valid enabled local OAuth configuration passes without exposing credentials', () => {
  const result = validateDesktopTestConfig(valid);
  assert.equal(result.ok, true);
  assert.equal(result.enabled, true);
  assert.equal(result.port, 8787);
  assert.equal(result.adminCount, 2);
  assert.equal(JSON.stringify(result).includes(valid.DISCORD_OAUTH_CLIENT_SECRET), false);
});
test('desktop UI rejects placeholder credentials and missing explicit admins', () => {
  const result = validateDesktopTestConfig({
    ...valid,
    DISCORD_OAUTH_CLIENT_ID: 'PASTE_CLIENT_ID',
    DISCORD_OAUTH_CLIENT_SECRET: 'PASTE_CLIENT_SECRET',
    TOURNAMENT_ADMIN_IDS: '',
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(value => value.includes('CLIENT_ID')));
  assert.ok(result.errors.some(value => value.includes('CLIENT_SECRET')));
  assert.ok(result.errors.some(value => value.includes('TOURNAMENT_ADMIN_IDS')));
});
test('desktop UI rejects non-loopback, mismatched, or query-bearing OAuth redirects', () => {
  for (const uri of [
    'https://127.0.0.1:8787/auth/discord/callback',
    'http://localhost:8787/auth/discord/callback',
    'http://127.0.0.1:9999/auth/discord/callback',
    'http://127.0.0.1:8787/auth/discord/callback?next=https://evil.example',
  ]) {
    const result = validateDesktopTestConfig({ ...valid, DISCORD_OAUTH_REDIRECT_URI: uri });
    assert.equal(result.ok, false, uri);
  }
});
test('desktop UI validates port and every administrator snowflake', () => {
  const result = validateDesktopTestConfig({ ...valid, DESKTOP_UI_PORT: '70000', TOURNAMENT_ADMIN_IDS: 'bad,12345678901234567' });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(value => value.includes('DESKTOP_UI_PORT')));
  assert.ok(result.errors.some(value => value.includes('Every TOURNAMENT_ADMIN_IDS')));
});

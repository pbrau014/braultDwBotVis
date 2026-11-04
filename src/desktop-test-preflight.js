'use strict';

function validateDesktopTestConfig(env = {}) {
  const errors = [];
  const enabledValue = String(env.ENABLE_DESKTOP_UI ?? '0').trim();
  if (!['0', '1'].includes(enabledValue)) errors.push('ENABLE_DESKTOP_UI must be 0 or 1.');
  const enabled = enabledValue === '1';
  if (!enabled) return { ok: errors.length === 0, enabled: false, port: null, redirectUri: null, adminCount: 0, errors };

  const port = Number(env.DESKTOP_UI_PORT || 8787);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) errors.push('DESKTOP_UI_PORT must be an integer from 1024 through 65535.');

  const clientId = String(env.DISCORD_OAUTH_CLIENT_ID || '').trim();
  if (!/^\d{17,20}$/.test(clientId)) errors.push('DISCORD_OAUTH_CLIENT_ID must be a real Discord application ID (17–20 digits).');

  const clientSecret = String(env.DISCORD_OAUTH_CLIENT_SECRET || '').trim();
  if (clientSecret.length < 20 || /paste|placeholder|example/i.test(clientSecret)) {
    errors.push('DISCORD_OAUTH_CLIENT_SECRET must be configured locally; placeholder values are not accepted.');
  }

  const expectedRedirect = 'http://127.0.0.1:' + port + '/auth/discord/callback';
  const redirectUri = String(env.DISCORD_OAUTH_REDIRECT_URI || expectedRedirect).trim();
  try {
    const parsed = new URL(redirectUri);
    if (parsed.protocol !== 'http:' || parsed.hostname !== '127.0.0.1' || parsed.port !== String(port) ||
        parsed.pathname !== '/auth/discord/callback' || parsed.username || parsed.password ||
        parsed.search || parsed.hash) {
      errors.push('DISCORD_OAUTH_REDIRECT_URI must exactly match the configured local loopback callback URL.');
    }
  } catch {
    errors.push('DISCORD_OAUTH_REDIRECT_URI must be a valid local callback URL.');
  }

  const rawAdminIds = String(env.TOURNAMENT_ADMIN_IDS || '').split(',').map(value => value.trim()).filter(Boolean);
  if (!rawAdminIds.length) errors.push('TOURNAMENT_ADMIN_IDS must include at least one desktop administrator Discord user ID.');
  if (rawAdminIds.some(value => !/^\d{17,20}$/.test(value))) {
    errors.push('Every TOURNAMENT_ADMIN_IDS value must be a 17–20 digit Discord user ID.');
  }

  return {
    ok: errors.length === 0,
    enabled: true,
    port,
    redirectUri: errors.some(error => error.startsWith('DISCORD_OAUTH_REDIRECT_URI')) ? null : redirectUri,
    adminCount: rawAdminIds.length,
    errors,
  };
}

module.exports = { validateDesktopTestConfig };

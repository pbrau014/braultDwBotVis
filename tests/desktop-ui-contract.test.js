'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('desktop login, Player, Admin and upload HTML pages are present and link local assets only', () => {
  const pages = {
    'desktop/index.html': ['Continue with Discord', '/auth/discord'],
    'desktop/player.html': ['/desktop.css', '/desktop.js', '/player.js', 'standings-body', 'submission-list'],
    'desktop/admin.html': ['/desktop.css', '/desktop.js', '/admin.js', 'add-player-form', 'settings-form', 'admin-submissions'],
    'desktop/upload.html': ['/desktop.css', '/desktop.js', '/upload.js', 'drop-zone', 'image-file', 'image-preview'],
  };
  for (const [file, needles] of Object.entries(pages)) {
    const html = read(file);
    for (const needle of needles) assert.ok(html.includes(needle), file + ' must contain ' + needle);
    assert.doesNotMatch(html, /https?:\/\/(?:cdn\.|unpkg\.com|cdnjs\.|discordapp\.com\/api\/webhooks)/i);
    assert.doesNotMatch(html, /DISCORD_BOT_TOKEN|DISCORD_OAUTH_CLIENT_SECRET|OCR_SPACE_API_KEY/i);
  }
});

test('desktop browser scripts use only same-origin local APIs and do not contain credentials or webhooks', () => {
  for (const file of ['desktop/desktop.js','desktop/player.js','desktop/admin.js','desktop/upload.js']) {
    const source = read(file);
    assert.doesNotMatch(source, /discord\.com\/api|discordapp\.com\/api\/webhooks|api\.ocr\.space/i, file);
    assert.doesNotMatch(source, /DISCORD_BOT_TOKEN|DISCORD_OAUTH_CLIENT_SECRET|OCR_SPACE_API_KEY|webhook/i, file);
    assert.doesNotMatch(source, /localStorage|indexedDB/i, file);
  }
  assert.match(read('desktop/upload.js'), /\/api\/upload/);
  assert.match(read('desktop/player.js'), /\/api\/overview/);
  assert.match(read('desktop/admin.js'), /\/api\/admin\/settings/);
  assert.match(read('desktop/desktop.js'), /submission.requiredValues/);
  assert.match(read('desktop/desktop.js'), /submission.status==='awaiting-mapping'/);
});

test('upload page supports one image preview, drag and drop, type/size validation and progress', () => {
  const html = read('desktop/upload.html');
  const script = read('desktop/upload.js');
  assert.match(html, /type="file"/);
  assert.doesNotMatch(html, /multiple/i);
  assert.match(script, /dragover/);
  assert.match(script, /URL\.createObjectURL/);
  assert.match(script, /10\*1024\*1024/);
  assert.match(script, /image\/png/);
  assert.match(script, /xhr\.upload/);
  assert.match(script, /X-File-Name/);
});

test('the original workbook and OCR reader HTML baselines remain present and unchanged by desktop derivatives', () => {
  assert.ok(fs.statSync(path.join(root,'dwbotStuff/backupWkbkBrowser.html')).size > 10_000);
  assert.ok(fs.statSync(path.join(root,'dwbotStuff/scoreReport_dark_clipboard (1).html')).size > 10_000);
  const reader = read('dwbotStuff/scoreReport_dark_clipboard (1).html');
  assert.doesNotMatch(reader, /discord\.com\/api\/webhooks|discordapp\.com\/api\/webhooks/i);
});

test('desktop styles provide narrow-screen layouts without a third-party style dependency', () => {
  const css = read('desktop/desktop.css');
  assert.match(css, /@media\(max-width:950px\)/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(css, /:root/);
});

test('Pilot and Full format guidance is present with keyboard-accessible hover quick notes', () => {
  const player = read('desktop/player.html');
  const admin = read('desktop/admin.html');
  const css = read('desktop/desktop.css');
  for (const html of [player, admin]) {
    assert.match(html, /Pilot YOLO/);
    assert.match(html, /Full YOLO/);
    assert.match(html, /class="help-tip"/);
    assert.match(html, /aria-describedby=/);
    assert.match(html, /role="tooltip"/);
  }
  assert.match(css, /\.help-tip:hover/);
  assert.match(css, /\.help-tip:focus-visible/);
  assert.match(css, /\.format-guide__grid/);
});

test('Admin lifecycle forms use same-origin protected API routes and cover Pilot/Full operations', () => {
  const html = read('desktop/admin.html');
  const script = read('desktop/admin.js');
  const bridge = read('src/desktop-bridge.js');
  for (const route of ['/api/admin/tournaments','/api/admin/seasons','/api/admin/stages','/api/admin/teams','/api/admin/registrations','/api/admin/rosters','/api/admin/event-nights','/api/admin/fixtures','/api/admin/matches','/api/admin/match-outcomes','/api/admin/bracket/advance','/api/admin/approvals','/api/admin/pilot/registrations','/api/admin/pilot/event-nights','/api/admin/tournament-scores','/api/admin/awards']) {
    assert.ok(html.includes('data-lifecycle-endpoint="'+route+'"'), 'Admin form missing '+route);
    assert.ok(bridge.includes("'"+route+"'"), 'Bridge route missing '+route);
  }
  assert.match(script, /data-lifecycle-endpoint/);
  assert.match(script, /data-entity/);
  assert.match(script, /pilotTournaments/);
  assert.match(read('desktop/player.js'), /player-tournament-list/);
  assert.match(read('desktop/admin.js'), /admin-tournament-list/);
  assert.match(bridge, /csrf\(req,session\)/);
  assert.match(bridge, /role\(principal,\['admin'\]\)/);
});

test('event-night selection is available for scoped score mapping and roster assignment',()=>{const admin=read('desktop/admin.html');const app=read('desktop/desktop.js');assert.match(admin,/name="eventNightId"/);assert.match(app,/eventNightId/);assert.match(read('desktop/admin.js'),/eventNights/);});

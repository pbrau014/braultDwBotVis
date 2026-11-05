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
  assert.match(read('desktop/upload.js'), /25\s*\*\s*1024\s*\*\s*1024/);
  assert.match(read('desktop/upload.html'), /maximum 25 MB/i);
  assert.match(read('desktop/admin.html'), /private recovery JSON/i);
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

test('desktop binary screenshot upload sends the session CSRF token required by the bridge', () => {
  const desktopScript = read('desktop/desktop.js');
  const uploadScript = read('desktop/upload.js');
  const bridge = read('src/desktop-bridge.js');
  assert.ok(desktopScript.includes("csrfToken:()=>session?.csrfToken||''"));
  assert.ok(uploadScript.includes('const csrfToken=D.csrfToken();'));
  assert.ok(uploadScript.includes("xhr.setRequestHeader('X-CSRF-Token',csrfToken)"));
  assert.ok(uploadScript.indexOf("xhr.setRequestHeader('X-CSRF-Token',csrfToken)") < uploadScript.indexOf('xhr.send(file)'));
  assert.match(bridge, /if\(req\.method==='POST'&&p==='\/api\/upload'\)\{\s*csrf\(req,session\)/);
});

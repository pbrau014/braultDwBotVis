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
    assert.doesNotMatch(html, /DISCORD_BOT_TOKEN|DISCORD_OAUTH_CLIENT_SECRET|OCRSPACE_API_KEY|OCR_SPACE_API_KEY/i);
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
  const uploadPage = read('desktop/upload.html');
  assert.match(uploadPage, /maximum 25 MiB/i);
  assert.doesNotMatch(uploadPage, /maximum 10 MB/i);
  assert.match(uploadPage, /OCR.Space Engine 2/i);
  assert.match(uploadPage, /PDF-derived raster/i);
  assert.match(uploadPage, /OCRSPACE_ENABLED=1/i);
  assert.match(uploadPage, /OCRSPACE_NETWORK_ALLOWLIST=1/i);
  assert.match(uploadPage, /rather than falling back to OCR on the original screenshot/i);
  assert.doesNotMatch(uploadPage, /safe-crop prepass is default-on|Full screenshots and player identity are never sent/i);
  assert.match(read('desktop/admin.html'), /private recovery JSON/i);
  assert.match(read('desktop/desktop.js'), /submission.requiredValues/);
  assert.match(read('desktop/desktop.js'), /submission.status==='awaiting-mapping'/);
});

test('upload page supports one image preview, drag and drop, type/size validation and progress', () => {
  const html = read('desktop/upload.html');
  const script = read('desktop/upload.js');
  const css = read('desktop/desktop.css');
  assert.match(html, /type="file"/);
  assert.doesNotMatch(html, /multiple/i);
  assert.match(script, /dragover/);
  assert.match(html, /id="drop-zone"[^>]*role="region"/);
  assert.match(html, /aria-describedby="upload-constraints"/);
  assert.match(html, /id="browse-button"[^>]*type="button"/);
  assert.doesNotMatch(html, /role="button"[^>]*>[\s\S]*?<button/i);
  assert.doesNotMatch(script, /zone\.addEventListener\('keydown'/);
  assert.match(script, /URL\.createObjectURL/);
  assert.match(script, /25\s*\*\s*1024\s*\*\s*1024/);
  assert.match(script, /image\/png/);
  assert.match(script, /xhr\.upload/);
  assert.match(script, /X-File-Name/);
  assert.match(css, /\.drop-zone:focus-within/);
  assert.match(script, /xhr\.timeout=180000/);
  assert.match(script, /Submission status uncertain/);
  assert.match(script, /Check the Player page/);
  assert.match(script, /showResult\('Screenshot received'/);
  assert.match(script, /Receipt is not final OCR acceptance or score approval/);
  assert.match(script, /clearFile\(\{ keepResult: true \}\)/);
  assert.match(script, /submissionUncertain/);
  assert.doesNotMatch(script, /Screenshot accepted into the OCR pipeline/);
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
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test('desktop binary screenshot upload sends the session CSRF token required by the bridge', () => {
  const desktopScript = read('desktop/desktop.js');
  const uploadScript = read('desktop/upload.js');
  const bridge = read('src/desktop-bridge.js');
  assert.ok(desktopScript.includes("csrfToken:()=>session?.csrfToken||''"));
  assert.match(uploadScript, /const\s+csrfToken\s*=\s*D\.csrfToken\(\);/);
  assert.match(uploadScript, /xhr\.setRequestHeader\('X-CSRF-Token',\s*csrfToken\)/);
  assert.ok(uploadScript.indexOf("xhr.setRequestHeader('X-CSRF-Token', csrfToken)") < uploadScript.indexOf('xhr.send(file)'));
  assert.match(bridge, /if\(req\.method==='POST'&&p==='\/api\/upload'\)\{\s*csrf\(req,session\)/);
});


test('admin scoring settings provide contextual visible, hover and assistive help', () => {
  const html = read('desktop/admin.html');
  const script = read('desktop/admin.js');
  assert.match(html, /id="setting-help"[^>]*role="note"/);
  assert.match(html, /id="setting-field"[^>]*aria-describedby="setting-help"/);
  assert.match(html, /id="setting-value"[^>]*aria-describedby="setting-help"/);
  assert.match(script, /const settingHelp=\{/);
  assert.match(script, /D\.\$\('setting-field'\)\.title=description/);
  assert.match(script, /D\.\$\('setting-value'\)\.title=description/);
  assert.match(script, /DWBOT default is 0\.9/);
  assert.match(script, /Grand Yolo formula does not use the Doubloon pool/);
});


test('participant desktop scoreboards suppress H12 dollar diagnostics', () => {
  const html = read('desktop/player.html');
  const script = read('desktop/player.js');
  const service = read('src/desktop-service.js');
  assert.doesNotMatch(html, /ESTIMATED VALUE|player-value|<th>Value<\/th>/);
  assert.doesNotMatch(script, /estimatedValue|D\.money/);
  assert.match(script, /D\.number\(row\.total\)/);
  assert.match(service, /const publicRow = row =>/);
  assert.match(service, /const \{ estimatedValue, \.\.\.visible \} = row/);
  assert.match(service, /return \{\.\.\.base,aggregate,role:'admin'/);
});


test('player and admin score tables label event scores as doubloons and explain Race C01', () => {
  const playerHtml = read('desktop/player.html');
  const playerJs = read('desktop/player.js');
  const adminHtml = read('desktop/admin.html');
  const adminJs = read('desktop/admin.js');
  assert.match(playerHtml, /Each event value is a calculated doubloon score/);
  assert.match(playerJs, /Damage event doubloons/);
  assert.match(playerJs, /Race C01 doubloons/);
  assert.match(adminHtml, /Damage dubs/);
  assert.match(adminHtml, /Grand Yolo dubs/);
  assert.match(adminJs, /C01 uses inverse elapsed seconds/);
  assert.match(adminJs, /historical workbook raw-time formula is not the active policy/);
});

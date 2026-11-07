'use strict';

// Scans the current tracked tree and all locally available Git history for
// Discord webhook URLs. It reports commit IDs and paths only, never secret text.
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const GIT_PATTERN = 'discord(app)?[.]com/api/webhooks/[0-9]{17,20}/[A-Za-z0-9._-]{20,}';
const TEXT_PATTERN = /https?:\/\/discord(?:app)?\.com\/api\/webhooks\/[0-9]{17,20}\/[A-Za-z0-9._-]{20,}/i;

function containsDiscordWebhookUrl(text) {
  return TEXT_PATTERN.test(String(text));
}

function parseHistoryMatches(output) {
  const findings = [];
  let commit = null;
  for (const line of String(output).split(/\r?\n/)) {
    if (/^[a-f0-9]{40}$/i.test(line.trim())) {
      commit = line.trim().toLowerCase();
    } else if (commit && line.trim()) {
      findings.push({ commit, path: line.trim() });
    }
  }
  const unique = new Map();
  for (const finding of findings) unique.set(finding.commit + '\0' + finding.path, finding);
  return [...unique.values()];
}

function git(args, { allowNoMatch = false } = {}) {
  const result = spawnSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !(allowNoMatch && result.status === 1)) {
    throw new Error('Git audit command failed: git ' + args[0] + ' (exit ' + result.status + '). ' + String(result.stderr || '').slice(0, 1000));
  }
  return String(result.stdout || '');
}

function auditRepository() {
  const shallow = git(['rev-parse', '--is-shallow-repository']).trim() === 'true';
  if (shallow) {
    throw new Error('History audit requires a full, non-shallow Git checkout (fetch-depth: 0).');
  }
  const trackedFiles = git(['ls-files', '-z']).split('\0').filter(Boolean);
  const currentOutput = git([
    'grep', '-I', '-l', '-i', '-E', GIT_PATTERN, 'HEAD', '--', '.',
  ], { allowNoMatch: true });
  const currentTreeFindings = currentOutput.split(/\r?\n/).map(x => x.trim()).filter(Boolean);

  // -G tests changed lines but --name-only emits only paths; no matched line
  // content or credential value is sent to stdout or stored in the report.
  const historyOutput = git([
    'log', '--all', '--format=%H', '--name-only', '-i', '-G' + GIT_PATTERN,
  ]);
  const historyFindings = parseHistoryMatches(historyOutput);
  const status = currentTreeFindings.length || historyFindings.length
    ? 'FINDINGS_REQUIRING_CREDENTIAL_REVOCATION_AND_HISTORY_REVIEW'
    : 'NO_MATCHING_WEBHOOK_URL_FOUND_IN_SCANNED_REFS';
  return {
    schemaVersion: 1,
    auditType: 'DISCORD_WEBHOOK_URL_CURRENT_TREE_AND_GIT_HISTORY',
    status,
    currentTrackedFileCount: trackedFiles.length,
    currentTreeFindingPaths: currentTreeFindings,
    historyFindingCount: historyFindings.length,
    historyFindings,
    secretValuesPrinted: false,
    historyScope: 'All refs available in this non-shallow checkout (git log --all).',
    limitations: [
      'This scan detects Discord webhook URL patterns only; it is not a general secret scanner.',
      'Remote forks, deleted branches no longer fetched, external clones, caches, and Discord-side credential state are outside this scan.',
      'A clean scan does not prove that a previously exposed webhook was revoked.',
      'Any historical match must be treated as compromised until owner-side revocation/deletion is confirmed.',
    ],
  };
}

async function main(argv = process.argv.slice(2)) {
  const report = auditRepository();
  const outputIndex = argv.indexOf('--output');
  if (outputIndex >= 0 && argv[outputIndex + 1]) {
    await fs.writeFile(path.resolve(argv[outputIndex + 1]), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  }
  process.stdout.write(JSON.stringify({
    status: report.status,
    currentTrackedFileCount: report.currentTrackedFileCount,
    currentTreeFindingCount: report.currentTreeFindingPaths.length,
    historyFindingCount: report.historyFindingCount,
    secretValuesPrinted: false,
    currentTreeFindingPaths: report.currentTreeFindingPaths,
    historyFindings: report.historyFindings,
  }, null, 2) + '\n');
  if (report.currentTreeFindingPaths.length || report.historyFindingCount) process.exitCode = 2;
  return report;
}

if (require.main === module) {
  main().catch(error => {
    process.stderr.write((error.stack || String(error)) + '\n');
    process.exitCode = 1;
  });
}

module.exports = { containsDiscordWebhookUrl, parseHistoryMatches, auditRepository, GIT_PATTERN };

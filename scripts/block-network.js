'use strict';
// Preload for offline OCR acceptance. Any attempted HTTP(S)/fetch/TLS connection
// fails immediately and is recorded; local files and worker threads remain usable.
const fs = require('node:fs');
const logPath = process.env.OCR_NETWORK_BLOCK_LOG;
function blocked(kind, destination) {
  const message = `[OCR-NETWORK-BLOCK] blocked ${kind} ${String(destination || '').slice(0, 300)}\n`;
  if (logPath) { try { fs.appendFileSync(logPath, message); } catch {} }
  const error = new Error(`Network access is disabled for OCR acceptance (${kind}).`);
  error.code = 'OCR_NETWORK_BLOCKED';
  throw error;
}
function destination(args) {
  const first = args[0];
  if (typeof first === 'string') return first;
  if (first instanceof URL) return first.href;
  if (first && typeof first === 'object') return first.href || first.hostname || first.host || first.protocol || '[request options]';
  return '[unknown destination]';
}
globalThis.fetch = function blockedFetch(input, ...args) {
  try { blocked('fetch', destination([input])); } catch (error) { return Promise.reject(error); }
};
for (const moduleName of ['node:http', 'node:https']) {
  const mod = require(moduleName);
  const proto = moduleName.endsWith('https') ? 'https' : 'http';
  mod.request = function (...args) { return blocked(proto, destination(args)); };
  mod.get = function (...args) { return blocked(`${proto}.get`, destination(args)); };
}
const tls = require('node:tls');
tls.connect = function (...args) { return blocked('tls', destination(args)); };
process.env.OCR_NETWORK_BLOCK_ENABLED = '1';

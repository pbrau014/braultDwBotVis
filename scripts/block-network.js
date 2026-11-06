'use strict';
// Preload for OCR acceptance. Only OCR.Space's API and temporary searchable-PDF
// hosts may be reached when the explicit allowlist switch is enabled. All other
// HTTP(S)/TLS/fetch destinations are blocked and recorded.
const fs = require('node:fs');
const logPath = process.env.OCR_NETWORK_BLOCK_LOG;
function blocked(kind, destination) {
  const message = `[OCR-NETWORK-BLOCK] blocked ${kind} ${String(destination || '').slice(0, 300)}\\n`;
  if (logPath) { try { fs.appendFileSync(logPath, message); } catch {} }
  const error = new Error(`Network access is disabled for OCR acceptance (${kind}).`);
  error.code = 'OCR_NETWORK_BLOCKED';
  throw error;
}
function destination(args) {
  const first = args[0];
  if (typeof first === 'string') return first;
  if (first instanceof URL) return first.href;
  if (first && typeof first === 'object') {
    if (first.href) return first.href;
    const host = first.hostname || first.host;
    if (host) return (first.protocol || 'https:') + '//' + host + (first.path || first.pathname || '/');
  }
  return '[unknown destination]';
}
function allowed(value) {
  if (process.env.OCRSPACE_NETWORK_ALLOWLIST !== '1') return false;
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:' && ['api.ocr.space', 'ocr.space'].includes(url.hostname);
  } catch { return false; }
}
const originalFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = function guardedFetch(input, ...args) {
  const target = destination([input]);
  if (allowed(target)) return originalFetch(input, ...args);
  try { blocked('fetch', target); } catch (error) { return Promise.reject(error); }
};
for (const moduleName of ['node:http', 'node:https']) {
  const mod = require(moduleName);
  const proto = moduleName.endsWith('https') ? 'https' : 'http';
  const originalRequest = mod.request.bind(mod);
  const originalGet = mod.get.bind(mod);
  mod.request = function (...args) {
    const target = destination(args);
    if (proto === 'https' && allowed(target)) return originalRequest(...args);
    return blocked(proto, target);
  };
  mod.get = function (...args) {
    const target = destination(args);
    if (proto === 'https' && allowed(target)) return originalGet(...args);
    return blocked(`${proto}.get`, target);
  };
}
const tls = require('node:tls');
const originalTlsConnect = tls.connect.bind(tls);
tls.connect = function (...args) {
  const target = destination(args);
  if (allowed(target)) return originalTlsConnect(...args);
  return blocked('tls', target);
};
process.env.OCR_NETWORK_BLOCK_ENABLED = '1';

'use strict';
// OCR.Space network access is explicitly permitted through a strict HTTPS host
// allowlist. When unrelated-egress restriction is enabled, only non-provider
// destinations are denied and recorded; OCR.Space is never blocked by this guard.
const fs = require('node:fs');
const logPath = process.env.OCR_NON_OCR_NETWORK_LOG;
const restrictNonOcrNetwork = process.env.OCR_NON_OCR_NETWORK_RESTRICTED === '1';
function blocked(kind, destination) {
  const message = `[NON-OCR-SPACE-EGRESS-RESTRICTED] denied ${kind} ${String(destination || '').slice(0, 300)}\\n`;
  if (logPath) { try { fs.appendFileSync(logPath, message); } catch {} }
  const error = new Error(`Non-OCR.Space network destination is outside the configured allowlist (${kind}).`);
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
function ocrSpaceAllowed(value) {
  if (process.env.OCRSPACE_NETWORK_ALLOWLIST !== '1') return false;
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:' && ['api.ocr.space', 'ocr.space'].includes(url.hostname);
  } catch { return false; }
}
const originalFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = function guardedFetch(input, ...args) {
  const target = destination([input]);
  if (ocrSpaceAllowed(target) || !restrictNonOcrNetwork) return originalFetch(input, ...args);
  try { blocked('fetch', target); } catch (error) { return Promise.reject(error); }
};
for (const moduleName of ['node:http', 'node:https']) {
  const mod = require(moduleName);
  const proto = moduleName.endsWith('https') ? 'https' : 'http';
  const originalRequest = mod.request.bind(mod);
  const originalGet = mod.get.bind(mod);
  mod.request = function (...args) {
    const target = destination(args);
    if ((proto === 'https' && ocrSpaceAllowed(target)) || !restrictNonOcrNetwork) return originalRequest(...args);
    return blocked(proto, target);
  };
  mod.get = function (...args) {
    const target = destination(args);
    if ((proto === 'https' && ocrSpaceAllowed(target)) || !restrictNonOcrNetwork) return originalGet(...args);
    return blocked(`${proto}.get`, target);
  };
}
const tls = require('node:tls');
const originalTlsConnect = tls.connect.bind(tls);
tls.connect = function (...args) {
  const target = destination(args);
  if (ocrSpaceAllowed(target) || !restrictNonOcrNetwork) return originalTlsConnect(...args);
  return blocked('tls', target);
};

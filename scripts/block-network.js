'use strict';
// OCR.Space network access is explicitly permitted through a strict HTTPS host
// allowlist. When unrelated-egress restriction is enabled, only non-provider
// destinations are denied and recorded; OCR.Space is never blocked by this guard.
const fs = require('node:fs');
const path = require('node:path');
const logPath = process.env.OCR_NON_OCR_NETWORK_LOG;
const restrictNonOcrNetwork = process.env.OCR_NON_OCR_NETWORK_RESTRICTED === '1';
if (restrictNonOcrNetwork) {
  if (!logPath) throw new Error('OCR_NON_OCR_NETWORK_LOG is required when unrelated-egress restriction is enabled.');
  try {
    fs.mkdirSync(path.dirname(path.resolve(logPath)), { recursive: true });
    fs.appendFileSync(logPath, '');
  } catch (error) {
    const failure = new Error('The restricted-egress diagnostic log is not writable; refusing to start.');
    failure.code = 'OCR_NETWORK_LOG_UNAVAILABLE';
    failure.cause = error;
    throw failure;
  }
}
function blocked(kind, destination) {
  const message = `[NON-APPROVED-OCR-EGRESS-RESTRICTED] denied ${kind} ${String(destination || '').slice(0, 300)}\n`;
  if (restrictNonOcrNetwork) {
    try { fs.appendFileSync(logPath, message); }
    catch (cause) {
      const failure = new Error('The restricted-egress diagnostic log write failed; request remains blocked.');
      failure.code = 'OCR_NETWORK_LOG_WRITE_FAILED';
      failure.cause = cause;
      throw failure;
    }
  }
  const error = new Error(`Network destination is outside the configured OCR provider allowlist (${kind}).`);
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
function providerAllowed(value) {
  try {
    const url = new URL(String(value));
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
    if (process.env.OCRSPACE_NETWORK_ALLOWLIST === '1' &&
        ['api.ocr.space', 'ocr.space'].includes(url.hostname)) return true;
    // Azure is permitted only for the exact resource hostname configured by
    // the operator, never for a broad *.cognitiveservices.azure.com wildcard.
    if (process.env.AZURE_DOCUMENT_INTELLIGENCE_NETWORK_ALLOWLIST === '1') {
      const configured = new URL(String(process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT || ''));
      return configured.protocol === 'https:' && !configured.username && !configured.password &&
        !configured.port && configured.pathname === '/' && !configured.search && !configured.hash &&
        url.hostname === configured.hostname && url.origin === configured.origin;
    }
    return false;
  } catch { return false; }
}
const originalFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = function guardedFetch(input, ...args) {
  const target = destination([input]);
  if (providerAllowed(target) || !restrictNonOcrNetwork) return originalFetch(input, ...args);
  try { blocked('fetch', target); } catch (error) { return Promise.reject(error); }
};
for (const moduleName of ['node:http', 'node:https']) {
  const mod = require(moduleName);
  const proto = moduleName.endsWith('https') ? 'https' : 'http';
  const originalRequest = mod.request.bind(mod);
  const originalGet = mod.get.bind(mod);
  mod.request = function (...args) {
    const target = destination(args);
    if ((proto === 'https' && providerAllowed(target)) || !restrictNonOcrNetwork) return originalRequest(...args);
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

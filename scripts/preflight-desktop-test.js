'use strict';

require('dotenv').config();
const { validateDesktopTestConfig } = require('../src/desktop-test-preflight');

const result = validateDesktopTestConfig(process.env);
if (!result.ok) {
  console.error('[Desktop preflight] FAIL:');
  for (const error of result.errors) console.error(' - ' + error);
  process.exitCode = 1;
} else if (!result.enabled) {
  console.log('[Desktop preflight] PASS: desktop UI is disabled; no OAuth setup or browser listener is required.');
} else {
  console.log('[Desktop preflight] PASS: local OAuth settings, loopback redirect, port, and ' + result.adminCount + ' explicit admin ID(s) are configured.');
  console.log('[Desktop preflight] This is offline configuration validation only; it does not contact Discord or prove the Developer Portal redirect is registered.');
}

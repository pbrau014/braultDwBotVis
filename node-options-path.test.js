'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizedOptionPath, quoteRequireOption, hasRequireOption } = require('../scripts/node-options-path');

test('NODE_OPTIONS preload paths are quoted and normalized for Windows', () => {
    const file = 'C:\\Users\\Tournament User\\bot\\scripts\\block-network.js';
    assert.equal(normalizedOptionPath(file, 'win32'), 'C:/Users/Tournament User/bot/scripts/block-network.js');
    assert.equal(quoteRequireOption(file, 'win32'), '--require="C:/Users/Tournament User/bot/scripts/block-network.js"');
});

test('existing Windows preload is detected with either slash convention', () => {
    const file = 'C:\\Users\\Tournament User\\bot\\scripts\\block-network.js';
    assert.equal(hasRequireOption('--require="C:/Users/Tournament User/bot/scripts/block-network.js"', file, 'win32'), true);
    assert.equal(hasRequireOption('--require="C:\\Users\\Tournament User\\bot\\scripts\\block-network.js"', file, 'win32'), true);
    assert.equal(hasRequireOption('--trace-warnings', file, 'win32'), false);
});

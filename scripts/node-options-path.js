'use strict';

const path = require('node:path');

// NODE_OPTIONS is parsed by Node itself rather than by the shell. Normalize
// absolute Windows preload paths to forward slashes to avoid backslash parsing
// ambiguities in quoted --require values. Node accepts C:/ paths on Windows.
function normalizedOptionPath(file, platform = process.platform) {
    const absolute = platform === 'win32' ? path.win32.resolve(file) : path.resolve(file);
    return platform === 'win32' ? absolute.replace(/\\/g, '/') : absolute;
}

function quoteRequireOption(file, platform = process.platform) {
    return `--require="${normalizedOptionPath(file, platform)}"`;
}

function hasRequireOption(nodeOptions, file, platform = process.platform) {
    if (!nodeOptions) return false;
    const candidate = normalizedOptionPath(file, platform).toLowerCase();
    const existing = String(nodeOptions).replace(/\\/g, '/').toLowerCase();
    return existing.includes(candidate);
}

module.exports = { normalizedOptionPath, quoteRequireOption, hasRequireOption };

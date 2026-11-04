'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

test('ImageMagick timeout kills the child and waits for confirmed process close', async (t) => {
  if (process.platform === 'win32') {
    t.skip('POSIX process-group fixture; Windows uses the native child kill path');
    return;
  }
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'yolo-fake-magick-'));
  const magick = path.join(dir, 'fake-magick.sh');
  const timeout = path.join(dir, 'timeout');
  const prior = {
    PATH: process.env.PATH,
    IMAGEMAGICK_BIN: process.env.IMAGEMAGICK_BIN,
    IMAGEMAGICK_TIMEOUT_MS: process.env.IMAGEMAGICK_TIMEOUT_MS,
  };
  try {
    await fs.writeFile(timeout, '#!/bin/sh\nexit 42\n', { mode: 0o755 });
    await fs.writeFile(magick, '#!/bin/sh\nif [ "$1" = "-version" ]; then echo "ImageMagick fake"; exit 0; fi\nsleep 60\n', { mode: 0o755 });
    await fs.chmod(timeout, 0o755);
    await fs.chmod(magick, 0o755);
    process.env.PATH = `${dir}${path.delimiter}${prior.PATH || ''}`;
    process.env.IMAGEMAGICK_BIN = magick;
    process.env.IMAGEMAGICK_TIMEOUT_MS = '1000';
    const modulePath = require.resolve('../src/image-processor');
    delete require.cache[modulePath];
    const processor = require('../src/image-processor');
    const started = Date.now();
    await assert.rejects(processor.metadata(Buffer.from('not an image')), /ImageMagick exceeded its 1000 ms processing timeout/i);
    assert.ok(Date.now() - started < 3500, 'timed-out image process should be killed and close confirmed promptly');
  } finally {
    if (prior.PATH === undefined) delete process.env.PATH; else process.env.PATH = prior.PATH;
    if (prior.IMAGEMAGICK_BIN === undefined) delete process.env.IMAGEMAGICK_BIN; else process.env.IMAGEMAGICK_BIN = prior.IMAGEMAGICK_BIN;
    if (prior.IMAGEMAGICK_TIMEOUT_MS === undefined) delete process.env.IMAGEMAGICK_TIMEOUT_MS; else process.env.IMAGEMAGICK_TIMEOUT_MS = prior.IMAGEMAGICK_TIMEOUT_MS;
    await fs.rm(dir, { recursive: true, force: true });
  }
});

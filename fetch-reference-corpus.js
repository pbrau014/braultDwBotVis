'use strict';

// Downloads only the exact user-provided image URLs recorded in the corpus JSON.
// It intentionally does not substitute similar search results or other screenshots.
const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'testdata', 'reference-corpus.json');
const OUTPUT_DIR = path.join(ROOT, 'testdata', 'reference-images');
const MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024;

async function main() {
    const manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8'));
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    let failed = 0;

    for (const item of manifest.records) {
        const destination = path.join(OUTPUT_DIR, item.filename);
        try {
            console.log(`Downloading ${item.id} from its configured source...`);
            const response = await fetch(item.sourceUrl, {
                redirect: 'follow',
                signal: AbortSignal.timeout(35_000),
                headers: { 'user-agent': 'WoWS-OCR-Regression/1.0 (+local test runner)' },
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const bytes = Buffer.from(await response.arrayBuffer());
            if (!bytes.length) throw new Error('empty response');
            if (bytes.length > MAX_DOWNLOAD_BYTES) throw new Error(`download exceeds ${MAX_DOWNLOAD_BYTES} byte test limit`);
            await fs.writeFile(destination, bytes);
            console.log(`  Saved ${item.filename} (${bytes.length.toLocaleString()} bytes).`);
        } catch (error) {
            failed += 1;
            console.error(`  FAILED ${item.id}: ${error.message}. The script does not substitute another image.`);
        }
    }

    if (failed) {
        console.error(`${failed} corpus download(s) failed. Check source reachability; Facebook CDN URLs may expire or block automated downloads.`);
        process.exitCode = 1;
    } else {
        console.log('All 3 specified image sources were downloaded. Add visually confirmed expected values to testdata/reference-corpus.json before scoring accuracy.');
    }
}

main().catch((error) => {
    console.error(`Could not fetch the reference corpus: ${error.stack || error.message}`);
    process.exitCode = 1;
});

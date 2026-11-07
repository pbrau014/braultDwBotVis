'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { createAccuracyReport } = require('../src/ocr-accuracy-metrics');

function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i++) {
        if (!argv[i].startsWith('--')) continue;
        const key = argv[i].slice(2);
        const value = argv[i + 1];
        if (!value || value.startsWith('--')) throw new Error('Missing value for --' + key);
        args[key] = value;
        i++;
    }
    return args;
}

async function readCollection(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) return parsed;
        if (Array.isArray(parsed.records)) return parsed.records;
        throw new Error('Expected a JSON array or an object with a records array: ' + filePath);
    } catch (error) {
        if (error.message.startsWith('Expected a JSON array')) throw error;
        return content.split(/\r?\n/).filter(line => line.trim()).map((line, index) => {
            try { return JSON.parse(line); }
            catch { throw new Error('Invalid JSON/JSONL at ' + filePath + ':' + (index + 1)); }
        });
    }
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (!args.predictions || !args['ground-truth']) {
        throw new Error('Usage: node scripts/summarize-multi-provider-accuracy.js --predictions <smoke-or-prediction-json> --ground-truth <labelled-json> [--output <report.json>]');
    }
    const predictions = await readCollection(path.resolve(args.predictions));
    const groundTruth = await readCollection(path.resolve(args['ground-truth']));
    const report = createAccuracyReport({ predictions, groundTruth });
    const output = JSON.stringify(report, null, 2) + '\n';
    if (args.output) {
        const outputPath = path.resolve(args.output);
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, output, { encoding: 'utf8', flag: 'wx' });
        process.stdout.write(JSON.stringify({ outputPath, sampleCounts: report.sampleCounts, metrics: report.metrics }, null, 2) + '\n');
    } else {
        process.stdout.write(output);
    }
}

main().catch(error => {
    process.stderr.write(String(error?.stack || error).slice(0, 3000) + '\n');
    process.exitCode = 1;
});

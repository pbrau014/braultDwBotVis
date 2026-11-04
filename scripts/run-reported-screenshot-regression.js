'use strict';

// Regression for the exact screenshot that triggered the live correction prompt.
// Uses the production bot extraction/validation path with Discord login stubbed.
const Module = require('node:module');
const path = require('node:path');
const fs = require('node:fs/promises');
const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'dotenv') return { config() {} };
    if (request === 'discord.js') {
        class MockClient { constructor() { this.rest = { on() {} }; } on() { return this; } once() { return this; } destroy() {} async login() {} }
        return {
            Client: MockClient,
            GatewayIntentBits: { Guilds: 1, GuildMessages: 2, MessageContent: 4 },
            Events: { MessageCreate: 'messageCreate', ClientReady: 'ready' },
            Partials: { Channel: 1 },
        };
    }
    return originalLoad.call(this, request, parent, isMain);
};

const bot = require('../src/bot');
const { numericValueOrNull } = require('../src/battle-record');
const { nativeTesseractAvailable } = require('../src/ocr-worker');
const { createOcrReportMetadata } = require('../src/ocr-report-metadata');
const { compareExpected } = require('../src/acceptance-checks');
const packageInfo = require('../package.json');
const fixture = path.join(__dirname, '..', 'fixtures', 'reported-issue', 'Screenshot_2026-10-22_201950.png');
const outputPath = process.env.REPORTED_SCREENSHOT_REPORT_PATH || path.join(__dirname, '..', 'testdata', 'reported-screenshot-regression-results.json');
const expected = {
    result: 'Defeat',
    player: '[AYNS]BabyEatingDingo',
    map: 'New Dawn',
    mode: 'Random Battle',
    battleStart: '30.09.2026 14:46',
    credits: 540180,
    xp: 4906,
    freeXp: 1536,
    damage: 87373,
};

(async () => {
    let result;
    try {
        const buffer = await fs.readFile(fixture);
        const output = await bot.extractText(buffer);
        const attempts = output.attempts.map((attempt) => bot.validateWorldOfWarshipsScreenshot(attempt, output.fields));
        attempts.sort((a, b) => a.missing.length - b.missing.length || b.confidence - a.confidence);
        const best = attempts[0];
        const record = best.record;
        const actual = {
            result: record.result,
            player: record.player,
            map: record.map,
            mode: record.mode,
            battleStart: record.battleStart,
            credits: numericValueOrNull(record.credits),
            xp: numericValueOrNull(record.xp),
            freeXp: numericValueOrNull(record.freeXp),
            damage: numericValueOrNull(record.damage),
        };
        const { comparison, allMatch, requiredFieldsPass } = compareExpected(actual, expected);
        const requestedEngine = String(process.env.OCR_ENGINE || 'auto').toLowerCase();
        const selectedEngine = requestedEngine === 'native'
            ? 'native Tesseract CLI + ImageMagick preprocessing'
            : requestedEngine === 'tesseractjs'
                ? 'Tesseract.js local assets + ImageMagick preprocessing'
                : nativeTesseractAvailable()
                    ? 'native Tesseract CLI (auto-selected) + ImageMagick preprocessing'
                    : 'Tesseract.js local assets (auto-selected) + ImageMagick preprocessing';
        result = {
            reportMetadata: createOcrReportMetadata(path.join(__dirname, '..')),
            buildVersion: packageInfo.version,
            configuredEngine: requestedEngine,
            engine: selectedEngine,
            filename: path.basename(fixture),
            imageSizeBytes: buffer.length,
            pipelineCompleted: true,
            attempts: output.attempts.length,
            selectedPageSegmentationMode: best.pageSegmentationMode,
            confidence: best.confidence,
            actual,
            expected,
            comparison,
            allExpectedFieldsPass: allMatch,
            allRequiredFieldsPass: requiredFieldsPass,
            requiredMissing: bot.getMissingRequiredFields(record).map((field) => ({ key: field.key, reason: field.reason })),
            ambiguities: record.ambiguities,
        };
        await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
        console.log(JSON.stringify(result, null, 2));
        if (!result.allRequiredFieldsPass || result.requiredMissing.length) process.exitCode = 1;
    } finally {
        await bot.terminateOcrWorker().catch(() => {});
        Module._load = originalLoad;
    }
})().catch((error) => {
    console.error('[REPORTED-SCREENSHOT] Fatal error:', error);
    process.exitCode = 1;
});

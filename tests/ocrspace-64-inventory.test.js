'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const inventory = require('../dwbotStuff/DWBOT_64_IMAGE_INVENTORY_REVIEWED.json');
const {
    ELIGIBLE_DISPOSITION,
    EXCLUDED_DISPOSITION,
    partitionReviewedInventory,
} = require('../src/ocrspace-inventory');

test('reviewed 64-image inventory partitions 56 eligible and 8 user-excluded images', () => {
    const { eligibleRecords, excludedRecords } = partitionReviewedInventory(inventory);
    assert.equal(eligibleRecords.length, 56);
    assert.equal(excludedRecords.length, 8);
    assert.ok(eligibleRecords.every(item => item.corpusDisposition === ELIGIBLE_DISPOSITION));
    assert.ok(excludedRecords.every(item => item.corpusDisposition === EXCLUDED_DISPOSITION));
    assert.deepEqual(
        new Set(excludedRecords.map(item => item.filename)),
        new Set(inventory.userReview.excludedFilenames),
    );
});

test('unknown or unreviewed image dispositions fail closed before any provider run', () => {
    const changed = structuredClone(inventory);
    changed.records[0].corpusDisposition = 'unreviewed';
    assert.throws(() => partitionReviewedInventory(changed), /unknown corpus disposition/);
});

test('per-image exclusions and user-reviewed exclusion list must agree exactly', () => {
    const changed = structuredClone(inventory);
    changed.userReview.excludedFilenames.pop();
    assert.throws(() => partitionReviewedInventory(changed), /do not match/);
});

test('64-image runner skips user-excluded records before the OCR.Space provider call', () => {
    const runner = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'run-ocrspace-64-inventory.js'), 'utf8');
    const exclusionGuard = runner.indexOf('if (item.corpusDisposition === EXCLUDED_DISPOSITION)');
    const skip = runner.indexOf('continue;', exclusionGuard);
    const providerCall = runner.indexOf('await createOcrSpacePdfFirst', exclusionGuard);
    assert.ok(exclusionGuard >= 0);
    assert.ok(skip > exclusionGuard && providerCall > skip);
    assert.match(runner, /providerSubmission:\s*false/);
});


test('all 64 source-member hashes are verified before the first OCR.Space request', () => {
    const runner = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'run-ocrspace-64-inventory.js'), 'utf8');
    const preflight = runner.indexOf('const verifiedSources = [];');
    const preflightComplete = runner.indexOf("Verified all 64 source members before any provider request.");
    const providerCall = runner.indexOf('await createOcrSpacePdfFirst');
    assert.ok(preflight >= 0 && preflightComplete > preflight && providerCall > preflightComplete);
    assert.match(runner, /sourceMemberHashesVerified:\s*verifiedSources\.length/);
});


test('64-image member preflight rejects symlink targets outside the verified source root', () => {
    const runner = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'run-ocrspace-64-inventory.js'), 'utf8');
    assert.match(runner, /const resolvedSourcePath = await fs\.realpath\(sourcePath\)/);
    assert.match(runner, /if \(!inside\(resolvedRoot, resolvedSourcePath\)\)/);
});

test('Windows acceptance validates the 56 eligible and 8 excluded inventory partition', () => {
    const runner = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'run-windows-ocr-acceptance.ps1'), 'utf8');
    assert.match(runner, /\$Inventory64Data\.imageCount -eq 64/);
    assert.match(runner, /\$Inventory64Data\.eligibleCount -eq 56/);
    assert.match(runner, /\$Inventory64Data\.eligibleProcessed -eq 56/);
    assert.match(runner, /\$Inventory64Data\.completedImages -eq 56/);
    assert.match(runner, /\$Inventory64Data\.excludedCount -eq 8/);
    assert.match(runner, /\$Inventory64Data\.excludedSkipped -eq 8/);
    assert.match(runner, /\$Inventory64Data\.completedInventoryEntries -eq 64/);
    assert.match(runner, /\$Inventory64Data\.sourceMemberHashesVerified -eq 64/);
    assert.match(runner, /\$Inventory64Data\.allSourceMembersVerifiedBeforeProvider -eq \$true/);
    assert.match(runner, /\$env:OCRSPACE_64_OUTPUT_DIR=Join-Path \$RunDir 'ocrspace-64-inventory'/);
    assert.match(runner, /\$EligibleRows\.Count -eq 56 -and \$ExcludedRows\.Count -eq 8/);
});

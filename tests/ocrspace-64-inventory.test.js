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

test('eligible-only 56 runner skips the eight absent user-excluded records before provider calls', () => {
    const runner = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'run-ocrspace-64-inventory.js'), 'utf8');
    const exclusionGuard = runner.indexOf('if (item.corpusDisposition === EXCLUDED_DISPOSITION)');
    const skip = runner.indexOf('continue;', exclusionGuard);
    const providerCall = runner.indexOf('await createOcrSpacePdfFirst', exclusionGuard);
    assert.ok(exclusionGuard >= 0);
    assert.ok(skip > exclusionGuard && providerCall > skip);
    assert.match(runner, /providerSubmission:\s*false/);
    assert.match(runner, /sourcePresent:\s*false/);
});


test('all 56 eligible source-member hashes and archive fingerprint are verified before the first OCR.Space request', () => {
    const runner = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'run-ocrspace-64-inventory.js'), 'utf8');
    const preflight = runner.indexOf('const verifiedSources = new Map();');
    const preflightComplete = runner.indexOf("Verified the reconstructed archive SHA-256 and all 56 eligible member hashes; all 8 excluded records are absent.");
    const providerCall = runner.indexOf('await createOcrSpacePdfFirst');
    assert.ok(preflight >= 0 && preflightComplete > preflight && providerCall > preflightComplete);
    assert.match(runner, /sourceMemberHashesVerified:\s*verifiedSources\.size/);
});


test('eligible member preflight rejects symlink targets outside the verified source root', () => {
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
    assert.match(runner, /\$Inventory64Data\.sourceMemberHashesVerified -eq 56/);
    assert.match(runner, /\$Inventory64Data\.allSourceMembersVerifiedBeforeProvider -eq \$true/);
    assert.match(runner, /\$Inventory64Data\.eligibleSourceHashesVerified -eq 56/);
    assert.match(runner, /\$Inventory64Data\.archiveMembersVerified -eq 56/);
    assert.match(runner, /\$Inventory64Data\.excludedRecordsAbsent -eq \$true/);
    assert.match(runner, /\$env:OCRSPACE_64_OUTPUT_DIR=Join-Path \$RunDir 'ocrspace-64-inventory'/);
    assert.match(runner, /\$EligibleRows\.Count -eq 56 -and \$ExcludedRows\.Count -eq 8/);
});


test('runner archive preflight reconstructs split parts and verifies exact eligible member set before permitting provider requests', () => {
    const preflight = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'prepare-ocrspace-eligible-56.py'), 'utf8');
    assert.match(preflight, /imgsHalf1-eligible-56\.zip\.\{n:03d\}/);
    assert.match(preflight, /archiveSha256/);
    assert.match(preflight, /len\(names\) != 56/);
    assert.match(preflight, /set\(names\) != set\(expected\)/);
    assert.match(preflight, /record\["sha256"\]/);
    assert.match(preflight, /record\["bytes"\]/);
    assert.match(preflight, /excludedRecordsAbsent/);
    assert.match(preflight, /providerRequestsPermitted/);
    const workflow = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'dwbot-verification.yml'), 'utf8');
    assert.ok(workflow.indexOf('Reconstruct and verify eligible-only 56-image archive before provider access') < workflow.indexOf('Current-source Tesseract.js and native Tesseract screenshot acceptance'));
});

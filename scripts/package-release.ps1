[CmdletBinding()]
param(
    [string]$ProjectRoot = '',
    [string]$OutputRoot = ''
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($ProjectRoot)) {
    $ProjectRoot = (Get-Location).Path
}
$ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    $OutputRoot = Join-Path $ProjectRoot 'release-artifacts'
}
$OutputRoot = [System.IO.Path]::GetFullPath($OutputRoot)

$branch = (& git -C $ProjectRoot branch --show-current).Trim()
if ($branch -notin @('main', 'ocr-multiprovider')) {
    throw "Package only from main or the isolated ocr-multiprovider branch; found $branch"
}
$commit = (& git -C $ProjectRoot rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0) {
    throw 'Cannot resolve source commit.'
}

$status = @(& git -C $ProjectRoot status --porcelain)
$unexpected = @($status | Where-Object { $_ -notmatch '^\?\? release-artifacts/' })
if ($unexpected.Count -gt 0) {
    throw ('Working tree has non-artifact changes: ' + ($unexpected -join '; '))
}

New-Item -ItemType Directory -Force -Path $OutputRoot | Out-Null
$stage = Join-Path $OutputRoot ('stage-' + $commit.Substring(0, 12))
$extract = Join-Path $OutputRoot ('verify-' + $commit.Substring(0, 12))
$packageLabel = if ($branch -eq 'ocr-multiprovider') { 'DWBOT-MULTIPROVIDER-CANDIDATE' } else { 'DWBOT' }
$zip = Join-Path $OutputRoot ($packageLabel + '-' + $commit.Substring(0, 12) + '.zip')

foreach ($pathToReset in @($stage, $extract, $zip)) {
    if (Test-Path -LiteralPath $pathToReset) {
        Remove-Item -LiteralPath $pathToReset -Recurse -Force
    }
}
New-Item -ItemType Directory -Force -Path $stage | Out-Null

$tracked = @(& git -C $ProjectRoot ls-files)
if ($LASTEXITCODE -ne 0 -or $tracked.Count -eq 0) {
    throw 'Tracked source inventory is empty.'
}

$excludedReviewAssets = @(
    'dwbotStuff/DWBOT_56_IMAGE_GROUND_TRUTH_REVIEW.xlsx',
    'dwbotStuff/DWBOT_64_IMAGE_INVENTORY_REVIEWED.json',
    'dwbotStuff/DWBOT_CONSOLIDATED_IMAGE_INVENTORY.json',
    'dwbotStuff/yolo_event.docx',
    'dwbotStuff/yolo_rules_xmpl.docx',
    'dwbotStuff/yolo_tournament_complete_instruction_set.docx',
    'dwbotStuff/README.md'
)
$excludedFilePatterns = @(
    '^testdata/imgsHalf1-eligible-56\.zip\.\d{3}$'
)
$excludedDirectoryPatterns = @(
    '(^|/)(node_modules|\.git|\.cache|coverage|release-artifacts|persistence-recovery|tournament-state|live-discord-state)(/|$)',
    '(^|/)provenance/input-archives(/|$)',
    '(^|/)docs/source-baselines(/|$)',
    '(^|/)docs/source-inputs(/|$)'
)

$included = @()
foreach ($relativePath in $tracked) {
    $normalizedPath = $relativePath -replace '\\', '/'
    if ($normalizedPath -match '(^|/)\.env($|\.)') {
        continue
    }
    if ($excludedReviewAssets -contains $normalizedPath) {
        continue
    }
    $excluded = $false
    foreach ($pattern in $excludedFilePatterns) {
        if ($normalizedPath -match $pattern) {
            $excluded = $true
            break
        }
    }
    if ($excluded) {
        continue
    }
    $excluded = $false
    foreach ($pattern in $excludedDirectoryPatterns) {
        if ($normalizedPath -match $pattern) {
            $excluded = $true
            break
        }
    }
    if ($excluded) {
        continue
    }

    $sourcePath = Join-Path $ProjectRoot $relativePath
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
        throw "Missing tracked file: $relativePath"
    }
    $destinationPath = Join-Path $stage $relativePath
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destinationPath) | Out-Null
    Copy-Item -LiteralPath $sourcePath -Destination $destinationPath
    $included += $normalizedPath
}

if (($included -notcontains 'package.json') -or ($included -notcontains 'package-lock.json')) {
    throw 'Node package manifests are missing from the release package.'
}

$manuals = @(
    @{
        Source = Join-Path $OutputRoot 'DWBOT_LOCAL_OPERATIONS_AND_RELEASE_VERIFICATION_MANUAL_2026-11-04.pdf'
        Relative = 'docs/iteration23/DWBOT_LOCAL_OPERATIONS_AND_RELEASE_VERIFICATION_MANUAL_2026-11-04.pdf'
    },
    @{
        Source = Join-Path $OutputRoot 'DWBOT_USER_MANUAL.pdf'
        Relative = 'docs/user/DWBOT_USER_MANUAL.pdf'
    }
)
foreach ($manual in $manuals) {
    if (-not (Test-Path -LiteralPath $manual.Source -PathType Leaf)) {
        throw "Rendered PDF manual is missing: $($manual.Source)"
    }
    $destination = Join-Path $stage $manual.Relative
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
    Copy-Item -LiteralPath $manual.Source -Destination $destination
    $included += $manual.Relative
}

$entries = @(
    $included | Sort-Object -Unique | ForEach-Object {
        $filePath = Join-Path $stage $_
        [pscustomobject]@{
            path = $_
            sizeBytes = (Get-Item -LiteralPath $filePath).Length
            sha256 = (Get-FileHash -LiteralPath $filePath -Algorithm SHA256).Hash.ToLowerInvariant()
        }
    }
)
$manifest = [ordered]@{
    schemaVersion = 1
    sourceBranch = $branch
    sourceCommit = $commit
    createdAt = (Get-Date).ToUniversalTime().ToString('o')
    excluded = @(
        '.env files and credentials',
        'node_modules, .git, cache, coverage, and generated release artifacts',
        'runtime state and persistence-recovery databases',
        'provenance/input-archives, docs/source-baselines, and docs/source-inputs',
        'large split 56-image exploratory corpus archive parts (retained in the repository)',
        'review-only workbook, inventory, and DOCX source assets retained in the repository'
    )
    files = $entries
}
$manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $stage 'RELEASE_PACKAGE_MANIFEST.json') -Encoding utf8

$archiveInputs = @(Get-ChildItem -LiteralPath $stage -Force | Select-Object -ExpandProperty FullName)
Compress-Archive -Path $archiveInputs -DestinationPath $zip -CompressionLevel Optimal
$zipHash = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()
"$zipHash  $(Split-Path -Leaf $zip)" | Set-Content -LiteralPath ($zip + '.sha256') -Encoding ascii

Expand-Archive -LiteralPath $zip -DestinationPath $extract
$listed = @(& tar.exe -tf $zip)
if ($LASTEXITCODE -ne 0) {
    throw 'ZIP integrity verification failed.'
}
$extractedManifestPath = Join-Path $extract 'RELEASE_PACKAGE_MANIFEST.json'
$extractedManifest = Get-Content -LiteralPath $extractedManifestPath -Raw | ConvertFrom-Json
$bad = @()
foreach ($entry in $extractedManifest.files) {
    $filePath = Join-Path $extract $entry.path
    if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
        $bad += "Missing $($entry.path)"
        continue
    }
    $item = Get-Item -LiteralPath $filePath
    $hash = (Get-FileHash -LiteralPath $filePath -Algorithm SHA256).Hash.ToLowerInvariant()
    if (($item.Length -ne $entry.sizeBytes) -or ($hash -ne $entry.sha256)) {
        $bad += "Mismatch $($entry.path)"
    }
}
if ($bad.Count -gt 0) {
    throw ($bad -join [Environment]::NewLine)
}

$forbidden = @(
    Get-ChildItem -LiteralPath $extract -Force -Recurse |
        Where-Object {
            $_.FullName -match '[\\/]node_modules([\\/]|$)' -or
            $_.Name -eq '.env' -or
            $_.Name -match '^\.env\.'
        }
)
if ($forbidden.Count -gt 0) {
    throw 'Forbidden dependency or environment-secret path found in release package.'
}

Push-Location $extract
try {
    & npm.cmd ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'npm ci failed in extracted package.' }
    & npm.cmd test
    if ($LASTEXITCODE -ne 0) { throw 'npm test failed in extracted package.' }
    & npm.cmd run test:prelive
    if ($LASTEXITCODE -ne 0) { throw 'prelive verification failed in extracted package.' }
}
finally {
    Pop-Location
}

$verification = [ordered]@{
    sourceBranch = $branch
    sourceCommit = $commit
    zip = $zip
    zipSha256 = $zipHash
    sourceFiles = $included.Count
    manifestEntries = @($extractedManifest.files).Count
    zipEntries = $listed.Count
    manifestVerified = $true
    cleanExtraction = $true
    npmCi = 'PASS'
    npmTest = 'PASS'
    prelive = 'PASS'
    passed = $true
}
$verification | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $OutputRoot 'release-package-verification.json') -Encoding utf8
Write-Host ($verification | ConvertTo-Json -Depth 5)

Remove-Item -LiteralPath $stage, $extract -Recurse -Force

)
$excludedDirectoryPatterns = @(
    '(^|/)(node_modules|\.git|\.cache|coverage|release-artifacts|persistence-recovery|tournament-state|live-discord-state)(/|$)',
    '(^|/)provenance/input-archives(/|$)',
    '(^|/)docs/source-baselines(/|$)',
    '(^|/)docs/source-inputs(/|$)'
)

$included = @()
foreach ($relativePath in $tracked) {
    $normalizedPath = $relativePath -replace '\\', '/'
    if ($normalizedPath -match '(^|/)\.env($|\.)') {
        continue
    }
    if ($excludedReviewAssets -contains $normalizedPath) {
        continue
    }
    $excluded = $false
    foreach ($pattern in $excludedDirectoryPatterns) {
        if ($normalizedPath -match $pattern) {
            $excluded = $true
            break
        }
    }
    if ($excluded) {
        continue
    }

    $sourcePath = Join-Path $ProjectRoot $relativePath
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
        throw "Missing tracked file: $relativePath"
    }
    $destinationPath = Join-Path $stage $relativePath
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destinationPath) | Out-Null
    Copy-Item -LiteralPath $sourcePath -Destination $destinationPath
    $included += $normalizedPath
}

if (($included -notcontains 'package.json') -or ($included -notcontains 'package-lock.json')) {
    throw 'Node package manifests are missing from the release package.'
}

$manuals = @(
    @{
        Source = Join-Path $OutputRoot 'DWBOT_LOCAL_OPERATIONS_AND_RELEASE_VERIFICATION_MANUAL_2026-11-04.pdf'
        Relative = 'docs/iteration23/DWBOT_LOCAL_OPERATIONS_AND_RELEASE_VERIFICATION_MANUAL_2026-11-04.pdf'
    },
    @{
        Source = Join-Path $OutputRoot 'DWBOT_USER_MANUAL.pdf'
        Relative = 'docs/user/DWBOT_USER_MANUAL.pdf'
    }
)
foreach ($manual in $manuals) {
    if (-not (Test-Path -LiteralPath $manual.Source -PathType Leaf)) {
        throw "Rendered PDF manual is missing: $($manual.Source)"
    }
    $destination = Join-Path $stage $manual.Relative
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
    Copy-Item -LiteralPath $manual.Source -Destination $destination
    $included += $manual.Relative
}

$entries = @(
    $included | Sort-Object -Unique | ForEach-Object {
        $filePath = Join-Path $stage $_
        [pscustomobject]@{
            path = $_
            sizeBytes = (Get-Item -LiteralPath $filePath).Length
            sha256 = (Get-FileHash -LiteralPath $filePath -Algorithm SHA256).Hash.ToLowerInvariant()
        }
    }
)
$manifest = [ordered]@{
    schemaVersion = 1
    sourceBranch = $branch
    sourceCommit = $commit
    createdAt = (Get-Date).ToUniversalTime().ToString('o')
    excluded = @(
        '.env files and credentials',
        'node_modules, .git, cache, coverage, and generated release artifacts',
        'runtime state and persistence-recovery databases',
        'provenance/input-archives, docs/source-baselines, and docs/source-inputs',
        'review-only workbook, inventory, and DOCX source assets retained in the repository'
    )
    files = $entries
}
$manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $stage 'RELEASE_PACKAGE_MANIFEST.json') -Encoding utf8

$archiveInputs = @(Get-ChildItem -LiteralPath $stage -Force | Select-Object -ExpandProperty FullName)
Compress-Archive -Path $archiveInputs -DestinationPath $zip -CompressionLevel Optimal
$zipHash = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()
"$zipHash  $(Split-Path -Leaf $zip)" | Set-Content -LiteralPath ($zip + '.sha256') -Encoding ascii

Expand-Archive -LiteralPath $zip -DestinationPath $extract
$listed = @(& tar.exe -tf $zip)
if ($LASTEXITCODE -ne 0) {
    throw 'ZIP integrity verification failed.'
}
$extractedManifestPath = Join-Path $extract 'RELEASE_PACKAGE_MANIFEST.json'
$extractedManifest = Get-Content -LiteralPath $extractedManifestPath -Raw | ConvertFrom-Json
$bad = @()
foreach ($entry in $extractedManifest.files) {
    $filePath = Join-Path $extract $entry.path
    if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
        $bad += "Missing $($entry.path)"
        continue
    }
    $item = Get-Item -LiteralPath $filePath
    $hash = (Get-FileHash -LiteralPath $filePath -Algorithm SHA256).Hash.ToLowerInvariant()
    if (($item.Length -ne $entry.sizeBytes) -or ($hash -ne $entry.sha256)) {
        $bad += "Mismatch $($entry.path)"
    }
}
if ($bad.Count -gt 0) {
    throw ($bad -join [Environment]::NewLine)
}

$forbidden = @(
    Get-ChildItem -LiteralPath $extract -Force -Recurse |
        Where-Object {
            $_.FullName -match '[\\/]node_modules([\\/]|$)' -or
            $_.Name -eq '.env' -or
            $_.Name -match '^\.env\.'
        }
)
if ($forbidden.Count -gt 0) {
    throw 'Forbidden dependency or environment-secret path found in release package.'
}

Push-Location $extract
try {
    & npm.cmd ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'npm ci failed in extracted package.' }
    & npm.cmd test
    if ($LASTEXITCODE -ne 0) { throw 'npm test failed in extracted package.' }
    & npm.cmd run test:prelive
    if ($LASTEXITCODE -ne 0) { throw 'prelive verification failed in extracted package.' }
}
finally {
    Pop-Location
}

$verification = [ordered]@{
    sourceBranch = $branch
    sourceCommit = $commit
    zip = $zip
    zipSha256 = $zipHash
    sourceFiles = $included.Count
    manifestEntries = @($extractedManifest.files).Count
    zipEntries = $listed.Count
    manifestVerified = $true
    cleanExtraction = $true
    npmCi = 'PASS'
    npmTest = 'PASS'
    prelive = 'PASS'
    passed = $true
}
$verification | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $OutputRoot 'release-package-verification.json') -Encoding utf8
Write-Host ($verification | ConvertTo-Json -Depth 5)

Remove-Item -LiteralPath $stage, $extract -Recurse -Force

[CmdletBinding()]
param(
    [string]$ProjectRoot = '',
    [string]$OutputRoot = '',
    [switch]$SkipInstall,
    [switch]$RunLiveMultiProviderSmoke
)
$ErrorActionPreference = 'Stop'
$MinimumNodeVersion = [version]'24.17.0'
if ([string]::IsNullOrWhiteSpace($ProjectRoot)) {
    $ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
} else {
    $ProjectRoot = (Resolve-Path $ProjectRoot).Path
}
if (-not (Test-Path (Join-Path $ProjectRoot 'package.json')) -or -not (Test-Path (Join-Path $ProjectRoot 'package-lock.json'))) {
    throw 'ProjectRoot must contain package.json and package-lock.json.'
}
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    $OutputRoot = Join-Path $ProjectRoot (Join-Path 'testdata\windows-ocr-acceptance' $stamp)
} elseif (-not [System.IO.Path]::IsPathRooted($OutputRoot)) {
    $OutputRoot = Join-Path $ProjectRoot $OutputRoot
}
New-Item -ItemType Directory -Force -Path $OutputRoot | Out-Null
$OutputRoot = (Resolve-Path $OutputRoot).Path
$nodeText = (& node --version).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Node.js is not available on PATH.' }
$nodeVersion = [version]($nodeText.TrimStart('v'))
if ($nodeVersion -lt $MinimumNodeVersion) {
    throw ('Node.js {0} is below the required minimum {1}.' -f $nodeVersion, $MinimumNodeVersion)
}
$npmCommand = Get-Command npm.cmd -ErrorAction Stop
$npmVersion = (& $npmCommand.Source --version).Trim()
if ($LASTEXITCODE -ne 0) { throw 'npm version query failed.' }

# Default acceptance is local/offline. Online providers run only in the
# separately selected smoke step, never across the screenshot corpus.
$env:DWBOT_MULTI_PROVIDER_ENABLED = '0'
$env:OCRSPACE_ENABLED = '0'
$env:OCRSPACE_NETWORK_ALLOWLIST = '0'
$env:AZURE_DOCUMENT_INTELLIGENCE_ENABLED = '0'
$env:AZURE_DOCUMENT_INTELLIGENCE_NETWORK_ALLOWLIST = '0'
$env:OCR_NON_OCR_NETWORK_RESTRICTED = '0'
$script:ProjectRoot = $ProjectRoot
$script:NpmPath = $npmCommand.Source
$script:OutputRoot = $OutputRoot
$script:Results = @()
$failed = $false

function Invoke-NpmStep {
    param([string]$Label, [string[]]$Arguments)
    $safe = $Label -replace '[^A-Za-z0-9_-]', '-'
    $stdout = Join-Path $script:OutputRoot ($safe + '.stdout.log')
    $stderr = Join-Path $script:OutputRoot ($safe + '.stderr.log')
    $combined = Join-Path $script:OutputRoot ($safe + '.log')
    $process = Start-Process -FilePath $script:NpmPath -ArgumentList $Arguments -WorkingDirectory $script:ProjectRoot -NoNewWindow -Wait -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
    $outText = if (Test-Path $stdout) { Get-Content -Raw -LiteralPath $stdout } else { '' }
    $errText = if (Test-Path $stderr) { Get-Content -Raw -LiteralPath $stderr } else { '' }
    $nl = [Environment]::NewLine
    $body = ('COMMAND: npm {0}' -f ($Arguments -join ' ')) + $nl + ('EXIT: {0}' -f $process.ExitCode) + $nl + '--- stdout ---' + $nl + $outText + $nl + '--- stderr ---' + $nl + $errText
    Set-Content -LiteralPath $combined -Value $body -Encoding utf8
    $script:Results += [pscustomobject]@{
        label = $Label
        arguments = $Arguments
        exitCode = $process.ExitCode
        passed = ($process.ExitCode -eq 0)
        log = $combined
    }
    $state = if ($process.ExitCode -eq 0) { 'PASS' } else { 'FAIL' }
    Write-Host ('[{0}] {1} (exit {2})' -f $state, $Label, $process.ExitCode)
    return ($process.ExitCode -eq 0)
}

$started = (Get-Date).ToUniversalTime().ToString('o')
if (-not $SkipInstall) {
    if (-not (Invoke-NpmStep -Label 'npm-ci' -Arguments @('ci', '--no-audit', '--no-fund'))) { $failed = $true }
}
if (-not $failed) {
    if (-not (Invoke-NpmStep -Label 'persistence-recovery' -Arguments @('run', 'test:persistence-recovery'))) { $failed = $true }
}
if (-not $failed) {
    if (-not (Invoke-NpmStep -Label 'offline-full-suite' -Arguments @('test'))) { $failed = $true }
}
if ($RunLiveMultiProviderSmoke -and -not $failed) {
    $env:DWBOT_MULTI_PROVIDER_ENABLED = '1'
    $env:OCRSPACE_ENABLED = '1'
    $env:OCRSPACE_NETWORK_ALLOWLIST = '1'
    $env:AZURE_DOCUMENT_INTELLIGENCE_ENABLED = '1'
    $env:AZURE_DOCUMENT_INTELLIGENCE_NETWORK_ALLOWLIST = '1'
    $env:AZURE_DOCUMENT_INTELLIGENCE_TIER = 'F0'
    $env:OCR_NON_OCR_NETWORK_RESTRICTED = '1'
    $env:OCR_NON_OCR_NETWORK_LOG = Join-Path $OutputRoot 'provider-network-blocked-attempts.log'
    $env:DWBOT_MULTI_PROVIDER_IMAGE_PATH = 'fixtures/four-screenshots/asashio-defeat.jpg'
    if (-not (Invoke-NpmStep -Label 'explicit-live-multi-provider-smoke' -Arguments @('run', 'smoke:multi-provider'))) { $failed = $true }
}
$sourceCommit = $null
$sourceBranch = $null
try { $sourceCommit = (& git -C $ProjectRoot rev-parse HEAD 2>$null).Trim() } catch {}
try { $sourceBranch = (& git -C $ProjectRoot branch --show-current 2>$null).Trim() } catch {}
$lockHash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $ProjectRoot 'package-lock.json')).Hash.ToLowerInvariant()
$packageHash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $ProjectRoot 'package.json')).Hash.ToLowerInvariant()
$report = [ordered]@{
    schemaVersion = 1
    createdAt = (Get-Date).ToUniversalTime().ToString('o')
    startedAt = $started
    sourceCommit = $sourceCommit
    sourceBranch = $sourceBranch
    nodeVersion = $nodeText
    npmVersion = $npmVersion
    minimumNodeVersion = $MinimumNodeVersion.ToString()
    packageJsonSha256 = $packageHash
    packageLockSha256 = $lockHash
    providerSmokeRequested = [bool]$RunLiveMultiProviderSmoke
    defaultAcceptanceNetworkMode = 'local-only'
    results = $script:Results
    passed = (-not $failed) -and (@($script:Results | Where-Object { -not $_.passed }).Count -eq 0)
}
$reportPath = Join-Path $OutputRoot 'windows-ocr-acceptance-report.json'
$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $reportPath -Encoding utf8
Write-Host ('Report: {0}' -f $reportPath)
if (-not $report.passed) { exit 1 }

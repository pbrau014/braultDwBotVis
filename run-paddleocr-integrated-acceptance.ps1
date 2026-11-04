[CmdletBinding()]
param(
    [string]$ProjectRoot = (Get-Location).Path,
    [string]$RuntimeRoot = (Join-Path $env:LOCALAPPDATA 'WoWSYOLO\PaddleOCR'),
    [int]$MaxCropsPerImage = 7,
    [int]$FallbackTimeoutMs = 15000,
    [int]$ImageTimeoutMs = 95000
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$Python = Join-Path $RuntimeRoot 'venv\Scripts\python.exe'
$DetModel = Join-Path $RuntimeRoot 'models\PP-OCRv6_medium_det'
$RecModel = Join-Path $RuntimeRoot 'models\PP-OCRv6_medium_rec'
$RegressionScript = Join-Path $ProjectRoot 'scripts\run-additional-screenshot-regression.js'
$Comparator = Join-Path $ProjectRoot 'scripts\compare-paddleocr-integrated-acceptance.js'
$Manifest = Join-Path $ProjectRoot 'testdata\additional-screenshot-ground-truth.json'
$AcceptanceDir = Join-Path $ProjectRoot 'testdata\ocr-acceptance'

$BaselineNetworkLog = Join-Path $AcceptanceDir 'baseline-blocked-network-attempts.log'
$CandidateNetworkLog = Join-Path $AcceptanceDir 'candidate-blocked-network-attempts.log'

foreach ($file in @((Join-Path $ProjectRoot 'package.json'), $Manifest, $RegressionScript, $Comparator)) {
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Expected project file not found: $file" }
}
foreach ($required in @($Python, $DetModel, $RecModel)) {
    if (-not (Test-Path -LiteralPath $required)) { throw "Local PaddleOCR prerequisite not found: $required" }
}
$NodeVersionText = (& node.exe -p 'process.versions.node').Trim()
if ($LASTEXITCODE -ne 0) { throw 'Could not determine the active Node.js runtime.' }
try {
    $NodeRuntime = [version]::Parse($NodeVersionText)
} catch {
    throw "The active Node.js version '$NodeVersionText' is not a valid stable version string."
}
if ($NodeRuntime -lt [version]'22.16.0') {
    throw "Node.js 22.16.0 or newer is required for this benchmark; found '$NodeVersionText'."
}
$RuntimeLabel = $NodeVersionText -replace '[^0-9A-Za-z.-]', '_'
$Baseline = Join-Path $AcceptanceDir "tesseract-only-baseline-windows-node$RuntimeLabel.json"
$Candidate = Join-Path $AcceptanceDir "paddleocr-integrated-acceptance-windows-node$RuntimeLabel.json"
$Comparison = Join-Path $AcceptanceDir "paddleocr-integrated-comparison-windows-node$RuntimeLabel.json"
New-Item -ItemType Directory -Force -Path $AcceptanceDir | Out-Null
Remove-Item -LiteralPath $BaselineNetworkLog, $CandidateNetworkLog -Force -ErrorAction SilentlyContinue

$env:PADDLEOCR_PYTHON_BIN = $Python
$env:PADDLEOCR_DET_MODEL_DIR = $DetModel
$env:PADDLEOCR_REC_MODEL_DIR = $RecModel
$env:PADDLEOCR_FIELD_FALLBACK_MAX_CROPS = [string][Math]::Max(1, [Math]::Min(7, $MaxCropsPerImage))
$env:PADDLEOCR_FIELD_FALLBACK_TIMEOUT_MS = [string][Math]::Max(1000, [Math]::Min(15000, $FallbackTimeoutMs))
$env:OCR_IMAGE_TIMEOUT_MS = [string][Math]::Max(30000, $ImageTimeoutMs)
$env:OCR_NETWORK_BLOCK_ENABLED = '1'
$env:OCR_SAVE_RAW_DIAGNOSTICS = '1'

# Capture the control and candidate on the same Windows host, Node runtime, engine,
# image order, manifest, and model/config environment. Historical Linux reports remain
# available but are not used as the paired runtime control for this comparison.
$env:PADDLEOCR_FIELD_FALLBACK = '0'
$env:OCR_SEQUENCE_REPORT_PATH = $Baseline
$env:OCR_NETWORK_BLOCK_LOG = $BaselineNetworkLog
Write-Host "Running the 16-image Windows Node $NodeVersionText Tesseract-only control..." -ForegroundColor Cyan
& node.exe $RegressionScript
$BaselineExit = $LASTEXITCODE
if (-not (Test-Path -LiteralPath $Baseline -PathType Leaf)) { throw "Tesseract-only control did not produce a report: $Baseline" }
$BaselineObject = Get-Content -LiteralPath $Baseline -Raw | ConvertFrom-Json
if ($BaselineObject.imageCount -ne 16 -or $BaselineObject.completedImages -ne 16 -or $BaselineObject.networkBlocked -ne $true) {
    throw 'Tesseract-only control is incomplete or does not prove that the Node network guard was enabled.'
}
if ((Test-Path -LiteralPath $BaselineNetworkLog) -and (Get-Item -LiteralPath $BaselineNetworkLog).Length -gt 0) {
    throw "Network attempts were blocked during the Tesseract-only control; inspect $BaselineNetworkLog before continuing."
}
if ($BaselineExit -ne 0) {
    Write-Warning 'The Tesseract-only control has known exact-field failures. Its complete report is retained and will be used as the same-host accuracy baseline.'
}

$env:PADDLEOCR_FIELD_FALLBACK = '1'
$env:OCR_SEQUENCE_REPORT_PATH = $Candidate
$env:OCR_NETWORK_BLOCK_LOG = $CandidateNetworkLog
Write-Host "Running the 16-image local PaddleOCR field-crop candidate..." -ForegroundColor Cyan
Write-Host 'PaddleOCR is enabled for this test process only. Python sockets and the Node worker network path are blocked.' -ForegroundColor Cyan
& node.exe $RegressionScript
$CandidateExit = $LASTEXITCODE
if (-not (Test-Path -LiteralPath $Candidate -PathType Leaf)) { throw "Hybrid acceptance did not produce a report: $Candidate" }
$CandidateObject = Get-Content -LiteralPath $Candidate -Raw | ConvertFrom-Json
if ($CandidateObject.imageCount -ne 16 -or $CandidateObject.completedImages -ne 16 -or $CandidateObject.networkBlocked -ne $true) {
    throw 'Hybrid acceptance is incomplete or does not prove that the Node network guard was enabled.'
}
if ((Test-Path -LiteralPath $CandidateNetworkLog) -and (Get-Item -LiteralPath $CandidateNetworkLog).Length -gt 0) {
    throw "Network attempts were blocked during the PaddleOCR candidate run; inspect $CandidateNetworkLog. The candidate comparison is not accepted."
}

Write-Host "`nComparing same-host Windows Tesseract-only and hybrid reports..." -ForegroundColor Cyan
& node.exe $Comparator $Baseline $Candidate $Comparison $Manifest
$CompareExit = $LASTEXITCODE
if ($CompareExit -ne 0) { throw "Comparison failed with exit code $CompareExit. Inspect report hashes and field-level rows." }
Write-Host "`nTesseract-only control: $Baseline"
Write-Host "Hybrid candidate:       $Candidate"
Write-Host "Comparison:             $Comparison"
if ($BaselineExit -ne 0 -or $CandidateExit -ne 0) {
    Write-Warning 'At least one exact-field acceptance gate returned nonzero. Review the metrics; do not infer release approval from a completed comparison.'
    exit 1
}
Write-Host 'All 16 records are exact on the development corpus. This is not release authorization; run a fresh holdout and separate native-Tesseract/Discord gates.' -ForegroundColor Green
exit 0

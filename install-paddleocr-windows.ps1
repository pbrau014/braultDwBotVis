[CmdletBinding()]
param(
    [string]$ProjectRoot = (Get-Location).Path,
    [string]$RuntimeRoot = (Join-Path $env:LOCALAPPDATA 'WoWSYOLO\PaddleOCR'),
    [switch]$SkipProjectBenchmark,
    [switch]$RunProjectBenchmark
)
$ErrorActionPreference = 'Stop'

function Invoke-Checked {
    param([string]$Program, [string[]]$Arguments, [string]$Action)
    Write-Host "`n== $Action ==" -ForegroundColor Cyan
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Action failed with exit code $LASTEXITCODE" }
}

$ProjectRoot = (Resolve-Path -LiteralPath $ProjectRoot).Path
$PrepareScript = Join-Path $PSScriptRoot 'prepare_paddleocr_models.py'
if (-not (Test-Path -LiteralPath $PrepareScript)) { throw "Missing helper script: $PrepareScript. Extract the entire installer kit first." }

function Get-PythonExecutable {
    param(
        [Parameter(Mandatory=$true)][string]$CommandPath,
        [string[]]$PrefixArguments = @()
    )
    $SavedPreference = $ErrorActionPreference
    try {
        # Windows PowerShell 5.1 can promote py.exe's stderr ("No suitable Python runtime found")
        # to a terminating error when global ErrorActionPreference is Stop. Treat probes as probes.
        $ErrorActionPreference = 'Continue'
        $ProbeOutput = @(& $CommandPath @PrefixArguments -c 'import os,sys; print(os.path.abspath(sys.executable))' 2>&1)
        $ProbeExitCode = $LASTEXITCODE
    } catch {
        $ProbeOutput = @()
        $ProbeExitCode = 1
    } finally {
        $ErrorActionPreference = $SavedPreference
    }
    if ($ProbeExitCode -ne 0) { return $null }
    foreach ($Line in $ProbeOutput) {
        $Candidate = ([string]$Line).Trim()
        if ($Candidate -match '^[A-Za-z]:\\.*python\.exe$' -and (Test-Path -LiteralPath $Candidate -PathType Leaf)) {
            return (Resolve-Path -LiteralPath $Candidate).Path
        }
    }
    return $null
}

function Find-CompatiblePython {
    $Launcher = Get-Command py.exe -ErrorAction SilentlyContinue
    if ($Launcher) {
        foreach ($Version in @('3.12','3.13','3.11','3.10','3.9')) {
            $Candidate = Get-PythonExecutable -CommandPath $Launcher.Source -PrefixArguments @("-$Version")
            if ($Candidate) { return $Candidate }
        }
    }
    $PythonCommand = Get-Command python.exe -ErrorAction SilentlyContinue
    if ($PythonCommand) {
        $Candidate = Get-PythonExecutable -CommandPath $PythonCommand.Source
        if ($Candidate) { return $Candidate }
    }
    # Probe the conventional per-user and per-machine Python 3.12 locations even if PATH
    # has not been refreshed in this PowerShell session.
    $KnownPaths = @(
        (Join-Path $env:LOCALAPPDATA 'Programs\Python\Python312\python.exe'),
        (Join-Path $env:ProgramFiles 'Python312\python.exe')
    )
    foreach ($KnownPath in $KnownPaths) {
        if (Test-Path -LiteralPath $KnownPath -PathType Leaf) {
            $Candidate = Get-PythonExecutable -CommandPath $KnownPath
            if ($Candidate) { return $Candidate }
        }
    }
    return $null
}

$BasePython = Find-CompatiblePython
if (-not $BasePython) {
    Write-Host 'No supported Python runtime was found. PaddlePaddle requires 64-bit Python 3.9-3.13 on Windows.' -ForegroundColor Yellow
    $WingetCommand = Get-Command winget.exe -ErrorAction SilentlyContinue
    if ($WingetCommand) {
        $InstallAnswer = Read-Host 'Install Python 3.12 x64 for this Windows user with winget now? [Y/N]'
        if ($InstallAnswer -match '^(Y|YES)$') {
            Write-Host 'Installing Python 3.12 using the official Python winget package...' -ForegroundColor Cyan
            $SavedPreference = $ErrorActionPreference
            try {
                $ErrorActionPreference = 'Continue'
                & $WingetCommand.Source install --id Python.Python.3.12 --exact --scope user --accept-source-agreements --accept-package-agreements
                $WingetExitCode = $LASTEXITCODE
            } catch {
                $WingetExitCode = 1
                Write-Warning $_.Exception.Message
            } finally {
                $ErrorActionPreference = $SavedPreference
            }
            if ($WingetExitCode -ne 0) {
                throw "Python installation through winget failed (exit $WingetExitCode). Run: winget install --id Python.Python.3.12 --exact --scope user"
            }
            $BasePython = Find-CompatiblePython
        }
    }
}
if (-not $BasePython) {
    throw 'No compatible Python runtime is installed. Install 64-bit Python 3.12 with: winget install --id Python.Python.3.12 --exact --scope user --accept-source-agreements --accept-package-agreements . Then close and reopen PowerShell and rerun this installer.'
}

$PythonInfo = (& $BasePython -c "import platform,struct,sys; print('%s|%d|%s' % ('.'.join(map(str,sys.version_info[:2])),struct.calcsize('P')*8,platform.machine()))" | Select-Object -Last 1).Trim()
$Parts = $PythonInfo -split '\|'
if ($Parts.Count -ne 3) { throw "Could not identify Python architecture: $PythonInfo" }
$PyVersion = [version]($Parts[0] + '.0')
if ($PyVersion -lt [version]'3.9.0' -or $PyVersion -ge [version]'3.14.0') { throw "Supported Python is 3.9-3.13; selected $($Parts[0]). Install/select Python 3.12 or 3.13." }
if ($Parts[1] -ne '64' -or $Parts[2] -notmatch 'AMD64|x86_64|x64') { throw "PaddlePaddle CPU wheels require x64 64-bit Python. Detected $PythonInfo" }

$Venv = Join-Path $RuntimeRoot 'venv'
$ModelsRoot = Join-Path $RuntimeRoot 'models'
New-Item -ItemType Directory -Force -Path $RuntimeRoot, $ModelsRoot | Out-Null
if (-not (Test-Path -LiteralPath (Join-Path $Venv 'Scripts\python.exe'))) {
    Invoke-Checked $BasePython @('-m','venv',$Venv) 'Create isolated PaddleOCR virtual environment'
}
$VenvPython = Join-Path $Venv 'Scripts\python.exe'
Invoke-Checked $VenvPython @('-m','pip','install','--upgrade','pip') 'Upgrade pip in the isolated environment'
Invoke-Checked $VenvPython @('-m','pip','install','--only-binary=:all:','paddlepaddle==3.3.1') 'Install PaddlePaddle 3.3.1 CPU wheel'
Invoke-Checked $VenvPython @('-m','pip','install','paddleocr==3.7.0') 'Install PaddleOCR 3.7.0'

# Work around the documented PaddlePaddle 3.3.0/3.3.1 CPU oneDNN/PIR inference failure.
# Disable oneDNN for this setup and subsequent local PaddleX/PaddleOCR runs. CPU inference
# may be slower, but this avoids the ConvertPirAttribute2RuntimeAttribute crash.
$env:PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT = 'False'
[Environment]::SetEnvironmentVariable('PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT', 'False', 'User')
# All network use below is static package/model download during provisioning only.
# Runtime inference and the final smoke test use copied model directories explicitly.
$env:PADDLE_PDX_MODEL_SOURCE = 'BOS'
Invoke-Checked $VenvPython @($PrepareScript,'--models-dir',$ModelsRoot) 'Download official English PP-OCRv6 models and verify local-only inference'

$DetDir = Join-Path $ModelsRoot 'PP-OCRv6_medium_det'
$RecDir = Join-Path $ModelsRoot 'PP-OCRv6_medium_rec'
foreach ($Pair in @(@('PADDLEOCR_PYTHON_BIN',$VenvPython), @('PADDLEOCR_DET_MODEL_DIR',$DetDir), @('PADDLEOCR_REC_MODEL_DIR',$RecDir), @('PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT','False'))) {
    [Environment]::SetEnvironmentVariable($Pair[0], $Pair[1], 'User')
    Set-Item -Path ("Env:" + $Pair[0]) -Value $Pair[1]
}

$Manifest = Join-Path $RuntimeRoot 'install-manifest.json'
# Read the metadata written by the already-verified Python helper instead of passing
# JSON/dictionary literals through powershell.exe native -c argument quoting. This
# avoids Windows PowerShell 5.1 stripping quotes and emitting NameError: python.
$ModelManifestPath = Join-Path $ModelsRoot 'paddleocr-model-manifest.json'
if (-not (Test-Path -LiteralPath $ModelManifestPath -PathType Leaf)) {
    throw "Model manifest is missing after offline verification: $ModelManifestPath"
}
$ModelManifest = Get-Content -LiteralPath $ModelManifestPath -Raw | ConvertFrom-Json
$InstalledRuntime = $ModelManifest.runtime
if (-not $InstalledRuntime -or -not $InstalledRuntime.paddlepaddle -or -not $InstalledRuntime.paddleocr) {
    throw "Model manifest does not contain Paddle package versions: $ModelManifestPath"
}
$ManifestObject = [ordered]@{
    status = 'installed-and-offline-verified'
    projectRoot = $ProjectRoot
    runtimeRoot = $RuntimeRoot
    python = $VenvPython
    installedPackages = $InstalledRuntime
    detectionModelDir = $DetDir
    recognitionModelDir = $RecDir
    modelManifest = $ModelManifestPath
    externalInferenceApisEnabled = $false
    modelFamily = 'PP-OCRv6 English medium'
    provisionedUtc = [DateTime]::UtcNow.ToString('o')
}
$ManifestObject | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $Manifest -Encoding utf8

Write-Host "`nPaddleOCR is installed and locally model-staged." -ForegroundColor Green
Write-Host "Python: $VenvPython"
Write-Host "Models: $ModelsRoot"
Write-Host "User environment variables set: PADDLEOCR_PYTHON_BIN, PADDLEOCR_DET_MODEL_DIR, PADDLEOCR_REC_MODEL_DIR"
Write-Host "Restart PowerShell/terminal windows for persistent user variables to appear in new sessions."

$Benchmark = Join-Path $ProjectRoot 'scripts\run-offline-paddleocr-benchmark.js'
if ($RunProjectBenchmark -and -not $SkipProjectBenchmark -and (Test-Path -LiteralPath $Benchmark)) {
    Push-Location $ProjectRoot
    try {
        Write-Host "`n== Run local-only PaddleOCR raw benchmark ==" -ForegroundColor Cyan
        & node.exe $Benchmark
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Installation succeeded, but the project's OCR benchmark exited $LASTEXITCODE. Inspect testdata\ocr-acceptance\paddleocr-raw-benchmark.json."
        }
    } finally { Pop-Location }
}
Write-Host "Install manifest: $Manifest"

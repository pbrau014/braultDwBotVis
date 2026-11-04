[CmdletBinding()]
param(
 [string]$ProjectRoot = '',
 [string]$OutputRoot = '',
 [string]$MinimumNodeVersion = '24.22.1'
)
$ErrorActionPreference='Stop'
if ([string]::IsNullOrWhiteSpace($ProjectRoot)) { $ProjectRoot = (Get-Location).Path }
$ProjectRoot=(Resolve-Path -LiteralPath $ProjectRoot).Path
if ([string]::IsNullOrWhiteSpace($OutputRoot)) { $OutputRoot = Join-Path $ProjectRoot 'testdata\ocr-acceptance' }
$OutputRoot=[System.IO.Path]::GetFullPath($OutputRoot)
Push-Location $ProjectRoot
try {
 $NodeText=(& node.exe -p 'process.versions.node').Trim()
 if($LASTEXITCODE -ne 0){throw 'Could not determine Node.js version.'}
 if([version]::Parse($NodeText) -lt [version]::Parse($MinimumNodeVersion)){throw "Node.js $MinimumNodeVersion or newer is required. Found $NodeText."}
 $NpmVersion=(& npm.cmd --version).Trim()
 if($LASTEXITCODE -ne 0){throw 'Could not determine npm version.'}
 $TessName='tesseract.exe'; if($env:TESSERACT_BIN){$TessName=$env:TESSERACT_BIN}
 $MagickName='magick.exe'; if($env:IMAGEMAGICK_BIN){$MagickName=$env:IMAGEMAGICK_BIN}
 $Tess=Get-Command $TessName -ErrorAction Stop
 $Magick=Get-Command $MagickName -ErrorAction Stop
 $TessVersion=(& $Tess.Source --version 2>&1 | Select-Object -First 1).ToString().Trim()
 if($TessVersion -notmatch '^tesseract\s+v?5\.'){throw "Native Tesseract 5.x required; found $TessVersion"}
 $LanguageLines=@(& $Tess.Source --list-langs 2>&1)
 $LanguageExit=$LASTEXITCODE
 $Languages=($LanguageLines | ForEach-Object { $_.ToString().Trim() }) -join [Environment]::NewLine
 $HasEnglish=@($LanguageLines | ForEach-Object { $_.ToString().Trim() } | Where-Object { $_ -eq 'eng' }).Count -gt 0
 if($LanguageExit -ne 0 -or -not $HasEnglish){throw "Native Tesseract requires English traineddata; languages reported: $Languages"}
 $MagickVersion=(& $Magick.Source -version 2>&1 | Select-Object -First 2) -join [Environment]::NewLine
 if($LASTEXITCODE -ne 0){throw 'ImageMagick version check failed.'}
 $Stamp=(Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
 $RunDir=Join-Path $OutputRoot ("windows-native-node"+$NodeText+"-"+$Stamp+"-"+$PID)
 New-Item -ItemType Directory -Force -Path $RunDir | Out-Null
 $env:TESSERACT_BIN=$Tess.Source
 $env:IMAGEMAGICK_BIN=$Magick.Source
 $env:PADDLEOCR_FIELD_FALLBACK='0'
 $env:OCR_CV_ASSIST='0'
 $env:OCRSPACE_ENABLED='0'
 $env:OCR_NETWORK_BLOCK_ENABLED='1'
 $Guard=Join-Path $ProjectRoot 'scripts\block-network.js'
 $env:NODE_OPTIONS=(($env:NODE_OPTIONS+' --require "'+$Guard+'"').Trim())
 $script:Results=@()
 function Invoke-LoggedNpm {
  param([string]$Label,[string[]]$Arguments)
  $Log=Join-Path $RunDir ($Label+'.log')
  Write-Host "[WINDOWS-OCR] START $Label"
  ("COMMAND: npm "+($Arguments -join ' ')) | Set-Content -LiteralPath $Log -Encoding utf8
  $PreviousErrorActionPreference=$ErrorActionPreference
  try {
   $ErrorActionPreference='Continue'
   & npm.cmd @Arguments *> $Log
   $Code=$LASTEXITCODE
  } finally { $ErrorActionPreference=$PreviousErrorActionPreference }
  Get-Content -LiteralPath $Log | ForEach-Object { Write-Host $_ }
  $Outcome=if($Code -eq 0){'PASS'}else{'FAIL'}
  $script:Results += [pscustomobject]@{label=$Label;arguments=$Arguments;exitCode=$Code;log=[System.IO.Path]::GetFileName($Log);passed=($Code -eq 0)}
  Write-Host "[WINDOWS-OCR] $Outcome $Label exit=$Code"
 }
 $env:OCR_ENGINE='tesseractjs'
 Invoke-LoggedNpm -Label 'tesseractjs-full-current-source-acceptance' -Arguments @('run','test:tesseractjs')
 $env:OCR_ENGINE='native'
 $env:REPORTED_SCREENSHOT_REPORT_PATH=Join-Path $RunDir 'reported-native.json'
 $env:OCR_NETWORK_BLOCK_LOG=Join-Path $RunDir 'reported-native-network-attempts.log'
 Invoke-LoggedNpm -Label 'native-reported-screenshot' -Arguments @('run','test:reported-screenshot')
 $env:FOUR_SCREENSHOT_REPORT_PATH=Join-Path $RunDir 'four-image-native.json'
 $env:OCR_NETWORK_BLOCK_LOG=Join-Path $RunDir 'four-image-native-network-attempts.log'
 Invoke-LoggedNpm -Label 'native-four-screenshot-acceptance' -Arguments @('run','test:four-images')
 $env:OCR_SEQUENCE_REPORT_PATH=Join-Path $RunDir 'additional-sixteen-native.json'
 $env:OCR_NETWORK_BLOCK_LOG=Join-Path $RunDir 'additional-sixteen-native-network-attempts.log'
 Invoke-LoggedNpm -Label 'native-additional-sixteen-screenshot-acceptance' -Arguments @('run','test:additional-images')
 $NativeReports=@()
 foreach($Name in @('reported-native.json','four-image-native.json','additional-sixteen-native.json')){
  $Path=Join-Path $RunDir $Name
  if(-not(Test-Path -LiteralPath $Path -PathType Leaf)){
   $NativeReports += [pscustomobject]@{name=$Name;exists=$false;exact=$false}; continue
  }
  $Data=Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
  if($Name -eq 'reported-native.json'){
   $Missing=@($Data.requiredMissing).Count
   $Exact=($Data.allExpectedFieldsPass -eq $true) -and ($Data.allRequiredFieldsPass -eq $true) -and ($Missing -eq 0)
   $Count=1; $Done=if($Data.pipelineCompleted -eq $true){1}else{0}
  }else{
   $Expected=if($Name -eq 'four-image-native.json'){4}else{16}
   $Bad=@($Data.results | Where-Object {-not $_.allExpectedFieldsPass -or -not $_.allRequiredFieldsPass -or @($_.requiredMissing).Count -gt 0}).Count
   $Exact=($Data.imageCount -eq $Expected) -and ($Data.completedImages -eq $Expected) -and ($Data.exactMatches -eq $Expected) -and ($Data.mandatoryExactMatches -eq $Expected) -and ($Data.requiredFieldsComplete -eq $Expected) -and ($Bad -eq 0)
   $Count=$Expected; $Done=[int]$Data.completedImages
  }
  $NativeReports += [pscustomobject]@{name=$Name;exists=$true;expectedImages=$Count;completedImages=$Done;exact=[bool]$Exact}
 }
 $NoNetwork=$true
 foreach($Name in @('reported-native-network-attempts.log','four-image-native-network-attempts.log','additional-sixteen-native-network-attempts.log')){
  $Path=Join-Path $RunDir $Name
  if((Test-Path -LiteralPath $Path) -and (Get-Item -LiteralPath $Path).Length -gt 0){$NoNetwork=$false}
 }
 $Commit='not-available'
 try{$Commit=(& git -C $ProjectRoot rev-parse HEAD 2>$null).Trim()}catch{}
 $Version=(& node.exe -p "require('./package.json').version").Trim()
 $Report=[ordered]@{
  schemaVersion=1;createdAt=(Get-Date).ToUniversalTime().ToString('o')
  runtime=[ordered]@{node=$NodeText;npm=$NpmVersion;platform=[System.Runtime.InteropServices.RuntimeInformation]::OSDescription;architecture=[System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()}
  engines=[ordered]@{tesseract=$TessVersion;imageMagick=$MagickVersion;languages=$Languages}
  source=[ordered]@{gitCommit=$Commit;packageVersion=$Version}
  commands=$script:Results;nativeReports=$NativeReports;noNetworkAttempts=$NoNetwork
  passed=(($script:Results.Count -eq 4) -and (@($script:Results|Where-Object{-not $_.passed}).Count -eq 0) -and (@($NativeReports|Where-Object{-not $_.exists -or -not $_.exact}).Count -eq 0) -and $NoNetwork)
 }
 $ReportPath=Join-Path $RunDir 'windows-native-ocr-acceptance-report.json'
 $Report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ReportPath -Encoding utf8
 $Hash=(Get-FileHash -LiteralPath $ReportPath -Algorithm SHA256).Hash.ToLowerInvariant()
 "$Hash  windows-native-ocr-acceptance-report.json" | Set-Content -LiteralPath (Join-Path $RunDir 'windows-native-ocr-acceptance-report.sha256') -Encoding ascii
 Write-Host "[WINDOWS-OCR] Report: $ReportPath"
 Write-Host "[WINDOWS-OCR] SHA-256: $Hash"
 if(-not $Report.passed){Write-Error 'Windows OCR acceptance failed or remains incomplete. Diagnostics are retained; do not weaken exact-value validation.';exit 1}
 Write-Host '[WINDOWS-OCR] PASS: Tesseract.js and native Tesseract exact screenshot gates passed.'
}
finally{Pop-Location}

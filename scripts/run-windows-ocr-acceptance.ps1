[CmdletBinding()]
param(
 [string]$ProjectRoot = '',
 [string]$OutputRoot = '',
 [string]$MinimumNodeVersion = '22.16.0'
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
 $Npm=Get-Command npm.cmd -ErrorAction Stop
 $NpmVersion=(& $Npm.Source --version).Trim()
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
 if(-not $env:OCRSPACE_API_KEY){throw 'OCRSPACE_API_KEY is not available. OCR.Space-first acceptance is blocked; no local-original-image substitute is permitted.'}
 Write-Host 'OCRSPACE_API_KEY configured: yes (value withheld).'
 # Every eligible source screenshot uses OCR.Space Engine 2 PDF-first; local engines read only the retained PDF raster.
 $env:OCRSPACE_ENABLED='1'
 $env:OCRSPACE_NETWORK_ALLOWLIST='1'
 $env:OCRSPACE_ARTIFACT_DIR=Join-Path $RunDir 'ocrspace-searchable-pdfs'
 $env:OCR_NON_OCR_NETWORK_RESTRICTED='1'
 $Guard=(Join-Path $ProjectRoot 'scripts\block-network.js').Replace('\','/')
 $env:NODE_OPTIONS=(($env:NODE_OPTIONS+' --require="'+$Guard+'"').Trim())
 $script:Results=@()
 function Invoke-LoggedNpm {
  param([string]$Label,[string[]]$Arguments)
  $Log=Join-Path $RunDir ($Label+'.log')
  Write-Host "[WINDOWS-OCR] START $Label"
  $OutputLog=$Log+'.stdout.tmp'
  $ErrorLog=$Log+'.stderr.tmp'
  $Process=$null
  $Code=1
  try {
   # Launch npm.cmd through cmd.exe and redirect both child streams at the
   # process boundary. PowerShell 5.1 otherwise promotes native stderr records
   # to terminating NativeCommandError under ErrorActionPreference=Stop,
   # even when npm exits 0 (for example, supervisor close diagnostics).
   $CommandLine='""'+$Npm.Source+'" '+($Arguments -join ' ')+'"'
   $Process=Start-Process -FilePath $env:ComSpec -ArgumentList @('/d','/s','/c',$CommandLine) -Wait -PassThru -NoNewWindow -RedirectStandardOutput $OutputLog -RedirectStandardError $ErrorLog
   $Code=[int]$Process.ExitCode
   $Stdout=if(Test-Path -LiteralPath $OutputLog){Get-Content -LiteralPath $OutputLog -Raw}else{''}
   $Stderr=if(Test-Path -LiteralPath $ErrorLog){Get-Content -LiteralPath $ErrorLog -Raw}else{''}
   @("COMMAND: npm "+($Arguments -join ' '),"EXIT: $Code","--- stdout ---",$Stdout,"--- stderr ---",$Stderr) | Set-Content -LiteralPath $Log -Encoding utf8
   if(-not [string]::IsNullOrWhiteSpace($Stdout)){Write-Host $Stdout}
   if(-not [string]::IsNullOrWhiteSpace($Stderr)){
    Write-Host '--- npm stderr (captured; not a PowerShell failure) ---'
    Write-Host $Stderr
   }
  }
  catch {
   $Failure=$_.Exception.Message
   @("COMMAND: npm "+($Arguments -join ' '),"EXIT: $Code","LAUNCH ERROR: $Failure") | Set-Content -LiteralPath $Log -Encoding utf8
   Write-Host "[WINDOWS-OCR] LAUNCH ERROR $Label $Failure"
   $Code=1
  }
  finally {
   Remove-Item -LiteralPath $OutputLog,$ErrorLog -Force -ErrorAction SilentlyContinue
  }
  $Outcome=if($Code -eq 0){'PASS'}else{'FAIL'}
  $script:Results += [pscustomobject]@{label=$Label;arguments=$Arguments;exitCode=$Code;log=[System.IO.Path]::GetFileName($Log);passed=($Code -eq 0)}
  Write-Host "[WINDOWS-OCR] $Outcome $Label exit=$Code"
 }
 $env:OCRSPACE_ENABLED='1'
 $env:OCRSPACE_NETWORK_ALLOWLIST='1'
 $env:OCR_ENGINE='tesseractjs'
 $env:OCR_ACCEPTANCE_RUN_DIR=Join-Path $RunDir 'tesseractjs-baseline'
 Invoke-LoggedNpm -Label 'tesseractjs-full-current-source-acceptance' -Arguments @('run','test:tesseractjs')
 $BaselineJsReportPath=Join-Path $env:OCR_ACCEPTANCE_RUN_DIR 'acceptance-report.json'
 $BaselineJsReport=$null
 if(Test-Path -LiteralPath $BaselineJsReportPath -PathType Leaf){$BaselineJsReport=Get-Content -LiteralPath $BaselineJsReportPath -Raw | ConvertFrom-Json}
 $env:OCRSPACE_ENABLED='1'
 $env:OCRSPACE_NETWORK_ALLOWLIST='1'
 $env:OCR_ENGINE='native'
 $env:REPORTED_SCREENSHOT_REPORT_PATH=Join-Path $RunDir 'reported-native.json'
 $env:OCR_NON_OCR_NETWORK_LOG=Join-Path $RunDir 'reported-native-network-attempts.log'
 Invoke-LoggedNpm -Label 'native-reported-screenshot' -Arguments @('run','test:reported-screenshot')
 $env:OCRSPACE_ENABLED='1'
 $env:OCRSPACE_NETWORK_ALLOWLIST='1'
 $env:OCRSPACE_ARTIFACT_DIR=Join-Path $RunDir 'native-four-ocrspace-pdfs'
 $env:FOUR_SCREENSHOT_REPORT_PATH=Join-Path $RunDir 'four-image-native.json'
 $env:OCR_NON_OCR_NETWORK_LOG=Join-Path $RunDir 'four-image-native-network-attempts.log'
 Invoke-LoggedNpm -Label 'native-four-screenshot-acceptance' -Arguments @('run','test:four-images')
 $env:OCRSPACE_ENABLED='1'
 $env:OCRSPACE_NETWORK_ALLOWLIST='1'
 $env:OCRSPACE_ARTIFACT_DIR=Join-Path $RunDir 'native-sixteen-ocrspace-pdfs'
 $env:OCR_SEQUENCE_REPORT_PATH=Join-Path $RunDir 'additional-sixteen-native.json'
 $env:OCR_NON_OCR_NETWORK_LOG=Join-Path $RunDir 'additional-sixteen-native-network-attempts.log'
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
 # Run a paired OpenCV geometry-assisted candidate on the same Windows host.
 # The Tesseract-only outputs above remain intact as the control; CV can only
 # propose regions and all accepted values still come from exact Tesseract
 # reads and the unchanged nine-field validators.
 $env:OCR_CV_ASSIST='1'
 $env:OCR_CV_DEBUG='1'
 $env:OCR_ACCEPTANCE_BATCH_REPEATS='1'
 $env:OCRSPACE_ENABLED='1'
 $env:OCRSPACE_NETWORK_ALLOWLIST='1'
 $env:OCR_ACCEPTANCE_RUN_DIR=Join-Path $RunDir 'tesseractjs-cv-assisted'
 $env:OCR_ENGINE='tesseractjs'
 Invoke-LoggedNpm -Label 'cv-assisted-tesseractjs-full-acceptance' -Arguments @('run','test:tesseractjs')
 $CvJsReportPath=Join-Path $env:OCR_ACCEPTANCE_RUN_DIR 'acceptance-report.json'
 $CvJsReport=$null
 $CvJsExact=$false
 if(Test-Path -LiteralPath $CvJsReportPath -PathType Leaf){
  $CvJsReport=Get-Content -LiteralPath $CvJsReportPath -Raw | ConvertFrom-Json
  $CvJsExact=($CvJsReport.passed -eq $true) -and ($CvJsReport.networkIsolation.nonOcrDeniedAttemptsDetected -eq $false)
 }
 $env:OCRSPACE_ENABLED='1'
 $env:OCRSPACE_NETWORK_ALLOWLIST='1'
 $env:OCR_ENGINE='native'
 $env:REPORTED_SCREENSHOT_REPORT_PATH=Join-Path $RunDir 'reported-native-cv.json'
 $env:OCR_NON_OCR_NETWORK_LOG=Join-Path $RunDir 'reported-native-cv-network-attempts.log'
 Invoke-LoggedNpm -Label 'cv-assisted-native-reported-screenshot' -Arguments @('run','test:reported-screenshot')
 $env:OCRSPACE_ENABLED='1'
 $env:OCRSPACE_NETWORK_ALLOWLIST='1'
 $env:OCRSPACE_ARTIFACT_DIR=Join-Path $RunDir 'native-cv-four-ocrspace-pdfs'
 $env:FOUR_SCREENSHOT_REPORT_PATH=Join-Path $RunDir 'four-image-native-cv.json'
 $env:OCR_NON_OCR_NETWORK_LOG=Join-Path $RunDir 'four-image-native-cv-network-attempts.log'
 Invoke-LoggedNpm -Label 'cv-assisted-native-four-screenshot-acceptance' -Arguments @('run','test:four-images')
 $env:OCRSPACE_ENABLED='1'
 $env:OCRSPACE_NETWORK_ALLOWLIST='1'
 $env:OCRSPACE_ARTIFACT_DIR=Join-Path $RunDir 'native-cv-sixteen-ocrspace-pdfs'
 $env:OCR_SEQUENCE_REPORT_PATH=Join-Path $RunDir 'additional-sixteen-native-cv.json'
 $env:OCR_NON_OCR_NETWORK_LOG=Join-Path $RunDir 'additional-sixteen-native-cv-network-attempts.log'
 Invoke-LoggedNpm -Label 'cv-assisted-native-additional-sixteen-acceptance' -Arguments @('run','test:additional-images')
 $CvNativeReports=@()
 foreach($Name in @('reported-native-cv.json','four-image-native-cv.json','additional-sixteen-native-cv.json')){
  $Path=Join-Path $RunDir $Name
  if(-not(Test-Path -LiteralPath $Path -PathType Leaf)){
   $CvNativeReports += [pscustomobject]@{name=$Name;exists=$false;exact=$false}; continue
  }
  $Data=Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
  if($Name -eq 'reported-native-cv.json'){
   $Missing=@($Data.requiredMissing).Count
   $Exact=($Data.pipelineCompleted -eq $true) -and ($Data.allExpectedFieldsPass -eq $true) -and ($Data.allRequiredFieldsPass -eq $true) -and ($Missing -eq 0)
   $Count=1; $Done=if($Data.pipelineCompleted -eq $true){1}else{0}
  }else{
   $Expected=if($Name -eq 'four-image-native-cv.json'){4}else{16}
   $Bad=@($Data.results | Where-Object {-not $_.allExpectedFieldsPass -or -not $_.allRequiredFieldsPass -or @($_.requiredMissing).Count -gt 0}).Count
   $Exact=($Data.imageCount -eq $Expected) -and ($Data.completedImages -eq $Expected) -and ($Data.exactMatches -eq $Expected) -and ($Data.mandatoryExactMatches -eq $Expected) -and ($Data.requiredFieldsComplete -eq $Expected) -and ($Bad -eq 0)
   $Count=$Expected; $Done=[int]$Data.completedImages
  }
  $CvNativeReports += [pscustomobject]@{name=$Name;exists=$true;expectedImages=$Count;completedImages=$Done;exact=[bool]$Exact}
 }
 $Inventory64ExtractionComplete=$false
 $Inventory64=[ordered]@{status='BLOCKED';imageCount=64;eligibleCount=56;eligibleProcessed=0;completedImages=0;excludedCount=8;excludedSkipped=0;completedInventoryEntries=0;sourceMemberHashesVerified=0;allSourceMembersVerifiedBeforeProvider=$false;resultCount=0;excludedRecordCount=0;exactAccuracy='NOT_EVALUABLE_NO_INDEPENDENT_GROUND_TRUTH'}
 if($env:OCRSPACE_64_ARCHIVE_PATH -and $env:OCRSPACE_64_IMAGE_ROOT){
  $env:OCRSPACE_ENABLED='1'
  $env:OCRSPACE_NETWORK_ALLOWLIST='1'
  $env:OCRSPACE_64_OUTPUT_DIR=Join-Path $env:TEMP ('dwbot-ocrspace-64-' + $PID)
  $env:OCR_NON_OCR_NETWORK_LOG=Join-Path $RunDir 'ocrspace-64-network-attempts.log'
  Invoke-LoggedNpm -Label 'ocrspace-64-inventory-pdf-first' -Arguments @('run','test:ocrspace-64')
  $Inventory64Path=Join-Path $env:OCRSPACE_64_OUTPUT_DIR 'ocrspace-64-inventory-report.json'
  if(Test-Path -LiteralPath $Inventory64Path -PathType Leaf){
   $Inventory64Data=Get-Content -LiteralPath $Inventory64Path -Raw | ConvertFrom-Json
   $EligibleRows=@($Inventory64Data.results)
   $ExcludedRows=@($Inventory64Data.excludedRecords)
   $InvalidEligibleRows=@($EligibleRows | Where-Object {
    $_.provider -ne 'ocr.space' -or $_.providerEngine -ne 2 -or
    $_.sourceSha256 -notmatch '^[a-f0-9]{64}$' -or $_.pdfSha256 -notmatch '^[a-f0-9]{64}$' -or
    [int]$_.pdfBytes -le 0 -or [int]$_.rasterBytes -le 0 -or
    -not $_.artifacts.pdf -or -not $_.artifacts.raster -or @($_.localReaders).Count -ne 2
   })
   $InvalidExcludedRows=@($ExcludedRows | Where-Object {
    $_.providerSubmission -ne $false -or $_.status -ne 'skipped-user-excluded' -or
    $_.sourceSha256 -notmatch '^[a-f0-9]{64}$'
   })
   $Inventory64ExtractionComplete=(
    $Inventory64Data.status -eq 'completed-extraction-not-accuracy-accepted' -and
    [int]$Inventory64Data.imageCount -eq 64 -and
    [int]$Inventory64Data.eligibleCount -eq 56 -and
    [int]$Inventory64Data.eligibleProcessed -eq 56 -and
    [int]$Inventory64Data.completedImages -eq 56 -and
    [int]$Inventory64Data.excludedCount -eq 8 -and
    [int]$Inventory64Data.excludedSkipped -eq 8 -and
    [int]$Inventory64Data.completedInventoryEntries -eq 64 -and
    [int]$Inventory64Data.sourceMemberHashesVerified -eq 64 -and
    $Inventory64Data.allSourceMembersVerifiedBeforeProvider -eq $true -and
    $EligibleRows.Count -eq 56 -and $ExcludedRows.Count -eq 8 -and
    $InvalidEligibleRows.Count -eq 0 -and $InvalidExcludedRows.Count -eq 0
   )
   $Inventory64=[ordered]@{
    status=$Inventory64Data.status;imageCount=[int]$Inventory64Data.imageCount
    eligibleCount=[int]$Inventory64Data.eligibleCount;eligibleProcessed=[int]$Inventory64Data.eligibleProcessed
    completedImages=[int]$Inventory64Data.completedImages;excludedCount=[int]$Inventory64Data.excludedCount
    excludedSkipped=[int]$Inventory64Data.excludedSkipped;completedInventoryEntries=[int]$Inventory64Data.completedInventoryEntries
    sourceMemberHashesVerified=[int]$Inventory64Data.sourceMemberHashesVerified
    allSourceMembersVerifiedBeforeProvider=($Inventory64Data.allSourceMembersVerifiedBeforeProvider -eq $true)
    resultCount=$EligibleRows.Count;excludedRecordCount=$ExcludedRows.Count
    invalidEligibleRecordCount=$InvalidEligibleRows.Count;invalidExcludedRecordCount=$InvalidExcludedRows.Count
    sourceArchiveSha256=$Inventory64Data.sourceArchiveSha256;report=$Inventory64Path
    exactAccuracy='NOT_EVALUABLE_NO_INDEPENDENT_GROUND_TRUTH'
   }
  }else{
   $Inventory64=[ordered]@{status='FAILED_OR_BLOCKED';imageCount=64;eligibleCount=56;completedImages=0;excludedCount=8;completedInventoryEntries=0;report=$Inventory64Path;exactAccuracy='NOT_EVALUABLE_NO_INDEPENDENT_GROUND_TRUTH'}
  }
 }else{
  $script:Results += [pscustomobject]@{label='ocrspace-64-inventory-pdf-first';arguments=@('run','test:ocrspace-64');exitCode=2;log=$null;passed=$false;blocked=$true}
  Write-Host '[WINDOWS-OCR] BLOCKED 64-image inventory: set OCRSPACE_64_ARCHIVE_PATH and OCRSPACE_64_IMAGE_ROOT after verifying imgsHalf1.zip.'
 }
 $CvPythonVersion='not-available'
 if($env:OPENCV_PYTHON_BIN -and (Test-Path -LiteralPath $env:OPENCV_PYTHON_BIN -PathType Leaf)){
  $CvPythonVersion=(& $env:OPENCV_PYTHON_BIN -c 'import cv2; print(cv2.__version__)' 2>&1 | Out-String).Trim()
  if($LASTEXITCODE -ne 0){$CvPythonVersion='unavailable'}
 }
 $NoUnauthorizedNetwork=($BaselineJsReport -and $BaselineJsReport.networkIsolation.nonOcrDeniedAttemptsDetected -eq $false) -and ($CvJsReport -and $CvJsReport.networkIsolation.nonOcrDeniedAttemptsDetected -eq $false)
 foreach($Name in @('reported-native-network-attempts.log','four-image-native-network-attempts.log','additional-sixteen-native-network-attempts.log','reported-native-cv-network-attempts.log','four-image-native-cv-network-attempts.log','additional-sixteen-native-cv-network-attempts.log','ocrspace-64-network-attempts.log')){
  $Path=Join-Path $RunDir $Name
  if((Test-Path -LiteralPath $Path) -and (Get-Item -LiteralPath $Path).Length -gt 0){$NoUnauthorizedNetwork=$false}
 }
 if(-not $BaselineJsReport -or -not $CvJsReport -or $CvPythonVersion -eq 'not-available' -or $CvPythonVersion -eq 'unavailable'){$NoUnauthorizedNetwork=$false}
 foreach($Name in @('reported-native-network-attempts.log','four-image-native-network-attempts.log','additional-sixteen-native-network-attempts.log')){
  $Path=Join-Path $RunDir $Name
  if((Test-Path -LiteralPath $Path) -and (Get-Item -LiteralPath $Path).Length -gt 0){$NoUnauthorizedNetwork=$false}
 }
 $Commit='not-available'
 try{$Commit=(& git -C $ProjectRoot rev-parse HEAD 2>$null).Trim()}catch{}
 $Version=(& node.exe -p "require('./package.json').version").Trim()
 $Report=[ordered]@{
  schemaVersion=2;createdAt=(Get-Date).ToUniversalTime().ToString('o')
  runtime=[ordered]@{node=$NodeText;npm=$NpmVersion;platform=[System.Runtime.InteropServices.RuntimeInformation]::OSDescription;architecture=[System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()}
  engines=[ordered]@{tesseract=$TessVersion;imageMagick=$MagickVersion;languages=$Languages}
  source=[ordered]@{gitCommit=$Commit;packageVersion=$Version}
  commands=$script:Results;baselineNativeReports=$NativeReports;inventory64=$Inventory64;cvCandidate=[ordered]@{opencvVersion=$CvPythonVersion;tesseractJsExact=$CvJsExact;nativeReports=$CvNativeReports};noNetworkAttempts=$NoUnauthorizedNetwork
  passed=(($CvJsExact) -and (@($script:Results|Where-Object{$_.label -like 'cv-assisted-*' -and -not $_.passed}).Count -eq 0) -and ($CvNativeReports.Count -eq 3) -and (@($CvNativeReports|Where-Object{-not $_.exists -or -not $_.exact}).Count -eq 0) -and $Inventory64ExtractionComplete -and $NoUnauthorizedNetwork)
 }
 $ReportPath=Join-Path $RunDir 'windows-native-ocr-acceptance-report.json'
 $Report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ReportPath -Encoding utf8
 $Hash=(Get-FileHash -LiteralPath $ReportPath -Algorithm SHA256).Hash.ToLowerInvariant()
 "$Hash  windows-native-ocr-acceptance-report.json" | Set-Content -LiteralPath (Join-Path $RunDir 'windows-native-ocr-acceptance-report.sha256') -Encoding ascii
 Write-Host "[WINDOWS-OCR] Report: $ReportPath"
 Write-Host "[WINDOWS-OCR] SHA-256: $Hash"
 if(-not $Report.passed){Write-Error 'Windows OCR acceptance failed or remains incomplete. Diagnostics are retained; do not weaken exact-value validation.';exit 1}
 Write-Host '[WINDOWS-OCR] PASS: OpenCV-assisted Tesseract.js and native Tesseract exact screenshot gates passed.'
}
finally{Pop-Location}
 -or $_.pdfSha256 -notmatch '^[a-f0-9]{64}
 $CvPythonVersion='not-available'
 if($env:OPENCV_PYTHON_BIN -and (Test-Path -LiteralPath $env:OPENCV_PYTHON_BIN -PathType Leaf)){
  $CvPythonVersion=(& $env:OPENCV_PYTHON_BIN -c 'import cv2; print(cv2.__version__)' 2>&1 | Out-String).Trim()
  if($LASTEXITCODE -ne 0){$CvPythonVersion='unavailable'}
 }
 $NoUnauthorizedNetwork=($BaselineJsReport -and $BaselineJsReport.networkIsolation.nonOcrDeniedAttemptsDetected -eq $false) -and ($CvJsReport -and $CvJsReport.networkIsolation.nonOcrDeniedAttemptsDetected -eq $false)
 foreach($Name in @('reported-native-network-attempts.log','four-image-native-network-attempts.log','additional-sixteen-native-network-attempts.log','reported-native-cv-network-attempts.log','four-image-native-cv-network-attempts.log','additional-sixteen-native-cv-network-attempts.log','ocrspace-64-network-attempts.log')){
  $Path=Join-Path $RunDir $Name
  if((Test-Path -LiteralPath $Path) -and (Get-Item -LiteralPath $Path).Length -gt 0){$NoUnauthorizedNetwork=$false}
 }
 if(-not $BaselineJsReport -or -not $CvJsReport -or $CvPythonVersion -eq 'not-available' -or $CvPythonVersion -eq 'unavailable'){$NoUnauthorizedNetwork=$false}
 foreach($Name in @('reported-native-network-attempts.log','four-image-native-network-attempts.log','additional-sixteen-native-network-attempts.log')){
  $Path=Join-Path $RunDir $Name
  if((Test-Path -LiteralPath $Path) -and (Get-Item -LiteralPath $Path).Length -gt 0){$NoUnauthorizedNetwork=$false}
 }
 $Commit='not-available'
 try{$Commit=(& git -C $ProjectRoot rev-parse HEAD 2>$null).Trim()}catch{}
 $Version=(& node.exe -p "require('./package.json').version").Trim()
 $Report=[ordered]@{
  schemaVersion=2;createdAt=(Get-Date).ToUniversalTime().ToString('o')
  runtime=[ordered]@{node=$NodeText;npm=$NpmVersion;platform=[System.Runtime.InteropServices.RuntimeInformation]::OSDescription;architecture=[System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()}
  engines=[ordered]@{tesseract=$TessVersion;imageMagick=$MagickVersion;languages=$Languages}
  source=[ordered]@{gitCommit=$Commit;packageVersion=$Version}
  commands=$script:Results;baselineNativeReports=$NativeReports;inventory64=$Inventory64;cvCandidate=[ordered]@{opencvVersion=$CvPythonVersion;tesseractJsExact=$CvJsExact;nativeReports=$CvNativeReports};noNetworkAttempts=$NoUnauthorizedNetwork
  passed=(($CvJsExact) -and (@($script:Results|Where-Object{$_.label -like 'cv-assisted-*' -and -not $_.passed}).Count -eq 0) -and ($CvNativeReports.Count -eq 3) -and (@($CvNativeReports|Where-Object{-not $_.exists -or -not $_.exact}).Count -eq 0) -and $Inventory64ExtractionComplete -and $NoUnauthorizedNetwork)
 }
 $ReportPath=Join-Path $RunDir 'windows-native-ocr-acceptance-report.json'
 $Report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ReportPath -Encoding utf8
 $Hash=(Get-FileHash -LiteralPath $ReportPath -Algorithm SHA256).Hash.ToLowerInvariant()
 "$Hash  windows-native-ocr-acceptance-report.json" | Set-Content -LiteralPath (Join-Path $RunDir 'windows-native-ocr-acceptance-report.sha256') -Encoding ascii
 Write-Host "[WINDOWS-OCR] Report: $ReportPath"
 Write-Host "[WINDOWS-OCR] SHA-256: $Hash"
 if(-not $Report.passed){Write-Error 'Windows OCR acceptance failed or remains incomplete. Diagnostics are retained; do not weaken exact-value validation.';exit 1}
 Write-Host '[WINDOWS-OCR] PASS: OpenCV-assisted Tesseract.js and native Tesseract exact screenshot gates passed.'
}
finally{Pop-Location}
 -or
    [int]$_.pdfBytes -le 0 -or [int]$_.rasterBytes -le 0 -or
    -not $_.artifacts.pdf -or -not $_.artifacts.raster -or @($_.localReaders).Count -ne 2
   })
   $InvalidExcludedRows=@($ExcludedRows | Where-Object {
    $_.providerSubmission -ne $false -or $_.status -ne 'skipped-user-excluded' -or
    $_.sourceSha256 -notmatch '^[a-f0-9]{64}
 $CvPythonVersion='not-available'
 if($env:OPENCV_PYTHON_BIN -and (Test-Path -LiteralPath $env:OPENCV_PYTHON_BIN -PathType Leaf)){
  $CvPythonVersion=(& $env:OPENCV_PYTHON_BIN -c 'import cv2; print(cv2.__version__)' 2>&1 | Out-String).Trim()
  if($LASTEXITCODE -ne 0){$CvPythonVersion='unavailable'}
 }
 $NoUnauthorizedNetwork=($BaselineJsReport -and $BaselineJsReport.networkIsolation.nonOcrDeniedAttemptsDetected -eq $false) -and ($CvJsReport -and $CvJsReport.networkIsolation.nonOcrDeniedAttemptsDetected -eq $false)
 foreach($Name in @('reported-native-network-attempts.log','four-image-native-network-attempts.log','additional-sixteen-native-network-attempts.log','reported-native-cv-network-attempts.log','four-image-native-cv-network-attempts.log','additional-sixteen-native-cv-network-attempts.log','ocrspace-64-network-attempts.log')){
  $Path=Join-Path $RunDir $Name
  if((Test-Path -LiteralPath $Path) -and (Get-Item -LiteralPath $Path).Length -gt 0){$NoUnauthorizedNetwork=$false}
 }
 if(-not $BaselineJsReport -or -not $CvJsReport -or $CvPythonVersion -eq 'not-available' -or $CvPythonVersion -eq 'unavailable'){$NoUnauthorizedNetwork=$false}
 foreach($Name in @('reported-native-network-attempts.log','four-image-native-network-attempts.log','additional-sixteen-native-network-attempts.log')){
  $Path=Join-Path $RunDir $Name
  if((Test-Path -LiteralPath $Path) -and (Get-Item -LiteralPath $Path).Length -gt 0){$NoUnauthorizedNetwork=$false}
 }
 $Commit='not-available'
 try{$Commit=(& git -C $ProjectRoot rev-parse HEAD 2>$null).Trim()}catch{}
 $Version=(& node.exe -p "require('./package.json').version").Trim()
 $Report=[ordered]@{
  schemaVersion=2;createdAt=(Get-Date).ToUniversalTime().ToString('o')
  runtime=[ordered]@{node=$NodeText;npm=$NpmVersion;platform=[System.Runtime.InteropServices.RuntimeInformation]::OSDescription;architecture=[System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()}
  engines=[ordered]@{tesseract=$TessVersion;imageMagick=$MagickVersion;languages=$Languages}
  source=[ordered]@{gitCommit=$Commit;packageVersion=$Version}
  commands=$script:Results;baselineNativeReports=$NativeReports;inventory64=$Inventory64;cvCandidate=[ordered]@{opencvVersion=$CvPythonVersion;tesseractJsExact=$CvJsExact;nativeReports=$CvNativeReports};noNetworkAttempts=$NoUnauthorizedNetwork
  passed=(($CvJsExact) -and (@($script:Results|Where-Object{$_.label -like 'cv-assisted-*' -and -not $_.passed}).Count -eq 0) -and ($CvNativeReports.Count -eq 3) -and (@($CvNativeReports|Where-Object{-not $_.exists -or -not $_.exact}).Count -eq 0) -and $Inventory64ExtractionComplete -and $NoUnauthorizedNetwork)
 }
 $ReportPath=Join-Path $RunDir 'windows-native-ocr-acceptance-report.json'
 $Report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ReportPath -Encoding utf8
 $Hash=(Get-FileHash -LiteralPath $ReportPath -Algorithm SHA256).Hash.ToLowerInvariant()
 "$Hash  windows-native-ocr-acceptance-report.json" | Set-Content -LiteralPath (Join-Path $RunDir 'windows-native-ocr-acceptance-report.sha256') -Encoding ascii
 Write-Host "[WINDOWS-OCR] Report: $ReportPath"
 Write-Host "[WINDOWS-OCR] SHA-256: $Hash"
 if(-not $Report.passed){Write-Error 'Windows OCR acceptance failed or remains incomplete. Diagnostics are retained; do not weaken exact-value validation.';exit 1}
 Write-Host '[WINDOWS-OCR] PASS: OpenCV-assisted Tesseract.js and native Tesseract exact screenshot gates passed.'
}
finally{Pop-Location}

   })
   $Inventory64ExtractionComplete=(
    $Inventory64Data.status -eq 'completed-extraction-not-accuracy-accepted' -and
    [int]$Inventory64Data.imageCount -eq 64 -and
    [int]$Inventory64Data.eligibleCount -eq 56 -and
    [int]$Inventory64Data.eligibleProcessed -eq 56 -and
    [int]$Inventory64Data.completedImages -eq 56 -and
    [int]$Inventory64Data.excludedCount -eq 8 -and
    [int]$Inventory64Data.excludedSkipped -eq 8 -and
    [int]$Inventory64Data.completedInventoryEntries -eq 64 -and
    [int]$Inventory64Data.sourceMemberHashesVerified -eq 64 -and
    $Inventory64Data.allSourceMembersVerifiedBeforeProvider -eq $true -and
    $EligibleRows.Count -eq 56 -and $ExcludedRows.Count -eq 8 -and
    $InvalidEligibleRows.Count -eq 0 -and $InvalidExcludedRows.Count -eq 0
   )
   $Inventory64=[ordered]@{
    status=$Inventory64Data.status;imageCount=[int]$Inventory64Data.imageCount
    eligibleCount=[int]$Inventory64Data.eligibleCount;eligibleProcessed=[int]$Inventory64Data.eligibleProcessed
    completedImages=[int]$Inventory64Data.completedImages;excludedCount=[int]$Inventory64Data.excludedCount
    excludedSkipped=[int]$Inventory64Data.excludedSkipped;completedInventoryEntries=[int]$Inventory64Data.completedInventoryEntries
    sourceMemberHashesVerified=[int]$Inventory64Data.sourceMemberHashesVerified
    allSourceMembersVerifiedBeforeProvider=($Inventory64Data.allSourceMembersVerifiedBeforeProvider -eq $true)
    resultCount=$EligibleRows.Count;excludedRecordCount=$ExcludedRows.Count
    invalidEligibleRecordCount=$InvalidEligibleRows.Count;invalidExcludedRecordCount=$InvalidExcludedRows.Count
    sourceArchiveSha256=$Inventory64Data.sourceArchiveSha256;report=$Inventory64Path
    exactAccuracy='NOT_EVALUABLE_NO_INDEPENDENT_GROUND_TRUTH'
   }
  }else{
   $Inventory64=[ordered]@{status='FAILED_OR_BLOCKED';imageCount=64;eligibleCount=56;completedImages=0;excludedCount=8;completedInventoryEntries=0;report=$Inventory64Path;exactAccuracy='NOT_EVALUABLE_NO_INDEPENDENT_GROUND_TRUTH'}
  }
 }else{
  $script:Results += [pscustomobject]@{label='ocrspace-64-inventory-pdf-first';arguments=@('run','test:ocrspace-64');exitCode=2;log=$null;passed=$false;blocked=$true}
  Write-Host '[WINDOWS-OCR] BLOCKED 64-image inventory: set OCRSPACE_64_ARCHIVE_PATH and OCRSPACE_64_IMAGE_ROOT after verifying imgsHalf1.zip.'
 }
 $CvPythonVersion='not-available'
 if($env:OPENCV_PYTHON_BIN -and (Test-Path -LiteralPath $env:OPENCV_PYTHON_BIN -PathType Leaf)){
  $CvPythonVersion=(& $env:OPENCV_PYTHON_BIN -c 'import cv2; print(cv2.__version__)' 2>&1 | Out-String).Trim()
  if($LASTEXITCODE -ne 0){$CvPythonVersion='unavailable'}
 }
 $NoUnauthorizedNetwork=($BaselineJsReport -and $BaselineJsReport.networkIsolation.nonOcrDeniedAttemptsDetected -eq $false) -and ($CvJsReport -and $CvJsReport.networkIsolation.nonOcrDeniedAttemptsDetected -eq $false)
 foreach($Name in @('reported-native-network-attempts.log','four-image-native-network-attempts.log','additional-sixteen-native-network-attempts.log','reported-native-cv-network-attempts.log','four-image-native-cv-network-attempts.log','additional-sixteen-native-cv-network-attempts.log','ocrspace-64-network-attempts.log')){
  $Path=Join-Path $RunDir $Name
  if((Test-Path -LiteralPath $Path) -and (Get-Item -LiteralPath $Path).Length -gt 0){$NoUnauthorizedNetwork=$false}
 }
 if(-not $BaselineJsReport -or -not $CvJsReport -or $CvPythonVersion -eq 'not-available' -or $CvPythonVersion -eq 'unavailable'){$NoUnauthorizedNetwork=$false}
 foreach($Name in @('reported-native-network-attempts.log','four-image-native-network-attempts.log','additional-sixteen-native-network-attempts.log')){
  $Path=Join-Path $RunDir $Name
  if((Test-Path -LiteralPath $Path) -and (Get-Item -LiteralPath $Path).Length -gt 0){$NoUnauthorizedNetwork=$false}
 }
 $Commit='not-available'
 try{$Commit=(& git -C $ProjectRoot rev-parse HEAD 2>$null).Trim()}catch{}
 $Version=(& node.exe -p "require('./package.json').version").Trim()
 $Report=[ordered]@{
  schemaVersion=2;createdAt=(Get-Date).ToUniversalTime().ToString('o')
  runtime=[ordered]@{node=$NodeText;npm=$NpmVersion;platform=[System.Runtime.InteropServices.RuntimeInformation]::OSDescription;architecture=[System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()}
  engines=[ordered]@{tesseract=$TessVersion;imageMagick=$MagickVersion;languages=$Languages}
  source=[ordered]@{gitCommit=$Commit;packageVersion=$Version}
  commands=$script:Results;baselineNativeReports=$NativeReports;inventory64=$Inventory64;cvCandidate=[ordered]@{opencvVersion=$CvPythonVersion;tesseractJsExact=$CvJsExact;nativeReports=$CvNativeReports};noNetworkAttempts=$NoUnauthorizedNetwork
  passed=(($CvJsExact) -and (@($script:Results|Where-Object{$_.label -like 'cv-assisted-*' -and -not $_.passed}).Count -eq 0) -and ($CvNativeReports.Count -eq 3) -and (@($CvNativeReports|Where-Object{-not $_.exists -or -not $_.exact}).Count -eq 0) -and $Inventory64ExtractionComplete -and $NoUnauthorizedNetwork)
 }
 $ReportPath=Join-Path $RunDir 'windows-native-ocr-acceptance-report.json'
 $Report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ReportPath -Encoding utf8
 $Hash=(Get-FileHash -LiteralPath $ReportPath -Algorithm SHA256).Hash.ToLowerInvariant()
 "$Hash  windows-native-ocr-acceptance-report.json" | Set-Content -LiteralPath (Join-Path $RunDir 'windows-native-ocr-acceptance-report.sha256') -Encoding ascii
 Write-Host "[WINDOWS-OCR] Report: $ReportPath"
 Write-Host "[WINDOWS-OCR] SHA-256: $Hash"
 if(-not $Report.passed){Write-Error 'Windows OCR acceptance failed or remains incomplete. Diagnostics are retained; do not weaken exact-value validation.';exit 1}
 Write-Host '[WINDOWS-OCR] PASS: OpenCV-assisted Tesseract.js and native Tesseract exact screenshot gates passed.'
}
finally{Pop-Location}

[CmdletBinding()]
param([string]$ProjectRoot='',[string]$OutputRoot='')
$ErrorActionPreference='Stop'
if([string]::IsNullOrWhiteSpace($ProjectRoot)){$ProjectRoot=(Get-Location).Path}
$ProjectRoot=(Resolve-Path -LiteralPath $ProjectRoot).Path
if([string]::IsNullOrWhiteSpace($OutputRoot)){$OutputRoot=Join-Path $ProjectRoot 'release-artifacts'}
$OutputRoot=[System.IO.Path]::GetFullPath($OutputRoot)
$branch=(& git -C $ProjectRoot branch --show-current).Trim(); if($branch -ne 'main'){throw "Package only from the active implementation branch main; found $branch"}
$commit=(& git -C $ProjectRoot rev-parse HEAD).Trim(); if($LASTEXITCODE -ne 0){throw 'Cannot resolve commit'}
$status=@(& git -C $ProjectRoot status --porcelain); $unexpected=@($status | Where-Object { $_ -notmatch '^\?\? release-artifacts/' }); if($unexpected.Count){throw ('Working tree has non-artifact changes: '+($unexpected -join '; '))}
New-Item -ItemType Directory -Force -Path $OutputRoot|Out-Null
$stage=Join-Path $OutputRoot ('stage-'+$commit.Substring(0,12)); $zip=Join-Path $OutputRoot ('DWBOT-'+$commit.Substring(0,12)+'.zip')
if(Test-Path $stage){Remove-Item $stage -Recurse -Force}; if(Test-Path $zip){Remove-Item $zip -Force}; New-Item -ItemType Directory -Force -Path $stage|Out-Null
$tracked=@(& git -C $ProjectRoot ls-files); if($LASTEXITCODE -ne 0 -or !$tracked.Count){throw 'Tracked inventory empty'}
$included=@()
foreach($rel in $tracked){$n=$rel -replace '\\','/'; if($n -match '(^|/)(node_modules|\.git|\.cache|coverage|release-artifacts|persistence-recovery)(/|$)'){continue}; if($n -match '(^|/)\.env($|\.)'){continue}; if($n -match '(^|/)(tournament-state|live-discord-state)(/|$)'){continue}; $src=Join-Path $ProjectRoot $rel; if(!(Test-Path -LiteralPath $src -PathType Leaf)){throw "Missing tracked file $rel"}; $dst=Join-Path $stage $rel; New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dst)|Out-Null; Copy-Item -LiteralPath $src -Destination $dst; $included+=$rel}
if(!($included -contains 'package.json') -or !($included -contains 'package-lock.json')){throw 'Node manifests missing'}
$pdfSource=Join-Path $OutputRoot 'DWBOT_LOCAL_OPERATIONS_AND_RELEASE_VERIFICATION_MANUAL_2026-11-04.pdf'
if(!(Test-Path -LiteralPath $pdfSource -PathType Leaf)){throw 'Rendered PDF manual is missing; package cannot be release-verified'}
$pdfRel='docs/iteration23/DWBOT_LOCAL_OPERATIONS_AND_RELEASE_VERIFICATION_MANUAL_2026-11-04.pdf'
$pdfDest=Join-Path $stage $pdfRel; New-Item -ItemType Directory -Force -Path (Split-Path -Parent $pdfDest)|Out-Null; Copy-Item -LiteralPath $pdfSource -Destination $pdfDest; $included+=$pdfRel
$userPdfSource=Join-Path $OutputRoot 'DWBOT_USER_MANUAL.pdf'
if(!(Test-Path -LiteralPath $userPdfSource -PathType Leaf)){throw 'Rendered user manual PDF is missing; package cannot be release-verified'}
$userPdfRel='docs/user/DWBOT_USER_MANUAL.pdf'
$userPdfDest=Join-Path $stage $userPdfRel; New-Item -ItemType Directory -Force -Path (Split-Path -Parent $userPdfDest)|Out-Null; Copy-Item -LiteralPath $userPdfSource -Destination $userPdfDest; $included+=$userPdfRel
$entries=@($included|Sort-Object|ForEach-Object{$p=Join-Path $stage $_; [pscustomobject]@{path=$_;sizeBytes=(Get-Item $p).Length;sha256=(Get-FileHash $p -Algorithm SHA256).Hash.ToLowerInvariant()}})
$manifest=@{schemaVersion=1;sourceCommit=$commit;createdAt=(Get-Date).ToUniversalTime().ToString('o');excluded=@('.env*','node_modules','.git','.cache','coverage','runtime state/databases','private backups');files=$entries}
$manifest|ConvertTo-Json -Depth 6|Set-Content -LiteralPath (Join-Path $stage 'RELEASE_PACKAGE_MANIFEST.json') -Encoding utf8
$archiveInputs=@(Get-ChildItem -LiteralPath $stage -Force | Select-Object -ExpandProperty FullName)
Compress-Archive -Path $archiveInputs -DestinationPath $zip -CompressionLevel Optimal
$zipHash=(Get-FileHash $zip -Algorithm SHA256).Hash.ToLowerInvariant(); "$zipHash  $(Split-Path -Leaf $zip)"|Set-Content ($zip+'.sha256') -Encoding ascii
$extract=Join-Path $OutputRoot ('verify-'+$commit.Substring(0,12)); if(Test-Path $extract){Remove-Item $extract -Recurse -Force}; Expand-Archive -LiteralPath $zip -DestinationPath $extract
$listed=& tar.exe -tf $zip; if($LASTEXITCODE -ne 0){throw 'ZIP integrity failed'}
$m=Get-Content (Join-Path $extract 'RELEASE_PACKAGE_MANIFEST.json') -Raw|ConvertFrom-Json; $bad=@()
foreach($e in $m.files){$p=Join-Path $extract $e.path; if(!(Test-Path -LiteralPath $p -PathType Leaf)){$bad+="Missing $($e.path)";continue}; $it=Get-Item $p; $hash=(Get-FileHash $p -Algorithm SHA256).Hash.ToLowerInvariant(); if($it.Length -ne $e.sizeBytes -or $hash -ne $e.sha256){$bad+="Mismatch $($e.path)"}}
if($bad.Count){throw ($bad -join [Environment]::NewLine)}
$forbidden=Get-ChildItem $extract -Force -Recurse|Where-Object{$_.FullName -match '[\\/]node_modules([\\/]|$)' -or $_.Name -eq '.env' -or $_.Name -match '^\.env\.'}; if($forbidden){throw 'Forbidden path found'}
Push-Location $extract; try{& npm.cmd ci --no-audit --no-fund; if($LASTEXITCODE){throw 'npm ci failed in extracted package'}; & npm.cmd test; if($LASTEXITCODE){throw 'npm test failed in extracted package'}; & npm.cmd run test:prelive; if($LASTEXITCODE){throw 'prelive failed in extracted package'}}finally{Pop-Location}
Remove-Item -LiteralPath $stage,$extract -Recurse -Force
$verify=[ordered]@{sourceCommit=$commit;zip=$zip;zipSha256=$zipHash;sourceFiles=$included.Count;manifestEntries=@($m.files).Count;zipEntries=$listed.Count;manifestVerified=$true;cleanExtraction=$true;npmCi='PASS';npmTest='PASS';prelive='PASS';passed=$true}
$verify|ConvertTo-Json -Depth 5|Set-Content (Join-Path $OutputRoot 'release-package-verification.json') -Encoding utf8; Write-Host ($verify|ConvertTo-Json -Depth 5)
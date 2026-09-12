$ErrorActionPreference = "Stop"
$projectRoot = Split-Path $PSScriptRoot -Parent
$frontendPath = Join-Path $projectRoot "frontend"
$backendPath = Join-Path $projectRoot "backend"
$outputPath = Join-Path $projectRoot "release\Classync-Windows"

Set-Location $frontendPath
npm.cmd run build

Set-Location $backendPath
& ".\venv\Scripts\python.exe" -m PyInstaller `
    --noconfirm `
    --onefile `
    --name ClassyncServer `
    --paths . `
    --add-data "..\frontend\dist;frontend\dist" `
    run_classync.py

New-Item -ItemType Directory -Path $outputPath -Force | Out-Null
Copy-Item -LiteralPath ".\dist\ClassyncServer.exe" -Destination $outputPath -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "Install-Classync.ps1") -Destination $outputPath -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "Install-Classync.cmd") -Destination $outputPath -Force

$zipPath = Join-Path $projectRoot "release\Classync-Windows.zip"
if (Test-Path $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
Compress-Archive -Path "$outputPath\*" -DestinationPath $zipPath
$installerPath = Join-Path $projectRoot "release\Classync-Setup.exe"
$sedPath = Join-Path $projectRoot "release\ClassyncInstaller.generated.sed"
$sedTemplate = Get-Content (Join-Path $PSScriptRoot "ClassyncInstaller.sed") -Raw
$sedTemplate.Replace("__TARGET_PATH__", $installerPath).Replace("__SOURCE_PATH__", $outputPath) |
    Set-Content -LiteralPath $sedPath -Encoding ASCII
& "$env:SystemRoot\System32\iexpress.exe" /N $sedPath
Write-Host "Installer created in: $(Join-Path $projectRoot 'release')" -ForegroundColor Green

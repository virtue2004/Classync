# Classync production launcher. Run from PowerShell with:
#   .\start-classync.ps1

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot
$backendPath = Join-Path $projectRoot "backend"
$frontendPath = Join-Path $projectRoot "frontend"

function Test-CommandAvailable($name) {
    return $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

Write-Host "Classync setup" -ForegroundColor Cyan

if (-not (Test-CommandAvailable "python")) {
    throw "Python 3.11 or later must be installed and available on PATH."
}
if (-not (Test-CommandAvailable "node")) {
    throw "Node.js LTS must be installed and available on PATH."
}

Set-Location $backendPath
if (-not (Test-Path "venv")) {
    Write-Host "Creating Python environment..." -ForegroundColor Yellow
    python -m venv venv
}

Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
& ".\venv\Scripts\pip.exe" install -r requirements.txt --quiet

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    $setupKey = [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
    # Windows PowerShell 5 defaults Set-Content to UTF-16, which Python's .env
    # loader cannot reliably read. Always write the configuration as UTF-8.
    (Get-Content ".env") -replace "OWNER_SETUP_KEY=replace-with-a-long-random-value", "OWNER_SETUP_KEY=$setupKey" | Set-Content ".env" -Encoding utf8
    Write-Host "Server setup key: $setupKey" -ForegroundColor Yellow
    Write-Host "Keep this key private. You will enter it once in the browser." -ForegroundColor Yellow
}

# Upgrade configuration files created by older releases. A valid key is kept
# unchanged; a missing or placeholder key is replaced exactly once.
$setupKeyLine = Get-Content ".env" | Where-Object {
    $_ -match "^OWNER_SETUP_KEY=" -and $_ -notmatch "replace-with-a-long-random-value$"
} | Select-Object -First 1
if (-not $setupKeyLine) {
    $setupKey = [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
    $envLines = Get-Content ".env"
    if ($envLines -match "^OWNER_SETUP_KEY=") {
        $envLines = $envLines -replace "^OWNER_SETUP_KEY=.*$", "OWNER_SETUP_KEY=$setupKey"
        $envLines | Set-Content ".env" -Encoding utf8
    } else {
        Add-Content ".env" "OWNER_SETUP_KEY=$setupKey" -Encoding utf8
    }
    Write-Host "A new server setup key was created: $setupKey" -ForegroundColor Yellow
}

Set-Location $frontendPath
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm.cmd install --silent
}

Write-Host "Building the production frontend..." -ForegroundColor Yellow
npm.cmd run build

Write-Host "Starting Classync server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "cd '$backendPath'; .\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
)

Start-Sleep -Seconds 5
Start-Process "http://localhost:8000"

Write-Host "Classync is running. Keep the server window open while using the app." -ForegroundColor Green
Write-Host "Open http://localhost:8000 and enter the server setup key to appoint the owner." -ForegroundColor Green

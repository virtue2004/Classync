# Classync — one-time setup + launch for a new tutor's machine.
#
# What this does, in order:
#   1. Checks Python and Node are installed (tells you where to get them if not)
#   2. Creates the backend's virtual environment and installs dependencies
#      (only if not already done — safe to re-run any time)
#   3. Installs frontend dependencies (only if not already done)
#   4. Starts both servers in their own windows and opens the app in your browser
#
# There's no account to set up — the first device to open the app on this
# machine automatically becomes the owner. Just open the browser tab this
# script launches and you're in.
#
# Usage: right-click this file -> "Run with PowerShell"
# (or from an existing PowerShell window: .\start-classync.ps1)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

function Test-Command($name) {
    return $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

Write-Host "=== Classync setup ===" -ForegroundColor Cyan

if (-not (Test-Command "python")) {
    Write-Host "Python isn't installed or isn't on PATH." -ForegroundColor Red
    Write-Host "Install it from https://www.python.org/downloads/ (check 'Add to PATH' during install), then re-run this script."
    exit 1
}
if (-not (Test-Command "node")) {
    Write-Host "Node.js isn't installed or isn't on PATH." -ForegroundColor Red
    Write-Host "Install it from https://nodejs.org/ (LTS version), then re-run this script."
    exit 1
}

# ---- Backend setup ----
Set-Location $backend

if (-not (Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

Write-Host "Installing backend dependencies (skips anything already installed)..." -ForegroundColor Yellow
& ".\venv\Scripts\pip.exe" install -r requirements.txt --quiet

if (-not (Test-Path ".env")) {
    Write-Host "Creating .env from the example file..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    $setupKey = [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N")
    (Get-Content ".env") -replace "OWNER_SETUP_KEY=replace-with-a-long-random-value", "OWNER_SETUP_KEY=$setupKey" | Set-Content ".env"
    Write-Host "Server setup key: $setupKey" -ForegroundColor Yellow
    Write-Host "Keep this key private. You will enter it once in the browser to appoint the owner." -ForegroundColor Yellow
}

# ---- Frontend setup ----
Set-Location $frontend

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies (first run only, may take a minute)..." -ForegroundColor Yellow
    npm.cmd install --silent
}

Write-Host "Building the production frontend..." -ForegroundColor Yellow
npm.cmd run build

# ---- Launch the production server ----
Write-Host ""
Write-Host "Starting servers..." -ForegroundColor Cyan

Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "cd '$backend'; .\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
)

Write-Host "Waiting for servers to come up..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Start-Process "http://localhost:8000"

Write-Host ""
Write-Host "Classync is running. Two new windows opened for the backend and frontend —" -ForegroundColor Green
Write-Host "leave both open while using the app. Close them (or Ctrl+C inside them) to stop." -ForegroundColor Green
Write-Host ""
Write-Host "The browser tab that just opened is now the OWNER device automatically —" -ForegroundColor Green
Write-Host "no login needed. Use it to promote other devices from the Devices page." -ForegroundColor Green

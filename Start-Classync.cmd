@echo off
setlocal
PowerShell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-classync.ps1"
if errorlevel 1 pause

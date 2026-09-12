@echo off
PowerShell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-Classync.ps1"
if errorlevel 1 pause

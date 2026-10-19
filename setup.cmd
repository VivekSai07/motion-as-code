@echo off
rem Double-click to install everything motion-as-code needs. Log: setup.log
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
echo.
pause

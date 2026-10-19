@echo off
rem End-to-end pipeline test with timings. Log: out\pipeline-test.log
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0test-pipeline.ps1"
echo.
pause

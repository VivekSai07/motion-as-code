@echo off
rem Double-click: script\script.txt -^> ElevenLabs voiceover -^> word timings. Log: out\voice.log
cd /d "%~dp0"
if not exist out mkdir out
echo ==== voice ==== > out\voice.log
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0make.ps1" voice >> out\voice.log 2>&1
if errorlevel 1 goto fail
echo ==== align ==== >> out\voice.log
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0make.ps1" align >> out\voice.log 2>&1
if errorlevel 1 goto fail
echo VOICE DONE >> out\voice.log
type out\voice.log
pause
exit /b 0
:fail
echo VOICE FAILED >> out\voice.log
type out\voice.log
pause

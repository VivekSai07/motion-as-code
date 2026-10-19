@echo off
rem Double-click: final render (motion blur) + sound-effects mix. Log: out\render.log
cd /d "%~dp0"
if not exist out mkdir out
echo start %date% %time% > out\render.log
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0make.ps1" render >> out\render.log 2>&1
if errorlevel 1 goto fail
echo render done %date% %time% >> out\render.log
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0make.ps1" sfx >> out\render.log 2>&1
if errorlevel 1 goto fail
echo RENDER DONE %date% %time% -^> out\video_sfx.mp4 >> out\render.log
type out\render.log
pause
exit /b 0
:fail
echo RENDER FAILED %date% %time% >> out\render.log
type out\render.log
pause

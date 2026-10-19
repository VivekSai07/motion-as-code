@echo off
rem Renderer diagnostics. Writes out\diag.log
cd /d "%~dp0app"
if not exist ..\out mkdir ..\out
echo ==== angle d3d11 ==== > ..\out\diag.log
call bun scripts/diag.ts --angle d3d11 --secs 150 >> ..\out\diag.log 2>&1
if %errorlevel%==0 goto done
echo ==== angle gl ==== >> ..\out\diag.log
call bun scripts/diag.ts --angle gl --secs 150 >> ..\out\diag.log 2>&1
if %errorlevel%==0 goto done
echo ==== angle swiftshader ==== >> ..\out\diag.log
call bun scripts/diag.ts --angle swiftshader --secs 150 >> ..\out\diag.log 2>&1
:done
echo DIAG FINISHED >> ..\out\diag.log
type ..\out\diag.log
pause

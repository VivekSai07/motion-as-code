@echo off
rem Compares render speed on the default GPU vs the high-performance (discrete) GPU. Log: out\gpu-bench.log
cd /d "%~dp0app"
if not exist ..\out mkdir ..\out
set PDOOM_ANGLE=d3d11
echo ==== default GPU ==== > ..\out\gpu-bench.log
set PDOOM_GPU=
call bun scripts/diag.ts --secs 60 >> ..\out\gpu-bench.log 2>&1
call bun scripts/render.ts perf --only code --from 36 --to 39 --samples auto --min-samples 4 --max-samples 12 >> ..\out\gpu-bench.log 2>&1
echo ==== high-performance GPU ==== >> ..\out\gpu-bench.log
set PDOOM_GPU=high
call bun scripts/diag.ts --secs 60 >> ..\out\gpu-bench.log 2>&1
call bun scripts/render.ts perf --only code --from 36 --to 39 --samples auto --min-samples 4 --max-samples 12 >> ..\out\gpu-bench.log 2>&1
echo BENCH FINISHED >> ..\out\gpu-bench.log

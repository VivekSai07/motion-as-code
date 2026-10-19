# End-to-end pipeline test with timings: ElevenLabs key check (no credits used), word alignment,
# audio analysis, full final render, sound-effects mix. Writes out\pipeline-test.log and a summary.
# Double-click test-pipeline.cmd. Uses the existing audio\voiceover.mp3 and script\script.txt.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
New-Item -ItemType Directory -Force out, out\pipeline-test | Out-Null
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User') + ";$HOME\.bun\bin;$HOME\.local\bin"
$env:PYTHONUTF8 = '1'
if (Test-Path 'render.env') { Get-Content 'render.env' | Where-Object { $_ -match '^\s*([A-Z_]+)=(.*)$' } | ForEach-Object { Set-Item "env:$($matches[1])" $matches[2].Trim() } }
$LOG = Join-Path $PSScriptRoot 'out\pipeline-test.log'
"motion-as-code pipeline test  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Set-Content $LOG
function Say([string]$s) { Write-Host $s; Add-Content $LOG $s }
$Rows = [System.Collections.ArrayList]::new()

function Stage([string]$name, [string]$cmdline, [string]$dir = $PSScriptRoot, [int]$timeoutSec = 600) {
  $stepLog = Join-Path $PSScriptRoot ("out\pipeline-test\{0}.log" -f ($name -replace '[^A-Za-z0-9]+', '-'))
  Say "`n== $name"
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = 'cmd.exe'; $psi.Arguments = "/c $cmdline > `"$stepLog`" 2>&1"
  $psi.WorkingDirectory = $dir; $psi.UseShellExecute = $false; $psi.CreateNoWindow = $true
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  $p = [System.Diagnostics.Process]::Start($psi)
  if ($p.WaitForExit($timeoutSec * 1000)) { $rc = $p.ExitCode } else { cmd /c "taskkill /pid $($p.Id) /T /F >nul 2>&1"; $rc = 124 }
  $sw.Stop()
  $out = if (Test-Path $stepLog) { Get-Content $stepLog | Where-Object { $_ -notmatch 'GL Driver Message' } } else { @() }
  $out | Select-Object -Last 15 | ForEach-Object { Say "   $_" }
  $secs = [math]::Round($sw.Elapsed.TotalSeconds, 1)
  $ok = ($rc -eq 0)
  Say ("   -> {0} in {1}s" -f $(if ($ok) { 'OK' } else { "FAILED (exit $rc)" }), $secs)
  [void]$Rows.Add([pscustomobject]@{ Stage = $name; Result = $(if ($ok) { 'OK' } else { 'FAILED' }); Seconds = $secs })
  return $ok
}

try { $os = Get-CimInstance Win32_OperatingSystem; Say ("Memory: {0} GB RAM free of {1} GB, {2} GB free incl. page file | graphics backend: {3}" -f [math]::Round($os.FreePhysicalMemory / 1MB, 1), [math]::Round($os.TotalVisibleMemorySize / 1MB, 1), [math]::Round($os.FreeVirtualMemory / 1MB, 1), $env:PDOOM_ANGLE) } catch {}
try { $cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1); $gpu = (Get-CimInstance Win32_VideoController | ForEach-Object Name) -join ' + '; Say "CPU: $($cpu.Name) ($($cpu.NumberOfLogicalProcessors) threads) | GPU: $gpu" } catch {}

# keep the kit's reference timings to compare the new alignment against
Copy-Item data\lyrics.json out\pipeline-test\lyrics.reference.json -Force
Copy-Item data\audio.json out\pipeline-test\audio.reference.json -Force

$total = [System.Diagnostics.Stopwatch]::StartNew()
Stage 'ElevenLabs key check (credits)' 'uv run --no-project python tools/elevenlabs.py usage' | Out-Null
Stage 'ElevenLabs voices' 'uv run --no-project python tools/elevenlabs.py voices' | Out-Null
$aligned = Stage 'Align words (wav2vec2)' 'uv run --no-project --with onnxruntime --with numpy python analysis/align_vo.py'
if ($aligned) {
  Stage 'Alignment accuracy vs reference' 'uv run --no-project python tools/compare_lyrics.py out/pipeline-test/lyrics.reference.json data/lyrics.json' | Out-Null
  Stage 'Audio analysis' 'uv run --no-project --with numpy python analysis/audio_vo.py' | Out-Null
}
$rendered = Stage 'Final render (92.6 s, 1080p60, motion blur)' 'bun scripts/render.ts video --samples auto --min-samples 4 --max-samples 12 --shutter 0.5 --crf 17 --out ../out/video.mp4' (Join-Path $PSScriptRoot 'app') 14400
if ($rendered) {
  Stage 'Sound-effects mix' 'uv run --no-project --with numpy python analysis/sfx_mix.py' | Out-Null
  Stage 'Mux picture + mix' 'ffmpeg -v error -y -i out/video.mp4 -i out/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -shortest out/video_sfx.mp4' | Out-Null
  Stage 'Check output file' 'ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate,nb_frames -of compact out/video_sfx.mp4' | Out-Null
}
$total.Stop()

Say "`n================ SUMMARY ================"
$Rows | Format-Table -AutoSize | Out-String | ForEach-Object { Say $_ }
Say ("Total: {0:N1} min" -f $total.Elapsed.TotalMinutes)

# motion-as-code pipeline:  script/script.txt -> ElevenLabs voiceover -> word timings -> plates -> video
#
#   make voices            list ElevenLabs voices (put one in script\voice.json)
#   make usage             ElevenLabs credits used / left
#   make voice             script\script.txt -> audio\voiceover.mp3   (uses credits)
#   make voice -DryRun     show the text and character count only
#   make align             word timings + loudness  -> data\lyrics.json, data\audio.json
#   make preview           live preview at http://localhost:5173
#   make stills 12.5,40    still frames at those times -> out\wip\
#   make draft             fast low-quality render  -> out\draft.mp4
#   make render            final render (motion blur) -> out\video.mp4
#   make sfx               sound-effects mix + mux    -> out\video_sfx.mp4  (cue sheet is per script)
#   make all               voice + align + render
#   make doctor            check the renderer (GPU, memory, startup) if renders fail
param([Parameter(Position = 0)][string]$Step = 'help', [Parameter(Position = 1)][string]$Arg = '', [switch]$DryRun)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User') + ";$HOME\.bun\bin;$HOME\.local\bin"
$env:PYTHONUTF8 = '1'
New-Item -ItemType Directory -Force out | Out-Null
# render.env (written by setup.ps1): the graphics backend / browser that works on this PC
if (Test-Path 'render.env') { Get-Content 'render.env' | Where-Object { $_ -match '^\s*([A-Z_]+)=(.*)$' } | ForEach-Object { Set-Item "env:$($matches[1])" $matches[2].Trim() } }
function MemCheck {
  try {
    $free = [math]::Round((Get-CimInstance Win32_OperatingSystem).FreeVirtualMemory / 1MB, 1)
    if ($free -lt 3) { Write-Warning "Only $free GB of memory free. Rendering needs about 2-4 GB: close other apps first, or it may fail." }
  } catch {}
}

function Run { param([string]$exe, [string[]]$a) & $exe @a; if ($LASTEXITCODE -ne 0) { throw "$exe failed (exit $LASTEXITCODE)" } }
function Voice { $a = @('run', '--no-project', 'python', 'tools/elevenlabs.py', 'tts'); if ($DryRun) { $a += '--dry-run' }; Run uv $a }
function Align {
  Run uv @('run', '--no-project', '--with', 'onnxruntime', '--with', 'numpy', 'python', 'analysis/align_vo.py')
  Run uv @('run', '--no-project', '--with', 'numpy', 'python', 'analysis/audio_vo.py')
}
function Render([string]$out, [string[]]$q) { MemCheck; Push-Location app; try { Run bun (@('scripts/render.ts', 'video') + $q + @('--out', $out)) } finally { Pop-Location } }
function Final { Render '../out/video.mp4' @('--samples', 'auto', '--min-samples', '4', '--max-samples', '12', '--shutter', '0.5', '--crf', '17') }

switch ($Step) {
  'voices'  { Run uv @('run', '--no-project', 'python', 'tools/elevenlabs.py', 'voices') }
  'usage'   { Run uv @('run', '--no-project', 'python', 'tools/elevenlabs.py', 'usage') }
  'voice'   { Voice }
  'align'   { Align }
  'preview' { Push-Location app; try { bun run dev } finally { Pop-Location } }
  'doctor'  { MemCheck; Push-Location app; try { Run bun @('scripts/diag.ts', '--angle', $(if ($env:PDOOM_ANGLE) { $env:PDOOM_ANGLE } else { 'd3d11' }), '--secs', '120') } finally { Pop-Location } }
  'stills'  { MemCheck; if (-not $Arg) { $Arg = '5' }; Push-Location app; try { Run bun @('scripts/render.ts', 'stills', '--t', $Arg, '--out', '../out/wip') } finally { Pop-Location } }
  'sheet'   { Push-Location app; try { Run bun @('scripts/render.ts', 'sheet', '--cuts', '--out', '../out/contact-sheet.png') } finally { Pop-Location } }
  'draft'   { Render '../out/draft.mp4' @('--samples', '1', '--crf', '23') }
  'render'  { Final }
  'sfx'     {
    Run uv @('run', '--no-project', '--with', 'numpy', 'python', 'analysis/sfx_mix.py')
    Run ffmpeg @('-v', 'error', '-y', '-i', 'out/video.mp4', '-i', 'out/mix.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-shortest', 'out/video_sfx.mp4')
    Write-Host 'wrote out\video_sfx.mp4'
  }
  'all'     { Voice; if (-not $DryRun) { Align; Final } }
  default   { Get-Content $PSCommandPath | Select-Object -Skip 1 -First 14 | ForEach-Object { $_ -replace '^# ?', '' } }
}

# One-time setup for motion-as-code on Windows. Safe to re-run: it skips what is already done.
# Double-click setup.cmd (or run: powershell -ExecutionPolicy Bypass -File .\setup.ps1)
#
# Installs only what is missing: bun, ffmpeg, uv (brings its own Python), Google Chrome, Git; then the
# app packages and Python packages; downloads the alignment model if missing; then test-renders one frame,
# trying graphics backends until one works, and saves the working one to render.env (used by make).
# Every step is checked; a summary at the end says what passed, what failed and what to do.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
New-Item -ItemType Directory -Force out | Out-Null
try { Stop-Transcript | Out-Null } catch {}
try { Start-Transcript -Path (Join-Path $PSScriptRoot 'setup.log') -Force | Out-Null }
catch { Start-Transcript -Path (Join-Path $PSScriptRoot ("out\setup-{0:yyyyMMdd-HHmmss}.log" -f (Get-Date))) -Force | Out-Null }  # setup.log locked by an old window

$Results = [System.Collections.ArrayList]::new()
$Advice = [System.Collections.ArrayList]::new()
function Mark([string]$name, [bool]$ok, [string]$note = '') { [void]$Results.Add([pscustomobject]@{ Step = $name; Result = $(if ($ok) { 'OK' } else { 'FAILED' }); Note = $note }) }
function Refresh-Path {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User') + ";$HOME\.bun\bin;$HOME\.local\bin"
}
function Has($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
function Step($msg) { Write-Host "`n== $msg" -ForegroundColor Cyan }
function WingetInstall($id) {
  if (-not (Has 'winget')) { Write-Host 'winget not available'; return }
  winget install --id $id -e --silent --accept-package-agreements --accept-source-agreements | Out-Host
  Refresh-Path
}
# Renderer / Vite processes left running by an earlier interrupted run of this kit (they hold memory and ports).
function Stop-Leftovers {
  try {
    Get-CimInstance Win32_Process -Filter "Name='bun.exe' OR Name='node.exe'" -ErrorAction Stop |
      Where-Object { $_.CommandLine -match 'scripts[\\/](render|diag)\.ts' -or ($_.CommandLine -match 'vite' -and $_.CommandLine -match '--strictPort') } |
      ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  } catch {}
}
# Run a native command through cmd so its output (stdout+stderr) lands in a log file we can show and
# search. A time limit stops (with its whole process tree) anything that hangs.
function Native([string]$cmdline, [string]$logName, [string]$dir = $PSScriptRoot, [int]$timeoutSec = 900) {
  $log = Join-Path $PSScriptRoot "out\$logName"
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = 'cmd.exe'
  $psi.Arguments = "/c $cmdline > `"$log`" 2>&1"
  $psi.WorkingDirectory = $dir
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  foreach ($k in @('BUN_INSTALL_CACHE_DIR', 'PDOOM_ANGLE', 'PDOOM_GPU', 'PDOOM_BOOT_TIMEOUT', 'BROWSER_CHANNEL', 'Path')) { $v = [Environment]::GetEnvironmentVariable($k, 'Process'); if ($v) { $psi.EnvironmentVariables[$k] = $v } elseif ($psi.EnvironmentVariables.ContainsKey($k)) { $psi.EnvironmentVariables.Remove($k) } }
  $p = [System.Diagnostics.Process]::Start($psi)
  if ($p.WaitForExit($timeoutSec * 1000)) { $rc = $p.ExitCode }
  else { Write-Warning "Stopped after $timeoutSec s (no response)."; cmd /c "taskkill /pid $($p.Id) /T /F >nul 2>&1"; $rc = 124 }
  Stop-Leftovers
  if (Test-Path $log) { Get-Content $log | Where-Object { $_ -notmatch 'GL Driver Message' } | Select-Object -Last 25 | Write-Host }
  return $rc
}
function LogHasMemoryError([string]$logName) {
  $log = Join-Path $PSScriptRoot "out\$logName"
  return (Test-Path $log) -and [bool](Select-String -Path $log -Pattern 'paging file is too small|0x5AF|out of memory|Allocation failed|Windows is out of memory' -Quiet)
}
function Memory {
  $os = Get-CimInstance Win32_OperatingSystem
  [pscustomobject]@{
    TotalRamGB   = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
    FreeRamGB    = [math]::Round($os.FreePhysicalMemory / 1MB, 1)
    FreeCommitGB = [math]::Round($os.FreeVirtualMemory / 1MB, 1)
    PageFileGB   = [math]::Round(((Get-CimInstance Win32_PageFileUsage -ErrorAction SilentlyContinue | Measure-Object AllocatedBaseSize -Sum).Sum) / 1024, 1)
  }
}
$MemAdvice = 'Your PC ran out of memory. Close other apps (extra browsers, IDEs, chat apps), then re-run setup.cmd. If it keeps happening, let Windows grow the page file: Settings > System > About > Advanced system settings > Performance Settings > Advanced > Virtual memory > Change > "System managed size" (then restart).'
Refresh-Path
Stop-Leftovers

# ------------------------------------------------------------------ 0. memory
Step 'Memory check'
try {
  $m = Memory
  Write-Host "RAM: $($m.FreeRamGB) GB free of $($m.TotalRamGB) GB | free commit (RAM + page file): $($m.FreeCommitGB) GB | page file: $($m.PageFileGB) GB"
  if ($m.FreeCommitGB -lt 4) {
    Write-Warning 'Less than 4 GB of free memory. Rendering needs about 2-4 GB. Close other apps before rendering.'
    Mark 'Memory' $false "only $($m.FreeCommitGB) GB free"
  } else { Mark 'Memory' $true "$($m.FreeCommitGB) GB free" }
} catch { Mark 'Memory' $true 'could not read (skipped)' }

# ------------------------------------------------------------------ 1. tools
Step 'bun'
try {
  if (-not (Has 'bun')) {
    WingetInstall 'Oven-sh.Bun'
    if (-not (Has 'bun')) { Invoke-RestMethod https://bun.sh/install.ps1 | Invoke-Expression; Refresh-Path }
  }
  if (-not (Has 'bun')) { throw 'not installed' }
  $bv = [version]((bun --version) -replace '[^0-9.].*$', '')
  if ($bv -lt [version]'1.4.0') { Write-Host "bun $bv is too old for the lockfile, upgrading..."; bun upgrade | Out-Host; Refresh-Path }
  $bv = (bun --version)
  Write-Host "bun $bv"; Mark 'bun' $true $bv
} catch { Mark 'bun' $false "$_"; [void]$Advice.Add('Install bun manually from https://bun.sh, then re-run setup.cmd.') }

Step 'ffmpeg'
try {
  if (-not (Has 'ffmpeg')) { WingetInstall 'Gyan.FFmpeg' }
  if (-not (Has 'ffmpeg')) { throw 'not installed' }
  $enc = (cmd /c 'ffmpeg -hide_banner -encoders 2>nul' | Select-String 'libx264')
  if (-not $enc) { throw 'this ffmpeg has no libx264 encoder' }
  Write-Host 'ffmpeg ok (libx264 present)'; Mark 'ffmpeg' $true
} catch { Mark 'ffmpeg' $false "$_"; [void]$Advice.Add('Install ffmpeg: winget install Gyan.FFmpeg (then re-run setup.cmd).') }

Step 'uv (Python runner)'
try {
  if (-not (Has 'uv')) {
    WingetInstall 'astral-sh.uv'
    if (-not (Has 'uv')) { Invoke-RestMethod https://astral.sh/uv/install.ps1 | Invoke-Expression; Refresh-Path }
  }
  if (-not (Has 'uv')) { throw 'not installed' }
  $uvv = (uv --version); Write-Host $uvv; Mark 'uv' $true $uvv
} catch { Mark 'uv' $false "$_"; [void]$Advice.Add('Install uv from https://docs.astral.sh/uv/, then re-run setup.cmd.') }

Step 'Browser for rendering (Chrome, or Edge as fallback)'
$RenderEnv = [ordered]@{}
function FindChrome { @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1 }
try {
  $chrome = FindChrome
  if (-not $chrome) { WingetInstall 'Google.Chrome'; $chrome = FindChrome }
  if ($chrome) { Write-Host "Chrome: $chrome"; Mark 'Browser' $true 'Chrome' }
  else {
    $edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $edge) { throw 'neither Chrome nor Edge found' }
    $RenderEnv['BROWSER_CHANNEL'] = 'msedge'; $env:BROWSER_CHANNEL = 'msedge'
    Write-Host "Chrome not found, using Edge: $edge"; Mark 'Browser' $true 'Edge (fallback)'
  }
} catch { Mark 'Browser' $false "$_"; [void]$Advice.Add('Install Google Chrome, then re-run setup.cmd.') }

Step 'Git (to sync with the shared repo)'
try {
  if (-not (Has 'git')) { WingetInstall 'Git.Git' }
  if (-not (Has 'git')) { throw 'not installed' }
  Write-Host (git --version); Mark 'Git' $true
} catch { Mark 'Git' $false "$_"; [void]$Advice.Add('Install Git from https://git-scm.com/download/win, then re-run setup.cmd.') }

# ------------------------------------------------------------------ 2. packages
Step 'App packages (bun install)'
try {
  if (-not (Has 'bun')) { throw 'bun missing' }
  $env:BUN_INSTALL_CACHE_DIR = Join-Path $PSScriptRoot '.bun-cache'   # same drive as the project: avoids cache-move failures
  $ok = $false
  foreach ($i in 1..3) {
    $rc = Native 'bun install --backend=copyfile' 'bun-install.log' (Join-Path $PSScriptRoot 'app') 600
    if ($rc -eq 0 -and (Test-Path 'app\node_modules\vite') -and (Test-Path 'app\node_modules\three') -and (Test-Path 'app\node_modules\playwright-core')) { $ok = $true; break }
    Write-Host "bun install failed (attempt $i)" -ForegroundColor Yellow
    if ($i -eq 2) { Write-Host 'Clearing app\node_modules and the bun cache, then retrying...'; Remove-Item -Recurse -Force 'app\node_modules', '.bun-cache' -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 3
  }
  if (-not $ok) { throw 'bun install did not complete (see out\bun-install.log)' }
  Mark 'App packages' $true
} catch {
  Mark 'App packages' $false "$_"
  if (LogHasMemoryError 'bun-install.log') { [void]$Advice.Add($MemAdvice) } else { [void]$Advice.Add('If antivirus is scanning the project folder, add an exclusion for it, then re-run setup.cmd.') }
}

Step 'Python packages (numpy, onnxruntime) - the first run downloads Python if needed'
try {
  if (-not (Has 'uv')) { throw 'uv missing' }
  $ok = $false
  foreach ($i in 1..2) {
    $rc = Native 'uv run --no-project --with onnxruntime --with numpy python tools/check_deps.py' 'python-deps.log'
    if ($rc -eq 0) { $ok = $true; break }
    Start-Sleep -Seconds 3
  }
  if (-not $ok) { throw 'see out\python-deps.log' }
  Mark 'Python packages' $true
} catch { Mark 'Python packages' $false "$_" }

Step 'Alignment model (downloaded from Hugging Face and checksum-verified)'
try {
  $model = 'analysis\models\w2v2_base_960h_q.onnx'
  $rc = 1
  if (Has 'uv') { $rc = Native 'uv run --no-project python tools/get_model.py' 'get-model.log' $PSScriptRoot 900 }
  if ($rc -ne 0 -or -not (Test-Path $model)) {
    # fallback: the original kit zip next to the project, if present
    $zip = Join-Path (Split-Path $PSScriptRoot -Parent) 'Motion_as_kit.zip'
    if (-not (Test-Path $zip)) { throw 'download failed (see out\get-model.log) and no Motion_as_kit.zip to restore from' }
    Write-Host 'Download failed - restoring the model from Motion_as_kit.zip...'
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $z = [System.IO.Compression.ZipFile]::OpenRead($zip)
    try {
      New-Item -ItemType Directory -Force 'analysis\models' | Out-Null
      foreach ($e in $z.Entries | Where-Object { $_.FullName -like 'Motion_as_kit/analysis/models/*.onnx' }) {
        [System.IO.Compression.ZipFileExtensions]::ExtractToFile($e, (Join-Path $PSScriptRoot "analysis\models\$($e.Name)"), $true)
      }
    } finally { $z.Dispose() }
  }
  if ((Get-Item $model).Length -lt 50MB) { throw 'model file looks incomplete' }
  Mark 'Alignment model' $true
} catch { Mark 'Alignment model' $false "$_"; [void]$Advice.Add('Model download failed: check your internet connection and re-run setup.cmd (see out\get-model.log).') }

Step 'ElevenLabs key file'
if (-not (Test-Path '.env')) { Copy-Item '.env.example' '.env'; Write-Host 'Created .env - open it and paste your ElevenLabs API key.' }
$hasKey = [bool](Select-String -Path '.env' -Pattern '^\s*ELEVENLABS_API_KEY=(?!paste|\s*$)' -Quiet)
if ($hasKey) { Write-Host 'API key present'; Mark 'ElevenLabs key' $true } else { Write-Host 'No key yet - open .env in Notepad and paste it after ELEVENLABS_API_KEY='; Mark 'ElevenLabs key' $true 'not added yet (needed only for "make voice")' }

# ------------------------------------------------------------------ 3. test render
Step 'Test render (one frame) - picks a graphics backend that works on this PC'
$renderOk = $false; $memFail = $false
if ((Test-Path 'app\node_modules\vite') -and (Has 'bun')) {
  $env:PDOOM_BOOT_TIMEOUT = '180000'
  # discrete GPU first (laptops default Chrome to the integrated one; the discrete is ~2x faster)
  foreach ($cand in @(@('d3d11', 'high'), @('d3d11', ''), @('gl', 'high'), @('gl', ''), @('swiftshader', ''))) {
    $angle = $cand[0]; $gpu = $cand[1]
    $tag = if ($gpu) { "$angle-$gpu-gpu" } else { $angle }
    $m = $null; try { $m = Memory } catch {}
    if ($m -and $m.FreeCommitGB -lt 1.5) { Write-Warning "Only $($m.FreeCommitGB) GB of memory free - the render will probably fail. Close other apps." }
    Write-Host "-- trying graphics backend: $angle$(if ($gpu) { ' on the high-performance GPU' })"
    $env:PDOOM_ANGLE = $angle
    if ($gpu) { $env:PDOOM_GPU = $gpu } else { Remove-Item Env:PDOOM_GPU -ErrorAction SilentlyContinue }
    $png = Join-Path $PSScriptRoot 'out\setup-test\f_0012.50.png'
    Remove-Item $png -ErrorAction SilentlyContinue
    $rc = Native 'bun scripts/render.ts stills --t 12.5 --out ../out/setup-test' "test-render-$tag.log" (Join-Path $PSScriptRoot 'app') 240
    if ($rc -eq 0 -and (Test-Path $png)) {
      $renderOk = $true; $RenderEnv['PDOOM_ANGLE'] = $angle; if ($gpu) { $RenderEnv['PDOOM_GPU'] = $gpu }
      Write-Host "Rendered out\setup-test\f_0012.50.png with $tag" -ForegroundColor Green; break
    }
    if (LogHasMemoryError "test-render-$tag.log") { $memFail = $true; Write-Host 'Failed: out of memory.' -ForegroundColor Yellow; break }
  }
  Remove-Item Env:PDOOM_GPU -ErrorAction SilentlyContinue
  Remove-Item Env:PDOOM_ANGLE -ErrorAction SilentlyContinue
}
if ($renderOk) {
  ($RenderEnv.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join "`r`n" | Set-Content -Encoding ascii 'render.env'
  Mark 'Test render' $true "backend $($RenderEnv['PDOOM_ANGLE'])$(if ($RenderEnv['PDOOM_GPU']) { ' + high-perf GPU' }) saved to render.env"
} else {
  Mark 'Test render' $false $(if ($memFail) { 'out of memory' } else { 'see out\test-render-*.log' })
  if ($memFail) { [void]$Advice.Add($MemAdvice) } else { [void]$Advice.Add('Send the out\test-render-*.log files to Claude.') }
}

# ------------------------------------------------------------------ summary
Write-Host "`n================ SUMMARY ================" -ForegroundColor Cyan
$Results | Format-Table -AutoSize | Out-String | Write-Host
$failed = @($Results | Where-Object { $_.Result -eq 'FAILED' -and $_.Step -ne 'Memory' })
if ($failed.Count -eq 0) {
  Write-Host 'SETUP COMPLETE. Next:  .\make preview   (the demo at http://localhost:5173)' -ForegroundColor Green
} else {
  Write-Host "SETUP INCOMPLETE ($($failed.Count) step(s) failed). Fix below, then double-click setup.cmd again (finished steps are skipped):" -ForegroundColor Red
  $Advice | Select-Object -Unique | ForEach-Object { Write-Host " - $_" -ForegroundColor Yellow }
}
Stop-Transcript | Out-Null
if ($failed.Count -gt 0) { exit 1 }

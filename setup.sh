#!/usr/bin/env bash
# One-time setup for motion-as-code on macOS (Linux: best effort). Safe to re-run: it skips what is
# already done. Double-click setup.command in Finder, or run:  ./setup.sh
#
# Installs only what is missing (via Homebrew): bun, ffmpeg, uv (brings its own Python), Google Chrome,
# git; then the app packages and Python packages; downloads the alignment model; then test-renders one
# frame, trying graphics backends until one works, and saves the working one to render.env (used by
# make.sh). Every step is checked; a summary at the end says what passed, what failed and what to do.
# Written for the bash 3.2 that ships with macOS.
set -u
cd "$(dirname "$0")" || exit 1
ROOT="$(pwd)"
mkdir -p out
exec > >(tee setup.log) 2>&1

OS="$(uname -s)"
export PATH="$HOME/.bun/bin:$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
RESULTS=()
ADVICE=()
FAILED=0
step() { printf '\n== %s\n' "$1"; }
mark() { # name ok|fail note
  if [ "$2" = ok ]; then RESULTS+=("OK      $1  $3"); else RESULTS+=("FAILED  $1  $3"); FAILED=$((FAILED + 1)); fi
}
have() { command -v "$1" >/dev/null 2>&1; }
brew_install() { [ "$OS" = Darwin ] && have brew && brew install "$@"; }

# Run a command with a time limit (macOS has no `timeout`), output to out/<log> and the screen.
# usage: run_logged <seconds> <logname> <dir> cmd args...
run_logged() {
  local secs="$1" log="$ROOT/out/$2" dir="$3"; shift 3
  ( cd "$dir" && exec "$@" ) >"$log" 2>&1 &
  local pid=$!
  ( sleep "$secs"; kill -9 "$pid" 2>/dev/null; pkill -9 -P "$pid" 2>/dev/null ) &
  local watch=$!
  wait "$pid"; local rc=$?
  kill "$watch" 2>/dev/null; wait "$watch" 2>/dev/null
  grep -v 'GL Driver Message' "$log" | tail -n 25
  return $rc
}
log_has_memory_error() { grep -Eqi 'out of memory|Allocation failed|cannot allocate' "$ROOT/out/$1" 2>/dev/null; }

# ------------------------------------------------------------------ 0. memory
step 'Memory check'
if [ "$OS" = Darwin ]; then
  total_gb=$(( $(sysctl -n hw.memsize) / 1073741824 ))
  page=$(vm_stat | awk '/page size of/ {print $8}')
  free_pages=$(vm_stat | awk '/Pages (free|inactive|speculative)/ {gsub("\\.","",$NF); s+=$NF} END {print s}')
  free_gb=$(( free_pages * page / 1073741824 ))
else
  total_gb=$(( $(awk '/MemTotal/ {print $2}' /proc/meminfo) / 1048576 ))
  free_gb=$(( $(awk '/MemAvailable/ {print $2}' /proc/meminfo) / 1048576 ))
fi
echo "RAM: about ${free_gb} GB free of ${total_gb} GB"
if [ "$free_gb" -lt 3 ]; then echo "WARNING: rendering needs about 2-4 GB free. Close heavy apps before rendering."; mark Memory fail "only ${free_gb} GB free"; else mark Memory ok "${free_gb} GB free"; fi

# ------------------------------------------------------------------ 1. tools
if [ "$OS" = Darwin ]; then
  step 'Homebrew (installs the other tools)'
  if ! have brew; then
    echo 'Installing Homebrew - it may ask for your Mac password...'
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null || /usr/local/bin/brew shellenv 2>/dev/null)"
  fi
  if have brew; then mark Homebrew ok "$(brew --version | head -1)"; else mark Homebrew fail 'not installed'; ADVICE+=('Install Homebrew from https://brew.sh, then run setup again.'); fi
fi

step 'git'
have git || brew_install git
if have git; then mark git ok "$(git --version)"; else mark git fail 'not installed'; ADVICE+=('Install git: xcode-select --install (or brew install git).'); fi

step 'bun'
if ! have bun; then brew_install oven-sh/bun/bun || curl -fsSL https://bun.sh/install | bash; fi
if have bun; then
  bv="$(bun --version)"
  case "$bv" in 0.*|1.[0-3].*) echo "bun $bv is too old for the lockfile, upgrading..."; bun upgrade; bv="$(bun --version)";; esac
  mark bun ok "$bv"
else mark bun fail 'not installed'; ADVICE+=('Install bun from https://bun.sh, then run setup again.'); fi

step 'ffmpeg'
have ffmpeg || brew_install ffmpeg
if have ffmpeg && ffmpeg -hide_banner -encoders 2>/dev/null | grep -q libx264; then mark ffmpeg ok 'libx264 present'
elif have ffmpeg; then mark ffmpeg fail 'no libx264 encoder'; ADVICE+=('Reinstall ffmpeg with libx264: brew reinstall ffmpeg.')
else mark ffmpeg fail 'not installed'; ADVICE+=('Install ffmpeg: brew install ffmpeg (Linux: sudo apt install ffmpeg).'); fi

step 'uv (Python runner)'
if ! have uv; then brew_install uv || curl -LsSf https://astral.sh/uv/install.sh | sh; fi
if have uv; then mark uv ok "$(uv --version)"; else mark uv fail 'not installed'; ADVICE+=('Install uv from https://docs.astral.sh/uv/, then run setup again.'); fi

step 'Browser for rendering (Google Chrome)'
: > render.env.new
if [ "$OS" = Darwin ]; then
  [ -d '/Applications/Google Chrome.app' ] || { have brew && brew install --cask google-chrome; }
  if [ -d '/Applications/Google Chrome.app' ]; then mark Browser ok 'Chrome'
  else mark Browser fail 'Chrome not found'; ADVICE+=('Install Google Chrome from https://www.google.com/chrome/, then run setup again.'); fi
else
  if have google-chrome || have google-chrome-stable; then mark Browser ok 'Chrome'
  else
    c="$(command -v chromium || command -v chromium-browser || true)"
    if [ -n "$c" ]; then echo "CHROME_PATH=$c" >> render.env.new; mark Browser ok "Chromium ($c)"
    else mark Browser fail 'no Chrome/Chromium'; ADVICE+=('Install Google Chrome or Chromium, then run setup again.'); fi
  fi
fi

# ------------------------------------------------------------------ 2. packages
step 'App packages (bun install)'
if have bun; then
  export BUN_INSTALL_CACHE_DIR="$ROOT/.bun-cache"
  ok=0
  for i in 1 2 3; do
    if run_logged 600 bun-install.log "$ROOT/app" bun install && [ -d app/node_modules/vite ] && [ -d app/node_modules/three ] && [ -d app/node_modules/playwright-core ]; then ok=1; break; fi
    echo "bun install failed (attempt $i)"
    [ "$i" = 2 ] && { echo 'Clearing app/node_modules and the bun cache, then retrying...'; rm -rf app/node_modules .bun-cache; }
    sleep 3
  done
  if [ $ok = 1 ]; then mark 'App packages' ok ''; else mark 'App packages' fail 'see out/bun-install.log'; fi
else mark 'App packages' fail 'bun missing'; fi

step 'Python packages (numpy, onnxruntime) - the first run downloads Python if needed'
if have uv && run_logged 900 python-deps.log "$ROOT" uv run --no-project --with onnxruntime --with numpy python tools/check_deps.py; then mark 'Python packages' ok ''
else mark 'Python packages' fail 'see out/python-deps.log'; fi

step 'Alignment model (downloaded from Hugging Face and checksum-verified)'
if have uv && run_logged 900 get-model.log "$ROOT" uv run --no-project python tools/get_model.py; then mark 'Alignment model' ok ''
else mark 'Alignment model' fail 'see out/get-model.log'; ADVICE+=('Model download failed: check your internet connection and run setup again.'); fi

step 'ElevenLabs key file'
[ -f .env ] || { cp .env.example .env; echo 'Created .env - open it and paste your ElevenLabs API key after ELEVENLABS_API_KEY='; }
if grep -Eq '^[[:space:]]*ELEVENLABS_API_KEY=[^p[:space:]]' .env; then mark 'ElevenLabs key' ok 'present'
else mark 'ElevenLabs key' ok 'not added yet (needed only for "make.sh voice")'; fi

# ------------------------------------------------------------------ 3. test render
step 'Test render (one frame) - picks a graphics backend that works on this machine'
render_ok=0; mem_fail=0
if have bun && [ -d app/node_modules/vite ]; then
  while IFS='=' read -r k v || [ -n "$k" ]; do case "$k" in [A-Z_]*) export "$k=$v" ;; esac; done < render.env.new
  export PDOOM_BOOT_TIMEOUT=180000
  if [ "$OS" = Darwin ]; then cands='metal default swiftshader'; else cands='default gl swiftshader'; fi
  for angle in $cands; do
    echo "-- trying graphics backend: $angle"
    export PDOOM_ANGLE="$angle"
    rm -f out/setup-test/f_0012.50.png
    if run_logged 240 "test-render-$angle.log" "$ROOT/app" bun scripts/render.ts stills --t 12.5 --out ../out/setup-test \
       && [ -f out/setup-test/f_0012.50.png ]; then
      render_ok=1; echo "PDOOM_ANGLE=$angle" >> render.env.new; echo "Rendered out/setup-test/f_0012.50.png with $angle"; break
    fi
    if log_has_memory_error "test-render-$angle.log"; then mem_fail=1; echo 'Failed: out of memory.'; break; fi
  done
  unset PDOOM_ANGLE
fi
if [ $render_ok = 1 ]; then mv render.env.new render.env; mark 'Test render' ok "backend saved to render.env"
else
  rm -f render.env.new
  if [ $mem_fail = 1 ]; then mark 'Test render' fail 'out of memory'; ADVICE+=('Your machine ran out of memory. Close heavy apps and run setup again.')
  else mark 'Test render' fail 'see out/test-render-*.log'; ADVICE+=('Send the out/test-render-*.log files to Claude.'); fi
fi

# ------------------------------------------------------------------ summary
printf '\n================ SUMMARY ================\n'
for r in "${RESULTS[@]}"; do echo "$r"; done
real_fail=0
for r in "${RESULTS[@]}"; do case "$r" in "FAILED  Memory"*) ;; FAILED*) real_fail=$((real_fail + 1));; esac; done
if [ $real_fail = 0 ]; then
  echo; echo 'SETUP COMPLETE. Next:  ./make.sh preview   (the current video at http://localhost:5173)'
else
  echo; echo "SETUP INCOMPLETE ($real_fail step(s) failed). Fix below, then run setup again (finished steps are skipped):"
  for a in "${ADVICE[@]+"${ADVICE[@]}"}"; do echo " - $a"; done
  exit 1
fi

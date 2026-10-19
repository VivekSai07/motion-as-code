#!/usr/bin/env bash
# motion-as-code pipeline (macOS / Linux):  script/script.txt -> ElevenLabs voiceover -> word timings -> plates -> video
#
#   ./make.sh voices            list ElevenLabs voices (put one in script/voice.json)
#   ./make.sh usage             ElevenLabs credits used / left
#   ./make.sh voice             script/script.txt -> audio/voiceover.mp3   (uses credits)
#   ./make.sh voice --dry-run   show the text and character count only
#   ./make.sh align             word timings + loudness  -> data/lyrics.json, data/audio.json
#   ./make.sh preview           live preview at http://localhost:5173
#   ./make.sh stills 12.5,40    still frames at those times -> out/wip/
#   ./make.sh sheet             contact sheet of every cut  -> out/contact-sheet.png
#   ./make.sh draft             fast render, no motion blur -> out/draft.mp4
#   ./make.sh render            final render (motion blur)  -> out/video.mp4
#   ./make.sh sfx               sound-effects mix + mux     -> out/video_sfx.mp4
#   ./make.sh all               voice + align + render + sfx
#   ./make.sh doctor            check the renderer (GPU, startup) if renders fail
set -euo pipefail
cd "$(dirname "$0")"
export PATH="$HOME/.bun/bin:$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
export PYTHONUTF8=1
mkdir -p out
# render.env (written by setup.sh): the graphics backend / browser that works on this machine
if [ -f render.env ]; then
  while IFS='=' read -r k v || [ -n "$k" ]; do
    case "$k" in [A-Z_]*) export "$k=${v%$'\r'}" ;; esac
  done < render.env
fi

memcheck() {
  local free_gb
  if [ "$(uname -s)" = Darwin ]; then
    local page; page=$(vm_stat | awk '/page size of/ {print $8}')
    free_gb=$(( $(vm_stat | awk '/Pages (free|inactive|speculative)/ {gsub("\\.","",$NF); s+=$NF} END {print s}') * page / 1073741824 ))
  else free_gb=$(( $(awk '/MemAvailable/ {print $2}' /proc/meminfo) / 1048576 )); fi
  if [ "$free_gb" -lt 3 ]; then echo "WARNING: only about ${free_gb} GB of memory free. Rendering needs 2-4 GB: close other apps first."; fi
}
voice() { uv run --no-project python tools/elevenlabs.py tts "$@"; }
align() {
  uv run --no-project --with onnxruntime --with numpy python analysis/align_vo.py
  uv run --no-project --with numpy python analysis/audio_vo.py
}
render_to() { local out="$1"; shift; memcheck; (cd app && bun scripts/render.ts video "$@" --out "$out"); }
final() { render_to ../out/video.mp4 --samples auto --min-samples 4 --max-samples 12 --shutter 0.5 --crf 17; }
sfx() {
  uv run --no-project --with numpy python analysis/sfx_mix.py
  ffmpeg -v error -y -i out/video.mp4 -i out/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -shortest out/video_sfx.mp4
  echo 'wrote out/video_sfx.mp4'
}

step="${1:-help}"; shift || true
case "$step" in
  voices)  uv run --no-project python tools/elevenlabs.py voices ;;
  usage)   uv run --no-project python tools/elevenlabs.py usage ;;
  voice)   voice "$@" ;;
  align)   align ;;
  preview) cd app && exec bun run dev ;;
  stills)  memcheck; (cd app && bun scripts/render.ts stills --t "${1:-5}" --out ../out/wip) ;;
  sheet)   (cd app && bun scripts/render.ts sheet --cuts --out ../out/contact-sheet.png) ;;
  draft)   render_to ../out/draft.mp4 --samples 1 --crf 23 ;;
  render)  final ;;
  sfx)     sfx ;;
  all)     voice; align; final; sfx ;;
  doctor)  memcheck; (cd app && bun scripts/diag.ts --angle "${PDOOM_ANGLE:-default}" --secs 120) ;;
  *)       sed -n '2,17p' "$0" | sed 's/^# \{0,1\}//' ;;
esac

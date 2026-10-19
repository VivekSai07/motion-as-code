#!/usr/bin/env bash
# Double-click in Finder: final render (motion blur) + sound-effects mix -> out/video_sfx.mp4. Log: out/render.log
cd "$(dirname "$0")" || exit 1
mkdir -p out
{ echo "start $(date)"; ./make.sh render && echo "render done $(date)" && ./make.sh sfx && echo "RENDER DONE $(date) -> out/video_sfx.mp4"; } 2>&1 | tee out/render.log
echo; read -r -p "Press Enter to close this window..."

#!/usr/bin/env bash
# Double-click in Finder: script/script.txt -> ElevenLabs voiceover -> word timings. Log: out/voice.log
cd "$(dirname "$0")" || exit 1
{ ./make.sh voice && ./make.sh align && echo "VOICE DONE"; } 2>&1 | tee out/voice.log
echo; read -r -p "Press Enter to close this window..."

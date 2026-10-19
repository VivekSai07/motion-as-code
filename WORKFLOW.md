# Your workflow: script -> voiceover -> motion graphics

Windows: commands run in PowerShell from this folder as `.\make <step>`; double-click the `.cmd` files.
Mac: run them in Terminal as `./make.sh <step>`; double-click the `.command` files. Steps are identical.

## One-time setup

1. Double-click `setup.cmd` (Mac: `setup.command`): installs bun, ffmpeg, uv (with Python),
   Chrome and git if missing, all packages, and the alignment model.
2. Open `.env` (created by setup) in Notepad and paste your ElevenLabs key after `ELEVENLABS_API_KEY=`.
3. `.\make voices` lists your voices. Copy a `voice_id` into `script\voice.json`.
4. `.\make preview` and open http://localhost:5173 to check the demo plays.

Setup ends with a summary. If a step failed it says what to do; fix that and double-click `setup.cmd`
again (finished steps are skipped). Rendering needs about 2-4 GB of free memory, so close heavy apps
before `make render`. If renders fail later, run `.\make doctor`.

## Each new video

| Step | Command | What happens |
|---|---|---|
| 1. Write | edit `script\script.txt` | one on-screen line per row |
| 2. Check cost | `.\make voice -DryRun` | shows the character count (about the credits it will use) |
| 3+4. Voice + timing | double-click `voice.cmd` (or `.\make voice` then `.\make align`) | ElevenLabs -> `audio\voiceover.mp3`, word timings -> `data\lyrics.json` |
| 5. Plates + sounds | ask Claude: "write plates for the new script" | Claude writes `app\src\scenes\*.ts`, `app\src\timeline.ts` and `script\sfx_cues.py` |
| 6. Look | `.\make preview` / `.\make sheet` | live preview / contact sheet in `out\` |
| 7. Render | `.\make draft` to check, then double-click `render.cmd` | `out\video_sfx.mp4` (picture + voice + sound effects) |

Changing only the delivery (same words, new voice or speed)? Run steps 3, 4 and 7. The plates re-time
themselves.

If a word comes out with no timing, add how it is spoken to `script\spoken.json`, e.g.
`"GPT-5": ["GEE", "PEE", "TEE", "FIVE"]`.

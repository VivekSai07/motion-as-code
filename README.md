# Motion as Code

Turn a voiceover script into a 1920×1080 / 60 fps motion-graphics video, without After Effects.
You write the script; ElevenLabs reads it; a speech model times every word; animated scenes
("plates"), written as TypeScript, play in sync with the words; Chrome renders every frame; ffmpeg
encodes the video and mixes in sound effects. Every frame is a deterministic function of time, so the
live browser preview and the exported MP4 are identical.

- **WORKFLOW.md**: the step-by-step loop for making a video, with measured render times.
- **CONTRIBUTING.md**: how two people share and improve this repo (branches, testing, merging).
- **CLAUDE.md**: instructions Claude follows when it writes plates and runs the pipeline.

## Install (once per machine)

You need: a Windows PC or a Mac, about 2 GB of disk, an internet connection, and (for new voiceovers)
an [ElevenLabs](https://elevenlabs.io) API key. Claude desktop is optional but is how plates usually
get written.

1. **Get the code**: `git clone <repo-url> motion-as-code` (or GitHub Desktop → Clone).
2. **Run setup** (installs everything that is missing, downloads the 91 MB alignment model, then
   test-renders one frame and picks the graphics settings that work on your machine):
   - Windows: double-click **`setup.cmd`**
   - Mac: double-click **`setup.command`** (first time: right-click → Open, because it isn't from the
     App Store). It uses Homebrew and may ask for your Mac password.

   Setup ends with a summary. If a step failed it tells you what to do; fix it and run setup again.
3. **Add your ElevenLabs key**: open `.env` (created by setup) and paste it after
   `ELEVENLABS_API_KEY=`. This file never leaves your machine and is never committed.
4. **Check it works**: `.\make preview` (Windows) or `./make.sh preview` (Mac), then open
   http://localhost:5173.

### Commands

| | Windows (PowerShell, in this folder) | Mac (Terminal, in this folder) |
|---|---|---|
| List voices | `.\make voices` | `./make.sh voices` |
| Voiceover + word timings | double-click `voice.cmd` | double-click `voice.command` |
| Live preview | `.\make preview` | `./make.sh preview` |
| Contact sheet / stills | `.\make sheet` · `.\make stills 12.5,20` | `./make.sh sheet` · `./make.sh stills 12.5,20` |
| Fast draft render | `.\make draft` | `./make.sh draft` |
| Final render + sound | double-click `render.cmd` | double-click `render.command` |
| Renderer check | `.\make doctor` | `./make.sh doctor` |

Outputs land in `out/` (git-ignored). Run `.\make` or `./make.sh` with no arguments for the full list.

### Using it with Claude desktop

Add this folder to Claude and ask in plain words: "write a 30-second script about X, voice it and make
the plates", "make the title slam softer", "render a draft". Claude edits the files and asks you to
double-click `voice` / `render` when a step has to run on your machine (your ElevenLabs key, your GPU).

## How it works

| Step | Files |
|---|---|
| Script (on-screen lines) | `script/script.txt`; pronunciations for the aligner in `script/spoken.json` |
| Voice settings | `script/voice.json` (voice id, model, tts pronunciation tweaks) |
| Voiceover | `tools/elevenlabs.py` → `audio/voiceover.mp3` |
| Word timings | `analysis/align_vo.py` (wav2vec2 CTC forced alignment) → `data/lyrics.json`; `analysis/audio_vo.py` → `data/audio.json` |
| Plates (scenes) | `app/src/scenes/*.ts`, sequenced by `app/src/timeline.ts` |
| Renderer | `app/` (TypeScript + three.js, bun + Vite); offline renderer `app/scripts/render.ts` (headless Chrome → raw frames → ffmpeg) |
| Sound effects | cue sheet `script/sfx_cues.py` + library `audio/sfx/` → `analysis/sfx_mix.py` |
| Examples | current: the OpenVLA explainer (`scenes/vla_*.ts`); the original 92.6 s demo in `examples/demo/` |

Plates find their words by content (`lineOf`, `wordOf`), so a new read of the same script re-times
every animation automatically. A new script needs new plates (see CLAUDE.md).

Render quality: `render` uses adaptive motion blur (up to 12 sub-frames per frame); `draft` renders one
sub-frame per frame and is roughly 10× faster. `--scale 2` renders 4K. Measured times are in WORKFLOW.md.

### Preview controls

| Key | Action |
|---|---|
| space | play / pause |
| ← / → | seek ±1 s (±5 s with shift) |
| `,` / `.` | step one frame |
| `[` / `]` | previous / next plate |
| `l` | loop the current plate |
| `h` | hide the UI |

Add `?t=12` to the URL to start at 12 s.

## Credits

The visual language is the engine and style of **[pdoom-video](https://github.com/mexicat/pdoom-video)**
by mexicat (Giacomo Magnanini, MIT licence, see `LICENSE.pdoom-engine`): the palette (ink, bone,
signal orange); Archivo, IBM Plex Mono and Cormorant Garamond plus the single-stroke plotter fonts;
the spark motif, the graph-paper sheets and the bone-paper forms; the post-processing (bloom,
halation, grain). The alignment model is
[wav2vec2-base-960h](https://huggingface.co/facebook/wav2vec2-base-960h) (Apache-2.0), in the ONNX
export by [Xenova](https://huggingface.co/Xenova/wav2vec2-base-960h). Sound effects were generated with
ElevenLabs Sound Effects.

# Working together

Two people, two operating systems (Windows and Mac), one shared baseline. The goal: `main` always
works on both machines, and improvements reach it only after both of you have tried them.

## Branches

| Branch | What goes there | Merged into `main`? |
|---|---|---|
| `main` | The working baseline: engine, tools, setup, docs, one example video | — |
| `feat/<name>`, `fix/<name>` | One improvement each (a new scene helper, a setup fix, a faster render option) | Yes, after review |
| `video/<name>` | Your own videos: script, voiceover, timings, plates, cue sheet | **No** |

Why videos stay on their own branches: every video rewrites the same files (`script/`, `audio/`,
`data/`, `app/src/timeline.ts`, `script/sfx_cues.py`), so merging two people's videos would conflict
every time. If a video produces something reusable (a new helper in `_vla.ts`, a better plate type),
move just that part to a `feat/` branch.

## The improvement loop

1. **Start from fresh `main`:** `git switch main && git pull`, then `git switch -c feat/short-name`.
2. **Make the change** (by hand or by asking Claude), commit in small steps.
3. **Push and open a pull request** on GitHub: `git push -u origin feat/short-name`.
4. **Both of you test it** (checklist below). Comment on the PR with what you saw.
5. **Merge when you both agree** (use "Squash and merge" so `main` stays one commit per feature).
   Then everyone runs `git switch main && git pull`.

Ideally `main` is protected so changes reach it only through pull requests. GitHub's branch
protection for private repos depends on your plan; if it isn't available, just agree never to push to
`main` directly.

## Testing checklist (for every pull request)

- [ ] `git fetch && git switch feat/short-name`
- [ ] Run setup again (`setup.cmd` on Windows, `setup.command` on Mac): it must end with **SETUP COMPLETE**.
- [ ] `make sheet` (contact sheet) and look at it; `make draft` and watch it.
- [ ] If rendering or the engine changed: `make render` the example and compare with the previous render.
- [ ] If a Windows file (`*.ps1`, `*.cmd`) or Mac file (`*.sh`, `*.command`) changed, the person on
      the *other* OS confirms nothing broke on theirs. This is the main reason to cross-test.

(`make` here means `.\make` on Windows and `./make.sh` on Mac.)

## Rules of thumb

- **Never commit `.env`** (your API key). Each of you uses your own ElevenLabs key. `.gitignore`
  already excludes it, along with renders (`out/`), packages and the downloaded model.
- **Keep `main` renderable**: the example video in `main` (currently the OpenVLA explainer; the
  original demo is in `examples/demo/`) must still render after every merge.
- **Small pull requests** are easier to test across two machines and two time zones.
- Write commit messages as short imperatives: "Add Mac setup", "Fix memory check on 8 GB laptops".

## Using Claude desktop with the repo

- Open the repo folder in Claude and ask in plain words ("write plates for this script", "make the
  title slam softer"). `CLAUDE.md` tells Claude how the pipeline and the house style work.
- Rendering and voice generation run on **your** machine (GPU + your ElevenLabs key) through the
  double-click files; Claude's sandbox can't reach ElevenLabs or your graphics card.
- Git: use whatever you're comfortable with — the `git` command line, GitHub Desktop, or ask Claude
  ("create a branch feat/x and commit this"). Claude may ask permission to manage files in the folder,
  because git creates and removes small lock files.

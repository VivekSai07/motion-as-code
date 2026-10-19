"""ElevenLabs voiceover for the motion-as-code kit (Python standard library only).

    uv run --no-project python tools/elevenlabs.py voices          # list the voices on your account
    uv run --no-project python tools/elevenlabs.py tts             # script/script.txt -> audio/voiceover.mp3
    uv run --no-project python tools/elevenlabs.py tts --dry-run   # show the text and character count, no API call
    uv run --no-project python tools/elevenlabs.py usage           # credits used / left this period

The API key is read from the ELEVENLABS_API_KEY environment variable or from the .env file in the
project root (never commit .env). Voice and model settings live in script/voice.json.
"""
import base64, json, os, shutil, subprocess, sys, tempfile, urllib.error, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API = "https://api.elevenlabs.io/v1"
SCRIPT = ROOT / "script" / "script.txt"
VOICE_CFG = ROOT / "script" / "voice.json"
OUT = ROOT / "audio" / "voiceover.mp3"
CHUNK = 2500  # characters per request; long scripts are split on line boundaries and stitched


def api_key() -> str:
    k = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    env = ROOT / ".env"
    if not k and env.exists():
        for line in env.read_text(encoding="utf-8-sig").splitlines():
            if line.strip().startswith("ELEVENLABS_API_KEY="):
                k = line.split("=", 1)[1].strip().strip('"').strip("'")
    if not k or k.startswith("paste"):
        sys.exit("No ElevenLabs API key. Put it in .env as  ELEVENLABS_API_KEY=...  (see .env.example).")
    return k


def call(method: str, path: str, body=None, accept="application/json"):
    req = urllib.request.Request(API + path, method=method, headers={"xi-api-key": api_key(), "Accept": accept})
    if body is not None:
        req.data = json.dumps(body).encode()
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        msg = e.read().decode(errors="replace")
        sys.exit(f"ElevenLabs API error {e.code} on {path}:\n{msg}")


def cfg() -> dict:
    c = {"voice_id": "", "model_id": "eleven_multilingual_v2", "output_format": "mp3_44100_128",
         "voice_settings": {"stability": 0.5, "similarity_boost": 0.75, "style": 0.0, "use_speaker_boost": True, "speed": 1.0},
         "tts_replace": {"→": "to"}}
    if VOICE_CFG.exists():
        c.update({k: v for k, v in json.loads(VOICE_CFG.read_text(encoding="utf-8-sig")).items() if not k.startswith("_")})
    return c


def script_lines() -> list[str]:
    return [l.strip() for l in SCRIPT.read_text(encoding="utf-8-sig").splitlines() if l.strip() and not l.lstrip().startswith("#")]


def voices():
    data = json.loads(call("GET", "/voices"))
    for v in sorted(data.get("voices", []), key=lambda v: (v.get("category", ""), v.get("name", ""))):
        labels = ", ".join(f"{k}: {x}" for k, x in (v.get("labels") or {}).items())
        print(f"{v['voice_id']}  {v.get('name',''):<28} [{v.get('category','')}]  {labels}")
    print("\nCopy a voice_id into script/voice.json.")


def usage():
    s = json.loads(call("GET", "/user/subscription"))
    used, lim = s.get("character_count"), s.get("character_limit")
    print(f"tier: {s.get('tier')}   used: {used} / {lim}   left: {(lim or 0) - (used or 0)}")


def tts(dry=False):
    c = cfg()
    lines = script_lines()
    for a, b in c.get("tts_replace", {}).items():
        lines = [l.replace(a, b) for l in lines]
    chunks, cur = [], []
    for l in lines:
        if cur and len("\n".join(cur + [l])) > CHUNK:
            chunks.append("\n".join(cur)); cur = []
        cur.append(l)
    if cur:
        chunks.append("\n".join(cur))
    total = sum(len(x) for x in chunks)
    print(f"{len(lines)} lines, {total} characters, {len(chunks)} request(s), model {c['model_id']}")
    if dry:
        print("\n".join(lines)); return
    voice = c.get("voice_id") or ""
    if not voice:
        vs = json.loads(call("GET", "/voices")).get("voices", [])
        if not vs:
            sys.exit("No voices on the account; set voice_id in script/voice.json.")
        voice = vs[0]["voice_id"]
        print(f"voice_id not set in script/voice.json, using '{vs[0].get('name')}' ({voice})")
    tmp = Path(tempfile.mkdtemp())
    parts = []
    for i, text in enumerate(chunks):
        body = {"text": text, "model_id": c["model_id"], "voice_settings": c["voice_settings"]}
        if i > 0: body["previous_text"] = chunks[i - 1][-500:]
        if i + 1 < len(chunks): body["next_text"] = chunks[i + 1][:500]
        audio = call("POST", f"/text-to-speech/{voice}?output_format={c['output_format']}", body, accept="audio/mpeg")
        p = tmp / f"part{i:03d}.mp3"; p.write_bytes(audio); parts.append(p)
        print(f"  request {i + 1}/{len(chunks)}: {len(audio) // 1024} KB")
    if OUT.exists():
        shutil.copy2(OUT, OUT.with_name("voiceover.prev.mp3"))
    if len(parts) == 1:
        shutil.copy2(parts[0], OUT)
    else:
        lst = tmp / "list.txt"
        lst.write_text("".join(f"file '{p.as_posix()}'\n" for p in parts), encoding="utf-8")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(OUT)], check=True)
    shutil.rmtree(tmp, ignore_errors=True)
    print(f"wrote {OUT.relative_to(ROOT)} (previous take kept as audio/voiceover.prev.mp3)")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "tts"
    {"voices": voices, "usage": usage, "tts": lambda: tts("--dry-run" in sys.argv)}.get(cmd, lambda: sys.exit(__doc__))()

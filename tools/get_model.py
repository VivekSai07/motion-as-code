"""Fetch the speech-alignment model (wav2vec2-base-960h, quantized ONNX, ~91 MB) used by
analysis/align_vo.py, and verify it byte for byte. Standard library only; safe to re-run.

    uv run --no-project python tools/get_model.py

Source: https://huggingface.co/Xenova/wav2vec2-base-960h (onnx/model_quantized.onnx), an ONNX
export of facebook/wav2vec2-base-960h (Apache-2.0). The kit's original copy is this exact file.
"""
import hashlib, os, sys, time, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / "analysis" / "models" / "w2v2_base_960h_q.onnx"
URL = "https://huggingface.co/Xenova/wav2vec2-base-960h/resolve/main/onnx/model_quantized.onnx"
SHA256 = "cd5040c147381580ed73258143dd8e0c28e800a09e74ee42ee2b3e8cb4d760a3"
SIZE = 95286046


def sha256(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    global DEST
    if "--dest" in sys.argv:  # e.g. a test download somewhere else
        DEST = Path(sys.argv[sys.argv.index("--dest") + 1]).resolve()
    if DEST.exists() and DEST.stat().st_size == SIZE and sha256(DEST) == SHA256:
        print(f"model present and verified: {DEST}")
        return 0
    DEST.parent.mkdir(parents=True, exist_ok=True)
    part = DEST.with_suffix(".onnx.part")
    print(f"downloading the alignment model ({SIZE / 1e6:.0f} MB) from Hugging Face...")
    for attempt in range(1, 4):
        try:
            with urllib.request.urlopen(URL, timeout=60) as r, open(part, "wb") as f:
                got, t0, last = 0, time.time(), 0.0
                while True:
                    b = r.read(1 << 20)
                    if not b:
                        break
                    f.write(b)
                    got += len(b)
                    if time.time() - last > 2:
                        last = time.time()
                        print(f"  {got / 1e6:5.0f} / {SIZE / 1e6:.0f} MB", flush=True)
            if part.stat().st_size != SIZE or sha256(part) != SHA256:
                raise ValueError("checksum mismatch")
            os.replace(part, DEST)
            print(f"model downloaded and verified: {DEST}")
            return 0
        except Exception as e:  # network hiccup or bad file: retry
            print(f"  attempt {attempt} failed: {e}")
            time.sleep(3)
    part.unlink(missing_ok=True)
    print(f"Could not download the model. Download it by hand from\n  {URL}\nand save it as {DEST}")
    return 1


if __name__ == "__main__":
    sys.exit(main())

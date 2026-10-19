"""Compare two lyrics.json files (word timings): how far the new alignment is from a reference.

    python tools/compare_lyrics.py reference.json new.json
"""
import json, sys

a = json.load(open(sys.argv[1], encoding="utf-8"))["lines"]
b = json.load(open(sys.argv[2], encoding="utf-8"))["lines"]
if len(a) != len(b):
    sys.exit(f"different number of lines: {len(a)} vs {len(b)}")
d = []
for la, lb in zip(a, b):
    for x, y in zip(la["words"], lb["words"]):
        d.append((abs(x["start"] - y["start"]) * 1000, abs(x["end"] - y["end"]) * 1000, x["w"]))
starts = sorted(s for s, _, _ in d)
n = len(d)
print(f"{len(a)} lines, {n} words compared")
print(f"word start offset: median {starts[n // 2]:.0f} ms, mean {sum(starts) / n:.1f} ms, max {starts[-1]:.0f} ms")
print(f"words within 20 ms: {sum(s <= 20 for s in starts)}/{n}, within 50 ms: {sum(s <= 50 for s in starts)}/{n}, off by >100 ms: {sum(s > 100 for s in starts)}")
worst = sorted(d, reverse=True)[:3]
print("largest: " + ", ".join(f"'{w}' {s:.0f} ms" for s, _, w in worst))

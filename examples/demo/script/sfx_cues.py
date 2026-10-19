# Sound-effects cue sheet for the original Motion-as-Code demo script.
# analysis/sfx_mix.py runs this file with its helpers in scope: cue, bed, typing, type_words,
# W (word of a line), line, cut, parts, jitter, LY. To use it again, copy it to script/sfx_cues.py.

# ================================================================== HOOK (0 – 9.9)
L0, L1 = "What if I told you", "And no"
w = lambda q, n=0: W(L0, q, n)
v = lambda q: W(L1, q)
cue(w("What")["start"] - 0.01, "spark_ignite", -15)
bed("spark_sizzle", w("What")["start"], w("you")["end"] - 0.05, -28)
cue(w("you", 1)["start"] - 0.02, "whoosh_fast", -15)
cue(w("create")["start"] - 0.005, "impact_small", -13, rate=0.85)
cue(w("create")["start"], "spark_ignite", -15, rate=0.9)
m = w("motion")
for i in range(6):
    cue(m["start"] + (i / 6) * max(0.2, m["end"] - m["start"]) * 0.85, "ui_tick", -24, rate=0.85 + 0.05 * i, pan=-0.4 + 0.15 * i)
g = w("graphics")
for i in range(8):
    cue(g["start"] + (i / 8) * max(0.2, g["end"] - g["start"]) * 0.85, "impact_small", -26, rate=1.35 + 0.03 * i, pan=-0.4 + 0.11 * i)
bed("spark_sizzle", g["start"] + 0.06, g["end"] + 0.05, -29, pan=0.2)
cue(w("like")["start"] + 0.12, "whoosh_soft", -23, rate=1.2)
typing("key_click", w("like")["start"] + 0.2, w("this")["end"] + 0.2, -29, pan=0.5, step=0.05)
cue(w("without")["start"] - 0.06, "whoosh_fast", -15)
cue(w("without")["start"] + 0.1, "whoosh_soft", -23, rate=1.3)
cue(w("opening")["start"], "zap_slash", -13, pan=-0.2)
cue(w("After")["start"], "zap_slash", -13, pan=0.2)
cue(v("And")["start"] - 0.06, "whoosh_fast", -15, pan=0.2)
for i in range(3):
    cue(v("And")["start"] - 0.1 + i * 0.08 + 0.12, "ui_blip", -25, pan=-0.6 + 0.6 * i, rate=1 + 0.06 * i)
cue(v("not")["start"], "snip", -11, pan=-0.25)
cue(v("not")["start"] + 0.03, "spark_ignite", -19, pan=-0.25, rate=1.2)
cue(v("MCP")["start"], "zap_slash", -15, pan=0.05)
cue(v("MCP")["start"] + 0.2, "zap_slash", -16, pan=0.5)
cue(cut("This is Claude"), "reverse_suck", -17)

# ================================================================== MODEL (9.9 – 19.2)
L2, L3 = "This is Claude", "Instead of controlling"
w = lambda q, n=0: W(L2, q, n)
cue(w("This")["start"] + 0.08, "whoosh_soft", -21, rate=1.3)
bed("spark_sizzle", w("This")["start"] + 0.02, w("Claude")["start"] + 0.18, -28)
cue(w("Claude")["start"] - 0.01, "impact_slam", -14, length=0.5, fade=0.2)
cue(w("Opus")["start"] - 0.01, "impact_small", -16)
ps = parts(w("5.5."))
for i, (a, b) in enumerate(ps):
    cue(a, "ui_tick", -20, rate=1.0 + 0.08 * i, pan=0.2 * i)
    if i != 1:
        for k in range(1, 5):
            cue(a + k * max(0.12, (b - a) * 0.9) / 5, "ui_tick", -28, rate=1.3, pan=0.2 * i)
typing("key_click", w("Claude")["start"] + 0.12, w("Claude")["start"] + 0.4, -28, pan=-0.5)
typing("key_click", w("Opus")["start"] + 0.1, w("Opus")["start"] + 0.32, -28, pan=-0.5)
w = lambda q, n=0: W(L3, q, n)
cue(w("Instead")["start"] - 0.06, "whoosh_fast", -15)
drags = [w("controlling")["start"] + 0.05, w("controlling")["end"] - 0.08, w("After")["start"] + 0.1, w("Effects")["start"] + 0.12, w("Effects")["end"] - 0.05]
for i, d in enumerate(drags):
    cue(d, "mouse_click", -16, pan=-0.45, rate=jitter(i, 0.04))
cue(w("you")["start"] + 0.12, "whoosh_soft", -22)
bed("spark_sizzle", w("basically")["start"], w("basically")["start"] + 0.4, -28, pan=0.3)
cue(w("tell")["start"], "ui_blip", -21, pan=0.35)
cue(w("tell")["start"] + 0.12, "whoosh_soft", -23, rate=1.2, pan=0.3)
type_words("key_click", [w(q, n) for q, n in [("what", 0), ("you", 1), ("want", 0), ("the", 0), ("animation", 0), ("to", 0), ("look", 0), ("like", 0)]], -24, pan=0.35)

# ================================================================== PROMPT (19.2 – 29.7)
L5 = "Create a 15-second"
cue(cut("For example") + 0.05, "whoosh_soft", -22, rate=1.1)
PIECES = {'"create': 2, "15-second": 2, "typography,": 2, "3d": 2, 'movement."': 2}
i = 0
words5 = line(L5)["words"]
for wi, wd in enumerate(words5):
    typed = fold(wd["w"]).replace("’", "'")
    n = PIECES.get(typed, 1)
    syl = wd.get("syl") if wd.get("syl") and len(wd["syl"]) == n else None
    for p in range(n):
        t0 = wd["start"] if p == 0 else (syl[p][0] if syl else wd["start"] + p * min(0.1, (wd["end"] - wd["start"]) / n))
        cue(t0, "key_click", -21 + (((i * 37) % 7) - 3) * 0.5, pan=-0.5 + 1.0 * (wi / max(1, len(words5) - 1)), rate=jitter(i))
        i += 1
w = lambda q: W(L5, q)
cue(w("transitions")["start"] + 0.05, "whoosh_soft", -25, rate=0.9, pan=0.5)
cue(w("3D")["start"] + 0.02, "ui_blip", -24, rate=0.75, pan=-0.2)
cue(w("seamless")["start"] + 0.5, "whoosh_soft", -21, rate=0.7)
mv = w("movement")
t_enter = min(cut("where it gets crazy") - 0.3, mv["end"] + 0.06)  # as in prompt.ts: min(end - 0.3, movement.end + 0.06)
cue(t_enter, "enter_key", -9, pan=0.4)
cue(cut("where it gets crazy"), "reverse_suck", -14)

# ================================================================== CRAZY (29.7 – 35.4)
L6, L7 = "where it gets crazy", "generate an MP4"
w = lambda q: W(L6, q)
for i, q in enumerate(["And", "this", "is", "where", "it", "gets"]):
    cue(w(q)["start"] - 0.005, "impact_small", -15, rate=0.9 + 0.04 * i)
cr = w("crazy")
cue(cr["start"] - 0.03, "riser", -23, mode="end")
cue(cr["start"] - 0.005, "impact_slam", -12, length=0.5, fade=0.2)
cue(cr["end"] + 0.06, "whoosh_fast", -16, rate=0.8)
w = lambda q: W(L7, q)
cue(w("doesn’t")["start"], "zap_slash", -14, pan=-0.05)
cue(w("doesn’t")["start"] + 0.1, "zap_slash", -15, pan=0.05)
for i, (a, b) in enumerate(parts(w("MP4"))):
    cue(a, "ui_tick", -19, rate=1.0 + 0.1 * i, pan=0.5)
d0 = w("directly")["start"]
bed("spark_sizzle", d0 - 0.05, d0 + 0.6, -25)
cue(d0 + 0.25, "ui_blip", -21)
cue(cut("It writes the animation"), "whoosh_soft", -20, rate=1.2)

# ================================================================== CODE (35.4 – 48.0)
L8, L9 = "It writes the animation", "The text, shapes"
w = lambda q: W(L8, q)
x = lambda q: W(L9, q)
code_lines = [w("writes")["start"], w("animation")["start"], w("itself")["start"], x("text")["start"], x("shapes")["start"], x("shapes")["start"] + 0.25,
              x("positions")["start"], x("easing")["start"], x("transitions")["start"], x("particles")["start"], x("particles")["end"], w("code")["start"]]
k = 0
for t0 in code_lines:
    k = typing("key_click", t0, t0 + 0.32, -28, pan=-0.55, step=0.055, start=k)
cue(w("animation")["start"] + 0.06, "whoosh_fast", -17, rate=0.9)
bed("spark_sizzle", w("animation")["start"], w("animation")["start"] + 0.45, -27, pan=0.3)
for i in range(0, 15, 2):
    cue(w("itself")["start"] + 0.02 * i, "ui_tick", -29, rate=1.3, pan=-0.1 + 0.05 * i)
cue(x("text")["start"] + 0.05, "whoosh_soft", -21, rate=1.3, pan=0.3)
bed("spark_sizzle", x("shapes")["start"], x("shapes")["start"] + 0.6, -22, pan=0.45)
cue(x("positions")["start"], "ui_blip", -20, pan=0.45)
cue(x("positions")["start"] + 0.12, "ui_blip", -23, pan=0.25, rate=1.2)
cue(x("positions")["start"] + 0.2, "whoosh_soft", -24, rate=1.3)
bed("spark_sizzle", x("easing")["start"], x("easing")["start"] + 0.45, -22, pan=0.55)
cue(x("easing")["start"] + 0.15, "whoosh_soft", -23)
cue(x("transitions")["start"] + 0.08, "whoosh_fast", -15, pan=0.2)
cue(x("transitions")["start"] + 0.83, "whoosh_fast", -18, pan=0.2, rate=0.9)
cue(x("particles")["start"], "spark_ignite", -16, pan=0.45)
bed("spark_sizzle", x("particles")["start"] + 0.1, x("defined")["start"], -29, pan=0.45)
cue(x("basically")["start"] + 0.1, "whoosh_soft", -21)
t_def = x("defined")["start"]
t_re = x("mathematically")["start"] + 0.25
t_play = x("over")["start"] - 0.05
cue(t_def, "tape_rewind", -13, length=t_re - t_def + 0.08, fade=0.06)
cue(x("mathematically")["start"], "ui_blip", -22, rate=0.8)
cue(t_play, "tape_ff", -17, rate=1.15, length=0.75, fade=0.1)

# ================================================================== FRAMES (48.0 – 52.1)
L10 = "Then that code is rendered"
w = lambda q, n=0: W(L10, q, n)
cue(w("rendered")["start"], "scan_sweep", -15, length=w("rendered")["end"] - w("rendered")["start"] + 0.25)
for i, wd in enumerate([w("frame"), w("by"), w("frame", 1)]):
    cue(wd["start"], "projector_click", -12, pan=0.3 - 0.3 * i)
t_run, t_col = w("frame", 1)["end"], w("and")["start"]
bed("projector_run", t_run, t_col + 0.35, -15, rate=1.25, fin=0.15, fout=0.2)
cue(t_col + 0.05, "whoosh_soft", -18, rate=1.2)
cue(w("video")["start"], "confirm_chime", -15)

# ================================================================== PIPELINE (52.1 – 62.6) — paper
L11, L12 = "So instead of", "essentially doing"
w = lambda q: W(L11, q)
y = lambda q: W(L12, q)
cue(cut("So instead of"), "paper_slide", -12)
k = typing("typewriter", w("So")["start"], w("of:")["end"], -19, pan=-0.2, step=0.07)
segs1 = [(w("After")["start"], w("Effects")["end"], -0.7), (w("layers")["start"], w("layers")["end"], -0.35), (w("keyframes")["start"], w("keyframes")["end"], 0.0),
         (w("graph")["start"], w("editor")["end"], 0.35), (w("render")["start"], w("render")["end"], 0.7)]
for a, b, pn in segs1:
    k = typing("typewriter", a, a + (b - a) * 0.85, -19, pan=pn, step=0.07, start=k)
arrows1 = [wd for wd in line(L11)["words"] if wd["w"] == "→"]
for i, wd in enumerate(arrows1):
    cue(wd["start"], "pen_line", -15, pan=-0.55 + 0.35 * i)
cue(w("render")["end"] + 0.04, "marker_strike", -9)
k = typing("typewriter", y("you’re")["start"], y("doing:")["end"], -19, pan=-0.2, step=0.07, start=k)
segs2 = [(y("Prompt")["start"], y("Prompt")["end"], -0.6), (y("code")["start"], y("code")["end"], -0.2), (y("render")["start"], y("render")["end"], 0.2), (y("video")["start"], y("video")["end"], 0.6)]
for a, b, pn in segs2:
    k = typing("typewriter", a, a + (b - a) * 0.85, -19, pan=pn, step=0.07, start=k)
arrows2 = [wd for wd in line(L12)["words"] if wd["w"] == "→"]
for i, wd in enumerate(arrows2):
    cue(wd["start"], "pen_line", -15, pan=-0.4 + 0.4 * i)
cue(y("video")["start"] + 0.04, "stamp", -8, pan=0.1)

# ================================================================== EDITS (62.6 – 80.6)
L13, L18 = "And because the animation", "modify the underlying"
w = lambda q: W(L13, q)
z = lambda q: W(L18, q)
cue(cut("And because the animation") + 0.05, "whoosh_soft", -23)
pr = w("procedural")
for i in range(4):
    cue(pr["start"] + (i / 4) * max(0.3, pr["end"] - pr["start"]), "ui_tick", -23, rate=0.9 + 0.05 * i)
cue(w("you")["start"] - 0.1, "whoosh_fast", -15)
cue(w("tell")["start"], "ui_blip", -21, pan=0.4)
CMDS = ["transition smoother", "Change the colour", "Slow this section", "seamlessly loop"]
for ci, q in enumerate(CMDS):
    l = line(q)
    type_words("key_click", l["words"], -23, pan=0.45)
    t_done = l["end"] + 0.12
    cue(t_done, "confirm_chime", -15, pan=0.35)
    if ci == 0:
        cue(t_done + 0.08, "whoosh_soft", -21, pan=-0.45, rate=1.1)
    elif ci == 1:
        cue(t_done + 0.08, "ui_blip", -19, pan=-0.45, rate=0.7)
    elif ci == 2:
        cue(t_done + 0.08, "whoosh_soft", -20, pan=-0.45, rate=0.6)
    else:
        cue(t_done + 0.08, "whoosh_soft", -21, pan=-0.45, rate=0.9)
        cue(t_done + 0.45, "ui_tick", -19, pan=-0.45, rate=0.8)
for i in range(4):
    cue(z("modify")["start"] + i * 0.06, "ui_blip", -24, rate=1 + 0.1 * i, pan=0.45)
cue(z("instead")["start"] - 0.08, "whoosh_fast", -15)
for i in range(12):
    cue(z("instead")["start"] + 0.0 + i * 0.05, "ui_tick", -28, rate=1.1 + 0.03 * i, pan=-0.8 + 0.14 * i)
h0, h1 = z("manually")["start"] - 0.1, z("keyframes")["start"]
for j in range(6):
    cue(h0 + (j + 0.6) / 6 * (h1 - h0), "mouse_click", -17, pan=-0.3 + 0.12 * j, rate=jitter(j, 0.04))
cue(z("keyframes")["start"], "falling_pieces", -10)

# ================================================================== VERDICT (80.6 – 92.64)
L19, L20, L21, L22 = "Does this replace", "Not really", "But for certain types", "the fact that you can go"
w = lambda q: W(L19, q)
cue(cut("Does this replace"), "paper_slide", -12)
k = typing("typewriter", w("Does")["start"], w("Effects")["end"] * 0.999, -19, pan=-0.3, step=0.075, start=200)
re_ = W(L20, "really")
cue(re_["start"], "pen_tick", -12, pan=0.2)
cue(re_["start"] + 0.12, "pen_tick", -13, pan=0.2)
w = lambda q: W(L21, q)
k = typing("typewriter", w("But")["start"], w("graphics")["end"], -20, pan=-0.3, step=0.075, start=k)
t0, t1 = w("certain")["start"], w("graphics")["end"] - 0.1
for i in range(5):
    cue(t0 + (t1 - t0) * i / 4 - 0.05, "pen_tick", -15, pan=-0.5 + 0.1 * i)
w = lambda q, n=0: W(L22, q, n)
t_split = w("the")["start"] - 0.12
cue(t_split + 0.02, "whoosh_soft", -18, rate=0.8)
cue(w("go")["start"], "spark_ignite", -13, pan=-0.6)
cue(w("to")["start"], "spark_zip", -12, length=w("animation")["start"] - w("to")["start"] + 0.25, fade=0.15)
cue(w("animation")["start"], "impact_small", -15, pan=0.5)
cue(w("animation")["start"] + 0.03, "confirm_chime", -20, pan=0.5)
for i in range(0, 15, 2):
    cue(w("without")["start"] + 0.02 * i, "ui_tick", -27, pan=-0.4 + 0.04 * i)
cue(w("timeline")["start"], "ui_blip", -20, pan=-0.1)
cue(w("pretty")["start"] - 0.005, "impact_slam", -16, length=0.4, fade=0.18)
cue(w("insane")["start"] - 0.005, "impact_slam", -14, rate=0.9, length=0.45, fade=0.2)
t_imp_end = DUR - 0.08
cue(t_imp_end, "reverse_suck", -15)
cue(t_imp_end, "spark_ignite", -26, rate=1.3, length=0.06, fade=0.03)



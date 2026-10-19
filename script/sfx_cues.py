# Sound-effects cue sheet for the OpenVLA explainer. Run by analysis/sfx_mix.py with its helpers in
# scope (cue, bed, typing, type_words, W, line, cut, parts, jitter). Every cue sits on a word time,
# matching what the plates animate on (app/src/scenes/vla_*.ts). db: level; pan: -1 left .. 1 right.

# ---------------------------------------------------------------- HOOK: see / understand / act
L1 = "What if a robot"
w = lambda q, n=0: W(L1, q, n)
cue(w("What")["start"] - 0.02, "spark_ignite", -17)
see, und, say, just, act = w("see"), w("understand"), w("say…"), w("just"), w("act?")
cue(see["start"] - 0.15, "pen_line", -22, pan=-0.55)
cue(see["start"] + 0.3, "ui_tick", -20, pan=-0.55)                  # crosshair snaps on the cube
cue(und["start"] - 0.15, "pen_line", -22, pan=0.0)
cue(und["start"], "ui_blip", -22)
typing("key_click", und["start"] + 0.25, und["start"] + 0.25 + 19 / 22, -29, pan=0.0, step=0.05)
cue(just["start"] - 0.15, "pen_line", -22, pan=0.55)
cue(act["start"], "whoosh_soft", -19, pan=0.5)                       # the arm swings
cue(act["start"] + 0.55, "snip", -15, pan=0.55)                      # gripper closes
cue(cut("This is OpenVLA"), "riser", -21)

# ---------------------------------------------------------------- TITLE: OpenVLA + spec sheet
L2, L3 = "This is OpenVLA", "vision-language-action"
v2 = lambda q: W(L2, q)
v3 = lambda q: W(L3, q)
cue(cut("This is OpenVLA") + 0.05, "pen_line", -21)                 # the rule
cue(v2("OpenVLA.")["start"] - 0.01, "impact_slam", -12)
cue(v2("OpenVLA.")["start"], "spark_ignite", -20, rate=0.9)
cue(v3("A")["start"] - 0.1, "paper_slide", -22)                     # spec sheet slides in
p = v3("7-billion-parameter")
bed("spark_zip", p["start"], p["end"], -27)                          # the counter rolls
for i, (a, b) in enumerate(parts(v3("vision-language-action"))):
    cue(a, "ui_tick", -19, rate=1.0 + 0.12 * i, pan=-0.3 + 0.3 * i)   # V, L, A light up
cue(v3("open")["start"], "stamp", -12)
cue(v3("source.")["start"] + 0.1, "confirm_chime", -24)

# ---------------------------------------------------------------- DATA: 970,000 episodes
L4 = "It learned from"
d = lambda q: W(L4, q)
cue(cut("It learned from"), "whoosh_fast", -17)
for i, (a, b) in enumerate(parts(d("970,000"))):
    for j in range(3):
        cue(a + (b - a) * j / 3, "ui_tick", -24, rate=0.9 + 0.08 * (i * 3 + j), pan=-0.5 + 0.08 * (i * 3 + j))
cue(d("970,000")["end"], "confirm_chime", -20)
cue(d("episodes.")["start"], "scan_sweep", -21)

# ---------------------------------------------------------------- IO: image + words -> actions
L5 = "Camera image in"
o = lambda q: W(L5, q)
cue(cut("Camera image in"), "whoosh_fast", -18, pan=-0.3)
cue(o("Camera")["start"], "projector_click", -16, pan=-0.6)
cue(o("in,")["start"], "whoosh_soft", -22, pan=-0.3)                 # arrow in
cue(o("in,")["start"] + 0.2, "ui_blip", -20)                          # model block
cue(o("your")["start"], "pen_line", -23, pan=-0.6)
typing("key_click", o("words")["start"], o("words")["start"] + 0.9, -29, pan=-0.6, step=0.05)
cue(o("in…")["start"], "whoosh_soft", -22, pan=-0.3)
cue(o("robot")["start"] - 0.02, "zap_slash", -16, pan=0.3)            # arrow out
for i in range(7):
    cue(o("actions")["start"] + 0.04 * i, "ui_tick", -25, rate=1.0 + 0.06 * i, pan=0.3 + 0.08 * i)
cue(o("out.")["start"], "impact_small", -16, pan=0.5)

# ---------------------------------------------------------------- VERSUS: 7B vs 55B, download
L6, L7 = "And it beats", "Pretty wild"
x = lambda q: W(L6, q)
y = lambda q: W(L7, q)
cue(cut("And it beats"), "whoosh_fast", -17)
cue(x("And")["start"] - 0.05, "pen_line", -22, pan=-0.4)
cue(x("beats")["start"], "impact_small", -14, pan=-0.4)
cue(x("beats")["start"] + 0.1, "confirm_chime", -20, pan=-0.4)
cue(x("RT-2-X,")["start"], "pen_tick", -20, pan=0.4)
bed("spark_sizzle", x("RT-2-X,")["start"], x("RT-2-X,")["start"] + 0.6, -30, pan=0.4)
cue(x("closed")["start"], "stamp", -15, pan=0.4)                     # the lock
cue(x("almost")["start"], "scan_sweep", -24)                         # dimension line
cue(y("Pretty")["start"] - 0.3, "whoosh_soft", -21)                   # camera closes in
cue(y("download")["start"], "enter_key", -16)
cue(y("download")["start"] + 0.1, "falling_pieces", -26)
cue(y("today.")["start"] + 0.05, "confirm_chime", -19)

// VLA HOOK — "What if a robot could see the world, understand what you say… and just act?"
// Three panels plotted on the words: SEE (a camera viewfinder on a cube), UNDERSTAND (a voice
// waveform and the instruction typed out), ACT (a two-link arm that reaches for the cube on "act").
import { type Frame, type PostOverrides } from '../engine/scene';
import { LineBatch } from '../engine/lines';
import { rgba } from '../engine/palette';
import { F, font } from '../engine/type';
import { type Line, type Word } from '../engine/lyrics';
import { clamp, ease, lerp, noise1, prog, pulse, TAU } from '../engine/util';
import { setWorld, label, pt, drawPen, w2s, type Cam, type P } from './_vo';
import { VlaPlate, rectProg, strokeProg, typed, expo } from './_vla';

const PW = 500, PH = 340, GAP = 40, PY = -70;
const PX = [-(PW * 1.5 + GAP), -PW / 2, PW / 2 + GAP];

export default class VlaHook extends VlaPlate {
  L!: Line;
  w: Record<string, Word> = {};
  tSee = 0; tUnd = 0; tAct = 0; tJust = 0;

  override init() {
    this.L = this.ctx.lyrics.get('What if a robot');
    this.w = this.words(this.L, [['what', 'What'], ['robot', 'robot'], ['see', 'see'], ['world', 'world,'], ['understand', 'understand'], ['say', 'say…'], ['and', 'and'], ['just', 'just'], ['act', 'act?']]);
    const ws = this.L.words;
    const i = ws.indexOf(this.w.understand!);
    this.row(ws.slice(0, i), 0, -330, 1560, 100, 'r1', 800, true);
    this.row(ws.slice(i), 0, -215, 1560, 100, 'r2', 800, true);
    this.tSee = this.w.see!.start; this.tUnd = this.w.understand!.start; this.tJust = this.w.just!.start; this.tAct = this.w.act!.start;
    const K = this.cam, s = this.ctx.start, e = this.ctx.end;
    K.key(s, 0, -40, 1.12);
    K.key(this.tUnd, 0, -20, 1.04, 0, ease.inOutCubic);
    K.key(this.tAct, 0, 0, 1.0, 0, ease.inOutCubic);
    K.key(e, 0, 0, 0.98, 0, ease.linear);
  }

  panelK(t: number, t0: number) { return prog(t, t0 - 0.15, t0 + 0.45, ease.outCubic); }

  draw(ctx: CanvasRenderingContext2D, c: Cam, t: number, _f: Frame) {
    const heads: P[] = [];
    // ---- 01 SEE: viewfinder brackets, crosshair, a cube on a table, REC dot
    const k1 = this.panelK(t, this.tSee);
    if (k1 > 0) {
      const x = PX[0]!, y = PY;
      const tip = rectProg(ctx, c, x, y, PW, PH, k1, 1.2, rgba('bone', 0.35));
      if (tip && k1 < 1) heads.push(tip);
      const b = 34, cx = x + PW / 2, cy = y + PH / 2 + 10;
      const br = (ax: number, ay: number, sx: number, sy: number) => strokeProg(ctx, c, [pt(ax, ay + sy * b), pt(ax, ay), pt(ax + sx * b, ay)], prog(t, this.tSee, this.tSee + 0.3), 2.2, rgba('bone', 0.9));
      br(cx - 110, cy - 80, 1, 1); br(cx + 110, cy - 80, -1, 1); br(cx - 110, cy + 80, 1, -1); br(cx + 110, cy + 80, -1, -1);
      const kc = prog(t, this.tSee + 0.15, this.tSee + 0.5, ease.outCubic);
      strokeProg(ctx, c, [pt(x + 30, cy + 62), pt(x + PW - 30, cy + 62)], kc, 1.2, rgba('ash', 0.6)); // table
      this.cube(ctx, c, cx + 6, cy + 30, 30, kc);
      // focus: crosshair snaps on the cube
      const f = prog(t, this.tSee + 0.3, this.tSee + 0.7, ease.outExpo);
      if (f > 0) {
        setWorld(ctx, c, cx + 6, cy + 30);
        ctx.strokeStyle = rgba('signal', f);
        ctx.lineWidth = 2 / c.z;
        const r = lerp(70, 26, f);
        ctx.strokeRect(-r, -r, r * 2, r * 2);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      setWorld(ctx, c, x + PW - 28, y + 26);
      ctx.fillStyle = rgba('signal', Math.floor(t * 2.2) % 2 ? 0.25 : 1);
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      setWorld(ctx, c, x, y);
      label(ctx, '01 · SEE', 0, PH + 34, { size: 18, col: rgba('bone', 0.85 * k1) });
      label(ctx, 'RGB · 224×224', 14, 26, { size: 13, col: rgba('ash', 0.8 * kc) });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    // ---- 02 UNDERSTAND: waveform + typed instruction
    const k2 = this.panelK(t, this.tUnd);
    if (k2 > 0) {
      const x = PX[1]!, y = PY;
      const tip = rectProg(ctx, c, x, y, PW, PH, k2, 1.2, rgba('bone', 0.35));
      if (tip && k2 < 1) heads.push(tip);
      const talking = prog(t, this.tUnd, this.tUnd + 0.2) * (1 - prog(t, this.w.say!.end, this.w.say!.end + 0.4));
      setWorld(ctx, c, x, y);
      const n = 34, bw = 6, gap = (PW - 60) / n;
      for (let i = 0; i < n; i++) {
        const env = Math.sin((i / (n - 1)) * Math.PI);
        const a = 0.12 + 0.88 * Math.abs(noise1(t * 9 + i * 0.37, i));
        const h = 6 + 78 * env * a * talking * k2;
        ctx.fillStyle = i / n < prog(t, this.tUnd, this.w.say!.end) ? rgba('signal', 0.95) : rgba('bone', 0.55);
        ctx.fillRect(30 + i * gap, 120 - h / 2, bw, h);
      }
      ctx.font = font(F.mono(500), 20);
      ctx.fillStyle = rgba('bone', 0.9);
      const msg = typed('“pick up the cube”', t, this.tUnd + 0.25, 22);
      ctx.fillText(msg, 30, 226);
      if (msg.length && msg.length < 19 && Math.floor(t * 3) % 2) ctx.fillRect(30 + ctx.measureText(msg).width + 3, 208, 10, 22);
      label(ctx, '02 · UNDERSTAND', 0, PH + 34, { size: 18, col: rgba('bone', 0.85 * k2) });
      label(ctx, 'LANGUAGE', 14, 26, { size: 13, col: rgba('ash', 0.8 * k2) });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    // ---- 03 ACT: a two-link arm, drawn on "just", reaching for the cube on "act"
    const k3 = this.panelK(t, this.tJust);
    if (k3 > 0) {
      const x = PX[2]!, y = PY;
      const tip = rectProg(ctx, c, x, y, PW, PH, k3, 1.2, rgba('bone', 0.35));
      if (tip && k3 < 1) heads.push(tip);
      const base = pt(x + 110, y + PH - 40);
      const cube = pt(x + PW - 110, y + PH - 66);
      strokeProg(ctx, c, [pt(x + 30, y + PH - 40), pt(x + PW - 30, y + PH - 40)], k3, 1.2, rgba('ash', 0.6));
      this.cube(ctx, c, cube.x, cube.y + 4, 22, k3);
      const m = prog(t, this.tAct, this.tAct + 0.55, ease.inOutCubic);
      const lift = prog(t, this.tAct + 0.65, this.tAct + 1.1, ease.inOutCubic);
      // joint angles: rest pose -> reach the cube -> lift
      const a1 = lerp(-1.95, -0.62, m) - 0.35 * lift, a2 = lerp(1.9, 1.05, m) - 0.25 * lift;
      const L1 = 140, L2 = 120;
      const j1 = pt(base.x + L1 * Math.cos(a1), base.y + L1 * Math.sin(a1));
      const ee = pt(j1.x + L2 * Math.cos(a1 + a2), j1.y + L2 * Math.sin(a1 + a2));
      const draw = prog(t, this.tJust, this.tJust + 0.35);
      strokeProg(ctx, c, [base, j1, ee], draw, 9, rgba('bone', 0.92));
      setWorld(ctx, c);
      ctx.fillStyle = rgba('ink', 1);
      ctx.strokeStyle = rgba('bone', 0.9 * draw);
      ctx.lineWidth = 2 / c.z;
      for (const p of [base, j1]) { ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, TAU); ctx.fill(); ctx.stroke(); }
      // gripper (signal): opens, closes on the cube
      const g = 14 * (1 - prog(t, this.tAct + 0.5, this.tAct + 0.65));
      const ang = a1 + a2;
      ctx.strokeStyle = rgba('signal', draw);
      ctx.lineWidth = 4 / c.z;
      const nx = -Math.sin(ang), ny = Math.cos(ang);
      for (const sgn of [-1, 1]) {
        const bx = ee.x + nx * (8 + g) * sgn, by = ee.y + ny * (8 + g) * sgn;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(ang) * 26, by + Math.sin(ang) * 26); ctx.stroke();
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (m > 0 && m < 1) heads.push(ee);
      setWorld(ctx, c, x, y);
      label(ctx, '03 · ACT', 0, PH + 34, { size: 18, col: rgba(m > 0 ? 'signal' : 'bone', 0.9 * k3) });
      label(ctx, '7-DOF ACTION', 14, 26, { size: 13, col: rgba('ash', 0.8 * k3) });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    this.heads = heads;
  }

  heads: P[] = [];
  cube(ctx: CanvasRenderingContext2D, c: Cam, x: number, y: number, s: number, k: number) {
    if (k <= 0) return;
    setWorld(ctx, c, x, y);
    ctx.globalAlpha = k;
    ctx.fillStyle = rgba('signal', 0.9);
    ctx.fillRect(-s, -s * 2, s * 2, s * 2);
    ctx.fillStyle = rgba('ember', 0.9);
    ctx.beginPath(); ctx.moveTo(-s, -s * 2); ctx.lineTo(-s + s * 0.6, -s * 2.5); ctx.lineTo(s + s * 0.6, -s * 2.5); ctx.lineTo(s, -s * 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba('blood', 0.95);
    ctx.beginPath(); ctx.moveTo(s, -s * 2); ctx.lineTo(s + s * 0.6, -s * 2.5); ctx.lineTo(s + s * 0.6, -s * 0.5); ctx.lineTo(s, 0); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  override drawFx(X: LineBatch, c: Cam, t: number) {
    const h = this.heads[0];
    if (!h) return;
    const [sx, sy] = w2s(c, h.x, h.y);
    drawPen(X, t, () => [sx, sy], { scale: 0.6, rate: 30 });
  }

  override post(t: number): PostOverrides {
    return { zoom: 1 + 0.02 * pulse(t, this.tAct, 0.12) + 0.01 * pulse(t, this.tSee, 0.1) };
  }
}

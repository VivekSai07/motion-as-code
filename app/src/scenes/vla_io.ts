// VLA IO — "Camera image in, your words in… robot actions out."
// A block diagram plotted on the words: CAMERA IMAGE and YOUR WORDS feed OPENVLA; on "robot actions
// out" an arrow leaves it into a panel of seven action channels that start moving.
import { type Frame, type PostOverrides } from '../engine/scene';
import { LineBatch } from '../engine/lines';
import { rgba } from '../engine/palette';
import { F, font } from '../engine/type';
import { type Line, type Word } from '../engine/lyrics';
import { clamp, ease, lerp, noise1, prog, pulse, TAU } from '../engine/util';
import { setWorld, label, pt, drawPen, w2s, arrowHead, mixCss, type Cam, type P } from './_vo';
import { VlaPlate, ARCH, rectProg, strokeProg, typed, expo } from './_vla';

const IMG = { x: -900, y: -150, w: 400, h: 250 };
const TXT = { x: -900, y: 170, w: 400, h: 120 };
const MOD = { x: -240, y: -40, w: 360, h: 220 };
const ACT = { x: 380, y: -120, w: 520, h: 380 };
const CH = ['x', 'y', 'z', 'roll', 'pitch', 'yaw', 'grip'];

export default class VlaIO extends VlaPlate {
  L!: Line;
  w: Record<string, Word> = {};
  head: P | null = null;

  override init() {
    this.L = this.ctx.lyrics.get('Camera image in');
    this.w = this.words(this.L, [['camera', 'Camera'], ['image', 'image'], ['in1', 'in,'], ['your', 'your'], ['words', 'words'], ['in2', 'in…'], ['robot', 'robot'], ['actions', 'actions'], ['out', 'out.']]);
    this.row(this.L.words, 0, -330, 1500, 92, 'k', 800, true);
    const K = this.cam, s = this.ctx.start, e = this.ctx.end, w = this.w;
    K.key(s, -420, -40, 1.12);
    K.key(w.in2!.end, -260, 0, 1.0, 0, ease.inOutCubic);
    K.key(w.out!.start, 0, 0, 0.92, 0, ease.inOutCubic);
    K.key(e, 30, 0, 0.9, 0, ease.linear);
  }

  draw(ctx: CanvasRenderingContext2D, c: Cam, t: number, _f: Frame) {
    const w = this.w;
    this.head = null;
    const pen = (p: P | null, k: number) => { if (p && k > 0 && k < 1) this.head = p; };
    // CAMERA IMAGE
    const k1 = prog(t, w.camera!.start - 0.1, w.camera!.start + 0.4, ease.outCubic);
    if (k1 > 0) {
      pen(rectProg(ctx, c, IMG.x, IMG.y, IMG.w, IMG.h, k1, 1.6, rgba('bone', 0.8)), k1);
      const ki = prog(t, w.image!.start, w.image!.start + 0.3);
      setWorld(ctx, c, IMG.x, IMG.y);
      ctx.globalAlpha = ki;
      // a tiny scene: table, cube, a bowl
      ctx.fillStyle = rgba('ink2', 1); ctx.fillRect(8, 8, IMG.w - 16, IMG.h - 16);
      ctx.fillStyle = rgba('graphite', 0.9); ctx.fillRect(8, 170, IMG.w - 16, IMG.h - 178);
      ctx.fillStyle = rgba('signal', 1); ctx.fillRect(110, 130, 44, 44);
      ctx.strokeStyle = rgba('bone', 0.9); ctx.lineWidth = 3 / c.z;
      ctx.beginPath(); ctx.ellipse(270, 168, 52, 14, 0, 0, Math.PI); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(218, 168); ctx.lineTo(322, 168); ctx.stroke();
      ctx.globalAlpha = 1;
      label(ctx, 'CAMERA IMAGE', 0, -16, { size: 14, col: rgba('bone', 0.8 * k1) });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    // YOUR WORDS
    const k2 = prog(t, w.your!.start - 0.1, w.your!.start + 0.35, ease.outCubic);
    if (k2 > 0) {
      pen(rectProg(ctx, c, TXT.x, TXT.y, TXT.w, TXT.h, k2, 1.6, rgba('bone', 0.8)), k2);
      setWorld(ctx, c, TXT.x, TXT.y);
      ctx.font = font(F.mono(500), 22);
      ctx.fillStyle = rgba('bone', 0.95);
      ctx.fillText(typed('“put the cube', t, w.words!.start, 26), 22, 50);
      ctx.fillText(typed('in the bowl”', t, w.words!.start + 0.5, 26), 22, 86);
      label(ctx, 'YOUR WORDS', 0, -16, { size: 14, col: rgba('bone', 0.8 * k2) });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    // arrows in
    const a1 = prog(t, w.in1!.start - 0.05, w.in1!.start + 0.35, ease.inOutCubic);
    const a2 = prog(t, w.in2!.start - 0.05, w.in2!.start + 0.35, ease.inOutCubic);
    const arrow = (pts: P[], k: number, col: string) => {
      const tip = strokeProg(ctx, c, pts, k, 2, col);
      if (tip && k >= 1) {
        const a = pts[pts.length - 1]!, b = pts[pts.length - 2]!;
        setWorld(ctx, c); ctx.strokeStyle = col; ctx.lineWidth = 2 / c.z;
        arrowHead(ctx, a.x, a.y, Math.atan2(a.y - b.y, a.x - b.x), 16);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      pen(tip, k);
    };
    arrow([pt(IMG.x + IMG.w + 10, IMG.y + IMG.h / 2), pt(-380, IMG.y + IMG.h / 2), pt(-380, MOD.y + 60), pt(MOD.x - 8, MOD.y + 60)], a1, rgba('signal', 0.95));
    arrow([pt(TXT.x + TXT.w + 10, TXT.y + TXT.h / 2), pt(-380, TXT.y + TXT.h / 2), pt(-380, MOD.y + 160), pt(MOD.x - 8, MOD.y + 160)], a2, rgba('signal', 0.95));
    // OPENVLA block
    const km = prog(t, w.in1!.start + 0.15, w.in1!.start + 0.5, ease.outCubic);
    if (km > 0) {
      pen(rectProg(ctx, c, MOD.x, MOD.y, MOD.w, MOD.h, km, 2.4, rgba('bone', 0.95)), km);
      const busy = prog(t, w.in1!.start + 0.4, w.in1!.start + 0.6) * (0.6 + 0.4 * Math.abs(noise1(t * 6, 2)));
      setWorld(ctx, c, MOD.x, MOD.y);
      ctx.fillStyle = rgba('ink2', 0.9 * km); ctx.fillRect(2, 2, MOD.w - 4, MOD.h - 4);
      ctx.font = font(ARCH(110, 900), 64);
      ctx.fillStyle = rgba('bone', km);
      ctx.textAlign = 'center';
      ctx.fillText('OpenVLA', MOD.w / 2, 118);
      ctx.textAlign = 'left';
      label(ctx, '7B · SigLIP + DINOv2 → Llama 2', MOD.w / 2, 160, { size: 12, col: rgba('ash', 0.9 * km), align: 'center', spacing: 1 });
      // activity: a row of cells flickering while it "thinks"
      for (let i = 0; i < 14; i++) {
        const on = Math.abs(noise1(t * 12 + i * 1.7, i)) * busy;
        ctx.fillStyle = mixCss('graphite', 'signal', on);
        ctx.fillRect(28 + i * 22, 186, 16, 8);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    // arrow out + ROBOT ACTIONS
    const ao = prog(t, w.robot!.start - 0.05, w.robot!.start + 0.3, ease.inOutCubic);
    arrow([pt(MOD.x + MOD.w + 8, MOD.y + MOD.h / 2), pt(ACT.x - 12, MOD.y + MOD.h / 2)], ao, rgba('signal', 0.95));
    const ka = prog(t, w.robot!.start + 0.1, w.actions!.start + 0.2, ease.outCubic);
    if (ka > 0) {
      pen(rectProg(ctx, c, ACT.x, ACT.y, ACT.w, ACT.h, ka, 1.6, rgba('bone', 0.8)), ka);
      const live = prog(t, w.actions!.start, w.actions!.start + 0.3);
      setWorld(ctx, c, ACT.x, ACT.y);
      label(ctx, 'ROBOT ACTIONS', 0, -16, { size: 14, col: rgba('bone', 0.8 * ka) });
      const bw = (ACT.w - 60) / CH.length;
      const mid = ACT.h / 2 - 10;
      ctx.strokeStyle = rgba('bone', 0.25 * ka); ctx.lineWidth = 1 / c.z;
      ctx.beginPath(); ctx.moveTo(20, mid); ctx.lineTo(ACT.w - 20, mid); ctx.stroke();
      CH.forEach((name, i) => {
        const v = live * noise1(t * 2.4 + i * 3.1, 40 + i) * 130 + (name === 'grip' ? live * 60 * Math.sign(Math.sin(t * 2)) : 0);
        const x = 30 + i * bw;
        ctx.fillStyle = name === 'grip' ? rgba('signal', ka) : rgba('bone', 0.85 * ka);
        ctx.fillRect(x + 8, Math.min(mid, mid - v), bw - 16, Math.max(2, Math.abs(v)));
        ctx.font = font(F.mono(500), 15);
        ctx.fillStyle = rgba('ash', ka);
        ctx.textAlign = 'center';
        ctx.fillText(name, x + bw / 2, ACT.h - 22);
        ctx.textAlign = 'left';
      });
      label(ctx, 'decoded from action tokens', ACT.w, ACT.h + 30, { size: 12, col: rgba('ash', 0.85 * live), align: 'right', spacing: 1 });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  override drawFx(X: LineBatch, c: Cam, t: number) {
    if (!this.head) return;
    const [sx, sy] = w2s(c, this.head.x, this.head.y);
    drawPen(X, t, () => [sx, sy], { scale: 0.7, rate: 40 });
  }

  override post(t: number): PostOverrides {
    const w = this.w;
    return { zoom: 1 + 0.012 * (pulse(t, w.in1!.start, 0.1) + pulse(t, w.in2!.start, 0.1)) + 0.02 * pulse(t, w.out!.start, 0.1) };
  }
}

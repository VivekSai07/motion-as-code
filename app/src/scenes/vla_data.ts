// VLA DATA — "It learned from 970,000 real robot episodes."
// A counter rolls to 970,000 across the spoken parts of the number while a field of dots (one per
// thousand episodes) fills in behind it; "episodes" sweeps a highlight across the field.
import { type Frame, type PostOverrides } from '../engine/scene';
import { rgba } from '../engine/palette';
import { F, font } from '../engine/type';
import { type Line, type Word } from '../engine/lyrics';
import { clamp, ease, hash, lerp, prog, pulse } from '../engine/util';
import { setWorld, label, mixCss, type Cam } from './_vo';
import { VlaPlate, commas, sylProg } from './_vla';

const COLS = 50, ROWS = 20, STEP = 26, DOT = 12;
const GX = -(COLS * STEP) / 2, GY = 40;

export default class VlaData extends VlaPlate {
  L!: Line;
  w: Record<string, Word> = {};

  override init() {
    this.L = this.ctx.lyrics.get('It learned from');
    this.w = this.words(this.L, [['learned', 'learned'], ['num', '970,000'], ['real', 'real'], ['robot', 'robot'], ['episodes', 'episodes.']]);
    this.row(this.L.words, 0, -330, 1500, 92, 'k', 800, true);
    const K = this.cam, s = this.ctx.start, e = this.ctx.end;
    K.key(s, 0, -120, 1.12);
    K.key(this.w.num!.start, 0, -40, 1.0, 0, ease.inOutCubic);
    K.key(e, 0, 30, 0.9, 0, ease.inOutCubic);
  }

  count(t: number) { return 970000 * ease.outCubic(sylProg(this.w.num!, t)); }

  draw(ctx: CanvasRenderingContext2D, c: Cam, t: number, _f: Frame) {
    const w = this.w;
    const n = this.count(t);
    const kIn = prog(t, w.num!.start - 0.25, w.num!.start);
    // the counter
    if (kIn > 0) {
      setWorld(ctx, c, 0, -110);
      ctx.font = font(F.mono(600), 150);
      ctx.textAlign = 'center';
      ctx.fillStyle = n >= 969999 ? mixCss('signal', 'bone', prog(t, w.num!.end, w.num!.end + 0.5)) : rgba('bone', kIn);
      ctx.fillText(commas(n), 0, 0);
      ctx.textAlign = 'left';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      setWorld(ctx, c, GX, -30);
      label(ctx, 'ROBOT EPISODES · OPEN X-EMBODIMENT', 0, 0, { size: 15, col: rgba('ash', 0.9 * kIn) });
      label(ctx, '1 dot = 1,000 episodes', COLS * STEP - 12, 0, { size: 15, col: rgba('ash', 0.9 * kIn), align: 'right' });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    // the field: dots fill in a scattered order as the count rises
    const lit = n / 1000;
    const sweep = prog(t, w.episodes!.start, w.episodes!.end + 0.3, ease.inOutCubic);
    setWorld(ctx, c, GX, GY);
    for (let r = 0; r < ROWS; r++) {
      for (let q = 0; q < COLS; q++) {
        const i = r * COLS + q;
        if (i >= 1000) continue;
        // fill order: column-major with a little jitter so it reads as data arriving
        const order = q * ROWS + r + hash(q, r, 3) * 40;
        const on = clamp((lit - order) / 25);
        const x = q * STEP, y = r * STEP;
        if (on <= 0) {
          ctx.strokeStyle = rgba('graphite', 0.5 * kIn);
          ctx.lineWidth = 1 / c.z;
          ctx.strokeRect(x, y, DOT, DOT);
          continue;
        }
        const hot = sweep > 0 ? Math.exp(-Math.pow((q / COLS - sweep) * 9, 2)) : 0;
        ctx.fillStyle = hot > 0.05 ? mixCss('bone', 'signal', hot) : rgba('bone', 0.15 + 0.75 * on * (0.6 + 0.4 * hash(i, 9)));
        ctx.fillRect(x, y, DOT, DOT);
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // "real robot": a small tag
    const kr = prog(t, w.real!.start, w.real!.start + 0.2);
    if (kr > 0) {
      setWorld(ctx, c, GX, GY + ROWS * STEP + 30);
      label(ctx, 'REAL ROBOTS · MANY EMBODIMENTS · MANY SCENES', 0, 0, { size: 14, col: rgba('signal', 0.95 * kr) });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  override post(t: number): PostOverrides {
    return { zoom: 1 + 0.015 * pulse(t, this.w.num!.start, 0.1) + 0.01 * pulse(t, this.w.episodes!.start, 0.1) };
  }
}

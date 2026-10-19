// Shared base for the OpenVLA plates: graph-paper sheet + one Canvas2D layer in world space + an
// additive spark layer, karaoke rows fitted to a width, and a few pen-drawing helpers.
// World units are screen px at zoom 1; (0, 0) is the centre of the frame, y down.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { Layer2D } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { rgba } from '../engine/palette';
import { F } from '../engine/type';
import { type Line, type Word } from '../engine/lyrics';
import { clamp, ease, lerp, prog } from '../engine/util';
import { Cam2D, gridPass, setGrid, drawKaraoke, placeRow, fitRow, setWorld, lengths, at, rectPts, wordOf, type KWord, type Cam, type P, type KaraokeOpts } from './_vo';

export const ARCH = (wd: number, wt: number) => F.archivo(wd, wt);
export const expo = (u: number) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u));

/** Polyline drawn up to fraction k of its length (the pen laying it down). Returns the tip. */
export function strokeProg(ctx: CanvasRenderingContext2D, c: Cam, pts: P[], k: number, widthPx: number, color: string): P | null {
  if (k <= 0 || pts.length < 2) return null;
  const L = lengths(pts);
  const tot = L[L.length - 1]!;
  const s = clamp(k) * tot;
  setWorld(ctx, c);
  ctx.lineWidth = widthPx / c.z;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0]!.x, pts[0]!.y);
  let tip: P = pts[0]!;
  for (let i = 1; i < pts.length; i++) {
    if (L[i]! <= s) { ctx.lineTo(pts[i]!.x, pts[i]!.y); tip = pts[i]!; continue; }
    const q = at(pts, L, s);
    ctx.lineTo(q.x, q.y); tip = q;
    break;
  }
  ctx.stroke();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return tip;
}

/** A rectangle drawn clockwise by the pen, 0..1. */
export function rectProg(ctx: CanvasRenderingContext2D, c: Cam, x: number, y: number, w: number, h: number, k: number, widthPx = 1.4, color = rgba('bone', 0.7)) {
  return strokeProg(ctx, c, rectPts(x, y, w, h), k, widthPx, color);
}

/** Text typed at `cps` characters per second from t0. */
export const typed = (text: string, t: number, t0: number, cps = 28) => text.slice(0, Math.max(0, Math.floor((t - t0) * cps)));

/** 970000 -> "970,000" */
export const commas = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** Progress through a word's spoken parts (0 before, 1 after), split evenly across its syllable spans. */
export function sylProg(w: Word, t: number) {
  const ps = w.syl && w.syl.length ? w.syl : [[w.start, w.end]];
  let k = 0;
  for (const [a, b] of ps) k += prog(t, a!, Math.max(a! + 0.05, b!));
  return k / ps.length;
}

export abstract class VlaPlate extends Scene {
  cam = new Cam2D();
  grid = gridPass(24, 96);
  ui = new Layer2D();
  fx = new LineBatch(20000);
  kw: KWord[] = [];
  karaokeOpts: KaraokeOpts = { pop: 0.04 };

  /** Karaoke row for some words, fitted to `width` (capped at `max` px), baseline at (x, y). */
  row(words: Word[], x: number, y: number, width: number, max: number, group = 'k', weight = 800, center = false) {
    const fam = ARCH(100, weight);
    const size = fitRow(words.map((w) => w.w), width, fam, max);
    const probe = placeRow(words, 0, 0, size, fam, group, { ant: 0.25 });
    const x0 = center ? x - probe.width / 2 : x;
    const r = placeRow(words, x0, y, size, fam, group, { ant: 0.25 });
    this.kw.push(...r.words);
    return { size, width: r.width, x: x0 };
  }

  /** Map of keys -> words of a line, by text (nth occurrence). */
  words(l: Line, spec: [string, string, number?][]) {
    const out: Record<string, Word> = {};
    for (const [k, q, n] of spec) out[k] = wordOf(l, q, n ?? 0);
    return out;
  }

  groupAlpha(_g: string, _t: number) { return 1; }
  abstract draw(ctx: CanvasRenderingContext2D, c: Cam, t: number, f: Frame): void;
  drawFx(_X: LineBatch, _c: Cam, _t: number) {}
  post(_t: number): PostOverrides { return {}; }

  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t;
    const c = this.cam.at(t);
    setGrid(this.grid, c, { reveal: [0, 0, 1e5], ink: 0.75 });
    this.grid.render(renderer, out);
    const U = this.ui;
    U.clear();
    const ctx = U.ctx;
    this.draw(ctx, c, t, f);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    drawKaraoke(ctx, c, t, this.kw, { ...this.karaokeOpts, alpha: (g, tt) => this.groupAlpha(g, tt) });
    comp.draw(renderer, U.upload(), out);
    const X = this.fx;
    X.clear();
    this.drawFx(X, c, t);
    X.render(renderer, out);
    // a short ease in from black on every cut keeps the hard cuts soft
    const fadeIn = 1 - ease.outCubic(prog(t, this.ctx.start, this.ctx.start + 0.18));
    return { bloom: 0.7, bloomThreshold: 0.84, vignette: 0.42, grain: 0.05, ...this.post(t), fade: Math.max(fadeIn * 0.85, this.post(t).fade ?? 0) };
  }
}

export { lerp };

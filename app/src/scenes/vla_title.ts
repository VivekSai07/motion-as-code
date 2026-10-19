// VLA TITLE — "This is OpenVLA. A 7-billion-parameter vision-language-action model, and it's fully
// open source."
// The pen rules the sheet; OPEN VLA slams in on its word. Then a spec sheet fills in as it is
// said: the parameter count rolls up, V / L / A light one by one on "vision-language-action",
// and an OPEN SOURCE stamp lands on "open source".
import { type Frame, type PostOverrides } from '../engine/scene';
import { LineBatch } from '../engine/lines';
import { rgba } from '../engine/palette';
import { F, font, measure } from '../engine/type';
import { type Line, type Word } from '../engine/lyrics';
import { clamp, ease, lerp, prog, pulse } from '../engine/util';
import { setWorld, label, pt, drawPen, w2s, mixCss, type Cam, type P } from './_vo';
import { VlaPlate, ARCH, strokeProg, commas, sylProg, expo } from './_vla';

const X0 = -720, CW = 1440;

export default class VlaTitle extends VlaPlate {
  L2!: Line; L3!: Line;
  w: Record<string, Word> = {};
  titleSize = 300;
  fam = ARCH(112, 900);
  head: P | null = null;

  override init() {
    const ly = this.ctx.lyrics;
    this.L2 = ly.get('This is OpenVLA');
    this.L3 = ly.get('vision-language-action');
    Object.assign(this.w, this.words(this.L2, [['this', 'This'], ['is', 'is'], ['vla', 'OpenVLA.']]));
    Object.assign(this.w, this.words(this.L3, [['a', 'A'], ['params', '7-billion-parameter'], ['vla3', 'vision-language-action'], ['model', 'model,'], ['and', 'and'], ['its', 'it’s'], ['fully', 'fully'], ['open', 'open'], ['source', 'source.']]));
    this.row([this.w.this!, this.w.is!], X0, -150, 400, 64, 't', 800);
    this.row(this.L3.words, 0, 455, 1500, 46, 'l3', 700, true);
    this.titleSize = Math.min(330, CW / (measure('OpenVLA', this.fam, 100) / 100));
    const K = this.cam, s = this.ctx.start, e = this.ctx.end, v = this.w.vla!.start;
    K.key(s, 0, -60, 1.18);
    K.key(v + 0.5, 0, -30, 1.1, 0, ease.outCubic);
    K.key(this.L3.start + 0.2, 0, 60, 0.98, 0, ease.inOutCubic);
    K.key(e, 0, 70, 0.95, 0, ease.linear);
  }

  draw(ctx: CanvasRenderingContext2D, c: Cam, t: number, _f: Frame) {
    const w = this.w, s = this.ctx.start;
    this.head = null;
    // the rule across the sheet
    const kr = prog(t, s + 0.05, s + 0.55, ease.inOutCubic);
    const tip = strokeProg(ctx, c, [pt(X0, -250), pt(X0 + CW, -250)], kr, 1.4, rgba('bone', 0.6));
    if (tip && kr < 1) this.head = tip;
    // OPEN VLA: slams in on the word; V L A light up on the spoken parts of "vision-language-action"
    const tv = w.vla!.start;
    const k = prog(t, tv - 0.04, tv + 0.22, ease.outCubic);
    if (k > 0) {
      const sc = lerp(1.18, 1, expo(prog(t, tv - 0.04, tv + 0.3)));
      const S = this.titleSize;
      const y = 110;
      setWorld(ctx, c, X0, y, (S / 100) * sc);
      ctx.font = font(this.fam, 100);
      ctx.globalAlpha = k;
      ctx.textBaseline = 'alphabetic';
      const open = 'Open';
      ctx.fillStyle = rgba('bone', 1);
      ctx.fillText(open, 0, 0);
      let x = measure(open, this.fam, 100);
      const syl = w.vla3!.syl && w.vla3!.syl.length === 3 ? w.vla3!.syl : [[w.vla3!.start, w.vla3!.end], [w.vla3!.start, w.vla3!.end], [w.vla3!.start, w.vla3!.end]];
      ['V', 'L', 'A'].forEach((ch, i) => {
        const on = prog(t, syl[i]![0]!, syl[i]![0]! + 0.12);
        ctx.fillStyle = on > 0 ? mixCss('bone', 'signal', on) : rgba('bone', 1);
        const pop = 1 + 0.12 * pulse(t, syl[i]![0]!, 0.09);
        ctx.save();
        ctx.translate(x + measure(ch, this.fam, 100) / 2, -36);
        ctx.scale(pop, pop);
        ctx.fillText(ch, -measure(ch, this.fam, 100) / 2, 36);
        ctx.restore();
        x += measure(ch, this.fam, 100);
      });
      ctx.globalAlpha = 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      // the dot of "OpenVLA." as a signal square
      setWorld(ctx, c, X0, y);
      label(ctx, 'fig. 1 — open vision-language-action model', CW, -S * 0.86, { size: 14, col: rgba('ash', 0.8 * k), align: 'right' });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    // the spec sheet (on line 3)
    const y0 = 190, rowH = 62;
    const rows: [string, (t: number) => string, number, string?][] = [
      ['PARAMETERS', (tt) => commas(7e9 * ease.outCubic(sylProg(w.params!, tt))), w.params!.start],
      ['MODALITIES', () => '', w.vla3!.start],
      ['LICENSE', () => '', w.open!.start],
    ];
    rows.forEach(([name, val, t0], i) => {
      const kk = prog(t, t0 - 0.2, t0 + 0.1);
      if (kk <= 0) return;
      const y = y0 + i * rowH;
      strokeProg(ctx, c, [pt(X0, y + 18), pt(X0 + CW, y + 18)], kk, 1, rgba('bone', 0.22));
      setWorld(ctx, c, X0, y);
      label(ctx, name, 0, 0, { size: 16, col: rgba('ash', 0.9 * kk) });
      ctx.font = font(F.mono(500), 30);
      ctx.fillStyle = rgba('bone', kk);
      if (i === 0) ctx.fillText(val(t), 380, 2);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    });
    // modalities: vision · language · action, each lighting on its spoken part
    const kv = prog(t, w.vla3!.start - 0.2, w.vla3!.start + 0.1);
    if (kv > 0) {
      const syl = w.vla3!.syl && w.vla3!.syl.length === 3 ? w.vla3!.syl : null;
      let x = 380;
      ['vision', 'language', 'action'].forEach((m, i) => {
        const on = syl ? prog(t, syl[i]![0]!, syl[i]![0]! + 0.15) : sylProg(w.vla3!, t);
        setWorld(ctx, c, X0, y0 + rowH);
        ctx.font = font(F.mono(500), 30);
        ctx.fillStyle = on > 0 ? mixCss('graphite', 'signal', on) : rgba('graphite', kv);
        ctx.fillText(m, x, 2);
        x += ctx.measureText(m).width;
        if (i < 2) { ctx.fillStyle = rgba('ash', kv); ctx.fillText('  →  ', x, 2); x += ctx.measureText('  →  ').width; }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      });
    }
    // the stamp
    const ks = prog(t, w.open!.start, w.open!.start + 0.12, ease.outCubic);
    if (ks > 0) {
      const sc = lerp(1.6, 1, expo(prog(t, w.open!.start, w.open!.start + 0.25)));
      setWorld(ctx, c, X0 + 380 + 150, y0 + 2 * rowH - 10, sc, -0.05);
      ctx.globalAlpha = ks;
      ctx.strokeStyle = rgba('signal', 1);
      ctx.lineWidth = 3 / (c.z * sc);
      ctx.strokeRect(-150, -30, 300, 56);
      ctx.font = font(ARCH(110, 900), 32);
      ctx.fillStyle = rgba('signal', 1);
      ctx.textAlign = 'center';
      ctx.fillText('OPEN SOURCE', 0, 10);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      setWorld(ctx, c, X0, y0 + 2 * rowH);
      label(ctx, 'weights + training code', CW, 2, { size: 14, col: rgba('ash', 0.85 * prog(t, w.source!.start, w.source!.start + 0.3)), align: 'right' });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  override groupAlpha(g: string, t: number) {
    if (g === 'l3') return prog(t, this.L3.start - 0.4, this.L3.start - 0.1);
    return 1;
  }

  override drawFx(X: LineBatch, c: Cam, t: number) {
    if (!this.head) return;
    const [sx, sy] = w2s(c, this.head.x, this.head.y);
    drawPen(X, t, () => [sx, sy], { scale: 0.8, rate: 50 });
  }

  override post(t: number): PostOverrides {
    const w = this.w;
    return { zoom: 1 + 0.03 * pulse(t, w.vla!.start, 0.1) + 0.012 * pulse(t, w.open!.start, 0.1), flash: 0.12 * pulse(t, w.vla!.start, 0.06) };
  }
}

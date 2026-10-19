// VLA VERSUS — "And it beats RT-2-X, a closed model almost eight times its size. Pretty wild for
// something you can download today."
// Two discs with areas in proportion to parameter count: OpenVLA (7B, open, solid signal) and
// RT-2-X (55B, closed, dashed with a lock). OpenVLA gets the check on "beats"; a dimension line reads
// the ratio on "eight times". On the last line the camera closes in on OpenVLA and a download arrow
// drops into it.
import { type Frame, type PostOverrides } from '../engine/scene';
import { LineBatch } from '../engine/lines';
import { rgba } from '../engine/palette';
import { F, font } from '../engine/type';
import { type Line, type Word } from '../engine/lyrics';
import { clamp, ease, lerp, prog, pulse, TAU } from '../engine/util';
import { setWorld, label, pt, arc, drawPen, w2s, mixCss, type Cam, type P } from './_vo';
import { VlaPlate, ARCH, strokeProg, expo } from './_vla';

const R1 = 105, R2 = R1 * Math.sqrt(55 / 7); // areas ~ parameters
const C1 = pt(-470, 60), C2 = pt(300, 60);

export default class VlaVersus extends VlaPlate {
  L6!: Line; L7!: Line;
  w: Record<string, Word> = {};
  head: P | null = null;

  override init() {
    const ly = this.ctx.lyrics;
    this.L6 = ly.get('And it beats');
    this.L7 = ly.get('Pretty wild');
    Object.assign(this.w, this.words(this.L6, [['and', 'And'], ['beats', 'beats'], ['rt', 'RT-2-X,'], ['closed', 'closed'], ['model', 'model'], ['almost', 'almost'], ['eight', 'eight'], ['times', 'times'], ['size', 'size.']]));
    Object.assign(this.w, this.words(this.L7, [['pretty', 'Pretty'], ['wild', 'wild'], ['download', 'download'], ['today', 'today.']]));
    this.row(this.L6.words, 0, -380, 1560, 84, 'l6', 800, true);
    this.row(this.L7.words, C1.x, C1.y + R1 + 170, 760, 64, 'l7', 800, true);
    const K = this.cam, s = this.ctx.start, e = this.ctx.end, w = this.w;
    K.key(s, -200, -40, 1.05);
    K.key(w.rt!.start, 0, -30, 0.92, 0, ease.inOutCubic);
    K.key(w.size!.end, 0, -20, 0.88, 0, ease.linear);
    K.key(this.L7.start + 0.5, C1.x, C1.y + 90, 1.35, 0, ease.inOutCubic);
    K.key(e, C1.x, C1.y + 90, 1.42, 0, ease.linear);
  }

  draw(ctx: CanvasRenderingContext2D, c: Cam, t: number, _f: Frame) {
    const w = this.w;
    this.head = null;
    const pen = (p: P | null, k: number) => { if (p && k > 0 && k < 1) this.head = p; };
    // OpenVLA disc
    const k1 = prog(t, w.and!.start - 0.1, w.and!.start + 0.35, ease.inOutCubic);
    if (k1 > 0) {
      const fill = prog(t, w.beats!.start, w.beats!.start + 0.2);
      setWorld(ctx, c, C1.x, C1.y);
      if (fill > 0) { ctx.fillStyle = rgba('signal', 0.92 * fill); ctx.beginPath(); ctx.arc(0, 0, R1, 0, TAU); ctx.fill(); }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      pen(strokeProg(ctx, c, arc(C1.x, C1.y, R1, -Math.PI / 2, Math.PI * 1.5, 96), k1, 2.4, rgba('signal', 1)), k1);
      setWorld(ctx, c, C1.x, C1.y);
      ctx.font = font(ARCH(110, 900), 44);
      ctx.textAlign = 'center';
      const hide7 = 1 - prog(t, w.download!.start - 0.15, w.download!.start + 0.05);
      ctx.globalAlpha = hide7;
      ctx.fillStyle = fill > 0.5 ? rgba('ink', 1) : rgba('bone', k1);
      ctx.fillText('7B', 0, 16);
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
      label(ctx, 'OPENVLA · OPEN', 0, R1 + 46, { size: 15, col: rgba('bone', 0.9 * k1), align: 'center' });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      // the check, on "beats"
      const kc = prog(t, w.beats!.start + 0.05, w.beats!.start + 0.35, ease.outCubic);
      pen(strokeProg(ctx, c, [pt(C1.x - 34, C1.y - R1 - 70), pt(C1.x - 8, C1.y - R1 - 44), pt(C1.x + 42, C1.y - R1 - 104)], kc, 7, rgba('signal', 1)), kc);
      if (kc > 0) {
        setWorld(ctx, c, C1.x, C1.y - R1 - 128);
        label(ctx, 'OUTPERFORMS', 0, 0, { size: 14, col: rgba('signal', 0.95 * kc), align: 'center' });
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
    }
    // RT-2-X disc: dashed (closed), with a lock
    const k2 = prog(t, w.rt!.start - 0.05, w.rt!.start + 0.6, ease.inOutCubic);
    if (k2 > 0) {
      const closed = prog(t, w.closed!.start, w.closed!.start + 0.25);
      ctx.setLineDash([14 / c.z, 10 / c.z]);
      pen(strokeProg(ctx, c, arc(C2.x, C2.y, R2, -Math.PI / 2, Math.PI * 1.5, 160), k2, 2, mixCss('bone', 'graphite', closed)), k2);
      ctx.setLineDash([]);
      setWorld(ctx, c, C2.x, C2.y);
      ctx.font = font(ARCH(110, 900), 96);
      ctx.textAlign = 'center';
      ctx.fillStyle = rgba('bone', 0.85 * k2);
      ctx.fillText('55B', 0, 34);
      ctx.textAlign = 'left';
      label(ctx, 'RT-2-X · CLOSED', 0, R2 + 46, { size: 15, col: rgba('ash', 0.95 * k2), align: 'center' });
      // lock
      if (closed > 0) {
        const pop = 1 + 0.25 * pulse(t, w.closed!.start, 0.08);
        ctx.translate(0, -R2 * 0.5);
        ctx.scale(pop, pop);
        ctx.globalAlpha = closed;
        ctx.strokeStyle = rgba('bone', 0.9); ctx.lineWidth = 4 / c.z;
        ctx.beginPath(); ctx.arc(0, -10, 16, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = rgba('bone', 0.9); ctx.fillRect(-24, -10, 48, 36);
        ctx.fillStyle = rgba('ink', 1); ctx.fillRect(-3, 0, 6, 14);
        ctx.globalAlpha = 1;
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    // dimension: ~8x, on "almost eight times its size"
    const kd = prog(t, w.almost!.start, w.times!.end, ease.inOutCubic) * (1 - prog(t, this.L7.start - 0.4, this.L7.start));
    if (kd > 0) {
      const y = C2.y + R2 + 90;
      pen(strokeProg(ctx, c, [pt(C1.x - R1, y), pt(C2.x + R2, y)], kd, 1.4, rgba('bone', 0.7)), kd);
      setWorld(ctx, c, (C1.x - R1 + C2.x + R2) / 2, y);
      ctx.fillStyle = rgba('ink', 1);
      ctx.fillRect(-150, -24, 300, 40);
      ctx.font = font(F.mono(600), 26);
      ctx.textAlign = 'center';
      ctx.fillStyle = rgba('signal', kd);
      ctx.fillText('55B / 7B ≈ 7.9×', 0, 8);
      ctx.textAlign = 'left';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    // download arrow into OpenVLA on the last line
    const kdl = prog(t, w.download!.start - 0.1, w.download!.start + 0.35, ease.outCubic);
    if (kdl > 0) {
      const drop = lerp(-90, 0, expo(kdl));
      setWorld(ctx, c, C1.x, C1.y + drop);
      ctx.globalAlpha = kdl;
      ctx.strokeStyle = rgba('ink', 1); ctx.lineWidth = 9 / c.z; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(0, -46); ctx.lineTo(0, 22); ctx.moveTo(-28, -6); ctx.lineTo(0, 22); ctx.lineTo(28, -6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-40, 40); ctx.lineTo(40, 40); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      setWorld(ctx, c, C1.x, C1.y + R1 + 82);
      label(ctx, 'huggingface.co/openvla', 0, 0, { size: 16, col: rgba('ash', 0.95 * prog(t, w.today!.start, w.today!.start + 0.3)), align: 'center', spacing: 1 });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  override groupAlpha(g: string, t: number) {
    if (g === 'l6') return 1 - prog(t, this.L7.start - 0.5, this.L7.start - 0.1);
    if (g === 'l7') return prog(t, this.L7.start - 0.4, this.L7.start - 0.1);
    return 1;
  }

  override drawFx(X: LineBatch, c: Cam, t: number) {
    if (!this.head) return;
    const [sx, sy] = w2s(c, this.head.x, this.head.y);
    drawPen(X, t, () => [sx, sy], { scale: 0.7, rate: 40 });
  }

  override post(t: number): PostOverrides {
    const w = this.w, e = this.ctx.end;
    return {
      zoom: 1 + 0.025 * pulse(t, w.beats!.start, 0.1) + 0.012 * pulse(t, w.closed!.start, 0.1) + 0.015 * pulse(t, w.download!.start, 0.1),
      fade: prog(t, e - 0.35, e, ease.inQuad),
    };
  }
}

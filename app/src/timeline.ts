// The edit: which plate plays when. A voiceover has no beat grid, so every cut sits in the pause
// before a line: just before its first word (never after it), anchored to the aligned script
// (data/lyrics.json).
import type { TimelineEntry } from './engine/engine';
import type { SceneClass } from './engine/scene';
import type { Lyrics } from './engine/lyrics';
import type { AudioData } from './engine/audio';

// Scene modules are discovered lazily so a missing/broken scene never breaks the build.
const modules = import.meta.glob<{ default: SceneClass }>('./scenes/*.ts');
const scene = (name: string) => () => {
  const m = modules[`./scenes/${name}.ts`];
  return m ? m() : Promise.reject(new Error(`scene module not found: scenes/${name}.ts`));
};

export function makeTimeline(ly: Lyrics, au: AudioData): TimelineEntry[] {
  /** Cut in the pause before the line containing q: 0.18 s before its first word (less if the pause is short). */
  const cut = (q: string, nth = 0) => {
    const l = ly.get(q, nth);
    const prev = ly.lines[l.i - 1];
    const gap = prev ? l.start - prev.end : 1;
    return l.start - Math.min(0.18, Math.max(0.04, gap * 0.45));
  };
  // OpenVLA explainer: one plate per beat of the script (see scenes/vla_*.ts)
  const b = {
    title: cut('This is OpenVLA'),
    data: cut('It learned from'),
    io: cut('Camera image in'),
    versus: cut('And it beats'),
    end: au.duration,
  };
  const E = (id: string, file: string, start: number, end: number, extra: Partial<TimelineEntry> = {}): TimelineEntry =>
    ({ id, load: scene(file), start, end, ...extra });
  return [
    E('hook', 'vla_hook', 0, b.title),
    E('title', 'vla_title', b.title, b.data),
    E('data', 'vla_data', b.data, b.io),
    E('io', 'vla_io', b.io, b.versus),
    E('versus', 'vla_versus', b.versus, b.end),
  ];
}

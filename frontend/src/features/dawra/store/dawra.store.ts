/**
 * مقام · مخزن الدورة (Zustand)
 * الحالة هنا، والحساب في المحركات النقيّة. لا منطق أعمال في المكوّنات.
 */
import { create } from 'zustand';
import type {
  Node, Power, GridKind, HeelPattern, AccentMode, Syllable, Bar,
} from '../types';
import { PRESETS, THRESHOLDS } from '../constants';
import {
  buildNodes, placeSyllables, parseSequence, type CycleConfig,
} from '../engine/cycle.engine';
import { scanBar } from '../engine/syllable.engine';

export interface DawraState {
  /* ── الإعدادات ── */
  bpm: number;
  grid: GridKind;
  lean: number;
  seq: number[];
  rest: number;
  heel: HeelPattern;
  acc: AccentMode;
  presetIdx: number;

  /* ── المحتوى ── */
  text: string;
  syls: Syllable[];
  nodes: Node[];

  /* ── التشغيل ── */
  playing: boolean;
  step: number;

  /* ── أفعال ── */
  setBpm: (v: number) => void;
  setGrid: (v: GridKind) => void;
  setLean: (v: number) => void;
  setSeqText: (v: string) => void;
  setRest: (v: number) => void;
  setHeel: (v: HeelPattern) => void;
  setAcc: (v: AccentMode) => void;
  applyPreset: (i: number) => void;

  setText: (v: string) => void;
  setSylSpan: (i: number, u: 1 | 2) => void;
  removeSyl: (i: number) => void;
  clearText: () => void;
  loadBar: (bar: Bar) => void;

  cycleNodePower: (i: number) => void;
  toggleNodeStress: (i: number) => void;

  setPlaying: (v: boolean) => void;
  setStep: (v: number) => void;

  /** يُعيد بناء العقد ويُعيد الإسقاط — يُستدعى بعد أي تغيير في الإعدادات */
  rebuild: () => void;
  config: () => CycleConfig;
}

const initialSeq = PRESETS[0].s.slice();

export const useDawra = create<DawraState>((set, get) => {
  const rebuild = () => {
    const s = get();
    const cfg: CycleConfig = {
      grid: s.grid, seq: s.seq, rest: s.rest,
      heel: s.heel, acc: s.acc, lean: s.lean,
    };
    set({ nodes: placeSyllables(buildNodes(cfg), s.syls) });
  };

  return {
    bpm: 88,
    grid: 16,
    lean: THRESHOLDS.defaultLean,
    seq: initialSeq,
    rest: PRESETS[0].r,
    heel: 'std',
    acc: '332',
    presetIdx: 0,

    text: 'في الليل نكتب والنهار يمحي',
    syls: scanBar('في الليل نكتب والنهار يمحي'),
    nodes: [],

    playing: false,
    step: -1,

    config: () => {
      const s = get();
      return { grid: s.grid, seq: s.seq, rest: s.rest, heel: s.heel, acc: s.acc, lean: s.lean };
    },

    rebuild,

    setBpm: (v) => set({ bpm: v }),
    setGrid: (v) => { set({ grid: v }); rebuild(); },
    setLean: (v) => { set({ lean: v }); rebuild(); },
    setRest: (v) => { set({ rest: v, presetIdx: -1 }); rebuild(); },
    setSeqText: (v) => { set({ seq: parseSequence(v), presetIdx: -1 }); rebuild(); },
    setHeel: (v) => { set({ heel: v }); rebuild(); },
    setAcc: (v) => { set({ acc: v }); rebuild(); },

    applyPreset: (i) => {
      const p = PRESETS[i];
      if (!p) return;
      set({ seq: p.s.slice(), rest: p.r, presetIdx: i });
      rebuild();
    },

    setText: (v) => { set({ text: v, syls: scanBar(v) }); rebuild(); },

    setSylSpan: (i, u) => {
      const syls = get().syls.map((s, k) =>
        k === i
          ? { ...s, u, k: u === 2 ? ('long' as const) : (s.w === 'ثقيل' ? ('heavy' as const) : ('' as const)) }
          : s
      );
      set({ syls });
      rebuild();
    },

    removeSyl: (i) => { set({ syls: get().syls.filter((_, k) => k !== i) }); rebuild(); },

    clearText: () => { set({ text: '', syls: [] }); rebuild(); },

    loadBar: (bar) => {
      set({ text: bar.text, syls: bar.syls.map((s) => ({ ...s })) });
      rebuild();
    },

    /** دورة القوة ٠→١→٢→٣→٠ */
    cycleNodePower: (i) => {
      const nodes = get().nodes.slice();
      const nd = nodes[i];
      if (!nd) return;
      nodes[i] = { ...nd, v: (((nd.v + 1) % 4) as Power) };
      set({ nodes: placeSyllables(nodes, get().syls) });
    },

    /** تبديل النبر: ٢ ↔ ١ */
    toggleNodeStress: (i) => {
      const nodes = get().nodes.slice();
      const nd = nodes[i];
      if (!nd) return;
      nodes[i] = { ...nd, v: (nd.v >= 2 ? 1 : 2) as Power };
      set({ nodes: placeSyllables(nodes, get().syls) });
    },

    setPlaying: (v) => set({ playing: v }),
    setStep: (v) => set({ step: v }),
  };
});

/* بناء أولي */
useDawra.getState().rebuild();

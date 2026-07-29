/**
 * مقام · محرك الدورة
 * SPEC-04 §2 (سلّم الزمن) · §6.2 (العقب) · §7.2 (مؤشرات الصحّة)
 *
 * دوالّ نقيّة: تأخذ الحالة وتُرجع نتيجة. لا React، لا mutation خارجي.
 */
import type {
  Node, Power, GridKind, HeelPattern, AccentMode, Syllable, HealthMetric,
} from '../types';
import {
  CYCLE, BARS, LISAN, DRUM, THRESHOLDS,
  quatrainCells, freeCells, cycleBars, stepsPerBeat, ar,
} from '../constants';

/* ══════════ إعدادات الدورة ══════════ */
export interface CycleConfig {
  grid: GridKind;
  seq: number[];
  rest: number;
  heel: HeelPattern;
  acc: AccentMode;
  lean: number;
}

/* ══════════ القفل · SPEC-04 §2.3 ══════════ */

export const seqSum = (seq: number[]) => seq.reduce((a, b) => a + b, 0);
export const separators = (seq: number[]) => Math.max(0, seq.length - 1);
export const restTotal = (seq: number[], rest: number) => rest * separators(seq);
export const grandTotal = (seq: number[], rest: number) =>
  seqSum(seq) + restTotal(seq, rest);
export const isLocked = (seq: number[], rest: number) =>
  grandTotal(seq, rest) === CYCLE;

/**
 * مسافة السكوت التي تُقفل الجملة.
 * r = (٤٨ − Σs) ÷ (عدد المجموعات − ١) — ويجب أن يكون صحيحاً.
 */
export function suggestedRest(seq: number[]): number | null {
  const need = CYCLE - seqSum(seq);
  const k = separators(seq);
  if (k <= 0 || need < 0) return null;
  return need % k === 0 ? need / k : null;
}

/** تلميح التصحيح المعروض للمستخدم */
export function lockHint(seq: number[], rest: number): string {
  if (isLocked(seq, rest)) {
    return `${ar(seqSum(seq))} خانة كلام + ${ar(restTotal(seq, rest))} خانة سكوت = ٤٨ ✓`;
  }
  const fix = suggestedRest(seq);
  if (fix !== null) return `اضبط مسافة السكوت على ${ar(fix)} لتقفل الجملة.`;
  const need = CYCLE - seqSum(seq);
  return `عدّل المنحنى: تحتاج ${ar(need)} خانة سكوت موزّعة على ${ar(separators(seq))} فاصلاً.`;
}

/* ══════════ اللسان والطبول · SPEC-04 §3.4 ══════════ */

/** هل هذه الخانة مرساة نبر؟ (step ١-based داخل البار) */
export function isAnchor(step: number, grid: GridKind, acc: AccentMode): boolean {
  if (acc === 'off') return false;
  if (acc === 'beat') return (step - 1) % stepsPerBeat(grid) === 0;
  return LISAN[grid].includes(step);
}

/** هل هذه الخانة نبضة طبل؟ */
export const isDrum = (step: number, grid: GridKind): boolean =>
  DRUM[grid].includes(step);

/* ══════════ العقب · SPEC-04 §6.2 ══════════ */

export const beatStep = (beat: number, grid: GridKind) =>
  (beat - 1) * stepsPerBeat(grid) + 1;

/** خانات العقب في بار معيّن (barIdx ٠-based) */
export function heelSteps(barIdx: number, grid: GridKind, heel: HeelPattern): number[] {
  const b1 = 1;
  const b2 = beatStep(2, grid);
  const b4 = beatStep(4, grid);
  switch (heel) {
    case 'std': return [b4];
    case 'dsp': return [b2];
    case 'alt': return [barIdx % 2 === 0 ? b2 : b4];
    case 'mul': return [b4, b1];
  }
}

/* ══════════ بناء العقد ══════════ */

/**
 * يبني الرباعية كاملة (٦٤ أو ٤٨ خانة).
 * منحنى الطاقة يملأ الدورة (٤٨) فقط — الباقي مساحة القفلة.
 */
export function buildNodes(cfg: CycleConfig): Node[] {
  const total = quatrainCells(cfg.grid);
  const out: Node[] = [];

  cfg.seq.forEach((n, gi) => {
    for (let k = 0; k < n; k++) {
      out.push({ v: 1, g: gi, head: k === 0, mu: 0, syl: '', ext: false });
    }
    if (gi < cfg.seq.length - 1) {
      for (let k = 0; k < cfg.rest; k++) {
        out.push({ v: 0, g: -1, head: false, mu: 0, syl: '', ext: false });
      }
    }
  });

  while (out.length < total) {
    out.push({ v: 0, g: -1, head: false, mu: 0, syl: '', ext: false });
  }
  const nodes = out.slice(0, total);

  // بذر القوة والميلان من قوانين النظام
  const spb = stepsPerBeat(cfg.grid);
  nodes.forEach((nd, i) => {
    if (nd.v === 0) {
      nd.mu = 0;
      return;
    }
    const bar = Math.floor(i / cfg.grid);
    const st = (i % cfg.grid) + 1;
    let v: Power = 1;
    if (isAnchor(st, cfg.grid, cfg.acc)) v = 2;
    if (nd.head) v = (Math.max(v, 2) as Power);
    if (heelSteps(bar, cfg.grid, cfg.heel).includes(st)) v = 3;
    nd.v = v;
    // الاتّكاء: آخر تقسيم من كل نبضة يتأخر خلفها
    nd.mu = st % spb === 0 ? cfg.lean : 0;
  });

  return nodes;
}

/* ══════════ الإسقاط المقطعي · SPEC-04 §1.2 ══════════ */

/**
 * قانون التفاوض العضوي: المقطع الممدود يُسقط على خانتين تلقائياً.
 * يُرجع نسخة جديدة — لا يُعدّل المدخل.
 */
export function placeSyllables(nodes: Node[], syls: Syllable[]): Node[] {
  const out = nodes.map((n) => ({ ...n, syl: '', ext: false }));
  const active: number[] = [];
  out.forEach((n, i) => {
    if (n.v > 0) active.push(i);
  });

  let p = 0;
  for (const s of syls) {
    if (p >= active.length) break;
    out[active[p]].syl = s.t;
    if (s.u === 2 && p + 1 < active.length) {
      out[active[p + 1]].ext = true;
      p += 2;
    } else {
      p += 1;
    }
  }
  return out;
}

/* ══════════ الأقواس المرقّمة · SPEC-04 §3.3 ══════════ */

export interface Arc {
  start: number;
  len: number;
}

/** مجموعات التشديد داخل بار واحد — الرقم = عدد المقاطع */
export function barArcs(nodes: Node[], barIdx: number, grid: GridKind): Arc[] {
  const arcs: Arc[] = [];
  const base = barIdx * grid;
  let i = 0;
  while (i < grid) {
    const g = nodes[base + i]?.g;
    if (g === undefined || g < 0) {
      i++;
      continue;
    }
    let j = i;
    while (j < grid && nodes[base + j]?.g === g) j++;
    arcs.push({ start: i, len: j - i });
    i = j;
  }
  return arcs;
}

/* ══════════ مؤشرات الصحّة · SPEC-04 §7.2 ══════════ */

export function healthMetrics(
  nodes: Node[],
  cfg: CycleConfig,
  syls: Syllable[]
): HealthMetric[] {
  const cyc = nodes.slice(0, CYCLE);
  const act = cyc.filter((n) => n.v > 0);
  const silent = CYCLE - act.length;
  const density = act.length / CYCLE;
  const breath = silent / CYCLE;

  const mean = act.length ? act.reduce((a, n) => a + n.v, 0) / act.length : 0;
  const sigma = act.length
    ? Math.sqrt(act.reduce((a, n) => a + (n.v - mean) ** 2, 0) / act.length)
    : 0;

  // كسرة الثالث
  const dens: number[] = [];
  for (let b = 0; b < cycleBars(cfg.grid); b++) {
    const slice = nodes.slice(b * cfg.grid, (b + 1) * cfg.grid);
    dens.push(slice.filter((n) => n.v > 0).length / cfg.grid);
  }
  const base = dens.length >= 3 ? (dens[0] + dens[1]) / 2 : 0;
  const dev = dens.length >= 3 ? Math.abs(dens[2] - base) : 0;
  const devOk = dev >= THRESHOLDS.thirdDevMin;

  // التفاوض العضوي
  const longTotal = syls.filter((s) => s.u === 2).length;
  const longPlaced = nodes.filter((n) => n.ext).length;
  const organic = longTotal ? longPlaced / longTotal : 1;

  const total = grandTotal(cfg.seq, cfg.rest);
  const locked = total === CYCLE;
  const breathOk = breath >= THRESHOLDS.breathMin && breath <= THRESHOLDS.breathMax;
  const sigmaOk = sigma >= THRESHOLDS.sigmaMin;

  return [
    {
      key: 'lock', label: 'القفل', value: `${ar(total)}/٤٨`, ratio: total / CYCLE,
      note: locked ? 'الجملة مقفولة' : 'غير مقفولة', status: locked ? 'ok' : 'no',
    },
    {
      key: 'breath', label: 'مساحة النفس', value: `${ar(Math.round(breath * 100))}٪`, ratio: breath,
      note: breathOk ? 'فيه مساحة تتنفّس' : 'راجع السكتات', status: breathOk ? 'ok' : '',
    },
    {
      key: 'sigma', label: 'حيوية الأداء', value: sigma.toFixed(2), ratio: sigma / 1.2,
      note: sigmaOk ? 'أداؤك متنوّع' : 'أداء مسطّح', status: sigmaOk ? 'ok' : 'no',
    },
    {
      key: 'density', label: 'كثافة التدفق', value: `${ar(Math.round(density * 100))}٪`, ratio: density,
      note: `${ar(act.length)} من ٤٨ خانة`, status: '',
    },
    {
      key: 'third', label: 'كسرة الثالث', value: devOk ? '✓' : '✗', ratio: Math.min(dev / 0.3, 1),
      note: devOk ? 'البار ٣ يكسر التوقّع' : 'البار ٣ مطابق', status: devOk ? 'ok' : 'no',
    },
    {
      key: 'organic', label: 'التفاوض العضوي', value: `${ar(Math.round(organic * 100))}٪`, ratio: organic,
      note: organic >= 1 ? 'مافيش مقطع مضغوط' : 'مدّ محشور في خانة', status: organic >= 1 ? 'ok' : 'no',
    },
  ];
}

/* ══════════ تلميح الوعاء ══════════ */
export function vesselHint(grid: GridKind): string {
  const free = freeCells(grid);
  return free > 0
    ? `الجملة تقفل في ${ar(cycleBars(grid))} بارات ويبقى البار الرابع مساحة القفلة (${ar(free)} خانة حرّة).`
    : 'الجملة تملأ الرباعية كاملة — بلا مساحة تنفّس. هذا سرّ إحساس الثلاثيات الملاحِق.';
}

/** هل هذا البار داخل مساحة القفلة؟ */
export const isFreeBar = (barIdx: number, grid: GridKind): boolean =>
  barIdx * grid >= CYCLE;

/** تحليل نص المنحنى الذي يكتبه المستخدم */
export function parseSequence(v: string): number[] {
  const a = String(v)
    .split(/[^0-9]+/)
    .map(Number)
    .filter((n) => n > 0 && n <= 24);
  return a.length ? a : [1];
}

export { CYCLE, BARS, quatrainCells, freeCells, cycleBars, stepsPerBeat };

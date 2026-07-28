/**
 * مقام · بصمة الدورة
 * SPEC-04 §5.1 — تُحسب تلقائياً لحظة الحقن الدفعي، بلا أي إدخال يدوي.
 * قرار س٢ المعتمد: `vProfile` يُشتق آلياً من النبر الطبيعي.
 */
import type {
  Bar, CycleFingerprint, Power, RhymeFamily, Syllable, GridKind,
} from '../types';
import { measure } from '../engine/syllable.engine';
import { LISAN, THRESHOLDS, RHYME_FAMILIES } from '../constants';

/**
 * اشتقاق مصفوفة القوة من النبر الطبيعي.
 * القاعدة (SPEC-04 §5.1-ب):
 *   المقطع الأخير  → ٣ (هبوط القافية)
 *   المقطع الثقيل  → ٢ (مرساة نبر)
 *   المقطع الخفيف  → ١ (أرضية التدفق)
 */
export function deriveVProfile(syls: Syllable[]): Power[] {
  return syls.map((s, i) =>
    i === syls.length - 1 ? 3 : s.w === 'ثقيل' ? 2 : 1
  );
}

/** الانحراف المعياري — حيوية الأداء */
export function stdDev(values: number[]): number {
  if (!values.length) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length);
}

/** مواضع النبر الطبيعي داخل البار */
export function deriveStressMap(syls: Syllable[]): number[] {
  const map: number[] = [];
  let cell = 1;
  syls.forEach((s) => {
    if (s.w === 'ثقيل') map.push(cell);
    cell += s.u;
  });
  return map;
}

/**
 * مطابقة إيقاع اللسان ٣-٣-٢.
 * كم من مواضع النبر الطبيعي تقع على مراسي اللسان.
 */
export function lisanMatch(stressMap: number[], grid: GridKind = 16): number {
  if (!stressMap.length) return 0;
  const anchors = LISAN[grid];
  const hits = stressMap.filter((s) => anchors.includes(((s - 1) % grid) + 1)).length;
  return +(hits / stressMap.length).toFixed(2);
}

/** هل يقبل البار الشبكتين؟ */
export function gridAffinity(cells: number): GridKind | 'both' {
  if (cells <= 12) return 'both';
  if (cells <= 16) return 16;
  return 'both';
}

/** بصمة الدورة الكاملة لنصّ بار */
export function fingerprint(text: string): CycleFingerprint & { syls: Syllable[] } {
  const m = measure(text);
  const vProfile = deriveVProfile(m.syls);
  const stressMap = deriveStressMap(m.syls);
  const grid = gridAffinity(m.cells);
  const refGrid: GridKind = grid === 12 ? 12 : 16;

  return {
    syl: m.syl,
    cells: m.cells,
    longAt: m.longAt,
    grid,
    vProfile,
    vSigma: +stdDev(vProfile).toFixed(2),
    breath: +Math.max(0, (16 - m.cells) / 16).toFixed(2),
    heelBeat: 4,
    leanHint: THRESHOLDS.defaultLean,
    stressMap,
    lisanMatch: lisanMatch(stressMap, refGrid),
    syls: m.syls,
  };
}

/** توليد بار كامل جاهز للتخزين */
export function makeBar(
  text: string,
  opts: { id?: string; fam?: RhymeFamily; index?: number } = {}
): Bar {
  const fp = fingerprint(text);
  const idx = opts.index ?? 0;
  return {
    id: opts.id ?? `b_${String(idx + 1).padStart(4, '0')}`,
    text,
    fam: opts.fam ?? RHYME_FAMILIES[idx % RHYME_FAMILIES.length],
    ...fp,
  };
}

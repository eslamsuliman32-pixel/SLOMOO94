// MAQAM · SPEC-03 · خط الأنابيب الكامل + المستودع
// يستهلك الطبقة صفر (SPEC-01) للتقطيع والبصمة والإسقاط، والطبقة الأولى (SPEC-02)
// للمطابقة — ولا يعيد تنفيذ أيٍّ منهما. §٠ من SPEC-01 مُلزِمة هنا.

import { normalize } from '../syllabifier/normalize.ts'
import { syllabifyWord } from '../syllabifier/syllabify.ts'
import { liaise } from '../syllabifier/liaise.ts'
import { fingerprint } from '../syllabifier/fingerprint.ts'
import { project } from '../syllabifier/project.ts'
import { GRID_16, GRID_12 } from '../syllabifier/grid.ts'
import type { GridSpec, Lexicon, Syllable } from '../syllabifier/types.ts'
import { matchScore } from '../barMatcher/match.ts'
import { extractRhyme } from './rhyme.ts'
import type { RhymeInfo } from './rhyme.ts'
import { classifyLayers } from './layers.ts'
import type { LayerMetrics } from './layers.ts'

export type GridType = '16' | '12' | 'hyb'

const GRID_HYBRID: GridSpec = { subdivisions: [4, 4, 3, 3] }

export function gridSpecOf(t: GridType): GridSpec {
  return t === '12' ? GRID_12 : t === 'hyb' ? GRID_HYBRID : GRID_16
}

export interface RepoWord {
  text: string
  syllables: Syllable[]
}

/** حالة المسودّة: draft = بلا تشكيل بعد (الطبقات الأربع غير محسوبة)، measured = مقاسة بالكامل */
export type BarStatus = 'draft' | 'measured'

export interface RepoBar extends LayerMetrics {
  id: number
  raw: string
  tag: string
  gridType: GridType
  status: BarStatus
  words: RepoWord[]
  syllables: Syllable[]
  rhyme: RhymeInfo | null
  hash: string
  lockScore: number
  ts: number
}

/** هل النص يحمل تشكيلاً؟ الطبقة صفر تحتاجه لتقطيع دقيق (§٣.٣ من SPEC-01). */
export function hasTashkeel(text: string): boolean {
  return /[ً-ْ]/.test(text)
}

export interface ProcessOutcome {
  bar: RepoBar | null
  /** سبب الرفض حين يتعذّر التقطيع — يُعرَض للمستخدم بدل الفشل الصامت */
  reason: 'ok' | 'empty' | 'needs-tashkeel'
}

/**
 * خط الأنابيب: تطبيع (SPEC-01) → تقطيع بالكلمة → وصل الحدود → بصمة → إسقاط على الشبكة
 * → الطبقات الأربع (SPEC-03) → استخراج القافية (SPEC-03).
 */
export function processBar(
  raw: string,
  opts: { tag?: string; gridType?: GridType; id: number; lex: Lexicon },
): ProcessOutcome {
  const text = raw.trim()
  if (!text) return { bar: null, reason: 'empty' }

  const gridType = opts.gridType ?? '16'
  const words = normalize(text)
  const perWord = words.map((w, wordIndex) =>
    syllabifyWord(w, opts.lex).map((s) => ({ ...s, wordIndex })),
  )
  const syllables = liaise(perWord)

  if (!syllables.length) {
    // التقطيع الفونوتاكتيكي يحتاج حركات صريحة؛ بلا تشكيل ولا مدخل معجمي لا نُخمّن.
    return { bar: null, reason: hasTashkeel(text) ? 'empty' : 'needs-tashkeel' }
  }

  const fp = fingerprint(syllables)
  const projection = project(fp, gridSpecOf(gridType))
  const layers = classifyLayers(syllables)
  const rhyme = extractRhyme(syllables)

  // إعادة تجميع المقاطع في كلمات للعرض (wordIndex يضعه هذا الملف أعلاه)
  const grouped = new Map<number, Syllable[]>()
  for (const s of syllables) {
    const arr = grouped.get(s.wordIndex)
    if (arr) arr.push(s)
    else grouped.set(s.wordIndex, [s])
  }
  const repoWords: RepoWord[] = [...grouped.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([i, syls]) => ({ text: words[i]?.text ?? '', syllables: syls }))

  return {
    reason: 'ok',
    bar: {
      id: opts.id,
      raw: text,
      tag: opts.tag?.trim() || '—',
      gridType,
      status: 'measured',
      words: repoWords,
      syllables,
      rhyme,
      hash: fp.hash,
      lockScore: +projection.lockScore.toFixed(3),
      ts: Date.now(),
      ...layers,
    },
  }
}

/* ══════════ التجميع الذكي ══════════ */

export type GroupAxis = 'rawi' | 'rhymeL2' | 'mora' | 'sylCount' | 'family' | 'stress'

export const AXIS_LABEL: Record<GroupAxis, string> = {
  rawi: 'حرف الروي',
  rhymeL2: 'الروي + الردف',
  mora: 'بصمة الوزن',
  sylCount: 'عدد المقاطع',
  family: 'العائلة المخرجية',
  stress: 'نمط النبر',
}

export function groupKey(b: RepoBar, axis: GroupAxis): string {
  switch (axis) {
    case 'rawi': return b.rhyme?.rawi ?? '—'
    case 'rhymeL2': return b.rhyme?.keyL2 ?? '—'
    case 'mora': return b.moraStr
    case 'sylCount': return String(b.sylCount)
    case 'family': return b.domFam
    case 'stress': return b.stressPattern
  }
}

export interface BarGroup {
  key: string
  axis: GroupAxis
  bars: RepoBar[]
}

export function groupBars(bars: RepoBar[], axis: GroupAxis, minSize = 2): BarGroup[] {
  const map = new Map<string, RepoBar[]>()
  for (const b of bars) {
    const k = groupKey(b, axis)
    const arr = map.get(k)
    if (arr) arr.push(b)
    else map.set(k, [b])
  }
  return [...map.entries()]
    .filter(([, list]) => list.length >= minSize)
    .map(([key, list]) => ({ key, axis, bars: list }))
    .sort((a, b) => b.bars.length - a.bars.length)
}

/* ══════════ التصفية ══════════ */

export interface RepoFilters {
  rawi?: string
  ridf?: '' | 'yes' | 'no' | 'ا' | 'و' | 'ي'
  family?: string
  gravity?: '' | 'hi' | 'lo'
  moraMin?: number | null
  moraMax?: number | null
  text?: string
  status?: '' | BarStatus
}

export function filterBars(bars: RepoBar[], f: RepoFilters): RepoBar[] {
  return bars.filter((b) => {
    const r = b.rhyme
    if (f.status && b.status !== f.status) return false
    if (f.rawi && r?.rawi !== f.rawi) return false
    if (f.ridf) {
      if (f.ridf === 'yes' && !r?.ridf) return false
      if (f.ridf === 'no' && r?.ridf) return false
      if (['ا', 'و', 'ي'].includes(f.ridf) && r?.ridf !== f.ridf) return false
    }
    if (f.family && b.domFam !== f.family) return false
    if (f.gravity === 'hi' && b.gravity < 0.15) return false
    if (f.gravity === 'lo' && b.gravity >= 0.15) return false
    if (f.moraMin != null && b.moraCount < f.moraMin) return false
    if (f.moraMax != null && b.moraCount > f.moraMax) return false
    if (f.text && !b.raw.includes(f.text.trim())) return false
    return true
  })
}

/* ══════════ أقرب البارات (يستهلك SPEC-02) ══════════ */

export interface NeighbourMatch {
  bar: RepoBar
  metricScore: number
  phoneticScore: number
  combined: number
}

/**
 * أقرب البارات لبار مرجعي — يستدعي `matchScore` من SPEC-02 مباشرة بأوزان يمرّرها
 * المستدعي (§٣.٣ من SPEC-02: لا وزن ثابت مبرمَج داخل المحرّك).
 */
export function nearestBars(
  target: RepoBar,
  pool: RepoBar[],
  opts: { metricWeight: number; phoneticWeight: number; topK?: number },
): NeighbourMatch[] {
  const targetFp = fingerprint(target.syllables)
  const out: NeighbourMatch[] = []
  for (const b of pool) {
    if (b.id === target.id) continue
    const r = matchScore(targetFp, fingerprint(b.syllables), opts)
    out.push({
      bar: b,
      metricScore: +r.metricScore.toFixed(3),
      phoneticScore: +r.phoneticScore.toFixed(3),
      combined: +r.combined.toFixed(3),
    })
  }
  out.sort((a, b) => b.combined - a.combined)
  return out.slice(0, opts.topK ?? 5)
}

/* ══════════ التصدير والاستيراد ══════════ */

export const REPO_SCHEMA = 'maqam.barRepository.v1'
export const GRID_PAYLOAD_SCHEMA = 'maqam.gridProjection.v1'

export function buildRepoPayload(bars: RepoBar[]) {
  return {
    schema: REPO_SCHEMA,
    count: bars.length,
    generated: new Date().toISOString(),
    bars: bars.map((b) => ({
      id: b.id, raw: b.raw, tag: b.tag, gridType: b.gridType,
      moraStr: b.moraStr, moraCount: b.moraCount, sylCount: b.sylCount,
      heavy: b.heavy, light: b.light, weightProfile: b.weightProfile,
      sonority: b.sonority, gravity: b.gravity, domFam: b.domFam,
      stressPattern: b.stressPattern, synco: b.synco, avgAttack: b.avgAttack,
      lockScore: b.lockScore, rhyme: b.rhyme, hash: b.hash,
      syllables: b.syllables.map((s) => ({
        text: s.text, cv: s.cv, moras: s.moras, attack: s.attack,
      })),
    })),
  }
}

export function buildGridPayload(bars: RepoBar[]) {
  return {
    schema: GRID_PAYLOAD_SCHEMA,
    source: 'SPEC-03 · مستودع البارات',
    generated: new Date().toISOString(),
    bars: bars.map((b) => {
      const stress = new Set(b.stressIndices)
      return {
        id: b.id, text: b.raw, gridType: b.gridType,
        moraString: b.moraStr, moraCount: b.moraCount,
        syllables: b.syllables.map((s, i) => ({
          text: s.text, cv: s.cv, moras: s.moras, attack: s.attack, stressed: stress.has(i),
        })),
        stressPattern: b.stressPattern,
        rhyme: b.rhyme,
        fingerprint: b.hash,
      }
    }),
  }
}

/** يستخرج النصوص الخام من ملف مُصدَّر — تُعاد معالجتها بالكامل عند الاستيراد */
export function readRepoPayload(json: unknown): string[] {
  const d = json as { bars?: { raw?: string }[] } | null
  if (!d || !Array.isArray(d.bars)) return []
  return d.bars.map((b) => b?.raw).filter((s): s is string => typeof s === 'string' && !!s.trim())
}

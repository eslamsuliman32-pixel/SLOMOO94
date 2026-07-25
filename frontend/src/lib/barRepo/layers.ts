// MAQAM · SPEC-03 · المرحلة ٣ — الطبقات الأربع
// ١ كلمات · ٢ قوافي · ٣ نبر (أوزان) · ٤ سنكبة
// كل القيم مشتقّة من مقاطع SPEC-01 الجاهزة (attack/weight/moras/wordIndex)،
// ولا يُعاد حساب أي تقطيع أو وزن هنا.

import type { Syllable } from '../syllabifier/types.ts'
import { letterInfo, LONG_VOWELS } from './letterData.ts'
import type { ArticulationFamily } from './letterData.ts'

const EMPHATIC = new Set(['ص', 'ض', 'ط', 'ظ', 'ق', 'خ', 'غ'])

export type WeightProfile = 'heavy' | 'balanced' | 'light'

export interface LayerMetrics {
  moraStr: string
  moraCount: number
  sylCount: number
  heavy: number
  light: number
  weightProfile: WeightProfile
  /** [انفجاري، احتكاكي، أنفي، انسيابي، صائت] */
  sonority: [number, number, number, number, number]
  gravity: number // كثافة التفخيم 0..1
  domFam: ArticulationFamily | '—'
  stressIndices: number[] // فهارس المقاطع المنبورة
  stressPattern: string // سلسلة 0/1 بطول المقاطع
  synco: number // معامل السنكبة 0..1
  avgAttack: number
}

/** كل الحروف المنطوقة في المقطع: onset + حرف المدّ (إن وُجد) + عنقود الـcoda */
function syllableLetters(s: Syllable): string[] {
  const out = [s.onset.ch]
  if (s.nucleus.length === 2) {
    out.push(s.nucleus === 'aa' ? 'ا' : s.nucleus === 'ii' ? 'ي' : 'و')
  }
  for (const c of s.codas) out.push(c.ch)
  return out
}

/**
 * النبر: أعلى قيمة اصطدام داخل كل كلمة (تُقرأ الكلمات من wordIndex الذي يضعه SPEC-01).
 * عند التعادل يفوز الأول — قرار ثابت يمنع تذبذب النتيجة بين تشغيلين.
 */
function stressedIndices(syllables: Syllable[]): number[] {
  const byWord = new Map<number, number[]>()
  syllables.forEach((s, i) => {
    const arr = byWord.get(s.wordIndex)
    if (arr) arr.push(i)
    else byWord.set(s.wordIndex, [i])
  })
  const out: number[] = []
  for (const idxs of byWord.values()) {
    let best = -1
    let bi = idxs[0]
    for (const i of idxs) {
      if (syllables[i].attack > best) {
        best = syllables[i].attack
        bi = i
      }
    }
    out.push(bi)
  }
  return out.sort((a, b) => a - b)
}

export function classifyLayers(syllables: Syllable[]): LayerMetrics {
  const sonority: [number, number, number, number, number] = [0, 0, 0, 0, 0]
  const famCount: Record<string, number> = {}
  let emphatic = 0
  let totalLetters = 0
  let attackSum = 0

  for (const s of syllables) {
    attackSum += s.attack
    for (const ch of syllableLetters(s)) {
      const info = letterInfo(ch)
      if (!info) continue
      totalLetters++
      if (EMPHATIC.has(ch)) emphatic++
      famCount[info.family] = (famCount[info.family] ?? 0) + 1
      switch (info.type) {
        case 'انفجاري': sonority[0]++; break
        case 'احتكاكي': sonority[1]++; break
        case 'أنفي': sonority[2]++; break
        case 'انسيابي': sonority[3]++; break
        default: sonority[4]++; break // لين / مدّ → صائت
      }
    }
  }

  const moraStr = syllables.map((s) => s.moras.join('')).join('')
  const moraCount = moraStr.length
  const heavy = syllables.filter((s) => s.weight > 1).length
  const light = syllables.length - heavy
  const ratio = syllables.length ? heavy / syllables.length : 0
  const weightProfile: WeightProfile = ratio > 0.6 ? 'heavy' : ratio < 0.35 ? 'light' : 'balanced'

  // السنكبة: نسبة المقاطع الثقيلة الواقعة في مواضع فردية (خارج الضربة)
  let offbeatHeavy = 0
  syllables.forEach((s, i) => { if (s.weight > 1 && i % 2 === 1) offbeatHeavy++ })
  const synco = heavy ? +(offbeatHeavy / heavy).toFixed(3) : 0

  const domFam = (Object.keys(famCount).sort((a, b) => famCount[b] - famCount[a])[0] ??
    '—') as ArticulationFamily | '—'

  const stressIndices = stressedIndices(syllables)
  const stressSet = new Set(stressIndices)

  return {
    moraStr,
    moraCount,
    sylCount: syllables.length,
    heavy,
    light,
    weightProfile,
    sonority,
    gravity: totalLetters ? +(emphatic / totalLetters).toFixed(3) : 0,
    domFam,
    stressIndices,
    stressPattern: syllables.map((_, i) => (stressSet.has(i) ? '1' : '0')).join(''),
    synco,
    avgAttack: syllables.length ? +(attackSum / syllables.length).toFixed(3) : 0,
  }
}

export { LONG_VOWELS }

// MAQAM · SPEC-03 · المرحلة ٤ — استخراج القافية
// يعمل على المقاطع الخارجة من SPEC-01 (لا يقطّع نصاً بنفسه — §٠ من SPEC-01).

import type { Syllable } from '../syllabifier/types.ts'
import { letterInfo, LONG_VOWELS } from './letterData.ts'

const EMPHATIC = new Set(['ص', 'ض', 'ط', 'ظ', 'ق', 'خ', 'غ'])

export interface RhymeInfo {
  rawi: string // حرف الروي
  ridf: string | null // مدّ يسبق الروي مباشرة
  wasl: string | null // مدّ أو هاء يتبع الروي
  tasis: string | null // ألف يفصلها عن الروي حرف واحد
  dakhil: string | null // الحرف الفاصل بين التأسيس والروي
  family: string // العائلة المخرجية للروي
  type: string // نوع نطق الروي
  emphatic: boolean
  mudaf: boolean // مردوف = يوجد ردف
  keyL1: string // مفتاح متدرّج ١: الروي وحده
  keyL2: string // مفتاح ٢: الردف + الروي
  keyL3: string // مفتاح ٣: نص آخر مقطعين
  cell: string // بصمة مورات المقطع الأخير
}

/**
 * سلسلة الصوامت الفعلية لنهاية البار، مأخوذة من بنية المقاطع لا من النص الخام:
 * لكل مقطع onset ثم حروف الـcoda بترتيبها، ويُدرَج حرف المدّ عند النواة الطويلة
 * لأن الردف/التأسيس/الوصل تُقاس على حروف المدّ المنطوقة.
 */
function consonantSpine(syllables: Syllable[]): string[] {
  const out: string[] = []
  for (const s of syllables) {
    out.push(s.onset.ch)
    if (s.nucleus.length === 2) {
      // نواة طويلة (aa/ii/uu) → حرف مدّ منطوق
      out.push(s.nucleus === 'aa' ? 'ا' : s.nucleus === 'ii' ? 'ي' : 'و')
    }
    for (const c of s.codas) out.push(c.ch)
  }
  return out
}

/** استخراج القافية من مقاطع البار — §٤ */
export function extractRhyme(syllables: Syllable[]): RhymeInfo | null {
  if (!syllables.length) return null
  const spine = consonantSpine(syllables)
  if (!spine.length) return null

  // تجاوز حروف اللين النهائية وهاء الوصل للوصول إلى الروي
  let p = spine.length - 1
  let wasl: string | null = null
  while (p > 0 && (LONG_VOWELS.has(spine[p]) || spine[p] === 'ه')) {
    wasl = spine[p]
    p--
  }
  const rawi = spine[p]

  // الردف: حرف مدّ يسبق الروي مباشرة
  const ridf = p > 0 && LONG_VOWELS.has(spine[p - 1]) ? spine[p - 1] : null

  // التأسيس: ألف يفصلها عن الروي حرف واحد (الدخيل بينهما)
  let tasis: string | null = null
  let dakhil: string | null = null
  if (!ridf && p >= 2 && spine[p - 2] === 'ا') {
    tasis = 'ا'
    dakhil = spine[p - 1]
  }

  const info = letterInfo(rawi)
  const lastSyl = syllables[syllables.length - 1]
  const last2 = syllables.slice(-2).map((s) => s.text).join('')

  return {
    rawi,
    ridf,
    wasl,
    tasis,
    dakhil,
    family: info?.family ?? '—',
    type: info?.type ?? '—',
    emphatic: EMPHATIC.has(rawi),
    mudaf: !!ridf,
    keyL1: rawi,
    keyL2: (ridf ?? '') + rawi,
    keyL3: last2,
    cell: lastSyl ? lastSyl.moras.join('') : '',
  }
}

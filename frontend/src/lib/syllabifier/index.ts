// MAQAM · SPEC-01 (FINAL) — نقطة الدخول العامة للطبقة صفر
// خمس دوال نقية بلا اعتماديات خارجية — §٦

export { normalize } from './normalize.ts'
export { syllabifyWord } from './syllabify.ts'
export { liaise } from './liaise.ts'
export { fingerprint } from './fingerprint.ts'
export { project } from './project.ts'

export { createLexicon, rememberPersonal, seedBaseLexicon, lookup } from './lexicon.ts'
export { GRID_16, GRID_12, gridSlots, subdivisionCurve, beatWeight } from './grid.ts'
export { sha1 } from './hash.ts'
export type * from './types.ts'

import { normalize } from './normalize.ts'
import { syllabifyWord } from './syllabify.ts'
import { liaise } from './liaise.ts'
import { fingerprint } from './fingerprint.ts'
import { project } from './project.ts'
import type { GridSpec, Lexicon, BarFingerprint, GridProjection, Syllable } from './types.ts'
import { GRID_16 } from './grid.ts'

/**
 * تنسيق خط الأنابيب الكامل لبار واحد: normalize → syllabifyWord(لكل كلمة) → liaise → fingerprint → project.
 * دالة تنسيق وحيدة (وليست إحدى الدوال الخمس النقية) — تُسنِد wordIndex الصحيح لكل مقطع
 * قبل تمريره لِـ liaise، وهو ما لا تعرفه syllabifyWord بمعزل عن موضعها في البار.
 */
export function analyzeBar(
  text: string,
  lex: Lexicon,
  grid: GridSpec = GRID_16,
): { fp: BarFingerprint; projection: GridProjection; syllables: Syllable[] } {
  const words = normalize(text)
  const perWord = words.map((word, wordIndex) =>
    syllabifyWord(word, lex).map((s) => ({ ...s, wordIndex })),
  )
  const syllables = liaise(perWord)
  const fp = fingerprint(syllables)
  const projection = project(fp, grid)
  return { fp, projection, syllables }
}

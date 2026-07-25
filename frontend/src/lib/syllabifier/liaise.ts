// §٤ البار كسلسلة متصلة — تقطيع منعزل بالكلمة + إصلاح حدود محلي (لا إعادة ترميز كاملة)

import { phonemeOf } from './phonemeTable.ts'
import { renderSyllableText } from './phonotactic.ts'
import type { CVShape, Mora, Syllable } from './types.ts'

const WASL_ONSET = 'ء'

function downgrade(cv: CVShape): CVShape {
  if (cv === 'CVCC') return 'CVC'
  if (cv === 'CVC') return 'CV'
  if (cv === 'CVVC') return 'CVV'
  return cv
}

function weightOf(cv: CVShape): 1 | 2 | 3 {
  return cv === 'CV' ? 1 : cv === 'CVC' || cv === 'CVV' ? 2 : 3
}

function rebuildMoras(weight: 1 | 2 | 3): Mora[] {
  return Array.from({ length: weight }, (_, k) => (k === 0 ? '●' : '▬'))
}

/** يدمج كلمات البار في سلسلة متصلة، يُصلح نقاط التماس فقط (§٤.٢) */
export function liaise(wordSyllables: Syllable[][]): Syllable[] {
  const words = wordSyllables.map((arr) => arr.map((s) => ({ ...s, codas: [...s.codas] })))

  for (let w = 0; w < words.length - 1; w++) {
    const A = words[w]
    const B = words[w + 1]
    if (!A.length || !B.length) continue
    const lastA = A[A.length - 1]
    const firstB = B[0]

    const aHasDanglingCoda = lastA.codas.length >= 1
    const bStartsBareVowel = firstB.onset.ch === WASL_ONSET
    if (!aHasDanglingCoda || !bStartsBareVowel) continue

    const movedCoda = lastA.codas[lastA.codas.length - 1]

    // أ) الكلمة A: تفقد آخر ساكن، يُعاد وزنها
    const newCodasA = lastA.codas.slice(0, -1)
    const newCvA = downgrade(lastA.cv)
    const newWeightA = weightOf(newCvA)
    A[A.length - 1] = {
      ...lastA,
      cv: newCvA,
      codas: newCodasA,
      coda: newCodasA.length ? newCodasA[newCodasA.length - 1] : null,
      weight: newWeightA,
      moras: rebuildMoras(newWeightA),
      text: renderSyllableText(lastA.onset.ch, lastA.nucleus, newCodasA),
      liaised: true,
    }

    // ب) الكلمة B: تكتسب onset حقيقياً بدل الفراغ (الشكل والوزن كما هما)
    const newOnsetB = phonemeOf(movedCoda.ch, movedCoda.borrowed)
    B[0] = {
      ...firstB,
      onset: newOnsetB,
      text: renderSyllableText(newOnsetB.ch, firstB.nucleus, firstB.codas),
      liaised: true,
    }
  }

  return words.flat()
}

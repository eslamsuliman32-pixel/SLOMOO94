// §٢.٥ بصمة البار — moraString هي العملة الموحّدة للنظام كله

import { sha1 } from './hash.ts'
import type { BarFingerprint, Syllable } from './types.ts'

export function fingerprint(syls: Syllable[]): BarFingerprint {
  const moraString = syls.map((s) => s.moras.join('')).join('')
  const raw = syls.map((s) => s.text).join(' ')

  const sonority: [number, number, number, number, number] = [0, 0, 0, 0, 0]
  // ترتيب: انفجاري / احتكاكي / أنفي / سائل / صائت (الانزلاقي GLIDE يُحسب ضمن الصائت)
  for (const s of syls) {
    switch (s.onset.cls) {
      case 'PLOSIVE': sonority[0]++; break
      case 'FRICATIVE': sonority[1]++; break
      case 'NASAL': sonority[2]++; break
      case 'LIQUID': sonority[3]++; break
      case 'GLIDE':
      case 'VOWEL': sonority[4]++; break
    }
  }

  const emphaticCount = syls.filter((s) => s.onset.emphatic).length
  const emphaticDensity = syls.length ? emphaticCount / syls.length : 0

  return {
    raw,
    syllables: syls,
    moraString,
    moraCount: moraString.length,
    sylCount: syls.length,
    sonority,
    emphaticDensity,
    hash: sha1(moraString),
  }
}

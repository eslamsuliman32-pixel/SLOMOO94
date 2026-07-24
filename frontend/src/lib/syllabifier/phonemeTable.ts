// جدول تصنيف الحروف العربية: cls (صوتي) / tajweed (كلاسيكي) / emphatic / attack
// §٢.١ و §٢.٢ من SPEC-01

import type { OnsetClass, Phoneme, Tajweed } from './types.ts'

const TIER1 = new Set(['ء', 'أ', 'إ', 'آ', 'ب', 'ت', 'د', 'ط', 'ض', 'ق', 'ك', 'ج'])
const TIER2 = new Set(['ث', 'ح', 'خ', 'ذ', 'ز', 'س', 'ش', 'ص', 'ظ', 'ف', 'ه'])
const TIER3 = new Set(['م', 'ن', 'ل', 'ر', 'و', 'ي', 'ع'])

const EMPHATIC = new Set(['ص', 'ض', 'ط', 'ظ', 'ق', 'خ', 'غ'])

const CLS: Record<string, OnsetClass> = {
  ء: 'VOWEL', أ: 'VOWEL', إ: 'VOWEL', آ: 'VOWEL', ؤ: 'VOWEL', ئ: 'VOWEL',
  ب: 'PLOSIVE', ت: 'PLOSIVE', د: 'PLOSIVE', ط: 'PLOSIVE', ض: 'PLOSIVE',
  ق: 'PLOSIVE', ك: 'PLOSIVE', ج: 'PLOSIVE', گ: 'PLOSIVE',
  ث: 'FRICATIVE', ح: 'FRICATIVE', خ: 'FRICATIVE', ذ: 'FRICATIVE', ز: 'FRICATIVE',
  س: 'FRICATIVE', ش: 'FRICATIVE', ص: 'FRICATIVE', ظ: 'FRICATIVE', ف: 'FRICATIVE',
  ه: 'FRICATIVE', ڤ: 'FRICATIVE',
  م: 'NASAL', ن: 'NASAL',
  ل: 'LIQUID', ر: 'LIQUID', ع: 'LIQUID',
  و: 'GLIDE', ي: 'GLIDE',
  ا: 'VOWEL', ى: 'VOWEL',
}

// شديد / متوسط / رخو — من أسرار الحروف (تصنيف تجويدي كلاسيكي، مستقل عن cls)
const SHADID = new Set(['ء', 'أ', 'إ', 'آ', 'ب', 'ت', 'د', 'ط', 'ق', 'ك', 'ج'])
const MUTAWASSIT = new Set(['م', 'ن', 'ل', 'ر', 'ع'])
// الباقي (بما فيها ض الرخوة تجويدياً رغم انفجاريتها الصوتية) → RIKHW افتراضياً

const ATTACK: Record<string, number> = {}
for (const ch of TIER1) ATTACK[ch] = 1.0
for (const ch of TIER2) ATTACK[ch] = 0.6
for (const ch of TIER3) ATTACK[ch] = 0.2
ATTACK['گ'] = 1.0
ATTACK['ڤ'] = 0.6
ATTACK['تش'] = 1.0 // كتلة واحدة، Tier1 — §٣.٢
ATTACK['نغ'] = 0.2
CLS['تش'] = 'PLOSIVE'
CLS['نغ'] = 'NASAL'

function tajweedOf(ch: string): Tajweed {
  if (SHADID.has(ch)) return 'SHADID'
  if (MUTAWASSIT.has(ch)) return 'MUTAWASSIT'
  return 'RIKHW'
}

const cache = new Map<string, Phoneme>()

export function phonemeOf(ch: string, borrowed = false): Phoneme {
  const key = ch + (borrowed ? '*' : '')
  const hit = cache.get(key)
  if (hit) return hit
  const p: Phoneme = {
    ch,
    cls: CLS[ch] ?? 'VOWEL',
    tajweed: tajweedOf(ch),
    emphatic: EMPHATIC.has(ch),
    attack: ATTACK[ch] ?? 0.2,
    borrowed,
  }
  cache.set(key, p)
  return p
}

export const ARABIC_CONSONANTS = new Set([
  ...TIER1, ...TIER2, ...TIER3, 'گ', 'ڤ',
])

export const ARABIC_LONG_VOWELS = new Set(['ا', 'و', 'ي', 'ى'])
export const ARABIC_SHORT_VOWEL_MARKS = new Set(['َ', 'ِ', 'ُ']) // فتحة كسرة ضمة
export const SUKUN = 'ْ'
export const SHADDA = 'ّ'
export const TANWEEN = new Set(['ً', 'ٍ', 'ٌ']) // فتحتان كسرتان ضمتان

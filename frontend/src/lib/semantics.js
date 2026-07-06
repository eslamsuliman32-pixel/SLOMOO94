// src/lib/semantics.js — قاعدة letter_semantics (الوضع ب — قرار D8)
// المصدر المعرفي: وثيقة «أسرار الحروف» (الدلالة الصوتية: خريطة المشاعر + تصنيف الشدة الثلاثي).

const MODULE = 'letter-semantics'
const VERSION = '0.1.0'

/* تصنيف الشدة الثلاثي: شديدة «أَجِدْ قَطٍ بَكَتْ» · متوسطة «لِنْ عُمَرْ» · رخوة (الباقي) */
const STRONG = new Set(['ء', 'ج', 'د', 'ق', 'ط', 'ب', 'ك', 'ت'])
const MEDIUM = new Set(['ل', 'ن', 'ع', 'م', 'ر'])

/* خريطة المشاعر (نواة القاعدة من المصدر) */
const EMOTION_MAP = [
  { id: 'sorrow', label: 'حزن وحنين', letters: new Set(['ا', 'و', 'ي', 'م']), color: 3 },
  { id: 'power', label: 'قوة وغضب', letters: new Set(['ص', 'ض', 'ط', 'ق']), color: 7 },
  { id: 'warmth', label: 'دفء وحنان', letters: new Set(['ح']), color: 5 },
  { id: 'joy', label: 'فرح وانشراح', letters: new Set(['ه']), color: 4 },
  { id: 'calm', label: 'هدوء وسكينة', letters: new Set(['س']), color: 1 },
]

const AR = /[\u0621-\u064A]/

/**
 * الطيف العاطفي للنص: نِسَب الشدة/التوسط/الرخاوة + المشاعر الغالبة بحضورها.
 * الآلة تكشف الطيف — والاختيار الفني للمستخدم (مبدأ D1).
 */
export function analyzeEmotions(text) {
  const t0 = Date.now()
  const letters = [...(text || '')].filter((c) => AR.test(c))
  const total = letters.length
  if (!total) {
    return { ok: true, data: null, error: null, meta: { module: MODULE, version: VERSION, took_ms: 0 } }
  }
  let strong = 0, medium = 0
  const emoCount = Object.fromEntries(EMOTION_MAP.map((e) => [e.id, 0]))
  for (const c of letters) {
    if (STRONG.has(c)) strong++
    else if (MEDIUM.has(c)) medium++
    for (const e of EMOTION_MAP) if (e.letters.has(c)) emoCount[e.id]++
  }
  const pct = (n) => Math.round((n / total) * 100)
  const emotions = EMOTION_MAP
    .map((e) => ({ id: e.id, label: e.label, color: e.color, pct: pct(emoCount[e.id]) }))
    .filter((e) => e.pct >= 8)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3)
  return {
    ok: true,
    data: {
      strong: pct(strong),
      medium: pct(medium),
      soft: 100 - pct(strong) - pct(medium),
      emotions,
      total,
    },
    error: null,
    meta: { module: MODULE, version: VERSION, took_ms: Date.now() - t0 },
  }
}

// src/lib/rhyme.js
// محرك القافية v0 — وفق docs/RHYME_PROSODY_SPEC.md (القسم الأول + الوضع أ من نظام المرونة).
// نطاق النسخة: استخراج الروي التقريبي لنهاية كل بار + تجميع عائلات القافية + عائلات المخارج.
// حدود معلنة: بدون تشكيل، استخراج الروي تقريبي (حروف المد والهاء تُعامل كوصل) — تُعاير في الخطوة 29.

const MODULE = 'rhyme-engine'
const VERSION = '0.1.0'

/* عائلات المخارج الثمانية (الوضع أ — التحوّل الصوتي) كما في المواصفة */
const PHONETIC_FAMILIES = [
  { id: 'labial',    name: 'شفوية',  letters: ['ب', 'م', 'و', 'ف'] },
  { id: 'liquid',    name: 'ذلقية',  letters: ['ل', 'ن', 'ر'] },
  { id: 'dental',    name: 'نطعية',  letters: ['ت', 'د', 'ط'] },
  { id: 'sibilant',  name: 'أسلية',  letters: ['س', 'ز', 'ص'] },
  { id: 'palatal',   name: 'شجرية',  letters: ['ج', 'ش', 'ض'] },
  { id: 'lisping',   name: 'لثوية',  letters: ['ث', 'ذ', 'ظ'] },
  { id: 'guttural',  name: 'حلقية',  letters: ['ء', 'ه', 'ع', 'ح', 'غ', 'خ'] },
  { id: 'uvular',    name: 'لهوية',  letters: ['ق', 'ك'] },
]

const FAMILY_BY_LETTER = {}
for (const f of PHONETIC_FAMILIES) for (const l of f.letters) FAMILY_BY_LETTER[l] = f

/* التطبيع النطقي الأساسي (المواصفة 3.3): توحيد الصور الإملائية نحو الصورة الصوتية */
export function normalize(text) {
  return text
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '') // تشكيل + ألف خنجرية + تطويل
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
}

const ARABIC_LETTER = /[\u0621-\u064A]/
/* حروف تُتجاوز من نهاية الكلمة عند البحث عن الروي (مدود + هاء الوصل) */
const SKIP_AS_WASL = new Set(['ا', 'و', 'ي', 'ه'])

/** آخر كلمة عربية في السطر */
export function lastWord(line) {
  const words = normalize(line).split(/[^\u0621-\u064A]+/).filter(Boolean)
  return words.length ? words[words.length - 1] : null
}

/**
 * استخراج الروي التقريبي: آخر حرف صحيح بعد تجاوز المدود وهاء الوصل من النهاية.
 * إن كانت الكلمة كلها مدودًا (نادر) يُعتمد آخر حرف كما هو.
 */
export function getRawi(word) {
  if (!word) return null
  const letters = [...word].filter((c) => ARABIC_LETTER.test(c))
  for (let i = letters.length - 1; i >= 0; i--) {
    if (!SKIP_AS_WASL.has(letters[i])) return letters[i]
  }
  return letters.length ? letters[letters.length - 1] : null
}

/** مفتاح العائلة القافوية: الروي نفسه، أو معرّف عائلة المخرج عند تفعيل الوضع أ */
export function familyKey(rawi, modeA = false) {
  if (!rawi) return null
  if (modeA && FAMILY_BY_LETTER[rawi]) return `fam:${FAMILY_BY_LETTER[rawi].id}`
  return `rawi:${rawi}`
}

/** اسم عربي وصفي للعائلة (للعرض) */
export function familyLabel(key, rawi) {
  if (!key) return ''
  if (key.startsWith('fam:')) {
    const f = PHONETIC_FAMILIES.find((x) => `fam:${x.id}` === key)
    return f ? `عائلة ${f.name}` : rawi
  }
  return `روي ${rawi}`
}

/**
 * تحليل نص متعدد السطور للتلوين الحي.
 * يعيد ok/data وفق عقد الوحدات: لكل سطر { text, lastWord, rawi, key, label, colorIndex }.
 * colorIndex ثابت لكل عائلة بترتيب أول ظهورها (يدور على 8 ألوان).
 */
export function analyzeLines(text, { modeA = false } = {}) {
  const t0 = Date.now()
  try {
    const lines = text.split('\n')
    const keyToColor = new Map()
    const data = lines.map((line) => {
      const lw = lastWord(line)
      const rawi = getRawi(lw)
      const key = familyKey(rawi, modeA)
      let colorIndex = null
      if (key) {
        if (!keyToColor.has(key)) keyToColor.set(key, keyToColor.size % 8)
        colorIndex = keyToColor.get(key)
      }
      return { text: line, lastWord: lw, rawi, key, label: familyLabel(key, rawi), colorIndex }
    })
    return { ok: true, data, error: null, meta: { module: MODULE, version: VERSION, took_ms: Date.now() - t0 } }
  } catch (e) {
    return {
      ok: false, data: null,
      error: { code: 'RHYME_ANALYZE_FAILED', message_ar: 'تعذّر تحليل القوافي.', recoverable: true },
      meta: { module: MODULE, version: VERSION, took_ms: Date.now() - t0 },
    }
  }
}

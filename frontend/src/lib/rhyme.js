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


/* ============================================================
   v1 — التوسعة: الحروف الستة، بصمة الوزن من التشكيل، القوافي الداخلية
   ============================================================ */

const HARAKA = new Set(['\u064E', '\u064F', '\u0650'])           // فتحة ضمة كسرة
const TANWIN = new Set(['\u064B', '\u064C', '\u064D'])
const SUKUN = '\u0652'
const SHADDA = '\u0651'
const MADD_LETTERS = new Set(['ا', 'و', 'ي', 'ى', 'آ'])
const MARKS = /[\u064B-\u0652\u0670]/

/** هل النص مُشكَّل بما يكفي لبصمة دقيقة؟ (حركة واحدة على الأقل) */
export function hasTashkeel(text) {
  return /[\u064B-\u0652]/.test(text)
}

/**
 * بصمة الوزن ●/▬ من نص مُشكَّل (منهجية الوزن — القسم 2.1):
 * متحرك = ● ، ساكن/مد = ▬ ، شدة = ▬● ، تنوين = ●▬ (حركة + نون ساكنة).
 * approx=true إن وُجدت حروف بلا علامة (عدا المدود) فاعتُبرت متحركة.
 */
export function weightFingerprint(text) {
  const chars = [...text]
  let fp = ''
  let approx = false
  let i = 0
  while (i < chars.length) {
    const c = chars[i]
    if (!ARABIC_LETTER.test(c)) {
      if (c === ' ' && fp && !fp.endsWith(' ')) fp += ' '
      i++; continue
    }
    // اجمع علامات الحرف
    let shadda = false, haraka = false, tanwin = false, sukun = false
    let j = i + 1
    while (j < chars.length && MARKS.test(chars[j])) {
      if (chars[j] === SHADDA) shadda = true
      else if (HARAKA.has(chars[j])) haraka = true
      else if (TANWIN.has(chars[j])) tanwin = true
      else if (chars[j] === SUKUN) sukun = true
      j++
    }
    if (c === 'آ') { fp += '●▬' }                       // همزة مفتوحة + مد
    else if (shadda) { fp += '▬' + (sukun ? '▬' : '●') } // فك الشدة
    else if (haraka) { fp += '●' }
    else if (tanwin) { fp += '●▬' }
    else if (sukun) { fp += '▬' }
    else if (MADD_LETTERS.has(c)) { fp += '▬' }          // مد بلا علامة
    else { fp += '●'; approx = true }                    // حرف عارٍ: متحرك افتراضًا
    i = j
  }
  fp = fp.trim()
  const syllables = (fp.match(/●/g) || []).length        // عدد المقاطع = عدد المتحركات
  return { fp, syllables, approx }
}

/**
 * الحروف الستة (تقريب v1 على نص غير مشكول — المواصفة 1.2):
 * الروي ثم: الوصل (مد/هاء بعده)، الخروج (مد بعد هاء الوصل)،
 * الردف (مد قبله مباشرة)، التأسيس (ألف قبله بحرف) والدخيل بينهما.
 */
export function sixLetters(word) {
  const w = normalize(word || '')
  const L = [...w].filter((c) => ARABIC_LETTER.test(c))
  if (!L.length) return null
  let ri = -1
  for (let i = L.length - 1; i >= 0; i--) { if (!SKIP_AS_WASL.has(L[i])) { ri = i; break } }
  if (ri === -1) ri = L.length - 1
  const out = { rawi: L[ri] }
  const after1 = L[ri + 1]
  if (after1 && (after1 === 'ه' || MADD_LETTERS.has(after1))) {
    out.wasl = after1
    const after2 = L[ri + 2]
    if (after1 === 'ه' && after2 && MADD_LETTERS.has(after2)) out.khurooj = after2
  }
  const before1 = L[ri - 1]
  if (before1 && ['ا', 'و', 'ي'].includes(before1)) out.ridf = before1
  if (!out.ridf && L[ri - 2] === 'ا') { out.tasees = 'ا'; out.dakheel = L[ri - 1] }
  return out
}

/** وصف مختصر للحروف الستة للعرض */
export function sixLabel(six) {
  if (!six) return ''
  const parts = ['روي ' + six.rawi]
  if (six.ridf) parts.push('ردف ' + six.ridf)
  if (six.tasees) parts.push('تأسيس')
  if (six.wasl) parts.push('وصل ' + six.wasl)
  return parts.join(' · ')
}

/** تفكيك السطر لكلمات مع مسافاتها (للعرض الملون) */
export function tokenize(line) {
  const tokens = []
  const re = /(\S+)(\s*)/g
  let m
  while ((m = re.exec(line))) tokens.push({ w: m[1], ws: m[2] })
  return tokens
}

/**
 * تحليل موسع v1: يضيف لكل سطر — الحروف الستة، بصمة الوزن (إن وُجد تشكيل)،
 * ومواضع القوافي الداخلية (كلمات داخل السطر من نفس عائلة قافية نهايته).
 */
export function analyzeLinesV1(text, { modeA = false } = {}) {
  const base = analyzeLines(text, { modeA })
  if (!base.ok) return base
  const data = base.data.map((l) => {
    const six = sixLetters(l.lastWord)
    const weight = hasTashkeel(l.text) ? weightFingerprint(l.text) : null
    const tokens = tokenize(l.text)
    const inner = new Set()
    if (l.key && tokens.length > 1) {
      tokens.slice(0, -1).forEach((t, i) => {
        const k = familyKey(getRawi(lastWord(t.w)), modeA)
        if (k && k === l.key && normalize(t.w).length > 1) inner.add(i)
      })
    }
    return { ...l, six, sixText: sixLabel(six), weight, tokens, inner }
  })
  return { ...base, data }
}

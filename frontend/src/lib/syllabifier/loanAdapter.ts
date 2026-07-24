// §٣.٢ الدخيل: يُطبَّع، لا يُستثنى
// أي امتداد لاتيني يتحول إلى PhoneticStream عربي المعايير قبل دخول خط الأنابيب —
// لا فرع منطقي لاحقاً يميّز أصله (project/fingerprint لا يعرفان أن الكلمة دخيلة).

import type { PhoneticStream, PhoneticUnit } from './types.ts'

const unit = (cons: string, opts: Partial<PhoneticUnit> = {}): PhoneticUnit => ({
  cons, harakah: null, madd: null, sukun: false, borrowed: true, ...opts,
})

/** معجم الدخيل المُقفَل — بذرة أولية (تُغذَّى لاحقاً من أرشيف بارات حقيقي، §٨.١) */
const LOAN_SEED: Record<string, PhoneticStream> = {
  flow: [unit('ف', { harakah: 'i' }), unit('ل', { madd: 'uu' })],
  check: [unit('تش', { harakah: 'i' }), unit('ك', { sukun: true })],
  real: [unit('ر', { harakah: 'i' }), unit('ي', { harakah: 'a' }), unit('ل', { sukun: true })],
  it: [unit('ء', { harakah: 'i' }), unit('ت', { sukun: true })],
  beat: [unit('ب', { madd: 'ii' }), unit('ت', { sukun: true })],
  mic: [unit('م', { madd: 'aa' }), unit('ك', { sukun: true })],
  verse: [unit('ف', { harakah: 'i' }), unit('ر', { sukun: true }), unit('س', { sukun: true })],
}

// جدول التحويل الاحتياطي (Grapheme→Phoneme) — §٣.٢. المدود الطويلة (ee/ea/oo/ay/ai/ow/au)
// تُطوى مسبقاً إلى صامت علّة مفرد (y/w) تلتقطه attachVowel لاحقاً كمدّ.
const DIGRAPHS: [RegExp, string][] = [
  [/ee|ea/g, 'y'],
  [/oo/g, 'w'],
  [/ay|ai/g, 'y'],
  [/ow|au/g, 'w'],
  [/ch/g, 'C'], // حامل مؤقت لـ"تش" ككتلة واحدة
  [/sh/g, 'ش'],
  [/th/g, 'ث'],
  [/ng/g, 'ن'],
]

const CONS_MAP: Record<string, string> = {
  p: 'ب', b: 'ب', t: 'ت', d: 'د', k: 'ك', g: 'گ',
  f: 'ف', v: 'ف', s: 'س', z: 'ز', h: 'ه',
  m: 'م', n: 'ن', l: 'ل', r: 'ر', j: 'ج', x: 'كس', q: 'ك', c: 'ك',
  C: 'تش',
}

const VOWEL_SHORT: Record<string, 'a' | 'i' | 'u'> = { a: 'a', e: 'i', i: 'i', o: 'u', u: 'u' }

const ONSET_CLUSTER_BREAK = /^[bcdfgklmnpqstvz]{2,}/

/** يفكّ عنقود صوامت في مستهلّ الكلمة بحرف علة مقتضب — العربية ترفض بداية المقطع بساكنَين */
function breakInitialCluster(latin: string): string {
  const m = latin.match(ONSET_CLUSTER_BREAK)
  if (!m) return latin
  const cluster = m[0]
  let out = ''
  for (let i = 0; i < cluster.length; i++) {
    out += cluster[i]
    if (i < cluster.length - 1) out += 'i' // حرف علة مقتضب بين الصامتين
  }
  return out + latin.slice(cluster.length)
}

function attachVowel(stream: PhoneticStream, w: string, i: number, stressed: boolean): number {
  const v = w[i]
  if (!v) return i
  if (v === 'y' || v === 'w') {
    const last = stream[stream.length - 1]
    last.madd = v === 'y' ? 'ii' : 'uu'
    return i + 1
  }
  if (VOWEL_SHORT[v]) {
    const last = stream[stream.length - 1]
    const short = VOWEL_SHORT[v]
    if (!stressed) last.madd = (short + short) as PhoneticUnit['madd']
    else last.harakah = short
    return i + 1
  }
  return i
}

/** محوِّل احتياطي عام (Grapheme→Phoneme) لأي كلمة دخيلة غير موجودة في المعجم المُقفَل.
 * النبرة الإنجليزية = الثقل العربي: أول نواة صوتية في الكلمة تُعامَل كمنبورة → ثقيلة (مدّ)،
 * وما يليها خفيف (حركة قصيرة)، اتساقاً مع §٣.٢. */
function fallbackConvert(word: string): PhoneticStream {
  let w = word.toLowerCase()
  for (const [re, marker] of DIGRAPHS) w = w.replace(re, marker)
  w = breakInitialCluster(w)

  const stream: PhoneticStream = []
  let firstVowelSeen = false
  let i = 0
  while (i < w.length) {
    const ch = w[i]
    if (CONS_MAP[ch]) {
      stream.push(unit(CONS_MAP[ch]))
      i++
      const stressed = firstVowelSeen
      const before = stream.length
      i = attachVowel(stream, w, i, stressed)
      const got = stream[before - 1].harakah !== null || stream[before - 1].madd !== null
      if (got) firstVowelSeen = true
      continue
    }
    if (VOWEL_SHORT[ch]) {
      // صائت بلا صامت سابق صريح (بداية كلمة بصائت) → حامل جلدي
      const short = VOWEL_SHORT[ch]
      stream.push(unit('ء', firstVowelSeen ? { harakah: short } : { madd: (short + short) as PhoneticUnit['madd'] }))
      firstVowelSeen = true
      i++
      continue
    }
    i++ // تجاهل رموز غير معروفة
  }

  // أي صامت أخير بلا حركة ولا مدّ → ساكن (نهاية كلمة)
  for (const u of stream) if (!u.harakah && !u.madd) u.sukun = true
  return stream
}

export function adaptLoanWord(word: string): PhoneticStream {
  const key = word.toLowerCase().replace(/[^a-z]/g, '')
  if (LOAN_SEED[key]) return LOAN_SEED[key]
  return fallbackConvert(key)
}

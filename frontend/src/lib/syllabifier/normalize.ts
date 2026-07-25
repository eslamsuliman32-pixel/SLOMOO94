// §٣.١ التطبيع الصوتي العربي + §٣.٢ تكيّف الدخيل + تقسيم النص إلى Word[]
// المخرَج النهائي لكل كلمة: PhoneticStream — سلسلة صامت/صائت خالصة، منها التقطيع حتمي.

import type { Lang, PhoneticStream, PhoneticUnit, Word } from './types.ts'
import { adaptLoanWord } from './loanAdapter.ts'

const TATWEEL = 'ـ'
const SUKUN = 'ْ'
const SHADDA = 'ّ'
const FATHA = 'َ'
const KASRA = 'ِ'
const DAMMA = 'ُ'
const FATHATAN = 'ً'
const KASRATAN = 'ٍ'
const DAMMATAN = 'ٌ'
const MADD_LETTERS: Record<string, 'aa' | 'ii' | 'uu'> = { ا: 'aa', ى: 'aa', و: 'uu', ي: 'ii' }
const HARAKAH_FOR_MADD: Record<string, 'a' | 'i' | 'u'> = { aa: 'a', ii: 'i', uu: 'u' }

const SHAMSI = new Set(['ت', 'ث', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ل', 'ن'])

const ARABIC_RE = /[؀-ۿ]/

function isArabicToken(tok: string): boolean {
  return ARABIC_RE.test(tok)
}

/**
 * «ال» التعريف — قاعدة قطعية لا تخمين (§٣.١):
 *   · قبل حرف شمسي: تُدغم اللام فيه (الشمس → اششمس)
 *   · قبل حرف قمري: تبقى اللام ساكنة (الوجع → الْوجع)
 * إثبات السكون نصياً هنا يمنع المرحلة اللاحقة من «استنتاج» حركة للام.
 */
function applyLamShamsiyya(raw: string): string {
  if (raw.startsWith('ال') && raw.length > 2) {
    const next = raw[2]
    if (SHAMSI.has(next)) {
      // احذف اللام، ضاعِف الحرف الشمسي التالي (إدغام)
      return 'ا' + next + raw.slice(2)
    }
    // قمري: اللام ساكنة بالقاعدة — تُثبَّت صراحةً إن لم تكن مُشكَّلة أصلاً
    if (/[ء-ي]/.test(next)) return 'ال' + SUKUN + raw.slice(2)
  }
  return raw
}

/** يفكّ التنوين إلى حركة قصيرة + نون ساكنة */
function unpackTanween(raw: string): string {
  return raw
    .replace(new RegExp(FATHATAN, 'g'), FATHA + 'نْ')
    .replace(new RegExp(KASRATAN, 'g'), KASRA + 'نْ')
    .replace(new RegExp(DAMMATAN, 'g'), DAMMA + 'نْ')
}

/** يفكّ الشدّة: حرف+شدّة → (نفس الحرف ساكناً) + (نفس الحرف بحركته التالية إن وُجدت) */
function unpackShadda(rawIn: string): string {
  // الترتيب القانوني: صامت + شدّة + حركة. يُطبَّع أي ترتيب معكوس (حركة ثم شدّة) قبل الفكّ.
  const raw = rawIn.replace(new RegExp(`([${FATHA}${KASRA}${DAMMA}])${SHADDA}`, 'g'), `${SHADDA}$1`)
  let out = ''
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (raw[i + 1] === SHADDA) {
      out += ch + SUKUN + ch
      i++ // تخطَّ علامة الشدّة
    } else {
      out += ch
    }
  }
  return out
}

function isDiacritic(ch: string): boolean {
  return ch === FATHA || ch === KASRA || ch === DAMMA || ch === SUKUN || ch === SHADDA
}

/**
 * يبني PhoneticStream من كلمة عربية.
 *
 * النص المُشكَّل يُقرأ حرفياً من علاماته. أما الحروف العارية فتُستنتَج حركاتها
 * بالقيود الفونوتاكتيكية (§٣.٣ المستوى ٣): العربية ترفض البدء بساكن وترفض توالي
 * ساكنَين، وحرف المدّ العاري يفرض حركته المجانسة على ما قبله، والوقف على آخر
 * الكلمة سكون. ما استُنتج يُعلَّم `approximate` ليظهر للمستخدم أن الدقة تقديرية.
 */
export function arabicWordToStream(
  rawWord: string,
  borrowed = false,
): { stream: PhoneticStream; approximate: boolean } {
  let w = rawWord.replace(new RegExp(TATWEEL, 'g'), '')
  w = applyLamShamsiyya(w)
  w = unpackTanween(w)
  w = unpackShadda(w)

  const stream: PhoneticStream = []
  let approximate = false
  let i = 0
  let pendingOnsetVowel = false // كلمة تبدأ بصائت مباشرة (همزة وصل بعد حذف الوصل النصي)

  // همزة الوصل: كلمة تبدأ بألف بلا همزة قطع ثابتة → تُقرأ ابتداءً بمساعدة صوتية.
  // في النص العاري تنطبق القاعدة نفسها بلا اشتراط حركة صريحة بعدها.
  if (w[0] === 'ا') pendingOnsetVowel = true

  /** آخِر حرف عربي في الكلمة؟ (الوقف عليه سكون) */
  const isFinalLetter = (from: number): boolean => {
    for (let k = from; k < w.length; k++) if (/[ء-ي]/.test(w[k])) return false
    return true
  }

  while (i < w.length) {
    const ch = w[i]
    if (isDiacritic(ch)) { i++; continue } // عولجت ضمن الحرف السابق
    if (!/[ء-ي]/.test(ch)) { i++; continue } // رموز غير صوتية

    const consChar = pendingOnsetVowel && ch === 'ا' ? 'ء' : ch
    const isWordStart = stream.length === 0
    pendingOnsetVowel = false

    let harakah: PhoneticUnit['harakah'] = null
    let madd: PhoneticUnit['madd'] = null
    let sukun = false
    i++

    const next = w[i]
    if (next === FATHA || next === KASRA || next === DAMMA) {
      const short = next === FATHA ? 'a' : next === KASRA ? 'i' : 'u'
      i++
      const after = w[i]
      const maddKind = after ? MADD_LETTERS[after] : undefined
      if (maddKind && HARAKAH_FOR_MADD[maddKind] === short) {
        madd = maddKind
        i++
        if (w[i] === SUKUN) i++ // سكون حرف المدّ نفسه، يُستهلك بلا أثر
      } else {
        harakah = short
      }
    } else if (next === SUKUN) {
      sukun = true
      i++
    } else {
      // ── لا علامة صريحة: استنتاج فونوتاكتيكي ──
      // حرف المدّ لا يكون مدّاً إلا إذا كان عارياً هو نفسه؛ فإن حمل حركة فهو صامت
      // (الواو في «الوَجَعْ» صامت لا مدّ).
      const nextIsBareMadd = !!next && !!MADD_LETTERS[next] && !isDiacritic(w[i + 1] ?? '')
      const maddKind = nextIsBareMadd ? MADD_LETTERS[next] : undefined
      const prev = stream[stream.length - 1]
      if (maddKind) {
        // حرف مدّ عارٍ يليه → يفرض حركته المجانسة على هذا الحرف (كِتاب/يقول/سِلاح)
        madd = maddKind
        i++
        approximate = true
      } else if (isFinalLetter(i)) {
        sukun = true // الوقف على آخر الكلمة
      } else if (isWordStart && consChar === 'ء' && ch === 'ا') {
        // همزة الوصل (ال التعريف وأخواتها): حركتها مساعِدة تحكمها قاعدة §٣.١
        // الحتمية، لا تخمين — فلا تُحسَب ضمن التقدير.
        harakah = 'a'
      } else if (isWordStart || (prev && prev.sukun)) {
        // العربية لا تبدأ بساكن ولا تُوالي ساكنَين → لا بد من حركة
        harakah = 'a'
        approximate = true
      } else {
        harakah = 'a' // الفتحة أشيع الحركات — التقدير الافتراضي
        approximate = true
      }
    }

    stream.push({ cons: consChar, harakah, madd, sukun: sukun && !harakah && !madd, borrowed })
  }

  return { stream, approximate }
}

/** يفصل النص إلى كلمات، يكتشف الدخيل اللاتيني، ويطبّع كل كلمة إلى PhoneticStream */
export function normalize(text: string): Word[] {
  const tokens = text.trim().split(/\s+/).filter(Boolean)
  const words: Word[] = []
  for (const tok of tokens) {
    if (isArabicToken(tok)) {
      const { stream, approximate } = arabicWordToStream(tok)
      words.push({ text: tok, stream, lang: 'ar' as Lang, approximate })
    } else if (/[A-Za-z]/.test(tok)) {
      // الدخيل يُكيَّف دوماً بتقدير (لا تشكيل في المصدر أصلاً)
      words.push({ text: tok, stream: adaptLoanWord(tok), lang: 'loan' as Lang, approximate: true })
    }
    // رموز/علامات ترقيم بلا حروف تُتجاهَل بصمت
  }
  return words
}

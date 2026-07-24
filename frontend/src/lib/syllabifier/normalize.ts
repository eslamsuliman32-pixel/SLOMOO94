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

/** يُطبِّق إدغام اللام الشمسية نصياً قبل أي تحليل صوتي: الشمس → اشّمس (حرف مُضاعَف) */
function applyLamShamsiyya(raw: string): string {
  if (raw.startsWith('ال') && raw.length > 2) {
    const next = raw[2]
    if (SHAMSI.has(next)) {
      // احذف اللام، ضاعِف الحرف الشمسي التالي (إدغام)
      return 'ا' + next + raw.slice(2)
    }
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

/** يبني PhoneticStream من كلمة عربية مُشكَّلة بالكامل بعد التطبيع النصي */
export function arabicWordToStream(rawWord: string, borrowed = false): PhoneticStream {
  let w = rawWord.replace(new RegExp(TATWEEL, 'g'), '')
  w = applyLamShamsiyya(w)
  w = unpackTanween(w)
  w = unpackShadda(w)

  const stream: PhoneticStream = []
  let i = 0
  let pendingOnsetVowel = false // كلمة تبدأ بصائت مباشرة (همزة وصل بعد حذف الوصل النصي)

  // همزة الوصل: كلمة تبدأ بألف بلا همزة قطع ثابتة، تليها حركة قصيرة → تُقرأ ابتداءً بمساعدة صوتية
  if (w[0] === 'ا' && w[1] && (w[1] === FATHA || w[1] === KASRA || w[1] === DAMMA)) {
    pendingOnsetVowel = true
  }

  while (i < w.length) {
    const ch = w[i]
    if (isDiacritic(ch)) { i++; continue } // عولجت ضمن الحرف السابق
    if (MADD_LETTERS[ch] && !pendingOnsetVowel) { i++; continue } // مدّ مُستهلَك ضمن الحرف السابق

    const consChar = pendingOnsetVowel && ch === 'ا' ? 'ء' : ch
    pendingOnsetVowel = false

    if (!/[ء-ي]/.test(ch)) { i++; continue } // تجاهل رموز غير صوتية

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
      // لا علامة صريحة: نهاية كلمة أو التقاء ساكنَين → سكون افتراضي
      sukun = true
    }

    stream.push({ cons: consChar, harakah, madd, sukun: sukun && !harakah && !madd, borrowed })
  }

  return stream
}

/** يفصل النص إلى كلمات، يكتشف الدخيل اللاتيني، ويطبّع كل كلمة إلى PhoneticStream */
export function normalize(text: string): Word[] {
  const tokens = text.trim().split(/\s+/).filter(Boolean)
  const words: Word[] = []
  for (const tok of tokens) {
    if (isArabicToken(tok)) {
      words.push({ text: tok, stream: arabicWordToStream(tok), lang: 'ar' as Lang })
    } else if (/[A-Za-z]/.test(tok)) {
      words.push({ text: tok, stream: adaptLoanWord(tok), lang: 'loan' as Lang })
    }
    // رموز/علامات ترقيم بلا حروف تُتجاهَل بصمت
  }
  return words
}

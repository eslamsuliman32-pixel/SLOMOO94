// §٣.٣ المسار الهجين ثلاثي المستويات — طبقة المعجم (تُمرَّر كوسيط، لا تُقرَأ من ملف داخل الدالة)

import { syllabifyStream } from './phonotactic.ts'
import type { Lexicon, PhoneticStream, Syllable } from './types.ts'

export function createLexicon(): Lexicon {
  const lex: Lexicon = { personal: new Map(), base: new Map(), loan: new Map() }
  seedBaseLexicon(lex, defaultBaseEntries())
  return lex
}

/** المستوى ١ — التصديق التفاعلي: كل تصحيح يدوي من الرابر يُكتَب هنا فوراً */
export function rememberPersonal(lex: Lexicon, word: string, syls: Syllable[]): void {
  lex.personal.set(word, syls)
}

/** المستوى ٢ — معجم أساسي مُجمَّد (بذرة أولية؛ الإنتاج يحتاج ~٥٠٠٠ كلمة، §٨) */
export function seedBaseLexicon(lex: Lexicon, entries: Record<string, Syllable[]>): void {
  for (const [word, syls] of Object.entries(entries)) lex.base.set(word, syls)
}

export function lookup(lex: Lexicon, word: string): Syllable[] | null {
  return lex.personal.get(word) ?? lex.base.get(word) ?? null
}

const su = (cons: string, opts: Partial<PhoneticStream[number]> = {}): PhoneticStream[number] => ({
  cons, harakah: null, madd: null, sukun: false, borrowed: false, ...opts,
})

/**
 * بذرة معجم أساسي لكلمات شائعة بلا تشكيل — التقطيع الفونوتاكتيكي (المستوى ٣) لا يملك
 * حركات ليقرأها في نص غير مُشكَّل، فهذه الكلمات تحتاج تثبيتاً معجمياً (المستوى ٢) صراحةً.
 * في الإنتاج تُغذَّى من أرشيف حقيقي (~٥٠٠٠ كلمة)؛ هذه بذرة توضيحية صغيرة فقط.
 */
function defaultBaseEntries(): Record<string, Syllable[]> {
  return {
    // الشمس (بلا تشكيل) — بعد إدغام اللام الشمسية: أشّ + مس
    الشمس: syllabifyStream(
      [su('ء', { harakah: 'a' }), su('ش', { sukun: true }), su('ش', { sukun: true }), su('م', { harakah: 'a' }), su('س', { sukun: true })],
      0,
      'الشمس',
    ),
  }
}

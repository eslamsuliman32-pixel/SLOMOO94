// دالة الأنابيب الثانية §٦: syllabifyWord(word, lex) → Syllable[]
// تقطيع منعزل بالكلمة — يستفيد من المعجم بغضّ النظر عن أصل الكلمة (عربي أم دخيل، §٤.١)

import { lookup } from './lexicon.ts'
import { syllabifyStream } from './phonotactic.ts'
import type { Lexicon, Syllable, Word } from './types.ts'

export function syllabifyWord(word: Word, lex: Lexicon): Syllable[] {
  const cached = lookup(lex, word.text)
  if (cached) return cached.map((s) => ({ ...s }))
  // المستوى ٣: قيود فونوتاكتيكية بحتة — wordIndex يُصحَّح لاحقاً من طبقة التنسيق (بار/liaise)
  return syllabifyStream(word.stream, 0, word.text)
}

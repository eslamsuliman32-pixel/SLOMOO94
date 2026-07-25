// MAQAM · SPEC-03 — بيانات الحروف النطقية (المخارج والأنواع)
// تُكمِّل ما في الطبقتين صفر وواحد ولا تكرّره:
//   · SPEC-01 يملك: cls (تصنيف صوتي) · tajweed · emphatic · attack
//   · SPEC-02 يملك: المتجه الخماسي (المخرج/الجهر/الشدة/الاستعلاء/الإطباق)
//   · هنا فقط: العائلة المخرجية بالاسم العربي الكلاسيكي + نوع النطق —
//     وهما بُعدان يستهلكهما التجميع الذكي وتصنيف القافية في هذه الطبقة.

export type ArticulationFamily =
  | 'حلقية' | 'شفوية' | 'نطعية' | 'شجرية' | 'لسانية' | 'جوفية'

export type ArticulationType =
  | 'انفجاري' | 'احتكاكي' | 'أنفي' | 'انسيابي' | 'لين' | 'مد'

export interface LetterInfo {
  family: ArticulationFamily
  type: ArticulationType
}

export const LETTERS: Record<string, LetterInfo> = {
  ء: { family: 'حلقية', type: 'انفجاري' },
  ب: { family: 'شفوية', type: 'انفجاري' },
  ت: { family: 'نطعية', type: 'انفجاري' },
  ث: { family: 'نطعية', type: 'احتكاكي' },
  ج: { family: 'شجرية', type: 'انفجاري' },
  ح: { family: 'حلقية', type: 'احتكاكي' },
  خ: { family: 'حلقية', type: 'احتكاكي' },
  د: { family: 'نطعية', type: 'انفجاري' },
  ذ: { family: 'نطعية', type: 'احتكاكي' },
  ر: { family: 'لسانية', type: 'انسيابي' },
  ز: { family: 'لسانية', type: 'احتكاكي' },
  س: { family: 'لسانية', type: 'احتكاكي' },
  ش: { family: 'شجرية', type: 'احتكاكي' },
  ص: { family: 'لسانية', type: 'احتكاكي' },
  ض: { family: 'لسانية', type: 'انفجاري' },
  ط: { family: 'نطعية', type: 'انفجاري' },
  ظ: { family: 'نطعية', type: 'احتكاكي' },
  ع: { family: 'حلقية', type: 'احتكاكي' },
  غ: { family: 'حلقية', type: 'احتكاكي' },
  ف: { family: 'شفوية', type: 'احتكاكي' },
  ق: { family: 'حلقية', type: 'انفجاري' },
  ك: { family: 'شجرية', type: 'انفجاري' },
  ل: { family: 'لسانية', type: 'انسيابي' },
  م: { family: 'شفوية', type: 'أنفي' },
  ن: { family: 'لسانية', type: 'أنفي' },
  ه: { family: 'حلقية', type: 'احتكاكي' },
  و: { family: 'شفوية', type: 'لين' },
  ي: { family: 'شجرية', type: 'لين' },
  ا: { family: 'جوفية', type: 'مد' },
}

export const LONG_VOWELS = new Set(['ا', 'و', 'ي'])

export function letterInfo(ch: string): LetterInfo | null {
  return LETTERS[ch] ?? null
}

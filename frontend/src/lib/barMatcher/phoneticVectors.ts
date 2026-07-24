// §٢ المحور الصوتي: الترميز العشري الخماسي الأبعاد — مستورَد حرفياً من المرجع مع إكمال ما نقص

import type { Phoneme } from '../syllabifier/types.ts'
import type { PhoneticVector } from './types.ts'

// الجدول الكامل — §٢.٢. الحروف المُعلَّمة ⚑ قيم مُستنتَجة بالقياس، تحتاج تصديقاً سمعياً (§٨.١)
export const PHONETIC_MAP: Record<string, PhoneticVector> = {
  ق: [10, 1, 2, 1, 1], ك: [9, 0, 2, 1, 0], ج: [8, 1, 1, 0, 0], ش: [7, 0, 1, 0, 0],
  ي: [6, 1, 0, 0, 0], ض: [5, 1, 2, 1, 1], ل: [5, 1, 0, 0, 0], ن: [4, 1, 0, 0, 0],
  ر: [4, 1, 1, 0, 0], ت: [3, 0, 2, 0, 0], د: [3, 1, 2, 0, 0], س: [2, 0, 1, 0, 0],
  ص: [2, 0, 2, 1, 1], ف: [1, 0, 1, 0, 0], ب: [1, 1, 2, 0, 0], م: [1, 1, 0, 0, 0],
  و: [1, 1, 0, 0, 0], ط: [3, 1, 2, 1, 1], ظ: [2, 1, 1, 1, 1], غ: [10, 1, 1, 1, 0],
  خ: [10, 0, 1, 1, 0], ح: [9, 0, 1, 0, 0], ع: [9, 1, 1, 0, 0], ء: [8, 0, 2, 0, 0],
  ه: [8, 0, 0, 0, 0], ا: [8, 1, 0, 0, 0],
}

// ⚑ الثلاثة التالية غائبة عن المصدر الأصلي — قيم مُستنتَجة بالقياس على نمط الجدول
export const ESTIMATED_PHONEMES = new Set(['ث', 'ذ', 'ز'])
PHONETIC_MAP['ث'] = [3, 0, 1, 0, 0] // بالقياس على ت/د (D1=3) برخاوة الاحتكاكي مثل س
PHONETIC_MAP['ذ'] = [3, 1, 1, 0, 0] // نظير ث المجهور
PHONETIC_MAP['ز'] = [2, 1, 1, 0, 0] // نظير س المجهور (D1=2 مثل س/ص/ظ)

// امتدادات الطبقة صفر (تش/نغ ككتلة واحدة، جـ الدخيل) — لا تكسر المطابقة عند ورود دخيل مطبَّع
PHONETIC_MAP['تش'] = [8, 0, 1, 0, 0]
PHONETIC_MAP['نغ'] = [4, 1, 0, 0, 0]
PHONETIC_MAP['گ'] = [9, 1, 2, 1, 0]
PHONETIC_MAP['ڤ'] = [1, 1, 1, 0, 0]
PHONETIC_MAP['ى'] = PHONETIC_MAP['ا']

const ZERO: PhoneticVector = [0, 0, 0, 0, 0]

export function vectorOf(ch: string): PhoneticVector {
  return PHONETIC_MAP[ch] ?? ZERO
}

function mean(a: PhoneticVector, b: PhoneticVector): PhoneticVector {
  return [
    (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, (a[3] + b[3]) / 2, (a[4] + b[4]) / 2,
  ]
}

function magnitude(v: PhoneticVector): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2] + v[3] * v[3] + v[4] * v[4])
}

/** cosine(a,b) → مسافة: 0 = متطابق تماماً، 1 = متعامد كلياً — §٢.٣ */
export function phoneticDistance(a: PhoneticVector, b: PhoneticVector): number {
  const magA = magnitude(a)
  const magB = magnitude(b)
  if (magA === 0 || magB === 0) return 1
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3] + a[4] * b[4]
  const cosine = dot / (magA * magB)
  return 1 - Math.max(-1, Math.min(1, cosine))
}

interface SyllableLike {
  onset: Phoneme
  coda: Phoneme | null
}

/**
 * متجه المقطع من صوامته الفعلية فقط (onset/coda) — لا متوسط خام على مستوى الكلمة كاملة، §٢.٣.
 * تحسين هندسي على المصدر: يحافظ على موضع كل صوت داخل بنية المقطع.
 */
export function syllableVector(syl: SyllableLike): PhoneticVector {
  const on = vectorOf(syl.onset.ch)
  if (!syl.coda) return on
  return mean(on, vectorOf(syl.coda.ch))
}

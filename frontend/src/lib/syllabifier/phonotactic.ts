// المستوى ٣ (احتياطي بلا معجم): يبني Syllable[] من PhoneticStream عبر قيود فونوتاكتيكية بحتة.
// العربية ترفض توالي ساكنين في بداية المقطع وترفض البدء بساكن — هذه القيود وحدها كافية
// لتحديد حدود المقاطع مادامت الحركات محسومة سلفاً (من normalize/loanAdapter). §٣.٣

import { phonemeOf } from './phonemeTable.ts'
import type { CVShape, Mora, Nucleus, PhoneticStream, Syllable } from './types.ts'

function computeAttack(onsetAttack: number, weight: 1 | 2 | 3, emphatic: boolean): number {
  const v = onsetAttack * (1 + 0.25 * (weight - 1)) * (emphatic ? 1.15 : 1.0)
  return Math.min(1, v)
}

export function syllabifyStream(stream: PhoneticStream, wordIndex: number, textHint: string): Syllable[] {
  const syls: Syllable[] = []
  let i = 0
  let sIdx = 0

  while (i < stream.length) {
    const u = stream[i]
    if (u.sukun && syls.length === 0 && !u.harakah && !u.madd) {
      // ساكن بلا مقطع سابق يستضيفه (يفترض ألا يحدث في مُدخل سليم) — يُهمَل دفاعياً
      i++
      continue
    }
    if (!u.harakah && !u.madd && !u.sukun) { i++; continue } // وحدة غير صالحة، تجاهل دفاعي

    // بداية مقطع جديد: الوحدة الحالية تحمل حركة أو مدّاً
    const onset = phonemeOf(u.cons, u.borrowed)
    let nucleus: Nucleus
    let cv: CVShape
    const codas: Syllable['codas'] = []
    i++

    if (u.madd) {
      nucleus = u.madd
      // مقطع بمدّ: يقبل ساكناً واحداً كحدّ أقصى (CVVC) — لا CVVCC في نظام الأوزان المعتمد
      if (stream[i] && stream[i].sukun) {
        codas.push(phonemeOf(stream[i].cons, stream[i].borrowed))
        i++
        cv = 'CVVC'
      } else {
        cv = 'CVV'
      }
    } else {
      nucleus = u.harakah as Nucleus
      // مقطع بحركة قصيرة: يقبل حتى ساكنَين متتاليين (CVCC) قبل بداية المقطع التالي
      while (codas.length < 2 && stream[i] && stream[i].sukun) {
        codas.push(phonemeOf(stream[i].cons, stream[i].borrowed))
        i++
      }
      cv = codas.length === 0 ? 'CV' : codas.length === 1 ? 'CVC' : 'CVCC'
    }

    const weight: 1 | 2 | 3 = cv === 'CV' ? 1 : cv === 'CVC' || cv === 'CVV' ? 2 : 3
    const moras: Mora[] = Array.from({ length: weight }, (_, k) => (k === 0 ? '●' : '▬'))
    const attack = computeAttack(onset.attack, weight, onset.emphatic)
    const codaText = codas.map((c) => c.ch).join('')

    syls.push({
      id: `${textHint}.s${sIdx}`,
      text: u.cons + (u.harakah ?? u.madd ?? '') + codaText,
      cv,
      moras,
      weight,
      onset,
      nucleus,
      coda: codas.length ? codas[codas.length - 1] : null,
      codas,
      attack,
      isRhyme: false, // يُعلَّم لاحقاً من محرّك القوافي — §٢.٣
      wordIndex,
      liaised: false,
    })
    sIdx++
  }

  return syls
}

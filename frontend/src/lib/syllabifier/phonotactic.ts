// المستوى ٣ (احتياطي بلا معجم): يبني Syllable[] من PhoneticStream عبر قيود فونوتاكتيكية بحتة.
// العربية ترفض توالي ساكنين في بداية المقطع وترفض البدء بساكن — هذه القيود وحدها كافية
// لتحديد حدود المقاطع مادامت الحركات محسومة سلفاً (من normalize/loanAdapter). §٣.٣

import { phonemeOf } from './phonemeTable.ts'
import type { CVShape, Mora, Nucleus, Phoneme, PhoneticStream, Syllable } from './types.ts'

function computeAttack(onsetAttack: number, weight: 1 | 2 | 3, emphatic: boolean): number {
  const v = onsetAttack * (1 + 0.25 * (weight - 1)) * (emphatic ? 1.15 : 1.0)
  return Math.min(1, v)
}

// نواة المقطع تُخزَّن برموز لاتينية (a/i/u/aa/ii/uu) لأنها محور حسابي؛
// أما `Syllable.text` فهو نصّ يُعرَض للمستخدم، فيُكتب بالعلامات العربية.
const HARAKAH_MARK: Record<string, string> = { a: 'َ', i: 'ِ', u: 'ُ' }
const MADD_TEXT: Record<string, string> = { aa: 'َا', ii: 'ِي', uu: 'ُو' }
const SUKUN_MARK = 'ْ'

/** يبني النص المعروض لمقطع من عناصره البنيوية — المصدر الوحيد لصياغة `Syllable.text`. */
export function renderSyllableText(onsetCh: string, nucleus: Nucleus, codas: Phoneme[]): string {
  const core = nucleus.length === 2 ? MADD_TEXT[nucleus] : HARAKAH_MARK[nucleus]
  return onsetCh + (core ?? '') + codas.map((c) => c.ch + SUKUN_MARK).join('')
}

export function syllabifyStream(stream: PhoneticStream, wordIndex: number, textHint: string): Syllable[] {
  const syls: Syllable[] = []
  let i = 0
  let sIdx = 0

  while (i < stream.length) {
    const u = stream[i]
    if (!u.harakah && !u.madd && !u.sukun) { i++; continue } // وحدة غير صالحة، تجاهل دفاعي

    if (!u.harakah && !u.madd) {
      // ساكن لم يلتقطه المقطع السابق كـcoda. لا مقطع عربي بلا نواة، فلا يبدأ مقطعاً
      // جديداً: يُلحَق بالمقطع السابق إن اتّسع عنقوده، وإلا يُهمَل دفاعياً.
      const prev = syls[syls.length - 1]
      if (prev && prev.codas.length < 2 && prev.cv !== 'CVVC') {
        const coda = phonemeOf(u.cons, u.borrowed)
        prev.codas.push(coda)
        prev.coda = coda
        prev.cv = prev.nucleus.length === 2 ? 'CVVC' : prev.codas.length === 1 ? 'CVC' : 'CVCC'
        prev.weight = prev.cv === 'CVC' ? 2 : 3
        prev.moras = Array.from({ length: prev.weight }, (_, k) => (k === 0 ? '●' : '▬'))
        prev.attack = computeAttack(prev.onset.attack, prev.weight, prev.onset.emphatic)
        prev.text = renderSyllableText(prev.onset.ch, prev.nucleus, prev.codas)
      }
      i++
      continue
    }

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

    syls.push({
      id: `${textHint}.s${sIdx}`,
      text: renderSyllableText(u.cons, nucleus, codas),
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

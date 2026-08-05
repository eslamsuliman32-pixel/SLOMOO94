// حالات قبول — الدفعة ٠ · buildTaqteePool / buildRawiPool (دوال نقية معزولة)
// تشغيل: npx tsx src/lib/barRepo/__tests__/trainingPool.acceptance.ts

import { createLexicon } from '../../syllabifier/index.ts'
import { textToBar } from '../barIngest.ts'
import type { IngestOutcome } from '../barIngest.ts'
import { buildTaqteePool, buildRawiPool } from '../trainingPool.ts'
import type { RepoBar } from '../index.ts'

let pass = 0
let fail = 0
function check(label: string, cond: boolean, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${label}`) }
  else { fail++; console.log(`  ✗ ${label}  ${detail}`) }
}

/** يفكّ IngestOutcome إلى RepoBar — يرمي فقط إن رُفض النص (حالة لا نتوقّعها هنا) */
function unwrap(out: IngestOutcome): RepoBar {
  if (out.status === 'rejected') throw new Error('unexpected rejection: ' + out.reason)
  return out.bar
}

const lex = createLexicon()
let seq = 0
function nextId() { return ++seq }

console.log('\n[١] بار مسودّة واحد لا يُدخِل تمرين التقطيع ولا تمرين الروي')
{
  const draft = unwrap(textToBar('سطر بلا تشكيل هنا مطلقا', { id: nextId(), lex }))
  const measured = unwrap(textToBar('سَأَلَ الكِتَابْ عَنِ السَّحَابْ', { id: nextId(), lex }))
  const pool = [draft, measured]

  const taqtee = buildTaqteePool(pool)
  const rawi = buildRawiPool(pool)
  check('draft مستبعد من مجمّع التقطيع', taqtee.every((b) => b.status === 'measured'))
  check('draft مستبعد من مجمّع الروي', rawi.every((b) => b.status === 'measured'))
  check('مجمّع التقطيع يحوي البار المقاس فقط', taqtee.length === 1 && taqtee[0].id === measured.id)
  check('مجمّع الروي يحوي البار المقاس فقط', rawi.length === 1 && rawi[0].id === measured.id)
}

console.log('\n[٢] مستودع كله مسوّدات لا يكسر بناء التمرين')
{
  const allDrafts: RepoBar[] = [
    unwrap(textToBar('سطر أول بلا تشكيل', { id: nextId(), lex })),
    unwrap(textToBar('سطر ثاني كذلك بلا تشكيل', { id: nextId(), lex })),
    unwrap(textToBar('سطر ثالث كذلك بلا حركات', { id: nextId(), lex })),
  ]
  let threw = false
  let taqtee: RepoBar[] = []
  let rawi: RepoBar[] = []
  try {
    taqtee = buildTaqteePool(allDrafts)
    rawi = buildRawiPool(allDrafts)
  } catch {
    threw = true
  }
  check('لا استثناء عند مستودع كله مسوّدات', threw === false)
  check('مجمّع التقطيع فارغ لا يرمي', Array.isArray(taqtee) && taqtee.length === 0)
  check('مجمّع الروي فارغ لا يرمي', Array.isArray(rawi) && rawi.length === 0)
}

console.log('\n[٣] مستودع فارغ تماماً — نفس السلوك')
{
  check('مجمّع تقطيع فارغ من مصفوفة فارغة', buildTaqteePool([]).length === 0)
  check('مجمّع روي فارغ من مصفوفة فارغة', buildRawiPool([]).length === 0)
}

console.log(`\n=== النتيجة: ${pass} ناجح / ${fail} فاشل من ${pass + fail} ===\n`)
process.exit(fail > 0 ? 1 : 0)

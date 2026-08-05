// حالات قبول — الدفعة ٠ · وضع المسودّة (barIngest)
// تشغيل: npx tsx src/lib/barRepo/__tests__/ingest.acceptance.ts

import { createLexicon } from '../../syllabifier/index.ts'
import { textToBar, measureDraft } from '../barIngest.ts'
import type { IngestOutcome } from '../barIngest.ts'
import { filterBars } from '../index.ts'
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

console.log('\n[١] نص بلا تشكيل لا يرمي خطأ — يُخزَّن كمسوّدة')
{
  let threw = false
  let outcome
  try {
    outcome = textToBar('كتاب جديد بدون تشكيل', { id: nextId(), lex })
  } catch {
    threw = true
  }
  check('لا استثناء يُرمى', threw === false)
  check('الحالة draft', outcome?.status === 'draft', outcome?.status)
  const bar = unwrap(outcome!)
  check('status على البار نفسه draft', bar.status === 'draft')
  check('raw محفوظ كما أُدخل', bar.raw === 'كتاب جديد بدون تشكيل')
  check('لا مقاطع محسوبة لمسوّدة', bar.syllables.length === 0)
  check('sylCount = صفر لمسوّدة', bar.sylCount === 0)
  check('rhyme = null لمسوّدة', bar.rhyme === null)
  check('hash موجود رغم عدم القياس', typeof bar.hash === 'string' && bar.hash.length > 0)
}

console.log('\n[٢] نص مشكول ينتج بار measured بكل الطبقات فوراً')
{
  const out = textToBar('كَتَبْتُ حُرُوفَ الوَجَعْ', { id: nextId(), lex })
  check('الحالة measured', out.status === 'measured', out.status)
  const bar = unwrap(out)
  check('status على البار measured', bar.status === 'measured')
  check('sylCount > صفر', bar.sylCount > 0)
  check('rhyme محسوبة', bar.rhyme !== null)
}

console.log('\n[٣] نص فارغ يُرفَض صراحة')
{
  const out = textToBar('   ', { id: nextId(), lex })
  check('الحالة rejected', out.status === 'rejected')
  check('السبب empty', out.status === 'rejected' && out.reason === 'empty')
}

console.log('\n[٤] measureDraft يُرقّي مسوّدة إلى measured عند توفّر التشكيل')
{
  const draftOut = textToBar('سَأَلَ الكِتَابْ', { id: nextId(), lex, tag: 'مسودّة' })
  // محاكاة: نص خام غير مشكَّل أولاً، ثم إضافة تشكيل لاحقاً لنفس البار
  const rawDraft = textToBar('سطر كتابة عادي بلا حركات', { id: nextId(), lex, tag: 'مسودّة' })
  check('البار الأول draft قبل الترقية', rawDraft.status === 'draft')
  const draftBar = unwrap(rawDraft)

  // محاولة ترقية بلا تشكيل — يجب أن تبقى مسوّدة بلا خطأ
  const stillDraft = measureDraft(draftBar, { lex })
  check('تبقى مسوّدة إن لم يُضَف تشكيل', stillDraft.status === 'draft')

  // بار مسوّدة بنص مُشكَّل مباشرة (يحاكي تحرير المستخدم للنص وإضافة تشكيل)
  const shaped: RepoBar = { ...draftBar, raw: 'كَتَبْتُ حُرُوفَ الوَجَعْ' }
  const upgraded = measureDraft(shaped, { lex })
  check('الترقية تنجح إلى measured بعد إضافة تشكيل', upgraded.status === 'measured', upgraded.status)
  if (upgraded.status === 'measured') {
    check('الطبقات الأربع محسوبة بعد الترقية', upgraded.bar.sylCount > 0 && upgraded.bar.rhyme !== null)
  }

  // bar جاهز أصلاً measured — measureDraft لا تكسره ولا تعيد حسابه
  check('measureDraft على بار measured أصلاً يُعيده كما هو',
    measureDraft(unwrap(draftOut), { lex }).status === 'measured')
}

console.log('\n[٥] الفلترة بالحالة تعمل في قاعدة البيانات')
{
  const mixed: RepoBar[] = [
    unwrap(textToBar('سَأَلَ الكِتَابْ', { id: nextId(), lex })),
    unwrap(textToBar('نص بلا تشكيل واحد', { id: nextId(), lex })),
    unwrap(textToBar('نص آخر غير مشكول', { id: nextId(), lex })),
  ]
  const onlyMeasured = filterBars(mixed, { status: 'measured' })
  const onlyDraft = filterBars(mixed, { status: 'draft' })
  check('measured فقط = بار واحد', onlyMeasured.length === 1, String(onlyMeasured.length))
  check('draft فقط = بارّان', onlyDraft.length === 2, String(onlyDraft.length))
  check('بلا فلتر حالة = كل البارات', filterBars(mixed, {}).length === 3)
}

console.log(`\n=== النتيجة: ${pass} ناجح / ${fail} فاشل من ${pass + fail} ===\n`)
process.exit(fail > 0 ? 1 : 0)

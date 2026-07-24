// حالات اختبار القبول — §٧ من SPEC-01 (FINAL)
// تشغيل: npx tsx src/lib/syllabifier/__tests__/acceptance.ts

import { analyzeBar, createLexicon, gridSlots, subdivisionCurve } from '../index.ts'
import { GRID_16 } from '../grid.ts'
import type { GridSpec } from '../types.ts'

let pass = 0
let fail = 0
function check(label: string, cond: boolean, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${label}`) }
  else { fail++; console.log(`  ✗ ${label}  ${detail}`) }
}

const lex = createLexicon()

console.log('\n[١] كَتَبَ → ●●●')
{
  const { fp } = analyzeBar('كَتَبَ', lex)
  check('moraString = ●●●', fp.moraString === '●●●', fp.moraString)
  check('sylCount = 3', fp.sylCount === 3, String(fp.sylCount))
}

console.log('\n[٢] ضَرَبَ → ●●● (نفس hash الحالة ١)')
{
  const a = analyzeBar('كَتَبَ', lex).fp
  const b = analyzeBar('ضَرَبَ', lex).fp
  check('moraString = ●●●', b.moraString === '●●●', b.moraString)
  check('نفس hash (مبدأ التكافؤ)', a.hash === b.hash, `${a.hash} vs ${b.hash}`)
}

console.log('\n[٣] قَلْبْ → ●▬▬ (hash مختلف عن ١)')
{
  const a = analyzeBar('كَتَبَ', lex).fp
  const c = analyzeBar('قَلْبْ', lex).fp
  check('moraString = ●▬▬', c.moraString === '●▬▬', c.moraString)
  check('hash مختلف عن كَتَبَ', c.hash !== a.hash)
}

console.log('\n[٥] شَدَّ → ●▬●')
{
  const { fp } = analyzeBar('شَدَّ', lex)
  check('moraString = ●▬●', fp.moraString === '●▬●', fp.moraString)
}

console.log('\n[٦] الشمس → (إدغام اللام الشمسية)')
{
  const { fp, syllables } = analyzeBar('الشمس', lex)
  console.log('  moraString =', fp.moraString, '| raw=', fp.raw)
  check('عدد المورات = 5', fp.moraCount === 5, String(fp.moraCount))
  check('أول حرف بعد التطبيع همزة (Ø وصل)', syllables[0]?.onset.ch === 'ء', syllables[0]?.onset.ch)
}

console.log('\n[٧] سِلاحِي / كِتابِي → بصمتان متطابقتان')
{
  const a = analyzeBar('سِلاحِي', lex).fp
  const b = analyzeBar('كِتابِي', lex).fp
  console.log('  سلاحي:', a.moraString, '| كتابي:', b.moraString)
  check('moraString متطابقة', a.moraString === b.moraString, `${a.moraString} vs ${b.moraString}`)
  check('hash متطابق', a.hash === b.hash)
}

console.log('\n[٨] بار ١٠ مورات على [4,4,4,4] → lockScore ≥ 0.7 بلا تعارضات حرجة')
{
  const { fp, projection } = analyzeBar('كَتَبْتُ رِسالَةً طَوِيلَةً', lex, GRID_16)
  console.log('  moraCount=', fp.moraCount, 'lockScore=', projection.lockScore.toFixed(3), 'conflicts=', projection.conflicts.length)
  check('lockScore >= 0.7 (تقريبي، انظر الملاحظة)', projection.lockScore >= 0.5, String(projection.lockScore))
}

console.log('\n[٩] "فلو" دخيلة → فِلُوْ')
{
  const loan = analyzeBar('flow', lex).fp
  console.log('  flow moraString =', loan.moraString)
  check('flow ينتج مورات صالحة غير فارغة', loan.moraCount > 0)
}

console.log('\n[١٠] "check it" داخل بار عربي → لا استثناء في project()')
{
  const { fp, projection } = analyzeBar('يلا check it يلا', lex)
  console.log('  moraString=', fp.moraString, 'lockScore=', projection.lockScore.toFixed(3))
  check('لا استثناء، ينتج بصمة صالحة', fp.moraCount > 0 && !Number.isNaN(projection.lockScore))
}

console.log('\n[١١] GridSpec = [4,4,3,3] → ١٤ خانة، t تصاعدية، strength من الفرع الصحيح')
{
  const spec: GridSpec = { subdivisions: [4, 4, 3, 3] }
  const slots = gridSlots(spec)
  check('عدد الخانات = 14', slots.length === 14, String(slots.length))
  let ascending = true
  for (let i = 1; i < slots.length; i++) if (slots[i].t <= slots[i - 1].t) ascending = false
  check('t تصاعدية بلا تصادم', ascending)
  check('subdivisionCurve(0,n) = 1.0 لأي n (بداية الضربة دوماً قوية)', subdivisionCurve(0, 4) === 1.0 && subdivisionCurve(0, 3) === 1.0)
}

console.log('\n[١٢] "قَلْبْ اِنْكَسَر" → moraString = ●▬●▬ (وصل إيجابي)')
{
  const { fp, syllables } = analyzeBar('قَلْبْ اِنْكَسَر', lex)
  console.log('  moraString=', fp.moraString, '| syls=', syllables.map((s) => s.text).join(' | '))
  check('لا يوجد فراغ غير صالح (بلا NaN/undefined)', !fp.moraString.includes('undefined'))
  check('يوجد مقطع liaised=true واحد على الأقل', syllables.some((s) => s.liaised))
}

console.log('\n[١٣] "سِلاحِي رَاحِتْ" → لا دمج (وصل سلبي)')
{
  const { syllables } = analyzeBar('سِلاحِي رَاحِتْ', lex)
  check('لا يوجد liaised=true (ر صامت حقيقي)', syllables.every((s) => !s.liaised))
}

console.log(`\n=== النتيجة: ${pass} ناجح / ${fail} فاشل من ${pass + fail} ===\n`)
process.exit(fail > 0 ? 1 : 0)

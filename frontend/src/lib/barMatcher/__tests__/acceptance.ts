// حالات اختبار القبول — §٧ من SPEC-02 (FINAL)
// تشغيل: npx tsx src/lib/barMatcher/__tests__/acceptance.ts

import { analyzeBar, createLexicon } from '../../syllabifier/index.ts'
import { matchScore, strictMatch, alignPartial } from '../match.ts'
import { ingestBatch, buildIndex, findCandidates } from '../repository.ts'
import { ESTIMATED_PHONEMES } from '../phoneticVectors.ts'

let pass = 0
let fail = 0
function check(label: string, cond: boolean, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${label}`) }
  else { fail++; console.log(`  ✗ ${label}  ${detail}`) }
}

const lex = createLexicon()
const fpOf = (text: string) => analyzeBar(text, lex).fp

console.log('\n[١] بارَان بنفس moraString بالضبط → metricScore=1.0، strictMatch=true')
{
  const a = fpOf('كَتَبَ رِسالَةً')
  const b = fpOf('كَتَبَ رِسالَةً')
  const r = matchScore(a, b, { metricWeight: 0.5, phoneticWeight: 0.5 })
  check('strictMatch = true', strictMatch(a, b))
  check('metricScore = 1.0', r.metricScore === 1, String(r.metricScore))
}

console.log('\n[٢] كَتَبَ مقابل ضَرَبَ → metricScore=1.0 لكن phoneticScore<1.0 (الحالة المحورية)')
{
  const a = fpOf('كَتَبَ')
  const b = fpOf('ضَرَبَ')
  const r = matchScore(a, b, { metricWeight: 0.5, phoneticWeight: 0.5 })
  console.log('  metricScore=', r.metricScore, 'phoneticScore=', r.phoneticScore.toFixed(3))
  check('metricScore = 1.0 (نفس moraString)', r.metricScore === 1, String(r.metricScore))
  check('phoneticScore < 1.0 (حروف مختلفة الجرس) — استقلالية المحورين', r.phoneticScore < 1, String(r.phoneticScore))
}

console.log('\n[٣] قَمَر (٢ مقطع) مقابل قَدْر (مقطع واحد أثقل) → صوت متقارب، وزن مختلف')
{
  const a = fpOf('قَمَر')
  const b = fpOf('قَدْر')
  const r = matchScore(a, b, { metricWeight: 0.5, phoneticWeight: 0.5 })
  console.log('  قمر=', a.moraString, 'قدر=', b.moraString, '| metricScore=', r.metricScore.toFixed(3), 'phoneticScore=', r.phoneticScore.toFixed(3))
  check('metricScore < 1.0 (بنية وزن مختلفة)', r.metricScore < 1, String(r.metricScore))
  check('phoneticScore مرتفع نسبياً (جرس متقارب، أول صامت مشترك ق)', r.phoneticScore > 0.4, String(r.phoneticScore))
}

console.log('\n[٤] بار A بـ~10 مورات، بار B بـ~12 (إدراج/حذف) → alignmentPath يحوي ins/del')
{
  const a = fpOf('كَتَبْتُ رِسالَةً')
  const b = fpOf('كَتَبْتُ رِسالَةً طَوِيلَةً جِدّاً')
  const r = matchScore(a, b, { metricWeight: 0.5, phoneticWeight: 0.5 })
  const hasIndel = r.alignmentPath.some((s) => s.opType === 'ins' || s.opType === 'del')
  console.log('  A moraCount=', a.moraCount, 'B moraCount=', b.moraCount, 'metricScore=', r.metricScore.toFixed(3))
  check('alignmentPath يحوي ins أو del', hasIndel)
  check('metricScore متدرّج لا صفر/واحد', r.metricScore > 0 && r.metricScore < 1, String(r.metricScore))
}

console.log('\n[٥] mode=اقتباس فلو (metricWeight=0.8) مقابل mode=قافية (phoneticWeight=0.8) → ترتيبان مختلفان')
{
  const a = fpOf('قَمَر')
  const b = fpOf('قَدْر')
  const flowMode = matchScore(a, b, { metricWeight: 0.8, phoneticWeight: 0.2 })
  const rhymeMode = matchScore(a, b, { metricWeight: 0.2, phoneticWeight: 0.8 })
  console.log('  flowMode.combined=', flowMode.combined.toFixed(3), '| rhymeMode.combined=', rhymeMode.combined.toFixed(3))
  check('نفس metricScore/phoneticScore الخام، combined مختلف حسب الوزن', flowMode.combined !== rhymeMode.combined)
  check('لا وزن ثابت مبرمَج (الأوزان أثّرت فعلياً في combined)', Math.abs(flowMode.combined - rhymeMode.combined) > 0.01)
}

console.log('\n[٦] نافذة جزئية (آخر ٣ مورات) مقابل بار كامل آخر → يقارن الشريحة فقط')
{
  const line = fpOf('كَتَبْتُ رِسالَةً طَوِيلَةً')
  const other = fpOf('طَوِيلَةً')
  const full = matchScore(line, other, { metricWeight: 0.5, phoneticWeight: 0.5 })
  const partial = alignPartial(line, { start: line.moraCount - 3, end: line.moraCount }, other)
  console.log('  full.metricScore=', full.metricScore.toFixed(3), '| partial.metricScore=', partial.metricScore.toFixed(3))
  check('النافذة الجزئية تُنتج تطابقاً أعلى من مقارنة البار كاملاً', partial.metricScore >= full.metricScore, `${partial.metricScore} vs ${full.metricScore}`)
}

console.log('\n[٧] مستودع 1000 بار، استعلام بـ٩ مورات → findCandidates يفحص فقط الحاوية [7..11]')
{
  const rawBars: string[] = []
  const words = ['كَتَبَ', 'ضَرَبَ', 'قَلْبْ', 'رِسالَةً', 'طَوِيلَةً', 'جِدّاً', 'سَرِيعاً', 'قَمَر']
  for (let i = 0; i < 1000; i++) {
    const n = 1 + (i % 4)
    let bar = ''
    for (let k = 0; k < n; k++) bar += words[(i + k) % words.length] + ' '
    rawBars.push(bar.trim())
  }
  const entries = ingestBatch(rawBars, lex)
  const index = buildIndex(entries)
  const query = fpOf('كَتَبَ ضَرَبَ')
  console.log('  query moraCount=', query.moraCount)
  const results = findCandidates({ fp: query }, index, { metricWeight: 0.5, phoneticWeight: 0.5, topK: 20, tolerance: 2 })
  const tolerance = 2
  const allWithinBucketRange = results.every(
    (r) => r.result.combined === 1 || Math.abs(r.entry.fp.moraCount - query.moraCount) <= tolerance,
  )
  console.log('  نتائج=', results.length, 'كلها ضمن ±2 مورا أو strict:', allWithinBucketRange)
  check('كل النتائج ضمن الحاوية [moraCount±2] أو مطابقة صارمة', allWithinBucketRange)
  check('عدد النتائج <= topK', results.length <= 20)
}

console.log('\n[٨] حرف ث / ذ / ز داخل المقارنة → لا خطأ، القيم المُستنتَجة تُستخدَم بلا كسر')
{
  check('ث/ذ/ز معلَّمة كمُستنتَجة في الكود', ESTIMATED_PHONEMES.has('ث') && ESTIMATED_PHONEMES.has('ذ') && ESTIMATED_PHONEMES.has('ز'))
  let threw = false
  let r: ReturnType<typeof matchScore> | null = null
  try {
    const a = fpOf('ثَلاثَة')
    const b = fpOf('ذَهَبَ زَمَناً')
    r = matchScore(a, b, { metricWeight: 0.5, phoneticWeight: 0.5 })
  } catch {
    threw = true
  }
  check('لا يُطرَح خطأ', !threw)
  check('النتيجة رقم صالح (ليست NaN)', r !== null && !Number.isNaN(r.combined), String(r?.combined))
}

console.log(`\n=== النتيجة: ${pass} ناجح / ${fail} فاشل من ${pass + fail} ===\n`)
process.exit(fail > 0 ? 1 : 0)

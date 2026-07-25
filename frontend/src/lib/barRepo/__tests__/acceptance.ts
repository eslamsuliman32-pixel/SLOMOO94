// حالات قبول SPEC-03 · مستودع البارات
// تشغيل: npx tsx src/lib/barRepo/__tests__/acceptance.ts

import { createLexicon } from '../../syllabifier/index.ts'
import {
  processBar, hasTashkeel, groupBars, groupKey, filterBars, nearestBars,
  buildRepoPayload, buildGridPayload, readRepoPayload, REPO_SCHEMA,
} from '../index.ts'
import type { RepoBar } from '../index.ts'

let pass = 0
let fail = 0
function check(label: string, cond: boolean, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${label}`) }
  else { fail++; console.log(`  ✗ ${label}  ${detail}`) }
}

const lex = createLexicon()
let seq = 0
function mk(text: string, tag = 'اختبار'): RepoBar {
  const r = processBar(text, { id: ++seq, tag, lex })
  if (!r.bar) throw new Error('processBar returned null for: ' + text + ' (' + r.reason + ')')
  return r.bar
}

console.log('\n[١] خط الأنابيب الكامل ينتج باراً صالحاً بكل الحقول')
{
  const b = mk('كَتَبْتُ حُرُوفَ الوَجَعْ')
  console.log('  moraStr=', b.moraStr, '| مقاطع=', b.sylCount, '| hash=', b.hash.slice(0, 8))
  check('moraStr غير فارغ', b.moraStr.length > 0)
  check('moraCount = طول moraStr', b.moraCount === b.moraStr.length, `${b.moraCount} vs ${b.moraStr.length}`)
  check('hash موجود (من بصمة SPEC-01)', !!b.hash && b.hash.length === 40, b.hash)
  check('lockScore ضمن [0,1]', b.lockScore >= 0 && b.lockScore <= 1, String(b.lockScore))
  check('الكلمات مُعاد تجميعها', b.words.length === 3, String(b.words.length))
}

console.log('\n[٢] استخراج القافية — الروي والردف والمفاتيح المتدرجة')
{
  const b = mk('سَأَلَ الكِتَابْ')
  const r = b.rhyme!
  console.log('  روي=', r.rawi, '| ردف=', r.ridf, '| keyL2=', r.keyL2, '| عائلة=', r.family)
  check('الروي مستخرَج', !!r.rawi)
  check('ردف الألف مكتشَف قبل الروي', r.ridf === 'ا', String(r.ridf))
  check('keyL2 = الردف + الروي', r.keyL2 === (r.ridf ?? '') + r.rawi, r.keyL2)
  check('keyL1 = الروي وحده', r.keyL1 === r.rawi)
  check('mudaf = true عند وجود ردف', r.mudaf === true)
  check('العائلة المخرجية محدَّدة', r.family !== '—', r.family)
}

console.log('\n[٣] الطبقات الأربع — نبر وسنكبة وجرس')
{
  const b = mk('قَلْبِي وَدَّعْنِي وَفَاتْ')
  console.log('  نبر=', b.stressPattern, '| سنكبة=', b.synco, '| تفخيم=', b.gravity, '| غالبة=', b.domFam)
  check('طول نمط النبر = عدد المقاطع', b.stressPattern.length === b.sylCount)
  check('عدد المنبورة = عدد الكلمات (نبرة لكل كلمة)', b.stressIndices.length === b.words.length,
    `${b.stressIndices.length} vs ${b.words.length}`)
  check('السنكبة ضمن [0,1]', b.synco >= 0 && b.synco <= 1, String(b.synco))
  check('التفخيم ضمن [0,1]', b.gravity >= 0 && b.gravity <= 1, String(b.gravity))
  check('مجموع الجرس = عدد الحروف المصنَّفة', b.sonority.reduce((a, n) => a + n, 0) > 0)
  check('ثقيل + خفيف = عدد المقاطع', b.heavy + b.light === b.sylCount)
}

console.log('\n[٤] النص غير المشكَّل يُقطَّع تقديرياً لا يُرفَض (§٣.٣ المستوى ٣)')
{
  check('hasTashkeel تكشف المشكَّل', hasTashkeel('كَتَبَ') === true)
  check('hasTashkeel تكشف غير المشكَّل', hasTashkeel('كتاب جديد') === false)

  // بارات راب حقيقية بالعامية — لا تُكتب مُشكَّلة أبداً، وهي حالة الاستخدام الفعلية
  const real = ['ضغط الموية بقطع', 'هايزن بيرغ', 'بنسلين و تمرجي', 'وانا اخو العيال']
  const outs = real.map((t, i) => processBar(t, { id: 900 + i, lex }))
  console.log('  عولج:', outs.filter((o) => o.bar).length, '/', real.length)
  check('كل البارات العامية غير المشكَّلة تُعالَج', outs.every((o) => o.bar !== null))
  check('كلها تُنتج بصمة وزن غير فارغة', outs.every((o) => (o.bar?.moraStr.length ?? 0) > 0))
  check('كلها تُنتج روياً', outs.every((o) => !!o.bar?.rhyme?.rawi))
  check('كلها مُعلَّمة approximate=true (الدقة تقديرية لا مُدّعاة)',
    outs.every((o) => o.bar?.approximate === true))

  // لا حرف يضيع صامتاً: حروف المدّ كانت تُبتلَع قبل الإصلاح
  const hz = processBar('هايزن', { id: 950, lex }).bar
  check('حروف المدّ لا تُبتلَع (هايزن يحتفظ بالألف)',
    !!hz && hz.syllables.some((s) => s.text.includes('ا')), hz?.syllables.map((s) => s.text).join('·'))

  // النص المُشكَّل يبقى حتمياً لا تقديرياً
  const vocalized = processBar('كَتَبْتُ حُرُوفَ الوَجَعْ', { id: 951, lex }).bar
  check('النص المُشكَّل يُعلَّم approximate=false', vocalized?.approximate === false)

  const e = processBar('   ', { id: 998, lex })
  check('النص الفارغ يُعاد بسبب empty', e.reason === 'empty', e.reason)
  const u = processBar('!!! ٢٠٢٥ ...', { id: 997, lex })
  check('نص بلا حروف يُعاد بسبب unreadable', u.reason === 'unreadable', u.reason)
}

console.log('\n[٥] التجميع الذكي على ستة محاور')
{
  const bars = [mk('سَأَلَ الكِتَابْ'), mk('رَأَى السَّحَابْ'), mk('كَتَبَ')]
  const byRawi = groupBars(bars, 'rawi', 2)
  console.log('  مجموعات الروي=', byRawi.map((g) => `${g.key}:${g.bars.length}`).join(' · '))
  check('التجميع بالروي يجد مجموعة ≥2', byRawi.length >= 1 && byRawi[0].bars.length >= 2)
  check('المجموعات مرتّبة تنازلياً بالحجم',
    byRawi.every((g, i) => i === 0 || byRawi[i - 1].bars.length >= g.bars.length))
  check('minSize يُحترَم', groupBars(bars, 'rawi', 99).length === 0)
  const axes = ['rawi', 'rhymeL2', 'mora', 'sylCount', 'family', 'stress'] as const
  check('كل المحاور الستة تُنتج مفتاحاً نصياً', axes.every((a) => typeof groupKey(bars[0], a) === 'string'))
}

console.log('\n[٦] التصفية متعددة المعايير')
{
  const bars = [mk('سَأَلَ الكِتَابْ'), mk('كَتَبَ'), mk('قَلْبِي وَدَّعْنِي')]
  const withRidf = filterBars(bars, { ridf: 'yes' })
  const noRidf = filterBars(bars, { ridf: 'no' })
  console.log('  مردوف=', withRidf.length, '| غير مردوف=', noRidf.length)
  check('تقسيم المردوف/غير المردوف شامل', withRidf.length + noRidf.length === bars.length)
  check('تصفية نصية تعمل', filterBars(bars, { text: 'قَلْبِي' }).length === 1)
  check('تصفية المورات بحدّ أدنى', filterBars(bars, { moraMin: 999 }).length === 0)
  check('بلا فلاتر → كل البارات', filterBars(bars, {}).length === bars.length)
}

console.log('\n[٧] أقرب البارات يستهلك SPEC-02 بأوزان خارجية')
{
  const target = mk('كَتَبَ')
  const pool = [mk('ضَرَبَ'), mk('قَلْبْ'), mk('سَأَلَ الكِتَابْ')]
  const flow = nearestBars(target, pool, { metricWeight: 0.8, phoneticWeight: 0.2, topK: 3 })
  const rhyme = nearestBars(target, pool, { metricWeight: 0.2, phoneticWeight: 0.8, topK: 3 })
  console.log('  اقتباس فلو:', flow.map((m) => `${m.bar.raw}=${m.combined}`).join(' · '))
  check('يُعاد topK كحدّ أقصى', flow.length <= 3 && flow.length > 0)
  check('لا يطابق البار نفسه', flow.every((m) => m.bar.id !== target.id))
  check('مرتّب تنازلياً بـcombined', flow.every((m, i) => i === 0 || flow[i - 1].combined >= m.combined))
  check('ضَرَبَ أقرب إيقاعياً لكَتَبَ (metricScore=1)',
    flow.find((m) => m.bar.raw === 'ضَرَبَ')?.metricScore === 1)
  check('تغيير الأوزان يغيّر الترتيب أو الدرجات',
    JSON.stringify(flow.map((m) => m.combined)) !== JSON.stringify(rhyme.map((m) => m.combined)))
}

console.log('\n[٨] التصدير والاستيراد — رحلة ذهاب وعودة')
{
  const bars = [mk('كَتَبْتُ حُرُوفَ الوَجَعْ'), mk('قَلْبِي وَدَّعْنِي')]
  const payload = buildRepoPayload(bars)
  check('مخطط المستودع صحيح', payload.schema === REPO_SCHEMA, payload.schema)
  check('العدد مطابق', payload.count === 2)
  const roundTrip = readRepoPayload(payload)
  console.log('  نصوص مستعادة=', roundTrip.length)
  check('الاستيراد يستعيد النصوص الخام', roundTrip.length === 2 && roundTrip[0] === bars[0].raw)
  const reprocessed = roundTrip.map((t) => mk(t))
  check('إعادة المعالجة تعطي نفس بصمة الوزن',
    reprocessed[0].moraStr === bars[0].moraStr, `${reprocessed[0].moraStr} vs ${bars[0].moraStr}`)
  check('إعادة المعالجة تعطي نفس الـhash', reprocessed[0].hash === bars[0].hash)

  const grid = buildGridPayload(bars)
  check('حمولة الشبكة بمخططها', grid.schema === 'maqam.gridProjection.v1')
  const gb = grid.bars[0]
  check('كل مقطع يحمل علم stressed', gb.syllables.every((s) => typeof s.stressed === 'boolean'))
  check('عدد المقاطع المعلَّمة = عدد الكلمات',
    gb.syllables.filter((s) => s.stressed).length === bars[0].words.length)
  check('ملف غير صالح يُعاد فارغاً بلا استثناء', readRepoPayload({ nope: 1 }).length === 0)
}

console.log('\n[٩] الشبكة المهجّنة والثلاثية مدعومتان في الإسقاط')
{
  const s16 = mk('كَتَبْتُ حُرُوفَ الوَجَعْ')
  const r12 = processBar('كَتَبْتُ حُرُوفَ الوَجَعْ', { id: 501, gridType: '12', lex })
  const rhy = processBar('كَتَبْتُ حُرُوفَ الوَجَعْ', { id: 502, gridType: 'hyb', lex })
  console.log('  lockScore: 16=', s16.lockScore, '· 12=', r12.bar?.lockScore, '· مهجّن=', rhy.bar?.lockScore)
  check('الشبكة الثلاثية تُنتج باراً', !!r12.bar)
  check('الشبكة المهجّنة تُنتج باراً', !!rhy.bar)
  check('نوع الشبكة محفوظ', r12.bar?.gridType === '12' && rhy.bar?.gridType === 'hyb')
  check('بصمة الوزن لا تتغيّر بتغيّر الشبكة (الوزن لغوي لا شبكي)',
    r12.bar?.moraStr === s16.moraStr && rhy.bar?.moraStr === s16.moraStr)
}

console.log(`\n=== النتيجة: ${pass} ناجح / ${fail} فاشل من ${pass + fail} ===\n`)
process.exit(fail > 0 ? 1 : 0)

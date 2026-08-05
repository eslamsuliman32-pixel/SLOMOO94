// حالات قبول — الدفعة ٠ · نسخة الاستيراد/التصدير الاحتياطية الكاملة
// تشغيل: npx tsx src/lib/vault/__tests__/acceptance.ts
//
// tsx يشغّل على Node مباشرة — لا localStorage عالمياً هناك، فنزرع نسخة ذاكرة
// بسيطة قبل أي نداء يلمسها. bars.js/pieces.js/localStore.js يتصلون بها بشكل
// كسول داخل الدوال لا عند تحميل الوحدة، فترتيب الاستيراد الساكن هنا آمن.

class MemoryStorage {
  private store = new Map<string, string>()
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
  removeItem(key: string): void {
    this.store.delete(key)
  }
  clear(): void {
    this.store.clear()
  }
}

const memoryStorage = new MemoryStorage()
;(globalThis as unknown as { localStorage: Storage }).localStorage = memoryStorage as unknown as Storage

import { createBar, listBars } from '../../bars.js'
import { createPiece, listPieces } from '../../pieces.js'
import { exportVault, importVault, shouldRemindExport, VAULT_SCHEMA_VERSION } from '../snapshot.ts'
import type { BarRow, PieceRow } from '../snapshot.ts'

interface LegacyResult<T> {
  ok: boolean
  data: T | null
  error: { message_ar: string } | null
}

let pass = 0
let fail = 0
function check(label: string, cond: boolean, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${label}`) }
  else { fail++; console.log(`  ✗ ${label}  ${detail}`) }
}

console.log('\n[١] التذكير: لا تصدير سابق → يذكّر فوراً')
{
  check('shouldRemindExport يبدأ true', shouldRemindExport() === true)
}

console.log('\n[٢] لقطة فارغة بمخطط صحيح قبل أي بيانات')
{
  const r = await exportVault()
  check('exportVault ينجح', r.ok === true)
  check('الإصدار = VAULT_SCHEMA_VERSION', r.data?.version === VAULT_SCHEMA_VERSION)
  check('exportedAt نص ISO', typeof r.data?.exportedAt === 'string' && !Number.isNaN(Date.parse(r.data.exportedAt)))
  check('bars فارغة', Array.isArray(r.data?.bars) && r.data?.bars.length === 0)
  check('pieces فارغة', Array.isArray(r.data?.pieces) && r.data?.pieces.length === 0)
}

console.log('\n[٣] تصدير بعد إضافة بيانات حقيقية')
{
  await createBar({ text: 'كَتَبْتُ حُرُوفَ الوَجَعْ' })
  await createBar({ text: 'قَلْبِي وَدَّعْنِي' })
  await createPiece({ title: 'مسودّة أولى', text: 'سطر ١\nسطر ٢' })

  const r = await exportVault()
  check('exportVault ينجح بعد الإضافة', r.ok === true)
  check('بارّان مُصدَّران', r.data?.bars.length === 2, String(r.data?.bars.length))
  check('عمل واحد مُصدَّر', r.data?.pieces.length === 1, String(r.data?.pieces.length))
  check('التذكير يُصفَّر مباشرة بعد التصدير', shouldRemindExport() === false)

  const eightDaysLater = Date.now() + 8 * 24 * 60 * 60 * 1000
  check('التذكير يعود بعد ٧ أيام', shouldRemindExport(eightDaysLater) === true)
}

console.log('\n[٤] رحلة ذهاب وعودة — استعادة على "جهاز جديد" فارغ')
{
  const before = await exportVault()
  const snapshot = before.data!
  memoryStorage.clear() // محاكاة جهاز جديد بلا بيانات

  const emptyCheck = (await listBars()) as LegacyResult<BarRow[]>
  check('الجهاز الجديد فارغ فعلاً', emptyCheck.ok === true && emptyCheck.data?.length === 0)

  const imported = await importVault(snapshot)
  check('importVault ينجح', imported.ok === true)
  check('أُضيف كل البارات والأعمال', imported.data?.added === 3, String(imported.data))
  check('لا تعارض على جهاز فارغ', imported.data?.conflicts === 0)
  check('لا تخطّي على جهاز فارغ', imported.data?.skipped === 0)

  const restoredBars = (await listBars()) as LegacyResult<BarRow[]>
  const restoredPieces = (await listPieces()) as LegacyResult<PieceRow[]>
  check('البارات استُعيدت بنفس النصوص',
    (restoredBars.data ?? []).map((b) => b.text).sort().join('|') === snapshot.bars.map((b) => b.text).sort().join('|'))
  check('الأعمال استُعيدت بنفس العناوين',
    (restoredPieces.data ?? []).map((p) => p.title).join('|') === snapshot.pieces.map((p) => p.title).join('|'))
}

console.log('\n[٥] استيراد نفس اللقطة مرة ثانية على نفس الجهاز → تعارض لا تكرار')
{
  const current = await exportVault()
  const reImport = await importVault(current.data)
  check('لا إضافات جديدة عند إعادة استيراد نفس اللقطة', reImport.data?.added === 0, String(reImport.data))
  check('كل الصفوف تُحتسب تعارضاً', reImport.data?.conflicts === 3, String(reImport.data))

  const after = await exportVault()
  check('لا تكرار في القاعدة بعد إعادة الاستيراد', after.data?.bars.length === 2 && after.data?.pieces.length === 1)
}

console.log('\n[٦] ملف غير صالح يُعاد بخطأ عربي صريح لا استثناء')
{
  const bad1 = await importVault({ nope: true })
  check('كائن بلا bars/pieces يُرفَض صراحة', bad1.ok === false && !!bad1.error?.message_ar)
  const bad2 = await importVault(null)
  check('null يُرفَض صراحة بلا رمي', bad2.ok === false)
  const bad3 = await importVault('نص عشوائي')
  check('نص خام يُرفَض صراحة بلا رمي', bad3.ok === false)
}

console.log('\n[٧] صفوف تالفة داخل ملف صالح شكلياً تُحتسب تخطّياً')
{
  memoryStorage.clear()
  const r = await importVault({
    version: 1,
    exportedAt: new Date().toISOString(),
    bars: [{ id: 'b1', text: '' }, { id: 'b2', text: 'بار صالح' }],
    pieces: [{ id: 'p1', title: 'بلا نص' }],
  })
  check('السطر بلا نص يُخطّى', r.data?.skipped === 2, String(r.data))
  check('السطر الصالح يُضاف', r.data?.added === 1, String(r.data))
}

console.log(`\n=== النتيجة: ${pass} ناجح / ${fail} فاشل من ${pass + fail} ===\n`)
process.exit(fail > 0 ? 1 : 0)

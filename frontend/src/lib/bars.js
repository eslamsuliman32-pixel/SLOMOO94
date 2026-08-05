// src/lib/bars.js
// وحدة الوصول لمستودع البارات — تلتزم عقد الوحدات الموحد (docs/MODULE_CONTRACT.md).
// التخزين محلي على جهاز المستخدم (localStore) — لا حساب ولا بريد إلكتروني.

import { createStore } from './localStore.js'

const store = createStore({ collection: 'bars', module: 'bars-repo', version: '1.0.0' })

/** إنشاء بار جديد. الحقل text إلزامي؛ الباقي وفق schema المرحلة 2 (الخطوة 16). */
export async function createBar({ text, project = null, song = null }) {
  const t0 = Date.now()
  if (!text || !text.trim()) return store.fail('BAR_TEXT_REQUIRED', 'نص البار مطلوب.', t0)
  return store.create({ text: text.trim(), project, song }, t0)
}

/** جلب كل البارات مرتبة زمنيًا (الأحدث أولًا). */
export async function listBars() {
  return store.list(Date.now())
}

/** تحديث بار موجود. */
export async function updateBar(id, changes) {
  const t0 = Date.now()
  if (!id) return store.fail('BAR_ID_REQUIRED', 'معرّف البار مطلوب.', t0)
  return store.update(id, changes, t0)
}

/** حذف بار. */
export async function deleteBar(id) {
  const t0 = Date.now()
  if (!id) return store.fail('BAR_ID_REQUIRED', 'معرّف البار مطلوب.', t0)
  return store.remove(id, t0)
}

function isValidBarRow(row) {
  return typeof row.text === 'string' && !!row.text.trim()
}

/** استيراد صفوف بارات من نسخة احتياطية (lib/vault) — يحافظ على المعرّف الأصلي. */
export async function importBars(rows) {
  return store.importMany(rows, isValidBarRow, Date.now())
}

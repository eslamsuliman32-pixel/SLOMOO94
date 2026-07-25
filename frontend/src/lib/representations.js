// src/lib/representations.js — أرشيف التمثيلات (الصور الشعرية) وفق قرار D9:
// أرشيف المالك أولًا (تصنيف/بحث/ربط).
// التخزين محلي على جهاز المستخدم (localStore) — لا حساب ولا بريد إلكتروني.

import { createStore } from './localStore.js'

const store = createStore({ collection: 'representations', module: 'representations-repo', version: '1.0.0' })

export async function createRep({ text, topic = '', emotion = '' }) {
  const t0 = Date.now()
  if (!text || !text.trim()) return store.fail('REP_TEXT_REQUIRED', 'نص التمثيل مطلوب.', t0)
  return store.create({ text: text.trim(), topic: topic.trim(), emotion: emotion.trim() }, t0)
}

export async function listReps() {
  return store.list(Date.now())
}

export async function deleteRep(id) {
  const t0 = Date.now()
  if (!id) return store.fail('REP_ID_REQUIRED', 'المعرّف مطلوب.', t0)
  return store.remove(id, t0)
}

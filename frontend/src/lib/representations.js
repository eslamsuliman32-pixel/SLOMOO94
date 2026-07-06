// src/lib/representations.js — أرشيف التمثيلات (الصور الشعرية) وفق قرار D9:
// أرشيف المالك أولًا (تصنيف/بحث/ربط)؛ الاقتراح التوليدي بطلب صريح لاحقًا مع طبقة المدرب.

import {
  collection, doc, addDoc, deleteDoc, getDocs, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase.js'

const COLLECTION = 'representations'
const MODULE = 'representations-repo'
const VERSION = '0.1.0'

const ok = (data, t0) => ({ ok: true, data, error: null, meta: { module: MODULE, version: VERSION, took_ms: Date.now() - t0 } })
const fail = (code, message_ar, t0) => ({
  ok: false, data: null, error: { code, message_ar, recoverable: true },
  meta: { module: MODULE, version: VERSION, took_ms: Date.now() - t0 },
})

export async function createRep({ text, topic = '', emotion = '' }) {
  const t0 = Date.now()
  if (!text || !text.trim()) return fail('REP_TEXT_REQUIRED', 'نص التمثيل مطلوب.', t0)
  try {
    const ref = await addDoc(collection(db, COLLECTION), {
      text: text.trim(), topic: topic.trim(), emotion: emotion.trim(),
      created_at: serverTimestamp(),
    })
    return ok({ id: ref.id }, t0)
  } catch { return fail('REP_CREATE_FAILED', 'تعذّر حفظ التمثيل.', t0) }
}

export async function listReps() {
  const t0 = Date.now()
  try {
    const snap = await getDocs(query(collection(db, COLLECTION), orderBy('created_at', 'desc')))
    return ok(snap.docs.map((d) => ({ id: d.id, ...d.data() })), t0)
  } catch { return fail('REPS_LIST_FAILED', 'تعذّر تحميل الأرشيف.', t0) }
}

export async function deleteRep(id) {
  const t0 = Date.now()
  if (!id) return fail('REP_ID_REQUIRED', 'المعرّف مطلوب.', t0)
  try { await deleteDoc(doc(db, COLLECTION, id)); return ok({ id }, t0) }
  catch { return fail('REP_DELETE_FAILED', 'تعذّر الحذف.', t0) }
}

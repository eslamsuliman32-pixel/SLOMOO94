// src/lib/bars.js
// وحدة الوصول لمستودع البارات — تلتزم عقد الوحدات الموحد (docs/MODULE_CONTRACT.md).
// الوحدة الوحيدة المخوّلة بالكتابة في collection "bars".

import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase.js'

const COLLECTION = 'bars'
const MODULE = 'bars-repo'
const VERSION = '0.1.0'

function ok(data, startedAt) {
  return { ok: true, data, error: null, meta: { module: MODULE, version: VERSION, took_ms: Date.now() - startedAt } }
}
function fail(code, message_ar, startedAt, recoverable = true) {
  return {
    ok: false, data: null,
    error: { code, message_ar, recoverable },
    meta: { module: MODULE, version: VERSION, took_ms: Date.now() - startedAt },
  }
}

/** إنشاء بار جديد. الحقل text إلزامي؛ الباقي وفق schema المرحلة 2 (الخطوة 16). */
export async function createBar({ text, project = null, song = null }) {
  const t0 = Date.now()
  if (!text || !text.trim()) return fail('BAR_TEXT_REQUIRED', 'نص البار مطلوب.', t0)
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      text: text.trim(),
      project, song,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    })
    return ok({ id: docRef.id }, t0)
  } catch (e) {
    return fail('BAR_CREATE_FAILED', 'تعذّر حفظ البار، حاول مرة أخرى.', t0)
  }
}

/** جلب كل البارات مرتبة زمنيًا (الأحدث أولًا). */
export async function listBars() {
  const t0 = Date.now()
  try {
    const q = query(collection(db, COLLECTION), orderBy('created_at', 'desc'))
    const snap = await getDocs(q)
    const bars = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return ok(bars, t0)
  } catch (e) {
    return fail('BARS_LIST_FAILED', 'تعذّر تحميل المستودع.', t0)
  }
}

/** تحديث بار موجود. */
export async function updateBar(id, changes) {
  const t0 = Date.now()
  if (!id) return fail('BAR_ID_REQUIRED', 'معرّف البار مطلوب.', t0)
  try {
    await updateDoc(doc(db, COLLECTION, id), { ...changes, updated_at: serverTimestamp() })
    return ok({ id }, t0)
  } catch (e) {
    return fail('BAR_UPDATE_FAILED', 'تعذّر تحديث البار.', t0)
  }
}

/** حذف بار. */
export async function deleteBar(id) {
  const t0 = Date.now()
  if (!id) return fail('BAR_ID_REQUIRED', 'معرّف البار مطلوب.', t0)
  try {
    await deleteDoc(doc(db, COLLECTION, id))
    return ok({ id }, t0)
  } catch (e) {
    return fail('BAR_DELETE_FAILED', 'تعذّر حذف البار.', t0)
  }
}

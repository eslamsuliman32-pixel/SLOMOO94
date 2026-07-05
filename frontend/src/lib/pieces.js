// src/lib/pieces.js
// وحدة «الأعمال» — كل عمل (أغنية/مسودة) وثيقة واحدة: عنوان + نص متعدد البارات.
// schema الخطوة 16: piece = { title, text, created_at, updated_at }
// البارات الفردية القابلة لإعادة الاستخدام تُدار في bars.js — العملان متكاملان لا متكرران.

import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, query, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase.js'

const COLLECTION = 'pieces'
const MODULE = 'pieces-repo'
const VERSION = '0.1.0'

const ok = (data, t0) => ({ ok: true, data, error: null, meta: { module: MODULE, version: VERSION, took_ms: Date.now() - t0 } })
const fail = (code, message_ar, t0) => ({
  ok: false, data: null, error: { code, message_ar, recoverable: true },
  meta: { module: MODULE, version: VERSION, took_ms: Date.now() - t0 },
})

export async function createPiece({ title = 'عمل بلا عنوان', text = '' }) {
  const t0 = Date.now()
  try {
    const ref = await addDoc(collection(db, COLLECTION), {
      title, text, created_at: serverTimestamp(), updated_at: serverTimestamp(),
    })
    return ok({ id: ref.id }, t0)
  } catch { return fail('PIECE_CREATE_FAILED', 'تعذّر إنشاء العمل.', t0) }
}

export async function updatePiece(id, { title, text }) {
  const t0 = Date.now()
  if (!id) return fail('PIECE_ID_REQUIRED', 'معرّف العمل مطلوب.', t0)
  try {
    await updateDoc(doc(db, COLLECTION, id), { title, text, updated_at: serverTimestamp() })
    return ok({ id }, t0)
  } catch { return fail('PIECE_UPDATE_FAILED', 'تعذّر حفظ العمل.', t0) }
}

export async function listPieces() {
  const t0 = Date.now()
  try {
    const snap = await getDocs(query(collection(db, COLLECTION), orderBy('updated_at', 'desc')))
    return ok(snap.docs.map((d) => ({ id: d.id, ...d.data() })), t0)
  } catch { return fail('PIECES_LIST_FAILED', 'تعذّر تحميل الأعمال.', t0) }
}

export async function deletePiece(id) {
  const t0 = Date.now()
  if (!id) return fail('PIECE_ID_REQUIRED', 'معرّف العمل مطلوب.', t0)
  try {
    await deleteDoc(doc(db, COLLECTION, id))
    return ok({ id }, t0)
  } catch { return fail('PIECE_DELETE_FAILED', 'تعذّر حذف العمل.', t0) }
}

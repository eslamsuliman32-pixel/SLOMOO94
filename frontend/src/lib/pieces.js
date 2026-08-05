// src/lib/pieces.js
// وحدة «الأعمال» — كل عمل (أغنية/مسودة) سجل واحد: عنوان + نص متعدد البارات.
// schema الخطوة 16: piece = { title, text, created_at, updated_at }
// البارات الفردية القابلة لإعادة الاستخدام تُدار في bars.js — العملان متكاملان لا متكرران.
// التخزين محلي على جهاز المستخدم (localStore) — لا حساب ولا بريد إلكتروني.

import { createStore } from './localStore.js'

const store = createStore({
  collection: 'pieces', module: 'pieces-repo', version: '1.0.0', sortKey: 'updated_at',
})

export async function createPiece({ title = 'عمل بلا عنوان', text = '' }) {
  return store.create({ title, text }, Date.now())
}

export async function updatePiece(id, { title, text }) {
  const t0 = Date.now()
  if (!id) return store.fail('PIECE_ID_REQUIRED', 'معرّف العمل مطلوب.', t0)
  return store.update(id, { title, text }, t0)
}

export async function listPieces() {
  return store.list(Date.now())
}

export async function deletePiece(id) {
  const t0 = Date.now()
  if (!id) return store.fail('PIECE_ID_REQUIRED', 'معرّف العمل مطلوب.', t0)
  return store.remove(id, t0)
}

function isValidPieceRow(row) {
  return typeof row.title === 'string' && typeof row.text === 'string'
}

/** استيراد صفوف أعمال من نسخة احتياطية (lib/vault) — يحافظ على المعرّف الأصلي. */
export async function importPieces(rows) {
  return store.importMany(rows, isValidPieceRow, Date.now())
}

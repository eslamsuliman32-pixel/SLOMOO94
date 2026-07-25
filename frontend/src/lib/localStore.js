// src/lib/localStore.js
// مخزن محلي بعقد الوحدات نفسه ({ok, data, error, meta}) — بديل Firestore بعد إزالة
// تسجيل الدخول بالحساب من كل الواجهات. كل بيانات المستخدم تبقى على جهازه وحده،
// فلا حساب ولا بريد ولا خادم. الاستبدال على مستوى الطبقة لا الواجهة: توقيعات
// الدوال في bars/pieces/representations لم تتغيّر، فلم تتغيّر الشاشات المستهلكة.

const PREFIX = 'maqam.'

function read(collection) {
  try {
    const raw = localStorage.getItem(PREFIX + collection)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(collection, rows) {
  localStorage.setItem(PREFIX + collection, JSON.stringify(rows))
}

function newId() {
  return 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/** يبني طبقة وصول لمجموعة واحدة بعقد النتائج الموحّد */
export function createStore({ collection, module, version = '1.0.0', sortKey = 'created_at' }) {
  const ok = (data, t0) => ({
    ok: true, data, error: null,
    meta: { module, version, took_ms: Date.now() - t0 },
  })
  const fail = (code, message_ar, t0) => ({
    ok: false, data: null,
    error: { code, message_ar, recoverable: true },
    meta: { module, version, took_ms: Date.now() - t0 },
  })

  return {
    ok,
    fail,
    list(t0) {
      try {
        const rows = read(collection).slice().sort((a, b) => (b[sortKey] ?? 0) - (a[sortKey] ?? 0))
        return ok(rows, t0)
      } catch {
        return fail('LOAD_FAILED', 'تعذّر تحميل البيانات المحفوظة على هذا الجهاز.', t0)
      }
    },
    create(fields, t0) {
      try {
        const now = Date.now()
        const row = { id: newId(), ...fields, created_at: now, updated_at: now }
        write(collection, [row, ...read(collection)])
        return ok({ id: row.id }, t0)
      } catch {
        return fail('SAVE_FAILED', 'تعذّر الحفظ — قد تكون مساحة المتصفح ممتلئة.', t0)
      }
    },
    update(id, changes, t0) {
      try {
        const rows = read(collection)
        const i = rows.findIndex((r) => r.id === id)
        if (i === -1) return fail('NOT_FOUND', 'العنصر غير موجود.', t0)
        rows[i] = { ...rows[i], ...changes, updated_at: Date.now() }
        write(collection, rows)
        return ok({ id }, t0)
      } catch {
        return fail('UPDATE_FAILED', 'تعذّر التحديث.', t0)
      }
    },
    remove(id, t0) {
      try {
        write(collection, read(collection).filter((r) => r.id !== id))
        return ok({ id }, t0)
      } catch {
        return fail('DELETE_FAILED', 'تعذّر الحذف.', t0)
      }
    },
  }
}

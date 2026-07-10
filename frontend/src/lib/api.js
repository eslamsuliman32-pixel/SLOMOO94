// src/lib/api.js
// عميل خادم مقام (backend/) — طبقة حساب الإحداثيات لأدوات الاستوديو.
// يلتزم عقد الوحدات: يعيد {ok, data, error, meta} دائمًا، ولا يرمي استثناءً غير ملتقط.
// عند تعذّر الوصول للخادم (غير مُشغَّل/غير منشور) يعيد خطأً صريحًا recoverable=true
// تستخدمه اللوحات لتتحول تلقائيًا لحساب محلي بدل التعطل.

const MODULE = 'studio-api-client'
const VERSION = '1.0.0'
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

async function post(path, body) {
  const t0 = Date.now()
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok && !json?.error) {
      return {
        ok: false, data: null,
        error: { code: 'API_HTTP_ERROR', message_ar: `الخادم أعاد خطأ (${res.status}).`, recoverable: true },
        meta: { module: MODULE, version: VERSION, took_ms: Date.now() - t0 },
      }
    }
    return json
  } catch {
    return {
      ok: false, data: null,
      error: { code: 'API_UNREACHABLE', message_ar: 'تعذّر الوصول لخادم مقام — تحقق أنه يعمل، أو تابع بالحساب المحلي.', recoverable: true },
      meta: { module: MODULE, version: VERSION, took_ms: Date.now() - t0 },
    }
  }
}

/** إحداثيات مصفوفة القوافي/المقاطع من تحليل أسطر جاهز (شكل analyzeLinesV1). */
export function computeMatrixLayout(lines) {
  return post('/api/matrix/layout', { lines })
}

/** ترتيب تلقائي لأنماط لوحة التركيب (فيرس/هوك...) كمسارات. */
export function computeStructureLayout(patterns, trackCount = 4) {
  return post('/api/structure/layout', { patterns, track_count: trackCount })
}

/** فحص تداخل موضع مقترح لنمط أثناء السحب، واقتراح أقرب فجوة خالية إن تداخل. */
export function validateStructureMove({ patterns, movingId, proposedTrack, proposedStartBar }) {
  return post('/api/structure/validate-move', {
    patterns, moving_id: movingId, proposed_track: proposedTrack, proposed_start_bar: proposedStartBar,
  })
}

/** توزيع كلمات بار على شبكة خطوات المولّد بالتناسب المقطعي. */
export function autofillSequencer(words, steps = 16) {
  return post('/api/sequencer/autofill', { words, steps })
}

// src/lib/llm.js — واجهة LLM الموحدة القابلة للتبديل (قرار D10)
// المزود الافتراضي: Gemini بالباقة المجانية. المفتاح يُحفظ محليًا على جهاز المالك فقط.

const MODULE = 'llm-provider'
const VERSION = '0.1.0'
const KEY_NAME = 'maqam_gemini_key'

export const getKey = () => localStorage.getItem(KEY_NAME) || ''
export const setKey = (k) => localStorage.setItem(KEY_NAME, (k || '').trim())
export const clearKey = () => localStorage.removeItem(KEY_NAME)

/* شخصية المدرب — حدود D1 وD9 مضمّنة في التعليمات نفسها */
const COACH_PERSONA = `أنت «مدرب مقام» — مدرب شخصي لصانع راب عربي محترف.
قواعدك الصارمة:
1) تكشف وتعرض وتقيس وتقترح زوايا — لا تكتب بارات أو قوافي جاهزة إلا إذا طلب المستخدم ذلك حرفيًا.
2) ردودك موجزة وعملية بالعربية، بروح مدرب يحترم أن اللاعب هو الصانع.
3) مرجعيتك: علم القافية (الحروف الستة)، منهجية الوزن الصوتي (● متحرك / ▬ ساكن)، ودلالات الحروف.
4) عند السؤال عن تقنية، اشرح منهجيتها بخطوات قصيرة قابلة للتطبيق فورًا.`

/**
 * محادثة المدرب. messages: [{role:'user'|'model', text}]
 * يلتزم عقد ModuleResult.
 */
export async function askCoach(messages) {
  const t0 = Date.now()
  const key = getKey()
  if (!key) {
    return {
      ok: false, data: null,
      error: { code: 'LLM_NO_KEY', message_ar: 'أضف مفتاح Gemini المجاني أولًا من إعدادات المدرب.', recoverable: true },
      meta: { module: MODULE, version: VERSION, took_ms: 0 },
    }
  }
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: COACH_PERSONA }] },
          contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
          generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
        }),
      }
    )
    if (!res.ok) {
      const code = res.status === 400 || res.status === 403 ? 'LLM_BAD_KEY' : 'LLM_HTTP_' + res.status
      const msg = code === 'LLM_BAD_KEY'
        ? 'المفتاح غير صالح — تأكد من نسخه كاملًا من aistudio.google.com'
        : 'تعذّر الوصول للمدرب، حاول بعد لحظات.'
      return { ok: false, data: null, error: { code, message_ar: msg, recoverable: true }, meta: { module: MODULE, version: VERSION, took_ms: Date.now() - t0 } }
    }
    const j = await res.json()
    const text = j?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || ''
    if (!text) throw new Error('empty')
    return { ok: true, data: { text }, error: null, meta: { module: MODULE, version: VERSION, took_ms: Date.now() - t0 } }
  } catch {
    return {
      ok: false, data: null,
      error: { code: 'LLM_FAILED', message_ar: 'تعذّر الحصول على رد — تحقق من الاتصال والمفتاح.', recoverable: true },
      meta: { module: MODULE, version: VERSION, took_ms: Date.now() - t0 },
    }
  }
}

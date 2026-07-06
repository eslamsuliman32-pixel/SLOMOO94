import { useState } from 'react'
import { askCoach, getKey, setKey, clearKey } from './lib/llm.js'

export default function Coach() {
  const [key, setKeyInput] = useState(getKey())
  const [saved, setSaved] = useState(!!getKey())
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  function saveKey() {
    setKey(key)
    setSaved(!!key.trim())
  }
  function removeKey() {
    clearKey(); setKeyInput(''); setSaved(false)
  }

  async function send() {
    if (!input.trim() || busy) return
    const next = [...msgs, { role: 'user', text: input.trim() }]
    setMsgs(next); setInput(''); setBusy(true); setErr('')
    const r = await askCoach(next.map((m) => ({ role: m.role === 'coach' ? 'model' : 'user', text: m.text })))
    setBusy(false)
    if (r.ok) setMsgs([...next, { role: 'coach', text: r.data.text }])
    else setErr(r.error.message_ar)
  }

  if (!saved) {
    return (
      <div className="coach wob">
        <h3>مدرب مقام</h3>
        <p className="gate-note">
          يعمل بمفتاح Gemini المجاني (باقة مجانية دائمًا) — احصل عليه من
          <span className="mono-inline"> aistudio.google.com/apikey</span>، يُحفظ على جهازك فقط.
        </p>
        <div className="reps-tags">
          <input className="lib-input" value={key} onChange={(e) => setKeyInput(e.target.value)} placeholder="الصق المفتاح هنا" />
          <button className="conn-test-btn" onClick={saveKey}>حفظ المفتاح</button>
        </div>
      </div>
    )
  }

  return (
    <div className="coach wob">
      <div className="reps-head">
        <h3>مدرب مقام</h3>
        <button className="mini-btn danger" onClick={removeKey}>تغيير المفتاح</button>
      </div>
      <div className="coach-log">
        {msgs.length === 0 && (
          <p className="gate-note">اسأل عن أي منهجية — التقطيع، الحروف الستة، عزل المسارات... المدرب يشرح ولا يكتب بدلًا عنك.</p>
        )}
        {msgs.map((m, i) => <div key={i} className={`coach-bubble ${m.role}`}>{m.text}</div>)}
        {busy && <div className="coach-bubble coach">...يفكر</div>}
      </div>
      {err && <div className="conn-test-result fail"><span className="conn-test-icon">✕</span> {err}</div>}
      <div className="reps-tags">
        <input className="lib-input" dir="rtl" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="اسأل المدرب..." />
        <button className="conn-test-btn" onClick={send} disabled={busy}>إرسال</button>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { createRep, listReps, deleteRep } from './lib/representations.js'

/** أرشيف التمثيلات (D9: الأرشيف أولًا — الاقتراح التوليدي لاحقًا مع طبقة المدرب) */
export default function Representations() {
  const [reps, setReps] = useState([])
  const [text, setText] = useState('')
  const [topic, setTopic] = useState('')
  const [emotion, setEmotion] = useState('')
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')

  async function refresh() {
    const r = await listReps()
    if (r.ok) setReps(r.data)
  }
  useEffect(() => { refresh() }, [])

  async function add() {
    if (!text.trim()) return
    setMsg('')
    const r = await createRep({ text, topic, emotion })
    if (r.ok) { setText(''); setTopic(''); setEmotion(''); refresh() }
    else setMsg(r.error.message_ar)
  }

  const visible = q.trim()
    ? reps.filter((r) => [r.text, r.topic, r.emotion].some((f) => (f || '').includes(q.trim())))
    : reps

  return (
    <div className="reps wob">
      <div className="reps-head">
        <h3>أرشيف التمثيلات</h3>
        <button className="mini-btn" disabled title="يُفعَّل مع طبقة المدرب — بطلبك الصريح فقط (قرار D9)">
          اقترح ✦ (لاحقًا)
        </button>
      </div>
      <p className="gate-note">صورك الشعرية واستعاراتك — تُحفظ وتُصنّف وتُسترجع وقت الكتابة.</p>

      <textarea
        className="lib-input reps-text" dir="rtl" rows={2}
        value={text} onChange={(e) => setText(e.target.value)}
        placeholder="اكتب التمثيل... (مثال: الحي كولاج من وجوه متعبة)"
      />
      <div className="reps-tags">
        <input className="lib-input" dir="rtl" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="الموضوع (الحي، الغربة...)" />
        <input className="lib-input" dir="rtl" value={emotion} onChange={(e) => setEmotion(e.target.value)} placeholder="العاطفة (حنين، غضب...)" />
        <button className="conn-test-btn" onClick={add}>حفظ</button>
      </div>

      <input className="lib-input lib-search" dir="rtl" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث في أرشيفك..." />
      {msg && <div className="conn-test-result fail"><span className="conn-test-icon">✕</span> {msg}</div>}

      {visible.map((r) => (
        <div className="bar-row" key={r.id}>
          <span className="bar-text">{r.text}</span>
          {r.topic && <span className="rhyme-badge rhyme-c3">{r.topic}</span>}
          {r.emotion && <span className="rhyme-badge rhyme-c2">{r.emotion}</span>}
          <button className="mini-btn danger" onClick={async () => { await deleteRep(r.id); refresh() }}>حذف</button>
        </div>
      ))}
    </div>
  )
}

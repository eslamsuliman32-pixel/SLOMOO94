import { useEffect, useRef, useState } from 'react'
import AuthGate from './AuthGate.jsx'
import { createPiece, updatePiece, listPieces, deletePiece } from './lib/pieces.js'
import { analyzeLinesV1 } from './lib/rhyme.js'
import Representations from './Representations.jsx'
import { analyzeEmotions } from './lib/semantics.js'
import Coach from './Coach.jsx'

function EmotionSpectrum({ text }) {
  const r = analyzeEmotions(text)
  if (!r.ok || !r.data) return <p className="gate-note">اكتب نصًا ليظهر طيفه العاطفي (المصدر: أسرار الحروف).</p>
  const d = r.data
  return (
    <div className="emo-spectrum wob">
      <h3>الطيف العاطفي للحروف</h3>
      <div className="emo-bars">
        <div className="emo-bar strong" style={{ '--w': d.strong + '%' }}><span>شديدة {d.strong}٪</span></div>
        <div className="emo-bar medium" style={{ '--w': d.medium + '%' }}><span>متوسطة {d.medium}٪</span></div>
        <div className="emo-bar soft" style={{ '--w': d.soft + '%' }}><span>رخوة {d.soft}٪</span></div>
      </div>
      {d.emotions.length > 0 && (
        <div className="emo-tags">
          {d.emotions.map((e) => <span key={e.id} className={`rhyme-badge rhyme-c${e.color}`}>{e.label} · {e.pct}٪</span>)}
        </div>
      )}
    </div>
  )
}

function Editor() {
  const [pieces, setPieces] = useState([])
  const [currentId, setCurrentId] = useState(null)
  const [title, setTitle] = useState('عمل بلا عنوان')
  const [text, setText] = useState('')
  const [saveState, setSaveState] = useState('') // '' | جارٍ الحفظ | تم الحفظ | خطأ
  const [modeA, setModeA] = useState(false)
  const [modeB, setModeB] = useState(false)
  const saveTimer = useRef(null)

  async function refresh() {
    const r = await listPieces()
    if (r.ok) setPieces(r.data)
  }
  useEffect(() => { refresh() }, [])

  function openPiece(p) {
    setCurrentId(p.id); setTitle(p.title || 'عمل بلا عنوان'); setText(p.text || ''); setSaveState('')
  }
  function newPiece() {
    setCurrentId(null); setTitle('عمل بلا عنوان'); setText(''); setSaveState('')
  }

  async function saveNow(nextTitle = title, nextText = text) {
    setSaveState('جارٍ الحفظ...')
    if (currentId) {
      const r = await updatePiece(currentId, { title: nextTitle, text: nextText })
      setSaveState(r.ok ? 'تم الحفظ ✓' : r.error.message_ar)
    } else {
      const r = await createPiece({ title: nextTitle, text: nextText })
      if (r.ok) { setCurrentId(r.data.id); setSaveState('تم الحفظ ✓') }
      else setSaveState(r.error.message_ar)
    }
    refresh()
  }

  /* حفظ تلقائي: 1.5 ثانية بعد آخر كتابة */
  function scheduleAutosave(nextTitle, nextText) {
    clearTimeout(saveTimer.current)
    setSaveState('...')
    saveTimer.current = setTimeout(() => saveNow(nextTitle, nextText), 1500)
  }

  const analysis = analyzeLinesV1(text, { modeA })
  const lines = analysis.ok ? analysis.data : []

  return (
    <div className="studio">
      <div className="studio-bar">
        <input
          className="studio-title"
          value={title}
          onChange={(e) => { setTitle(e.target.value); scheduleAutosave(e.target.value, text) }}
          placeholder="عنوان العمل"
        />
        <button className="mini-btn" onClick={newPiece}>+ عمل جديد</button>
        <span className="save-state mono">{saveState}</span>
      </div>

      <textarea
        className="studio-editor"
        dir="rtl"
        value={text}
        onChange={(e) => { setText(e.target.value); scheduleAutosave(title, e.target.value) }}
        placeholder="اكتب باراتك هنا — كل سطر بار..."
        rows={8}
      />

      <div className="rhyme-preview">
        <div className="rhyme-preview-head">
          <h3>معاينة القافية الحية</h3>
          <label className="toggle">
            <input type="checkbox" checked={modeA} onChange={(e) => setModeA(e.target.checked)} />
            الوضع أ: عائلات المخارج
          </label>
          <label className="toggle">
            <input type="checkbox" checked={modeB} onChange={(e) => setModeB(e.target.checked)} />
            الوضع ب: الطيف العاطفي
          </label>
        </div>
        {lines.filter((l) => l.text.trim()).length === 0
          ? <p className="gate-note">اكتب بارًا وسترى نهايته ملونة حسب عائلته القافوية — ولو كتبت بالتشكيل ستظهر بصمة الوزن ● ▬ كاملة.</p>
          : lines.map((l, i) => {
            if (!l.text.trim()) return null
            const toks = l.tokens || []
            return (
              <div className="rhyme-block" key={i}>
                <div className="rhyme-line">
                  {toks.map((t, ti) => {
                    const isTail = ti === toks.length - 1
                    const isInner = l.inner && l.inner.has(ti)
                    const cls = isTail
                      ? `rhyme-tail rhyme-c${l.colorIndex ?? 0}`
                      : isInner ? `rhyme-inner rhyme-c${l.colorIndex ?? 0}` : ''
                    return <span key={ti}>{cls ? <span className={cls} title={isTail ? l.sixText : 'قافية داخلية'}>{t.w}</span> : t.w}{t.ws ? ' ' : ''}</span>
                  })}
                  {l.rawi && <span className={`rhyme-badge rhyme-c${l.colorIndex ?? 0}`}>{l.sixText || l.label}</span>}
                </div>
                {l.weight && (
                  <div className="weight-row">
                    <span className="weight-fp" dir="ltr">{l.weight.fp}</span>
                    <span className="weight-count">{l.weight.syllables} مقاطع{l.weight.approx ? ' · تقريبي' : ''}</span>
                  </div>
                )}
              </div>
            )
          })}
      </div>

      {modeB && <EmotionSpectrum text={text} />}

      {pieces.length > 0 && (
        <div className="pieces-list">
          <h3>أعمالك</h3>
          {pieces.map((p) => (
            <div key={p.id} className={`piece-row ${p.id === currentId ? 'active' : ''}`}>
              <button className="piece-open" onClick={() => openPiece(p)}>{p.title || 'بلا عنوان'}</button>
              <button className="mini-btn danger" onClick={async () => { await deletePiece(p.id); if (p.id === currentId) newPiece(); refresh() }}>حذف</button>
            </div>
          ))}
        </div>
      )}
      <Representations />
      <Coach />
    </div>
  )
}

export default function StudioScreen() {
  return <AuthGate>{() => <Editor />}</AuthGate>
}

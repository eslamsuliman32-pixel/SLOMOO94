import { useEffect, useState } from 'react'
import AuthGate from './AuthGate.jsx'
import { createBar, listBars, deleteBar } from './lib/bars.js'
import { getRawi, lastWord } from './lib/rhyme.js'
import ConnectionTest from './ConnectionTest.jsx'
import Coach from './Coach.jsx'
import BarRepositoryScreen from './BarRepositoryScreen.jsx'

function SavedBars() {
  const [bars, setBars] = useState([])
  const [queryText, setQueryText] = useState('')
  const [newBar, setNewBar] = useState('')
  const [msg, setMsg] = useState('')

  async function refresh() {
    const r = await listBars()
    if (r.ok) setBars(r.data)
    else setMsg(r.error.message_ar)
  }
  useEffect(() => { refresh() }, [])

  async function add() {
    if (!newBar.trim()) return
    setMsg('')
    const r = await createBar({ text: newBar })
    if (r.ok) { setNewBar(''); refresh() }
    else setMsg(r.error.message_ar)
  }

  const q = queryText.trim()
  const visible = q ? bars.filter((b) => (b.text || '').includes(q)) : bars

  return (
    <div className="library">
      <div className="lib-add">
        <input
          className="lib-input"
          dir="rtl"
          value={newBar}
          onChange={(e) => setNewBar(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="أضف بارًا للمستودع..."
        />
        <button className="conn-test-btn" onClick={add}>حفظ</button>
      </div>

      <input
        className="lib-input lib-search"
        dir="rtl"
        value={queryText}
        onChange={(e) => setQueryText(e.target.value)}
        placeholder="ابحث في مستودعك..."
      />

      {msg && <div className="conn-test-result fail"><span className="conn-test-icon">✕</span> {msg}</div>}

      <div className="lib-count mono">{visible.length} / {bars.length} بار</div>

      {visible.map((b) => {
        const rawi = getRawi(lastWord(b.text || ''))
        return (
          <div className="bar-row" key={b.id}>
            <span className="bar-text">{b.text}</span>
            {rawi && <span className="rhyme-badge rhyme-c0">روي {rawi}</span>}
            <button className="mini-btn danger" onClick={async () => { await deleteBar(b.id); refresh() }}>حذف</button>
          </div>
        )
      })}

      <ConnectionTest />
      <Coach />
    </div>
  )
}

export default function LibraryScreen() {
  // مستودع البارات (SPEC-03) يعمل محليًا بالكامل بلا حساب؛ البارات المحفوظة تحتاج تسجيل دخول.
  const [section, setSection] = useState('repo')

  return (
    <div className="lib-shell">
      <nav className="bp-mode-tabs">
        <button className={`bp-mode-tab${section === 'repo' ? ' on' : ''}`} onClick={() => setSection('repo')}>
          مستودع البارات
        </button>
        <button className={`bp-mode-tab${section === 'saved' ? ' on' : ''}`} onClick={() => setSection('saved')}>
          بارات محفوظة
        </button>
      </nav>

      {section === 'repo'
        ? <BarRepositoryScreen />
        : <AuthGate>{() => <SavedBars />}</AuthGate>}
    </div>
  )
}

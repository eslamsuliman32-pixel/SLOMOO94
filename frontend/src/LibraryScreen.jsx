import { useEffect, useRef, useState } from 'react'
import { createBar, listBars, deleteBar } from './lib/bars.js'
import { getRawi, lastWord } from './lib/rhyme.js'
import BarRepositoryScreen from './BarRepositoryScreen.jsx'
import { exportVault, importVault, shouldRemindExport } from './lib/vault/snapshot.ts'

function download(text, name) {
  const blob = new Blob([text], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

/* ══════════ شريط النسخة الاحتياطية الكاملة (بارات + أعمال) ══════════ */
function VaultBar() {
  const [remind, setRemind] = useState(false)
  const [status, setStatus] = useState(null) // { kind: 'ok' | 'fail', text }
  const fileRef = useRef(null)

  useEffect(() => { setRemind(shouldRemindExport()) }, [])

  async function doExport() {
    const r = await exportVault()
    if (!r.ok) { setStatus({ kind: 'fail', text: r.error.message_ar }); return }
    download(JSON.stringify(r.data, null, 2), `maqam_vault_${new Date().toISOString().slice(0, 10)}.json`)
    setRemind(false)
    setStatus({ kind: 'ok', text: `صُدّرت نسخة احتياطية — ${r.data.bars.length} بار و${r.data.pieces.length} عمل` })
  }

  function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      let json
      try {
        json = JSON.parse(reader.result)
      } catch {
        setStatus({ kind: 'fail', text: 'تعذّرت قراءة ملف النسخة الاحتياطية.' })
        return
      }
      const r = await importVault(json)
      if (!r.ok) { setStatus({ kind: 'fail', text: r.error.message_ar }); return }
      setStatus({ kind: 'ok', text: `استُورد ${r.data.added} · تُخطّي ${r.data.skipped} · تعارض ${r.data.conflicts}` })
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="vault-bar">
      {remind && (
        <div className="conn-test-result fail">
          <span className="conn-test-icon">!</span> لم تُصدَّر نسخة احتياطية منذ أكثر من ٧ أيام — يُستحسن التصدير الآن.
        </div>
      )}
      <div className="br-actions">
        <button className="mini-btn" onClick={doExport}>⬇ نسخة احتياطية كاملة</button>
        <button className="mini-btn" onClick={() => fileRef.current?.click()}>استيراد نسخة احتياطية</button>
        <input ref={fileRef} type="file" accept=".json" onChange={handleImport} hidden />
      </div>
      {status && (
        <div className={`conn-test-result ${status.kind === 'ok' ? 'ok' : 'fail'}`}>
          <span className="conn-test-icon">{status.kind === 'ok' ? '✓' : '✕'}</span> {status.text}
        </div>
      )}
    </div>
  )
}

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
    </div>
  )
}

export default function LibraryScreen() {
  // الاثنان يعملان محليًا على الجهاز بلا حساب: مستودع البارات (SPEC-03) للتحليل،
  // والبارات المحفوظة كقائمة بسيطة سريعة.
  const [section, setSection] = useState('repo')

  return (
    <div className="lib-shell">
      <VaultBar />

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
        : <SavedBars />}
    </div>
  )
}

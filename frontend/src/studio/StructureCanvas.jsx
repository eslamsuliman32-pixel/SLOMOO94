import { useRef, useState } from 'react'
import { computeStructureLayout, validateStructureMove } from '../lib/api.js'

const BAR_W = 32
const TRACK_H = 56
const TRACK_COUNT = 4
const KIND_LABELS = { verse: 'فيرس', hook: 'هوك', bridge: 'جسر', intro: 'مقدمة', outro: 'خاتمة' }

let seq = 0
function nextId() { seq += 1; return `pat-${seq}` }

/** لوحة التركيب الهيكلي — بديل قائمة التشغيل: تجميع الفيرسات والهوكات كمسارات على شبكة بارات. */
export default function StructureCanvas() {
  const [patterns, setPatterns] = useState([])
  const [status, setStatus] = useState('idle') // idle | up | down
  const [label, setLabel] = useState('')
  const [kind, setKind] = useState('verse')
  const [lengthBars, setLengthBars] = useState(4)
  const dragRef = useRef(null)

  function addPattern() {
    if (!label.trim()) return
    setPatterns((prev) => [...prev, {
      id: nextId(), label: label.trim(), kind, length_bars: Number(lengthBars) || 4,
      track: 0, start_bar: 0, end_bar: Number(lengthBars) || 4,
      x: 0, y: 0, width: (Number(lengthBars) || 4) * BAR_W, height: TRACK_H, color_token: 'blue',
    }])
    setLabel('')
  }

  function removePattern(id) {
    setPatterns((prev) => prev.filter((p) => p.id !== id))
  }

  async function autoArrange() {
    if (!patterns.length) return
    const r = await computeStructureLayout(
      patterns.map((p) => ({ id: p.id, label: p.label, kind: p.kind, length_bars: p.length_bars })),
      TRACK_COUNT,
    )
    if (r.ok) { setStatus('up'); setPatterns(r.data.patterns.map((p) => ({ ...p, length_bars: p.end_bar - p.start_bar }))) }
    else setStatus('down')
  }

  function onPointerDown(e, p) {
    e.preventDefault()
    dragRef.current = { id: p.id, start: { x: e.clientX, y: e.clientY }, origin: { x: p.x, y: p.y } }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }
  function onPointerMove(e) {
    const d = dragRef.current
    if (!d) return
    const dx = e.clientX - d.start.x
    const dy = e.clientY - d.start.y
    setPatterns((prev) => prev.map((p) => (p.id === d.id ? { ...p, x: Math.max(0, d.origin.x + dx), y: Math.max(0, d.origin.y + dy) } : p)))
  }
  async function onPointerUp() {
    const d = dragRef.current
    dragRef.current = null
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    if (!d) return

    setPatterns((prev) => {
      const moving = prev.find((p) => p.id === d.id)
      if (!moving) return prev
      const proposedTrack = Math.max(0, Math.min(TRACK_COUNT - 1, Math.round(moving.y / TRACK_H)))
      const proposedStartBar = Math.max(0, Math.round(moving.x / BAR_W))

      validateStructureMove({ patterns: prev, movingId: d.id, proposedTrack, proposedStartBar }).then((r) => {
        setPatterns((cur) => cur.map((p) => {
          if (p.id !== d.id) return p
          if (r.ok) {
            setStatus('up')
            return { ...p, track: r.data.track, start_bar: r.data.start_bar, end_bar: r.data.end_bar, x: r.data.x, y: r.data.y }
          }
          setStatus('down')
          // تراجع محلي بلا فحص تداخل: مجرد التقاط للشبكة
          const track = Math.max(0, Math.min(TRACK_COUNT - 1, Math.round(p.y / TRACK_H)))
          const startBar = Math.max(0, Math.round(p.x / BAR_W))
          return { ...p, track, start_bar: startBar, end_bar: startBar + p.length_bars, x: startBar * BAR_W, y: track * TRACK_H }
        }))
      })
      return prev
    })
  }

  const totalBars = patterns.length ? Math.max(...patterns.map((p) => p.end_bar)) : 16
  const width = Math.max(totalBars * BAR_W, 320)
  const height = TRACK_COUNT * TRACK_H

  return (
    <div className="daw-panel structure-panel">
      <div className="daw-panel-head">
        <span className={`led ${status === 'up' ? 'on' : ''}`} />
        <span>لوحة التركيب الهيكلي</span>
        <span className="matrix-status mono">{status === 'down' ? 'الخادم غير متصل — التقاط شبكي محلي فقط' : status === 'up' ? 'متصل بالخادم' : ''}</span>
      </div>
      <div className="daw-panel-body">
        <div className="structure-add">
          <input className="lib-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="اسم النمط (فيرس ١، هوك...)" onKeyDown={(e) => e.key === 'Enter' && addPattern()} />
          <select className="lib-input structure-kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            {Object.entries(KIND_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <input className="lib-input structure-len" type="number" min={1} max={32} value={lengthBars} onChange={(e) => setLengthBars(e.target.value)} />
          <button className="conn-test-btn" onClick={addPattern}>إضافة</button>
          <button className="mini-btn" onClick={autoArrange} disabled={!patterns.length}>رتّب تلقائيًا</button>
        </div>

        {patterns.length === 0 ? (
          <p className="gate-note">أضف أنماطًا (فيرس/هوك) لتركيبها كمسارات على الشبكة الزمنية.</p>
        ) : (
          <div className="matrix-scroll">
            <div className="structure-stage" style={{ width, height }}>
              {Array.from({ length: TRACK_COUNT }).map((_, i) => (
                <div key={i} className="structure-track" style={{ top: i * TRACK_H, width, height: TRACK_H }} />
              ))}
              {patterns.map((p) => (
                <div
                  key={p.id}
                  className={`structure-block color-${p.color_token || 'blue'}`}
                  style={{ left: p.x, top: p.y + 3, width: p.width - 4, height: TRACK_H - 8 }}
                  onPointerDown={(e) => onPointerDown(e, p)}
                  title={`${p.label} — ${KIND_LABELS[p.kind] || p.kind} — ${p.length_bars} بار`}
                >
                  <span className="structure-block-label">{p.label}</span>
                  <button className="structure-block-del" onPointerDown={(e) => e.stopPropagation()} onClick={() => removePattern(p.id)}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

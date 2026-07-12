import { useEffect, useMemo, useRef, useState } from 'react'
import { computeMatrixLayout } from '../lib/api.js'
import { linesToMatrixPayload } from '../lib/matrixAdapter.js'

/** شبكة هندسة القوافي والمقاطع — بديل مخطط البيانو.
 * المحور الصادي: عائلة القافية (٨ عائلات + ممر محايد للكلمات غير القافوية).
 * المحور السيني: التدفق الزمني المتصل عبر الأبيات؛ عرض كل كتلة يتناسب مع عدد مقاطعها. */
export default function RhymeMatrix({ lines }) {
  const [status, setStatus] = useState('checking') // checking | up | down
  const [blocks, setBlocks] = useState([])
  const [connections, setConnections] = useState([])
  const [timelineWidth, setTimelineWidth] = useState(0)
  const [positions, setPositions] = useState({})
  const dragRef = useRef(null)

  const payload = useMemo(() => linesToMatrixPayload(lines), [lines])

  useEffect(() => {
    let cancelled = false
    if (!payload.length) { setBlocks([]); setConnections([]); return undefined }
    const timer = setTimeout(async () => {
      const r = await computeMatrixLayout(payload)
      if (cancelled) return
      if (r.ok) {
        setStatus('up')
        setBlocks(r.data.blocks)
        setConnections(r.data.connections)
        setTimelineWidth(r.data.timeline_width)
        setPositions({})
      } else {
        setStatus('down')
      }
    }, 400)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [payload])

  function posFor(b) { return positions[b.id] || { x: b.x, y: b.y } }

  function onPointerDown(e, b) {
    e.preventDefault()
    dragRef.current = { id: b.id, start: { x: e.clientX, y: e.clientY }, origin: posFor(b) }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }
  function onPointerMove(e) {
    const d = dragRef.current
    if (!d) return
    const dx = e.clientX - d.start.x
    const dy = e.clientY - d.start.y
    setPositions((p) => ({ ...p, [d.id]: { x: Math.max(0, d.origin.x + dx), y: Math.max(0, d.origin.y + dy) } }))
  }
  function onPointerUp() {
    dragRef.current = null
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  }

  const laneCount = 9
  const laneHeight = 46
  const height = laneCount * laneHeight
  const width = Math.max(timelineWidth, 320)
  const blockById = useMemo(() => Object.fromEntries(blocks.map((b) => [b.id, b])), [blocks])

  return (
    <div className="daw-panel matrix-panel">
      <div className="daw-panel-head">
        <span className={`led ${status === 'up' ? 'on' : ''}`} />
        <span>مصفوفة القوافي والمقاطع</span>
        <span className="matrix-status mono">
          {status === 'up' && 'متصل بالخادم'}
          {status === 'down' && 'الخادم غير متصل — شغّل backend/ محليًا (انظر README)'}
          {status === 'checking' && '...'}
        </span>
      </div>
      <div className="daw-panel-body">
        {blocks.length === 0 ? (
          <p className="gate-note">
            {status === 'down'
              ? 'تعذّر حساب المصفوفة — تأكد أن خادم مقام يعمل على المنفذ 8000.'
              : 'اكتب بارًا في المحرر أعلاه لتظهر مصفوفته هنا.'}
          </p>
        ) : (
          <div className="matrix-scroll">
            <div className="matrix-stage" style={{ width, height }}>
              <svg className="matrix-lanes-svg" width={width} height={height}>
                {Array.from({ length: laneCount }).map((_, i) => (
                  <rect key={i} x={0} y={i * laneHeight} width="100%" height={laneHeight} className={`matrix-lane ${i % 2 ? 'alt' : ''}`} />
                ))}
                {connections.map((c, i) => {
                  const a = blockById[c.from_block]; const b = blockById[c.to_block]
                  if (!a || !b) return null
                  const pa = posFor(a); const pb = posFor(b)
                  const ax = pa.x + a.width / 2; const ay = pa.y + a.height / 2
                  const bx = pb.x + b.width / 2; const by = pb.y + b.height / 2
                  return (
                    <path key={i} d={`M${ax},${ay} C${(ax + bx) / 2},${ay} ${(ax + bx) / 2},${by} ${bx},${by}`}
                      className={`matrix-link rhyme-c${c.color_index}`} fill="none" />
                  )
                })}
              </svg>
              <div className="matrix-blocks">
                {blocks.map((b) => {
                  const p = posFor(b)
                  return (
                    <div
                      key={b.id}
                      className={`matrix-block ${b.color_index != null ? `rhyme-c${b.color_index}` : 'neutral'} ${b.is_tail ? 'tail' : ''}`}
                      style={{ left: p.x, top: p.y + 2, width: Math.max(b.width - 3, 18), height: b.height - 6 }}
                      onPointerDown={(e) => onPointerDown(e, b)}
                      title={`${b.text} — ${b.syllables} مقاطع`}
                    >
                      <span className="mb-label">{b.text}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

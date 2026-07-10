import { useRef } from 'react'

/** مقبض دوّار سكيومورفي: اسحب رأسيًا للتعديل — يحاكي مقابض أجهزة الاستوديو الفعلية. */
export default function Knob({ label, value, onChange, min = 0, max = 100, format }) {
  const dragRef = useRef(null)

  function onPointerDown(e) {
    e.preventDefault()
    dragRef.current = { startY: e.clientY, startValue: value }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }
  function onMove(e) {
    const d = dragRef.current
    if (!d) return
    const delta = d.startY - e.clientY
    const range = max - min
    const next = Math.min(max, Math.max(min, d.startValue + (delta / 120) * range))
    onChange(Math.round(next))
  }
  function onUp() {
    dragRef.current = null
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
  }
  function onKeyDown(e) {
    if (e.key === 'ArrowUp') onChange(Math.min(max, value + 1))
    if (e.key === 'ArrowDown') onChange(Math.max(min, value - 1))
  }

  const pct = (value - min) / (max - min)
  const angle = -130 + pct * 260

  return (
    <div className="knob-wrap">
      <div
        className="knob" style={{ '--angle': `${angle}deg` }}
        onPointerDown={onPointerDown} onKeyDown={onKeyDown}
        role="slider" aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} aria-label={label} tabIndex={0}
      />
      <span className="knob-label">{label}</span>
      <span className="knob-value">{format ? format(value) : value}</span>
    </div>
  )
}

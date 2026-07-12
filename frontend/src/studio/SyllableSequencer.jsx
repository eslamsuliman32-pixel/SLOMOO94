import { useEffect, useRef, useState } from 'react'
import { autofillSequencer } from '../lib/api.js'
import { estimateSyllables } from '../lib/matrixAdapter.js'
import Knob from './Knob.jsx'

const STEPS = 16

/** مولّد الإيقاع المقطعي — بديل الـ Step Sequencer: يوزّع كلمات بار على شبكة خطوات مضيئة. */
export default function SyllableSequencer() {
  const [text, setText] = useState('')
  const [steps, setSteps] = useState(() => Array.from({ length: STEPS }, (_, i) => ({ index: i, active: false, word: null, syllable_part: null })))
  const [status, setStatus] = useState('idle') // idle | up | down
  const [bpm, setBpm] = useState(96)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(-1)
  const rafRef = useRef(null)
  const lastRef = useRef(0)

  async function distribute() {
    const words = text.trim().split(/\s+/).filter(Boolean).map((w) => ({ text: w, syllables: estimateSyllables(w) }))
    if (!words.length) return
    const r = await autofillSequencer(words, STEPS)
    if (r.ok) { setStatus('up'); setSteps(r.data.steps) } else setStatus('down')
  }

  function toggleStep(i) {
    setSteps((prev) => prev.map((s) => (s.index === i ? { ...s, active: !s.active, word: s.active ? null : s.word } : s)))
  }

  useEffect(() => {
    if (!playing) { cancelAnimationFrame(rafRef.current); setCurrent(-1); return undefined }
    const stepMs = (60000 / bpm) / 4
    function tick(t) {
      if (t - lastRef.current >= stepMs) {
        lastRef.current = t
        setCurrent((c) => (c + 1) % STEPS)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, bpm])

  return (
    <div className="daw-panel sequencer-panel">
      <div className="daw-panel-head">
        <span className={`led ${status === 'up' ? 'on' : ''}`} />
        <span>مولّد الإيقاع المقطعي</span>
        <span className="matrix-status mono">{status === 'down' ? 'الخادم غير متصل' : status === 'up' ? 'متصل بالخادم' : ''}</span>
      </div>
      <div className="daw-panel-body">
        <div className="sequencer-controls">
          <input
            className="lib-input" value={text} onChange={(e) => setText(e.target.value)}
            placeholder="اكتب بارًا واحدًا ليُوزَّع على الشبكة..." onKeyDown={(e) => e.key === 'Enter' && distribute()}
          />
          <button className="conn-test-btn" onClick={distribute}>وزّع</button>
          <button className={`mini-btn ${playing ? 'active' : ''}`} onClick={() => setPlaying((p) => !p)}>{playing ? '■ إيقاف' : '► تشغيل'}</button>
          <Knob label="BPM" value={bpm} onChange={setBpm} min={60} max={180} />
        </div>

        <div className="sequencer-grid">
          {steps.map((s) => (
            <button
              key={s.index}
              className={`seq-step ${s.active ? 'active' : ''} ${current === s.index ? 'playhead' : ''} ${s.index % 4 === 0 ? 'downbeat' : ''}`}
              onClick={() => toggleStep(s.index)}
              title={s.word || (s.syllable_part ? `امتداد مقطع ${s.syllable_part}` : 'فارغة')}
            >
              {s.word && <span className="seq-step-word">{s.word}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

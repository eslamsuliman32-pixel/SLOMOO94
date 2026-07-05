import { useState } from 'react'
import { PILLARS } from './pillars.js'
import RhythmCanvas from './RhythmCanvas.jsx'
import StudioScreen from './StudioScreen.jsx'
import LibraryScreen from './LibraryScreen.jsx'

function Wordmark() {
  return (
    <div className="wordmark">
      <span className="wm-motif" aria-hidden="true">● ▬ ● ▬ ▬</span>
      <h1>مَقَام</h1>
      <span className="wm-sub">MAQAM — مختبر صناعة الراب العربي</span>
    </div>
  )
}

function PillarCard({ p, onOpen, index }) {
  return (
    <button className="card" style={{ animationDelay: `${index * 90}ms` }} onClick={() => onOpen(p.id)}>
      <span className="card-num">{p.num}</span>
      <span className="card-motif" aria-hidden="true">{p.motif}</span>
      <h2>{p.title}</h2>
      <p>{p.tagline}</p>
      <span className="card-go">افتح ←</span>
    </button>
  )
}

function PillarScreen({ p, onBack }) {
  const functional = p.id === 'studio' || p.id === 'library'
  return (
    <section className="screen">
      <button className="back" onClick={onBack}>→ الأركان</button>
      <header className="screen-head">
        <span className="card-num">{p.num}</span>
        <h2>{p.title}</h2>
        <span className="screen-motif" aria-hidden="true">{p.motif}</span>
      </header>
      <p className="screen-tag">{p.tagline}</p>
      {p.id === 'studio' && <StudioScreen />}
      {p.id === 'library' && <LibraryScreen />}
      {!functional && (
        <div className="planned">
          <h3>قيد البناء وفق الخطة</h3>
          <ul>
            {p.planned.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <span className="planned-step">{p.step}</span>
        </div>
      )}
    </section>
  )
}

export default function App() {
  const [active, setActive] = useState(null)
  const pillar = PILLARS.find((p) => p.id === active)

  return (
    <div className="frame">
      <header className="top">
        <Wordmark />
        <RhythmCanvas seed={941994} />
      </header>

      <main>
        {pillar
          ? <PillarScreen p={pillar} onBack={() => setActive(null)} />
          : (
            <div className="grid">
              {PILLARS.map((p, i) => <PillarCard key={p.id} p={p} onOpen={setActive} index={i} />)}
            </div>
          )}
      </main>

      <footer className="status">
        <span>المبدأ: الآلة تكشف وتعرض وتقيس — الإنسان يقرر ويكتب ويؤدي</span>
        <span className="mono">v0.2.0 · المرحلة 2-3 · خطوات 16-19 و25-28 (v0)</span>
      </footer>
    </div>
  )
}

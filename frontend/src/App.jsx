import { useState } from 'react'
import { PILLARS } from './pillars.js'
import RhythmCanvas from './RhythmCanvas.jsx'
import StudioScreen from './StudioScreen.jsx'
import LibraryScreen from './LibraryScreen.jsx'
import TrainingScreen from './TrainingScreen.jsx'
import AnalysisScreen from './AnalysisScreen.jsx'
import ElectromagneticSemantics from './components/ElectromagneticSemantics.jsx'
import ProsodyLab from './ProsodyLab.jsx'
import { Doodle, ZineStrip, Underline, Mic, Spray, Cassette } from './Doodles.jsx'

function Wordmark() {
  return (
    <div className="wordmark">
      <div className="wm-icons" aria-hidden="true">
        <Mic className="wm-doodle" />
        <Spray className="wm-doodle" />
        <Cassette className="wm-doodle" />
      </div>
      <span className="wm-motif" aria-hidden="true">● ▬ ● ▬ ▬</span>
      <h1>مَقَام</h1>
      <Underline className="wm-underline" />
      <span className="wm-sub">MAQAM TEXT-DAW — محطة العمل الصوتية-اللغوية للهندسة الغنائية</span>
    </div>
  )
}

function PillarCard({ p, onOpen }) {
  return (
    <button className="card" onClick={() => onOpen(p.id)}>
      <span className="card-num">#{p.num}</span>
      <Doodle name={p.doodle} className="card-doodle" title={p.title} />
      <h2>{p.title}</h2>
      <p>{p.tagline}</p>
      <span className="card-go">افتح ←</span>
    </button>
  )
}

function PillarScreen({ p, onBack }) {
  const functional = true /* كل الأركان الأربعة صارت وظيفية */
  return (
    <section className="screen">
      <button className="back" onClick={onBack}>→ الأركان</button>
      <header className="screen-head">
        <Doodle name={p.doodle} className="screen-doodle" title={p.title} />
        <h2>{p.title}</h2>
        <span className="screen-motif" aria-hidden="true">{p.motif}</span>
      </header>
      <p className="screen-tag">{p.tagline}</p>

      {p.strip && <ZineStrip title={p.strip.title} steps={p.strip.steps} />}

      {p.id === 'studio' && <StudioScreen />}
      {p.id === 'library' && <LibraryScreen />}
      {p.id === 'training' && <TrainingScreen />}
      {p.id === 'analysis' && <AnalysisScreen />}
      {p.id === 'semantics' && <ElectromagneticSemantics />}
      {p.id === 'prosody' && <ProsodyLab />}

      {!functional && (
        <div className="planned wob">
          <h3>قيد البناء وفق الخطة ↓</h3>
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
              {PILLARS.map((p) => <PillarCard key={p.id} p={p} onOpen={setActive} />)}
            </div>
          )}
      </main>

      <footer className="status">
        <span>المبدأ: الآلة ترسم وتكشف وتقيس — الإنسان يقرر ويكتب ويؤدي</span>
        <span className="mono">MAQAM TEXT-DAW v1.0.0</span>
      </footer>
    </div>
  )
}

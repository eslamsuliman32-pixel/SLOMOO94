import { useEffect, useState } from 'react'
import { PILLARS } from './pillars.js'
import RhythmCanvas from './RhythmCanvas.jsx'
import StudioScreen from './StudioScreen.jsx'
import LibraryScreen from './LibraryScreen.jsx'
import TrainingScreen from './TrainingScreen.jsx'
import AnalysisScreen from './AnalysisScreen.jsx'
import ElectromagneticSemantics from './components/ElectromagneticSemantics.jsx'
import ProsodyLab from './ProsodyLab.jsx'
import { Doodle, ZineStrip } from './Doodles.jsx'

/** ختم مقام — قطرة مانجو تحمل حرف الميم (هوية WORKSTATION v3) */
function Seal({ className }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <radialGradient id="seal-body" cx="35%" cy="28%" r="85%">
          <stop offset="0%" stopColor="#FFE29A" /><stop offset="38%" stopColor="#FFB84D" />
          <stop offset="72%" stopColor="#F98B1D" /><stop offset="100%" stopColor="#B35400" />
        </radialGradient>
        <linearGradient id="seal-leaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C9F04A" /><stop offset="100%" stopColor="#5E8F00" />
        </linearGradient>
        <radialGradient id="seal-hi" cx="50%" cy="18%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,.85)" /><stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <path d="M50 6 C74 20 88 40 88 60 C88 82 71 96 50 96 C29 96 12 82 12 60 C12 40 26 20 50 6 Z"
        fill="url(#seal-body)" stroke="#7A3B00" strokeWidth="1.5" />
      <ellipse cx="42" cy="30" rx="20" ry="13" fill="url(#seal-hi)" />
      <path d="M50 6 C58 2 68 2 74 8 C66 12 58 12 50 6 Z" fill="url(#seal-leaf)" />
      <text x="50" y="72" textAnchor="middle" fontFamily="Amiri,serif" fontSize="46" fontWeight="700" fill="#2B1400" opacity=".9">م</text>
      <text x="50" y="70" textAnchor="middle" fontFamily="Amiri,serif" fontSize="46" fontWeight="700" fill="#FFF3D6">م</text>
    </svg>
  )
}

/** أزرار النقل وعداد الزمن — نبض الشاسيه الحي */
function Transport() {
  const [playing, setPlaying] = useState(true)
  const [rec, setRec] = useState(false)
  const [cs, setCs] = useState(0) // أجزاء الثانية (centiseconds)

  useEffect(() => {
    if (!playing) return undefined
    const id = setInterval(() => setCs((c) => c + 5), 50)
    return () => clearInterval(id)
  }, [playing])

  const m = Math.floor(cs / 6000)
  const s = Math.floor(cs / 100) % 60
  const c = cs % 100

  return (
    <>
      <button className={`ibtn ${playing ? 'on-lime' : ''}`} title="تشغيل" onClick={() => setPlaying(!playing)}>▶</button>
      <button className="ibtn" title="إيقاف" onClick={() => { setPlaying(false); setCs(0); setRec(false) }}>■</button>
      <button className={`ibtn ${rec ? 'on-red' : ''}`} title="تسجيل" onClick={() => setRec(!rec)}>●</button>
      <div className="lcd">
        <span className="big">{m}:{String(s).padStart(2, '0')}:{String(c).padStart(2, '0')}</span>
        <small>M:S:CS</small>
      </div>
    </>
  )
}

/** شريط الأدوات العلوي — شاسيه محطة العمل */
function Toolbar() {
  return (
    <header id="toolbar">
      <div className="tb-group tb-brand">
        <Seal className="seal-sm" />
        <div className="tb-title">
          <h1>مَقَام</h1>
          <span className="tb-sub mono">MAQAM WORKSTATION</span>
        </div>
      </div>
      <div className="tb-group tb-menus" aria-hidden="true">
        <span className="menu">ملف</span><span className="menu">تحرير</span>
        <span className="menu">أنماط</span><span className="menu">عرض</span><span className="menu">أدوات</span>
      </div>
      <div className="tb-group">
        <Transport />
        <div className="lcd"><span className="big orange">TEXT-DAW</span><small>MODE</small></div>
      </div>
      <div className="tb-group tb-wave">
        <RhythmCanvas seed={941994} />
      </div>
    </header>
  )
}

function PillarCard({ p, onOpen }) {
  return (
    <button className="card" style={{ '--wc': p.wc }} onClick={() => onOpen(p.id)}>
      <span className="win-h"><i className="wdot" /> {p.title} <span className="win-en mono">{p.en}</span></span>
      <span className="card-body">
        <Doodle name={p.doodle} className="card-doodle" title={p.title} />
        <span className="card-tag">{p.tagline}</span>
      </span>
      <span className="card-foot mono">#{p.num} · افتح ←</span>
    </button>
  )
}

function PillarScreen({ p, onBack }) {
  return (
    <section className="screen" style={{ '--wc': p.wc }}>
      <button className="back" onClick={onBack}>→ الأركان</button>
      <header className="screen-head">
        <Doodle name={p.doodle} className="screen-doodle" title={p.title} />
        <h2>{p.title}</h2>
        <span className="lcd screen-lcd"><span className="big orange">{p.en}</span><small>{p.motif}</small></span>
      </header>
      <p className="screen-tag">{p.tagline}</p>

      {p.strip && <ZineStrip title={p.strip.title} steps={p.strip.steps} />}

      {p.id === 'studio' && <StudioScreen />}
      {p.id === 'library' && <LibraryScreen />}
      {p.id === 'training' && <TrainingScreen />}
      {p.id === 'analysis' && <AnalysisScreen />}
      {p.id === 'semantics' && <ElectromagneticSemantics />}
      {p.id === 'prosody' && <ProsodyLab />}
    </section>
  )
}

export default function App() {
  const [active, setActive] = useState(null)
  const pillar = PILLARS.find((p) => p.id === active)

  return (
    <div className="frame">
      <Toolbar />

      <main>
        {pillar
          ? <PillarScreen p={pillar} onBack={() => setActive(null)} />
          : (
            <div className="grid">
              {PILLARS.map((p) => <PillarCard key={p.id} p={p} onOpen={setActive} />)}
            </div>
          )}
      </main>

      <footer id="statusbar">
        <span>MAQAM.SYS <b className="g">READY</b></span>
        <span>RHYME <b className="o">v1</b></span>
        <span>PROSODY <b className="o">30 FEET</b></span>
        <span className="hint">الفنان قائد، والتطبيق مدرّب — الآلة ترسم وتكشف وتقيس، والإنسان يقرر ويكتب ويؤدي</span>
        <span className="mono">MAQAM WORKSTATION v3.0.0</span>
      </footer>
    </div>
  )
}

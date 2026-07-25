import { useState } from 'react'
import { PILLARS } from './pillars.js'
import RhythmCanvas from './RhythmCanvas.jsx'
import StudioScreen from './StudioScreen.jsx'
import LibraryScreen from './LibraryScreen.jsx'
import TrainingScreen from './TrainingScreen.jsx'
import AnalysisScreen from './AnalysisScreen.jsx'
import { Doodle, ZineStrip, Mic } from './Doodles.jsx'

function SidebarToggleIcon(p) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function Sidebar({ active, onOpen, collapsed, mobileOpen }) {
  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
      <button className="sidebar-brand" onClick={() => onOpen(null)}>
        <div className="sidebar-mark chamfer-sm"><Mic /></div>
        <div className="sidebar-brand-text">
          <div className="name">مَقَام</div>
          <div className="tag">MAQAM · v1.0</div>
        </div>
      </button>

      <nav className="sidebar-nav">
        {PILLARS.map((p) => (
          <button
            key={p.id}
            className={`sidebar-item${active === p.id ? ' active' : ''}`}
            onClick={() => onOpen(p.id)}
          >
            <Doodle name={p.doodle} className="sidebar-item-icon" title={p.title} />
            <span className="num mono">{p.num}</span>
            <span className="sidebar-item-label">{p.title}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-foot">
        <div className="sidebar-quote">"الوزن أمانة، والقافية إمضاء"</div>
      </div>
    </aside>
  )
}

function Topbar({ pillar, onToggleSidebar }) {
  return (
    <header className="topbar">
      <button className="sidebar-toggle" onClick={onToggleSidebar} aria-label="طي/فتح القائمة الجانبية">
        <SidebarToggleIcon style={{ width: 17, height: 17 }} />
      </button>
      <div className="topbar-crumb">
        <b>مقام</b>
        <span className="sep">/</span>
        {pillar ? pillar.title : <b>الأركان</b>}
      </div>
      <div className="topbar-spacer" />
    </header>
  )
}

function PillarCard({ p, onOpen }) {
  return (
    <button className="card" onClick={() => onOpen(p.id)}>
      <div className="card-top">
        <span className="card-num mono">#{p.num}</span>
        <Doodle name={p.doodle} className="card-doodle" title={p.title} />
      </div>
      <h2>{p.title}</h2>
      <p>{p.tagline}</p>
      <span className="card-go">افتح الأداة ←</span>
    </button>
  )
}

function PillarScreen({ p, onBack }) {
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
    </section>
  )
}

export default function App() {
  const [active, setActive] = useState(null)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pillar = PILLARS.find((p) => p.id === active)

  function openPillar(id) {
    setActive(id)
    setMobileOpen(false)
  }

  function toggleSidebar() {
    if (window.innerWidth <= 900) setMobileOpen((v) => !v)
    else setCollapsed((v) => !v)
  }

  return (
    <div className="app-shell">
      <Sidebar active={active} onOpen={openPillar} collapsed={collapsed} mobileOpen={mobileOpen} />

      <div className="main-wrap">
        <Topbar pillar={pillar} onToggleSidebar={toggleSidebar} />

        <main className="content">
          {pillar ? (
            <PillarScreen p={pillar} onBack={() => setActive(null)} />
          ) : (
            <>
              <div className="page-head">
                <div className="page-head-text">
                  <h1>مَقَام</h1>
                  <p>الهيكل المُضيء — مدرّب صناعة الراب العربي</p>
                </div>
                <div className="page-head-canvas">
                  <RhythmCanvas seed={941994} />
                </div>
              </div>
              <div className="grid">
                {PILLARS.map((p) => <PillarCard key={p.id} p={p} onOpen={openPillar} />)}
              </div>
            </>
          )}

          <footer className="status">
            <span>"الآلة تكشف وتعرض وتقيس — الإنسان يقرر ويكتب ويؤدي"</span>
            <span className="mono">MAQAM · الهيكل المُضيء v2.0</span>
          </footer>
        </main>
      </div>
    </div>
  )
}

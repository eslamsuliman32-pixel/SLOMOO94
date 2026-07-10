import { useMemo, useState } from 'react'
import Coach from './Coach.jsx'
import {
  STRESSED, UNSTRESSED, FEET, FEET_COUNT, ENDINGS, REPETITION_LEVELS,
  CATEGORY_LABELS, CATEGORY_COLOR,
} from './lib/prosodyFeet.js'

/** أداة ١ — بناء البصمة النبرية وتشخيص القدم (حتى ٤ مقاطع) */
function FootBuilder() {
  const [pattern, setPattern] = useState([])
  const key = pattern.join(' ')
  const foot = FEET[key]

  function add(sym) {
    if (pattern.length >= 4) return
    setPattern([...pattern, sym])
  }

  return (
    <div className="exercise wob">
      <h3>المحلل المقطعي ومصنّف الأقدام</h3>
      <p className="gate-note">أضف حتى ٤ مقاطع لتشخيص القدم العروضية النبرية فورًا (- منبور / ~ غير منبور).</p>
      <div className="ex-controls">
        <button className="conn-test-btn ex-key" onClick={() => add(STRESSED)} disabled={pattern.length >= 4}>منبور (-)</button>
        <button className="conn-test-btn ex-key" onClick={() => add(UNSTRESSED)} disabled={pattern.length >= 4}>غير منبور (~)</button>
        <button className="mini-btn" onClick={() => setPattern(pattern.slice(0, -1))} disabled={!pattern.length}>تراجع</button>
        <button className="mini-btn danger" onClick={() => setPattern([])} disabled={!pattern.length}>مسح</button>
      </div>
      <div className="ex-answer" dir="ltr">{key || '...'}</div>
      {pattern.length > 0 && (
        <div className="prosody-result">
          {foot ? (
            <>
              <h4>{foot.name} <span className={`rhyme-badge ${CATEGORY_COLOR[foot.category]}`}>{CATEGORY_LABELS[foot.category]}</span></h4>
              <p className="gate-note">مثال: {foot.example} — {foot.desc}</p>
            </>
          ) : (
            <p className="gate-note">تتابع غير قياسي — لا يطابق قدمًا مستقلة في القاموس، قد يكون جزءًا من تداخل وزني.</p>
          )}
        </div>
      )}
    </div>
  )
}

/** أداة ٢ — كاشف نهايات الأبيات (مذكرة/مؤنثة) */
function EndingDetector() {
  const [kind, setKind] = useState(null)
  const info = kind && ENDINGS[kind]

  return (
    <div className="exercise wob">
      <h3>كاشف ومحلل نهايات الأبيات</h3>
      <p className="gate-note">اختر نمط المقطعين الأخيرين من البيت لمعرفة نوع القفلة وأثرها الموسيقي.</p>
      <div className="ex-controls">
        <button className={`conn-test-btn ex-key ${kind === 'masculine' ? 'ok' : ''}`} onClick={() => setKind('masculine')}>نهاية: (~ -)</button>
        <button className={`conn-test-btn ex-key ${kind === 'feminine' ? 'ok' : ''}`} onClick={() => setKind('feminine')}>نهاية: (- ~)</button>
      </div>
      {info && (
        <div className="prosody-result">
          <h4>{info.label}</h4>
          <p className="gate-note">مثال قياسي: <em>{info.example}</em></p>
          <p className="gate-note">{info.effect}</p>
        </div>
      )}
    </div>
  )
}

/** أداة ٣ — مصفوفة تتبع التكرار البنيوي (٩ مستويات) */
function RepetitionMatrix() {
  const [checked, setChecked] = useState(() => new Set())
  const pct = Math.round((checked.size / REPETITION_LEVELS.length) * 100)

  function toggle(id) {
    const next = new Set(checked)
    next.has(id) ? next.delete(id) : next.add(id)
    setChecked(next)
  }

  return (
    <div className="exercise wob prosody-matrix">
      <h3>مصفوفة تتبع التكرار البنيوي</h3>
      <p className="gate-note">التكرار هو المحرك التنظيمي الأساسي للإيقاع. تتبّع المستويات التي رصدتها في نصك:</p>
      <div className="checklist-grid">
        {REPETITION_LEVELS.map((lvl, i) => (
          <label className="toggle check-item" key={lvl.id}>
            <input type="checkbox" checked={checked.has(lvl.id)} onChange={() => toggle(lvl.id)} />
            {i + 1}. {lvl.label}
          </label>
        ))}
      </div>
      <div className="prog-row">
        <span>مؤشر عمق التحليل البنيوي</span>
        <span className="mono">{pct}%</span>
      </div>
      <div className="prog-track"><div className="prog-fill" style={{ '--w': pct + '%' }} /></div>
    </div>
  )
}

/** أداة ٤ — القاموس الشامل للأقدام العروضية */
function FeetDictionary() {
  const [filter, setFilter] = useState('all')
  const entries = useMemo(
    () => Object.entries(FEET).filter(([, f]) => filter === 'all' || f.category === filter),
    [filter],
  )

  return (
    <div className="exercise wob">
      <h3>القاموس الشامل للأقدام العروضية ({FEET_COUNT} تركيبًا)</h3>
      <div className="ex-controls prosody-tabs">
        <button className={`mini-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>الكل</button>
        {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
          <button key={cat} className={`mini-btn ${filter === cat ? 'active' : ''}`} onClick={() => setFilter(cat)}>{label}</button>
        ))}
      </div>
      <div className="prosody-table-wrap">
        <table className="prosody-table">
          <thead>
            <tr><th>الفئة</th><th>اسم القدم</th><th>النمط</th><th>مثال</th><th>الخصائص والأثر</th></tr>
          </thead>
          <tbody>
            {entries.map(([pat, f]) => (
              <tr key={pat}>
                <td><span className={`rhyme-badge ${CATEGORY_COLOR[f.category]}`}>{CATEGORY_LABELS[f.category]}</span></td>
                <td>{f.name}</td>
                <td className="weight-fp" dir="ltr">{pat}</td>
                <td>{f.example}</td>
                <td className="gate-note">{f.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function ProsodyLab() {
  return (
    <div className="training prosody-lab">
      <p className="gate-note">
        نظام النبر هنا (منبور/غير منبور) مرجع مقارن من العروض الغربي الكلاسيكي، منفصل عن محرك الوزن العربي
        (متحرك ●/ساكن ▬) في ركن التدريب — الأداتان تخدمان الأذن نفسها من زاويتين مختلفتين.
      </p>
      <FootBuilder />
      <EndingDetector />
      <RepetitionMatrix />
      <FeetDictionary />
      <Coach />
    </div>
  )
}

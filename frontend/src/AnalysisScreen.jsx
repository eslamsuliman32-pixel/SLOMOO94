import { useState } from 'react'
import Coach from './Coach.jsx'

/* صف العدّ: 1 e + a لكل ضربة (نفس محلل البيت الحقيقي) */
const COUNT_LABELS = ['1', 'e', '+', 'a', '2', 'e', '+', 'a', '3', 'e', '+', 'a', '4', 'e', '+', 'a']

/* شبكة الـ16 خانة لبار واحد — مستهلك خفيف لـ Beat Profile (قرار D5: لا تحليل صوتي هنا) */
function BarGrid({ bar, lyric }) {
  return (
    <div className="bp-stage">
      <div className="bp-barline" />

      {/* أقواس الكلمات + عدد المقاطع */}
      <div className="bp-grid16 bp-row-brackets">
        {lyric?.words?.map((w, i) => (
          <div key={i} className="bp-bracket" style={{ gridColumn: `${w.fromSlot + 1} / ${w.toSlot + 2}` }}>
            <span className="bp-syl-count">{w.syllableCount}</span>
            <span className="bp-wname">{w.name}</span>
          </div>
        ))}
      </div>

      {/* مثلثات: 808 (وردي) + نبر المقطع (ذهبي) */}
      <div className="bp-grid16 bp-row-tris">
        {bar.slots.map((s, i) => {
          const syl = lyric?.syllables?.find((x) => x.slot === i)
          return (
            <div key={i} className="bp-tri-cell">
              {s.e808 && <div className="bp-tri" />}
              {syl?.stress && <div className="bp-tri stress" />}
            </div>
          )
        })}
      </div>

      {/* النقاط: كيك (مضيئة أزرق) · سنير (حلقة) · مقطع (ذهبي) */}
      <div className="bp-grid16 bp-row-dots">
        {bar.slots.map((s, i) => {
          const syl = lyric?.syllables?.find((x) => x.slot === i)
          const cls = ['bp-dot']
          if (s.kick) cls.push('kick')
          if (s.snare) cls.push('snare')
          if (syl && !s.kick) cls.push('syl')
          if (s.rawOnset && !s.kick && !s.snare) cls.push('onset')
          return (
            <div key={i} className={`bp-dot-cell${i % 4 === 0 ? ' beat-line' : ''}`}>
              <div className="bp-tick" />
              <div className={cls.join(' ')} />
            </div>
          )
        })}
      </div>

      {/* المقاطع اللفظية */}
      <div className="bp-grid16 bp-row-syll">
        {bar.slots.map((s, i) => {
          const syl = lyric?.syllables?.find((x) => x.slot === i)
          return (
            <div key={i} className="bp-syl-cell">
              {syl && <span className={`bp-syl-txt${syl.stress ? ' stressed' : ''}`}>{syl.text}</span>}
            </div>
          )
        })}
      </div>

      {/* صف العدّ */}
      <div className="bp-grid16 bp-row-count">
        {COUNT_LABELS.map((lbl, i) => (
          <div key={i} className={`bp-count-cell${i % 4 === 0 ? ' beat' : ''}`}>{lbl}</div>
        ))}
      </div>
    </div>
  )
}

export default function AnalysisScreen() {
  const [profile, setProfile] = useState(null)
  const [viewBar, setViewBar] = useState(0)
  const [err, setErr] = useState('')

  function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setErr('')
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const p = JSON.parse(reader.result)
        if (p.schema !== 'maqam.beatProfile' || !Array.isArray(p.bars) || !p.bars.length) {
          setErr('الملف ليس Beat Profile متوافقًا مع مقام (schema: maqam.beatProfile). صدّره من «محلل البيت الحقيقي».')
          return
        }
        setProfile(p)
        setViewBar(0)
      } catch {
        setErr('تعذّرت قراءة الملف — تأكد أنه ملف .json صدّرته أداة محلل البيت.')
      }
    }
    reader.readAsText(file)
  }

  const bar = profile?.bars?.[viewBar]
  const lyric = profile?.lyrics?.bars?.find((b) => b && b.barIndex === bar?.index) || null
  const section = profile?.sections?.find((s) => bar && bar.index >= s.fromBar && bar.index <= s.toBar)

  return (
    <div className="analysis">
      <div className="import-box">
        <h3>استيراد Beat Profile</h3>
        <p className="gate-note">
          حلّل بيتك مرة واحدة في <span className="mono-inline">محلل البيت الحقيقي</span>، صدّر ملف
          <span className="mono-inline">beat_profile.json</span> ثم ارفعه هنا — تُعاد بناء الشبكة والأقسام
          والبارات فورًا دون أي إعادة تحليل صوتي (قرار D5: التحليل الثقيل مرة، والعرض خفيف دائمًا).
        </p>
        <input type="file" accept=".json,application/json" onChange={onFile} className="file-input" />
        {err && <div className="conn-test-result fail"><span className="conn-test-icon">✕</span> {err}</div>}
      </div>

      {profile && bar && (
        <div className="profile-view">
          <div className="profile-meta">
            {profile.source?.filename && <span className="rhyme-badge rhyme-c0">{profile.source.filename}</span>}
            <span className="rhyme-badge rhyme-c1">BPM {profile.tempo?.bpm}</span>
            <span className="rhyme-badge rhyme-c3">ثقة {profile.tempo?.confidencePercent}٪</span>
            <span className="rhyme-badge rhyme-c5">{profile.bars.length} بار</span>
            <span className="rhyme-badge rhyme-c6">{profile.sections?.length || 0} قسم</span>
            {profile.detectionCounts && (
              <span className="rhyme-badge rhyme-c2">
                كيك {profile.detectionCounts.kick} · سنير {profile.detectionCounts.snare} · 808 {profile.detectionCounts.e808}
              </span>
            )}
            {profile.lyrics?.overallMatchPercent != null && (
              <span className="rhyme-badge rhyme-c3">تزامن النبر {profile.lyrics.overallMatchPercent}٪</span>
            )}
          </div>

          {/* شريط الأقسام الحقيقية */}
          {profile.sections?.length > 0 && (
            <div className="bp-sections">
              <div className="bp-rail-label">SECTIONS · أقسام البيت الحقيقية</div>
              <div className="bp-sec-rail">
                {profile.sections.map((s) => (
                  <button
                    key={s.index}
                    className={`bp-sec-block${section?.index === s.index ? ' now' : ''}`}
                    style={{ flexGrow: s.barsCount }}
                    onClick={() => setViewBar(s.fromBar)}
                  >
                    <span className="bp-sn">قسم {s.index + 1} · {s.tag}</span>
                    <span className="bp-sb">{s.barsCount} بار</span>
                    <span className="bp-se" style={{ opacity: 0.25 + s.energyLevel * 0.75 }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* شريط البارات */}
          <div className="bp-bars-rail-wrap">
            <div className="bp-rail-label">BARS · كل بارات التراك</div>
            <div className="bp-bars-rail">
              {profile.bars.map((b) => (
                <button
                  key={b.index}
                  className={`bp-bar-tile${b.index === viewBar ? ' viewed' : ''}`}
                  onClick={() => setViewBar(b.index)}
                >{b.index + 1}</button>
              ))}
            </div>
          </div>

          {/* عنوان البار الحالي */}
          <div className="bp-stage-head">
            <span className="mono">BAR <b>{bar.index + 1}</b> / {profile.bars.length}
              {section ? ` · قسم ${section.index + 1} (${section.tag})` : ''}</span>
            {lyric?.matchPercent != null && <span className="bp-match-badge">تزامن النبر: {lyric.matchPercent}٪</span>}
          </div>

          <BarGrid bar={bar} lyric={lyric} />

          <div className="bp-legend">
            <span className="bp-leg"><span className="bp-d kick" /> كيك</span>
            <span className="bp-leg"><span className="bp-d snare" /> سنير</span>
            <span className="bp-leg"><span className="bp-t" /> 808</span>
            <span className="bp-leg"><span className="bp-d syl" /> مقطع لفظي</span>
            <span className="bp-leg"><span className="bp-t g" /> نَبْر</span>
          </div>
          <p className="gate-note">
            النقطة الزرقاء المضيئة كيك، الحلقة سنير، المثلث الوردي 808، والذهبي مقطع لفظي منطوق.
            الأقواس تجمّع كلمات النص فوق خاناتها، والرقم عددها. اختر أي بار أو قسم للتنقل.
          </p>
        </div>
      )}
      <Coach />
    </div>
  )
}

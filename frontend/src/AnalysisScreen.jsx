import { useState } from 'react'
import Coach from './Coach.jsx'

/* صف العدّ: 1 e + a لكل ضربة (نفس محلل البيت الحقيقي) */
const COUNT_LABELS = ['1', 'e', '+', 'a', '2', 'e', '+', 'a', '3', 'e', '+', 'a', '4', 'e', '+', 'a']
const AR_NUM = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d])

/* ── تحليل مبسّط: قراءة البيت بلغة واضحة من بيانات Beat Profile ── */
function readBeat(profile) {
  const bars = profile.bars
  const beatSlots = [0, 4, 8, 12]
  let kickOnBeat = 0, kickTotal = 0, snareOnBackbeat = 0, e808Total = 0
  bars.forEach((b) => {
    b.slots.forEach((s, i) => {
      if (s.kick) { kickTotal++; if (beatSlots.includes(i)) kickOnBeat++ }
      if (s.snare && (i === 4 || i === 12)) snareOnBackbeat++
      if (s.e808) e808Total++
    })
  })
  const feel = profile.tempo.bpm < 85 ? 'هادئ متمهّل' : profile.tempo.bpm < 110 ? 'متوسط متوازن' : 'سريع مندفع'
  const kickReading = kickTotal === 0 ? 'بلا كيك واضح' :
    kickOnBeat / Math.max(1, kickTotal) > 0.6 ? 'الكيك يقع على الضربات القوية (أساس ثابت)' : 'الكيك موزّع خارج الضربات (إيقاع متذبذب)'
  const snareReading = snareOnBackbeat >= bars.length ? 'السنير على الـbackbeat (2 و4) — نبض راب كلاسيكي' :
    snareOnBackbeat > 0 ? 'سنير على الـbackbeat جزئيًا' : 'سنير غير منتظم'
  const e808Reading = e808Total === 0 ? 'بلا 808 مستدام' : `حضور 808 في ${AR_NUM(e808Total)} موضعًا — باص عميق يملأ القاع`
  return { feel, kickReading, snareReading, e808Reading }
}

/* عدد ضربات نوع معيّن في بار */
const countIn = (bar, key) => bar.slots.filter((s) => s[key]).length

/* شبكة الـ16 خانة لبار واحد — الطبقات قابلة للتحكم في الوضع الاحترافي */
function BarGrid({ bar, lyric, layers }) {
  return (
    <div className="bp-stage">
      <div className="bp-barline" />

      {layers.brackets && (
        <div className="bp-grid16 bp-row-brackets">
          {lyric?.words?.map((w, i) => (
            <div key={i} className="bp-bracket" style={{ gridColumn: `${w.fromSlot + 1} / ${w.toSlot + 2}` }}>
              <span className="bp-syl-count">{w.syllableCount}</span>
              <span className="bp-wname">{w.name}</span>
            </div>
          ))}
        </div>
      )}

      <div className="bp-grid16 bp-row-tris">
        {bar.slots.map((s, i) => {
          const syl = lyric?.syllables?.find((x) => x.slot === i)
          return (
            <div key={i} className="bp-tri-cell">
              {layers.e808 && s.e808 && <div className="bp-tri" />}
              {layers.stress && syl?.stress && <div className="bp-tri stress" />}
            </div>
          )
        })}
      </div>

      <div className="bp-grid16 bp-row-dots">
        {bar.slots.map((s, i) => {
          const syl = lyric?.syllables?.find((x) => x.slot === i)
          const cls = ['bp-dot']
          if (layers.drums && s.kick) cls.push('kick')
          if (layers.drums && s.snare) cls.push('snare')
          if (layers.syllables && syl && !s.kick) cls.push('syl')
          if (layers.onsets && s.rawOnset && !s.kick && !s.snare) cls.push('onset')
          return (
            <div key={i} className={`bp-dot-cell${i % 4 === 0 ? ' beat-line' : ''}`}>
              <div className="bp-tick" />
              <div className={cls.join(' ')} />
            </div>
          )
        })}
      </div>

      {layers.syllables && (
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
      )}

      {layers.count && (
        <div className="bp-grid16 bp-row-count">
          {COUNT_LABELS.map((lbl, i) => (
            <div key={i} className={`bp-count-cell${i % 4 === 0 ? ' beat' : ''}`}>{lbl}</div>
          ))}
        </div>
      )}
    </div>
  )
}

const DEFAULT_LAYERS = { drums: true, e808: true, onsets: false, syllables: true, stress: true, brackets: true, count: true }
const SIMPLE_LAYERS = { drums: true, e808: true, onsets: false, syllables: false, stress: false, brackets: false, count: true }

const LAYER_META = [
  { key: 'drums', label: 'كيك / سنير', tint: 'kick' },
  { key: 'e808', label: 'الـ808 ▼', tint: 'pulse' },
  { key: 'onsets', label: 'ضربات خام', tint: '' },
  { key: 'syllables', label: 'المقاطع', tint: 'gold' },
  { key: 'stress', label: 'النبر ▼', tint: 'pulse' },
  { key: 'brackets', label: 'أقواس الكلمات', tint: 'gold' },
  { key: 'count', label: 'سطر العدّ', tint: 'lcd' },
]

export default function AnalysisScreen() {
  const [profile, setProfile] = useState(null)
  const [viewBar, setViewBar] = useState(0)
  const [err, setErr] = useState('')
  const [mode, setMode] = useState('simple') // 'simple' | 'pro'
  const [layers, setLayers] = useState(DEFAULT_LAYERS)

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

  function setModeAndLayers(m) {
    setMode(m)
    setLayers(m === 'simple' ? SIMPLE_LAYERS : DEFAULT_LAYERS)
  }

  const bar = profile?.bars?.[viewBar]
  const lyric = profile?.lyrics?.bars?.find((b) => b && b.barIndex === bar?.index) || null
  const section = profile?.sections?.find((s) => bar && bar.index >= s.fromBar && bar.index <= s.toBar)
  const reading = profile ? readBeat(profile) : null

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
          {/* مبدّل الوضع */}
          <div className="bp-mode-tabs">
            <button className={`bp-mode-tab${mode === 'simple' ? ' on' : ''}`} onClick={() => setModeAndLayers('simple')}>
              عرض مبسّط
            </button>
            <button className={`bp-mode-tab${mode === 'pro' ? ' on' : ''}`} onClick={() => setModeAndLayers('pro')}>
              عرض احترافي
            </button>
          </div>

          {/* ═══════════ الوضع المبسّط ═══════════ */}
          {mode === 'simple' && (
            <>
              <div className="bp-tiles">
                <div className="bp-tile"><span className="bp-tile-v">{AR_NUM(profile.tempo.bpm)}</span><span className="bp-tile-l">BPM</span></div>
                <div className="bp-tile"><span className="bp-tile-v">{AR_NUM(profile.bars.length)}</span><span className="bp-tile-l">بار</span></div>
                <div className="bp-tile"><span className="bp-tile-v">{AR_NUM(profile.sections?.length || 0)}</span><span className="bp-tile-l">قسم</span></div>
                <div className="bp-tile"><span className="bp-tile-v">{AR_NUM(profile.tempo.confidencePercent)}٪</span><span className="bp-tile-l">ثقة الكشف</span></div>
              </div>

              <div className="bp-reading">
                <h3>قراءة سريعة للبيت</h3>
                <ul>
                  <li><b>الإحساس:</b> إيقاع {reading.feel} عند {AR_NUM(profile.tempo.bpm)} BPM.</li>
                  <li><b>الكيك:</b> {reading.kickReading}.</li>
                  <li><b>السنير:</b> {reading.snareReading}.</li>
                  <li><b>الـ808:</b> {reading.e808Reading}.</li>
                  {profile.sections?.length > 0 && (
                    <li><b>البناء:</b> {AR_NUM(profile.sections.length)} أقسام —{' '}
                      {profile.sections.map((s) => `${s.tag} (${AR_NUM(s.barsCount)} بار)`).join('، ')}.</li>
                  )}
                </ul>
              </div>

              <div className="bp-bars-rail-wrap">
                <div className="bp-rail-label">اختر بارًا لعرض شبكته</div>
                <div className="bp-bars-rail">
                  {profile.bars.map((b) => (
                    <button key={b.index} className={`bp-bar-tile${b.index === viewBar ? ' viewed' : ''}`} onClick={() => setViewBar(b.index)}>{AR_NUM(b.index + 1)}</button>
                  ))}
                </div>
              </div>

              <div className="bp-stage-head">
                <span className="mono">BAR <b>{AR_NUM(bar.index + 1)}</b> / {AR_NUM(profile.bars.length)}{section ? ` · ${section.tag}` : ''}</span>
              </div>
              <BarGrid bar={bar} lyric={lyric} layers={SIMPLE_LAYERS} />
              <div className="bp-legend">
                <span className="bp-leg"><span className="bp-d kick" /> كيك</span>
                <span className="bp-leg"><span className="bp-d snare" /> سنير</span>
                <span className="bp-leg"><span className="bp-t" /> 808</span>
              </div>
            </>
          )}

          {/* ═══════════ الوضع الاحترافي ═══════════ */}
          {mode === 'pro' && (
            <>
              <div className="profile-meta">
                {profile.source?.filename && <span className="rhyme-badge rhyme-c0">{profile.source.filename}</span>}
                <span className="rhyme-badge rhyme-c1">BPM {profile.tempo?.bpm}</span>
                <span className="rhyme-badge rhyme-c3">ثقة {profile.tempo?.confidencePercent}٪</span>
                <span className="rhyme-badge rhyme-c0">نبضة {profile.tempo?.beatDurationSec?.toFixed(3)}ث</span>
                <span className="rhyme-badge rhyme-c5">{profile.bars.length} بار</span>
                <span className="rhyme-badge rhyme-c6">{profile.sections?.length || 0} قسم</span>
                {profile.detectionCounts && (
                  <span className="rhyme-badge rhyme-c2">كيك {profile.detectionCounts.kick} · سنير {profile.detectionCounts.snare} · 808 {profile.detectionCounts.e808} · خام {profile.detectionCounts.raw}</span>
                )}
                {profile.source?.durationSec != null && <span className="rhyme-badge rhyme-c7">{Math.round(profile.source.durationSec)}ث · {profile.source.sampleRateAnalysis}Hz</span>}
                {profile.lyrics?.overallMatchPercent != null && <span className="rhyme-badge rhyme-c3">تزامن النبر {profile.lyrics.overallMatchPercent}٪</span>}
              </div>

              {/* طبقات قابلة للتحكم */}
              <div className="bp-layers">
                <span className="bp-rail-label">LAYERS · الطبقات</span>
                {LAYER_META.map((l) => (
                  <button
                    key={l.key}
                    className={`bp-chip${layers[l.key] ? ' on' : ''}`}
                    data-tint={l.tint}
                    onClick={() => setLayers((prev) => ({ ...prev, [l.key]: !prev[l.key] }))}
                  ><span className="bp-chip-ic" /> {l.label}</button>
                ))}
              </div>

              {profile.sections?.length > 0 && (
                <div className="bp-sections">
                  <div className="bp-rail-label">SECTIONS · أقسام البيت الحقيقية (Novelty Segmentation)</div>
                  <div className="bp-sec-rail">
                    {profile.sections.map((s) => (
                      <button key={s.index} className={`bp-sec-block${section?.index === s.index ? ' now' : ''}`} style={{ flexGrow: s.barsCount }} onClick={() => setViewBar(s.fromBar)}>
                        <span className="bp-sn">قسم {s.index + 1} · {s.tag}</span>
                        <span className="bp-sb">{s.barsCount} بار · طاقة {Math.round(s.energyLevel * 100)}٪</span>
                        <span className="bp-se" style={{ opacity: 0.25 + s.energyLevel * 0.75 }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="bp-bars-rail-wrap">
                <div className="bp-rail-label">BARS · كل بارات التراك</div>
                <div className="bp-bars-rail">
                  {profile.bars.map((b) => (
                    <button key={b.index} className={`bp-bar-tile${b.index === viewBar ? ' viewed' : ''}`} onClick={() => setViewBar(b.index)}>{b.index + 1}</button>
                  ))}
                </div>
              </div>

              <div className="bp-stage-head">
                <span className="mono">BAR <b>{bar.index + 1}</b> / {profile.bars.length}{section ? ` · قسم ${section.index + 1} (${section.tag})` : ''}</span>
                {lyric?.matchPercent != null && <span className="bp-match-badge">تزامن النبر: {lyric.matchPercent}٪</span>}
              </div>

              <BarGrid bar={bar} lyric={lyric} layers={layers} />

              <div className="bp-legend">
                <span className="bp-leg"><span className="bp-d kick" /> كيك (هيمنة sub)</span>
                <span className="bp-leg"><span className="bp-d snare" /> سنير (mid+high)</span>
                <span className="bp-leg"><span className="bp-t" /> 808 (sub مستدام)</span>
                <span className="bp-leg"><span className="bp-d syl" /> مقطع لفظي</span>
                <span className="bp-leg"><span className="bp-t g" /> نَبْر</span>
              </div>

              {/* دقة زمنية للبار: توقيت كل خانة بالثانية + محتواها */}
              <div className="bp-precision">
                <div className="bp-rail-label">
                  دقة البار {bar.index + 1} — التوقيت الحقيقي لكل خانة (ثانية) · الحدود {bar.startSec.toFixed(3)}ث → {bar.endSec.toFixed(3)}ث ·
                  كيك {countIn(bar, 'kick')} / سنير {countIn(bar, 'snare')} / 808 {countIn(bar, 'e808')}
                </div>
                <div className="bp-timing-wrap">
                  <table className="bp-timing">
                    <thead>
                      <tr><th>خانة</th><th>عدّ</th><th>ثانية</th><th>محتوى</th></tr>
                    </thead>
                    <tbody>
                      {bar.slots.map((s, i) => {
                        const hits = [s.kick && 'كيك', s.snare && 'سنير', s.e808 && '808', s.rawOnset && 'خام'].filter(Boolean).join(' · ')
                        const syl = lyric?.syllables?.find((x) => x.slot === i)
                        return (
                          <tr key={i} className={i % 4 === 0 ? 'beat' : ''}>
                            <td className="mono">{s.index}</td>
                            <td className="mono">{COUNT_LABELS[i]}</td>
                            <td className="mono">{bar.slotTimesSec[i]?.toFixed(3)}</td>
                            <td>{[hits, syl && `«${syl.text}»${syl.stress ? ' (نبر)' : ''}`].filter(Boolean).join(' — ') || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="gate-note">
                كل قيمة هنا مقيسة فعليًا من الطيف: النقطة الزرقاء المضيئة كيك (هيمنة النطاق التحتي)،
                الحلقة سنير (جسم mid + بريق high)، المثلث الوردي 808 (استدامة sub بعد الذروة). التوقيتات
                مُنقَّحة على النبضات الحقيقية لا من معادلة BPM جامدة — لذا تكفي لمزامنة أي مشغّل خارجي مباشرة.
              </p>
            </>
          )}
        </div>
      )}
      <Coach />
    </div>
  )
}

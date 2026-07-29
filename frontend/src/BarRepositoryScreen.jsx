import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createLexicon } from './lib/syllabifier/index.ts'
import {
  processBar, groupBars, AXIS_LABEL, filterBars, nearestBars,
  buildRepoPayload, buildGridPayload, readRepoPayload,
} from './lib/barRepo/index.ts'
import { useBarRepositoryStore } from './state/barRepositoryStore.js'

/* عيّنة مقصودة التصميم: قافيتان متكررتان (ـاب ×٣ · ـعْ ×٢) ليُظهر تبويب
   التجميع الذكي مجموعات حقيقية بدل قائمة فارغة عند أول تشغيل. */
const DEMO = `سَأَلَ الكِتَابْ عَنِ السَّحَابْ
وَقَفْتُ طَوِيلًا خَلْفَ البَابْ
حَمَلْتُ رِسَالَةْ فِي الجِرَابْ
كَتَبْتُ حُرُوفَ الوَجَعْ
مِنْ زَمَانْ وَأَنَا دَايِرْ أَطْلَعْ
قَلْبِي وَدَّعْنِي وَفَاتْ بِلَا كَلَامْ`

const PIPELINE = [
  'التطبيع الصوتي — حذف ما لا يُنطق، فكّ الشدّة، إدغام الشمسية',
  'التقطيع المقطعي — استخراج المقاطع وأوزانها المورية',
  'الطبقات الأربع — كلمات · قوافي · نبر · سنكبة',
  'استخراج القافية — الروي والردف والوصل والمفاتيح المتدرجة',
  'البصمة والحفظ — توليد hash وإيداع القاعدة',
]

const AR_NUM = ['٠', '١', '٢', '٣', '٤', '٥']
const SONORITY_LABELS = ['انفجاري', 'احتكاكي', 'أنفي', 'انسيابي', 'صائت']
const WEIGHT_LABEL = { heavy: 'ثقيل', balanced: 'متوازن', light: 'خفيف' }

function download(text, name) {
  const blob = new Blob([text], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

/* ══════════ نافذة التفصيل: الطبقات الأربع + أقرب البارات ══════════ */
function DetailModal({ bar, pool, onClose, onSendToMetronome }) {
  const [weights, setWeights] = useState({ metricWeight: 0.5, phoneticWeight: 0.5 })
  const neighbours = useMemo(
    () => nearestBars(bar, pool, { ...weights, topK: 5 }),
    [bar, pool, weights],
  )
  const r = bar.rhyme ?? {}
  const stress = new Set(bar.stressIndices)

  return (
    <div className="br-mask" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="br-modal">
        <div className="br-modal-head">
          <div>
            <h3>{bar.raw}</h3>
            <div className="br-modal-sub mono" dir="ltr">{bar.hash.slice(0, 12)} · {bar.tag}</div>
          </div>
          <button className="br-modal-x" onClick={onClose} aria-label="إغلاق">×</button>
        </div>

        <section className="br-lay">
          <div className="br-lay-h"><span className="br-lay-n">{AR_NUM[1]}</span><h4>طبقة الكلمات — التقطيع المقطعي</h4></div>
          <div className="br-syl-strip">
            {bar.syllables.map((s, i) => (
              <div key={s.id + i} className={`br-syl${stress.has(i) ? ' str' : ''}${i >= bar.syllables.length - 2 ? ' rhy' : ''}`}>
                <span className="br-syl-c">{s.text}</span>
                <span className="br-syl-m mono">{s.moras.join('')}</span>
              </div>
            ))}
          </div>
          <div className="br-legend-mini">
            <span className="br-dot-str" /> منبور
            <span className="br-dot-rhy" /> منطقة القافية
          </div>
        </section>

        <section className="br-lay">
          <div className="br-lay-h"><span className="br-lay-n">{AR_NUM[2]}</span><h4>طبقة القوافي</h4></div>
          <div className="br-kv">
            <div className="br-kvi"><label>الروي</label><div className="v br-rawi">{r.rawi ?? '—'}</div></div>
            <div className="br-kvi"><label>الردف</label><div className="v">{r.ridf ?? 'لا يوجد'}</div></div>
            <div className="br-kvi"><label>الوصل</label><div className="v">{r.wasl ?? 'لا يوجد'}</div></div>
            <div className="br-kvi"><label>التأسيس</label><div className="v">{r.tasis ?? 'لا يوجد'}</div></div>
            <div className="br-kvi"><label>الدخيل</label><div className="v">{r.dakhil ?? 'لا يوجد'}</div></div>
            <div className="br-kvi"><label>عائلة الروي</label><div className="v">{r.family ?? '—'}</div></div>
            <div className="br-kvi"><label>مفتاح ١</label><div className="v mono">{r.keyL1 ?? '—'}</div></div>
            <div className="br-kvi"><label>مفتاح ٢</label><div className="v mono">{r.keyL2 ?? '—'}</div></div>
            <div className="br-kvi"><label>مفتاح ٣ (مقطعي)</label><div className="v">{r.keyL3 ?? '—'}</div></div>
          </div>
        </section>

        <section className="br-lay">
          <div className="br-lay-h"><span className="br-lay-n">{AR_NUM[3]}</span><h4>طبقة النبر والوزن</h4></div>
          <div className="br-kv">
            <div className="br-kvi"><label>بصمة المورات</label><div className="v br-mora mono">{bar.moraStr}</div></div>
            <div className="br-kvi"><label>نمط النبر</label><div className="v mono" dir="ltr">{bar.stressPattern}</div></div>
            <div className="br-kvi"><label>مقاطع / مورات</label><div className="v mono" dir="ltr">{bar.sylCount} / {bar.moraCount}</div></div>
            <div className="br-kvi"><label>خفيف / ثقيل</label><div className="v mono" dir="ltr">{bar.light} / {bar.heavy}</div></div>
            <div className="br-kvi"><label>غلبة الوزن</label><div className="v">{WEIGHT_LABEL[bar.weightProfile]}</div></div>
            <div className="br-kvi"><label>متوسط الاصطدام</label><div className="v mono" dir="ltr">{bar.avgAttack}</div></div>
            <div className="br-kvi"><label>التصاق الشبكة</label><div className="v mono" dir="ltr">{bar.lockScore}</div></div>
          </div>
        </section>

        <section className="br-lay">
          <div className="br-lay-h"><span className="br-lay-n">{AR_NUM[4]}</span><h4>طبقة السنكبة والجرس</h4></div>
          <div className="br-kv">
            <div className="br-kvi"><label>معامل السنكبة</label><div className="v mono br-gold" dir="ltr">{bar.synco}</div></div>
            <div className="br-kvi"><label>كثافة التفخيم</label><div className="v mono" dir="ltr">{bar.gravity}</div></div>
            <div className="br-kvi"><label>العائلة الغالبة</label><div className="v">{bar.domFam}</div></div>
            {bar.sonority.map((n, i) => (
              <div className="br-kvi" key={i}><label>{SONORITY_LABELS[i]}</label><div className="v mono" dir="ltr">{n}</div></div>
            ))}
          </div>
        </section>

        <section className="br-lay">
          <div className="br-lay-h">
            <span className="br-lay-n">{AR_NUM[5]}</span>
            <h4>أقرب البارات <span className="br-lay-note">— مطابقة SPEC-02 بمحورين مستقلّين</span></h4>
          </div>
          <div className="br-wmodes">
            <button className={`mini-btn${weights.metricWeight === 0.8 ? ' on' : ''}`}
              onClick={() => setWeights({ metricWeight: 0.8, phoneticWeight: 0.2 })}>اقتباس فلو (وزن ٠٫٨)</button>
            <button className={`mini-btn${weights.metricWeight === 0.5 ? ' on' : ''}`}
              onClick={() => setWeights({ metricWeight: 0.5, phoneticWeight: 0.5 })}>متوازن</button>
            <button className={`mini-btn${weights.metricWeight === 0.2 ? ' on' : ''}`}
              onClick={() => setWeights({ metricWeight: 0.2, phoneticWeight: 0.8 })}>قافية (جرس ٠٫٨)</button>
          </div>
          {neighbours.length === 0
            ? <p className="br-hint">لا بارات أخرى في القاعدة للمقارنة.</p>
            : (
              <div className="br-neigh">
                {neighbours.map((n) => (
                  <div className="br-neigh-row" key={n.bar.id}>
                    <span className="br-neigh-t">{n.bar.raw}</span>
                    <span className="rhyme-badge rhyme-c0 mono" dir="ltr">وزن {n.metricScore}</span>
                    <span className="rhyme-badge rhyme-c2 mono" dir="ltr">جرس {n.phoneticScore}</span>
                    <span className="rhyme-badge rhyme-c3 mono" dir="ltr">{n.combined}</span>
                  </div>
                ))}
              </div>
            )}
        </section>

        <div className="br-modal-actions">
          <button className="conn-test-btn" onClick={() => { onSendToMetronome([bar]); onClose() }}>أرسل للميترونوم</button>
          <button className="mini-btn" onClick={() => download(JSON.stringify(buildGridPayload([bar]), null, 2), 'maqam_grid_payload.json')}>
            ⬇ حمولة الشبكة
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══════════ تبويب الحقن الدفعي ══════════ */
function InjectTab({ lex, nextId, onIngest, toast }) {
  const [text, setText] = useState('')
  const [tag, setTag] = useState('')
  const [gridType, setGridType] = useState('16')
  const [stage, setStage] = useState(-1)
  const [report, setReport] = useState(null)
  const [busy, setBusy] = useState(false)

  const lineCount = text.split('\n').filter((l) => l.trim()).length

  async function run() {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
    if (!lines.length) { toast('الصق بارات أولاً'); return }
    setBusy(true); setReport(null)

    // عرض مراحل خط الأنابيب واحدة تلو الأخرى (المعالجة نفسها متزامنة وسريعة)
    for (let s = 0; s < PIPELINE.length; s++) {
      setStage(s)
      await new Promise((r) => setTimeout(r, 110))
    }

    const accepted = []
    const rejected = []
    let id = nextId
    for (const line of lines) {
      const out = processBar(line, { tag, gridType, id, lex })
      if (out.bar) { accepted.push(out.bar); id++ }
      else rejected.push({ line, reason: out.reason })
    }
    setStage(PIPELINE.length)
    setReport({ accepted: accepted.length, rejected })
    if (accepted.length) onIngest(accepted)
    setBusy(false)
    toast(accepted.length ? `عولج ${accepted.length} بار` : 'لم يُقبل أي بار')
  }

  return (
    <div className="br-inject">
      <div className="br-panel">
        <div className="br-panel-h"><h3>لوح الحقن</h3><span className="br-hint mono">{lineCount} سطر</span></div>
        <textarea
          className="br-area" dir="rtl" value={text} disabled={busy}
          onChange={(e) => setText(e.target.value)}
          placeholder={'الصق البارات هنا — كل سطر بار واحد...\n\nكَتَبْتُ حُرُوفَ الوَجَعْ عَلَيَّ\nقَلْبِي وَدَّعْنِي وَفَاتْ بِلَا كَلَامْ'}
        />
        <div className="br-fields">
          <div className="br-fld">
            <label htmlFor="br-tag">الوسم</label>
            <input id="br-tag" className="lib-input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="فيرس ١ / مسودة..." />
          </div>
          <div className="br-fld">
            <label htmlFor="br-grid">الشبكة</label>
            <select id="br-grid" className="lib-input" value={gridType} onChange={(e) => setGridType(e.target.value)}>
              <option value="16">مستقيم ١٦</option>
              <option value="12">ثلاثي ١٢</option>
              <option value="hyb">مهجّن</option>
            </select>
          </div>
        </div>
        <div className="br-actions">
          <button className="conn-test-btn" onClick={run} disabled={busy}>عالج الدفعة</button>
          <button className="mini-btn" onClick={() => setText(DEMO)} disabled={busy}>أدخل عيّنة</button>
          <button className="mini-btn" onClick={() => { setText(''); setReport(null); setStage(-1) }} disabled={busy}>مسح اللوح</button>
        </div>
      </div>

      <div className="br-panel">
        <div className="br-panel-h"><h3>خط الأنابيب</h3></div>
        <ol className="br-pipe">
          {PIPELINE.map((label, i) => (
            <li key={i} className={`br-pstage${stage > i ? ' done' : stage === i ? ' now' : ''}`}>
              <span className="br-pdot">{AR_NUM[i + 1]}</span>
              <span className="br-pname">{label}</span>
            </li>
          ))}
        </ol>
        <div className="br-ptrack">
          <div className="br-pfill" style={{ width: `${Math.max(0, Math.min(1, (stage + 1) / PIPELINE.length)) * 100}%` }} />
        </div>

        {report && (
          <div className="br-report">
            <div className="conn-test-result ok"><span className="conn-test-icon">✓</span> أُودِع {report.accepted} بار في القاعدة</div>
            {report.rejected.length > 0 && (
              <div className="conn-test-result fail br-report-fail">
                <span className="conn-test-icon">!</span>
                <div>
                  <b>{report.rejected.length} سطر لم يُعالَج</b> — الطبقة صفر تحتاج تشكيلاً صريحاً لتقطيع دقيق،
                  ولا تُخمّن الحركات. شكِّل هذه الأسطر وأعد المحاولة:
                  <ul className="br-rejected">
                    {report.rejected.slice(0, 6).map((x, i) => (
                      <li key={i}>{x.line}<span className="br-why mono">{x.reason === 'needs-tashkeel' ? 'يحتاج تشكيل' : 'فارغ'}</span></li>
                    ))}
                    {report.rejected.length > 6 && <li className="br-why">…و{report.rejected.length - 6} غيرها</li>}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ══════════ تبويب قاعدة البيانات ══════════ */
function DatabaseTab({ bars, sel, setSel, onOpen, onSendToMetronome, onImport, toast }) {
  const [f, setF] = useState({ rawi: '', ridf: '', family: '', gravity: '', moraMin: '', moraMax: '', text: '' })
  const fileRef = useRef(null)

  const rawis = useMemo(() => [...new Set(bars.map((b) => b.rhyme?.rawi).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar')), [bars])
  const families = useMemo(() => [...new Set(bars.map((b) => b.domFam).filter((x) => x && x !== '—'))], [bars])

  const visible = useMemo(() => filterBars(bars, {
    rawi: f.rawi || undefined,
    ridf: f.ridf || undefined,
    family: f.family || undefined,
    gravity: f.gravity || undefined,
    moraMin: f.moraMin === '' ? null : Number(f.moraMin),
    moraMax: f.moraMax === '' ? null : Number(f.moraMax),
    text: f.text || undefined,
  }), [bars, f])

  function toggle(id) {
    const next = new Set(sel)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSel(next)
  }

  const selectedBars = bars.filter((b) => sel.has(b.id))

  function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const lines = readRepoPayload(JSON.parse(reader.result))
        if (!lines.length) { toast('لا بارات صالحة في الملف'); return }
        onImport(lines)
      } catch { toast('تعذّرت قراءة الملف') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="br-db">
      <div className="br-panel">
        <div className="br-filters">
          <div className="br-fld">
            <label htmlFor="f-rawi">حرف الروي</label>
            <select id="f-rawi" className="lib-input" value={f.rawi} onChange={(e) => setF({ ...f, rawi: e.target.value })}>
              <option value="">الكل</option>
              {rawis.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="br-fld">
            <label htmlFor="f-ridf">الردف</label>
            <select id="f-ridf" className="lib-input" value={f.ridf} onChange={(e) => setF({ ...f, ridf: e.target.value })}>
              <option value="">الكل</option><option value="yes">مردوف</option><option value="no">غير مردوف</option>
              <option value="ا">ألف</option><option value="و">واو</option><option value="ي">ياء</option>
            </select>
          </div>
          <div className="br-fld">
            <label htmlFor="f-fam">العائلة الغالبة</label>
            <select id="f-fam" className="lib-input" value={f.family} onChange={(e) => setF({ ...f, family: e.target.value })}>
              <option value="">الكل</option>
              {families.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div className="br-fld">
            <label htmlFor="f-grav">الجرس</label>
            <select id="f-grav" className="lib-input" value={f.gravity} onChange={(e) => setF({ ...f, gravity: e.target.value })}>
              <option value="">الكل</option><option value="hi">مفخّم</option><option value="lo">مرقّق</option>
            </select>
          </div>
          <div className="br-fld">
            <label>عدد المورات</label>
            <div className="br-range">
              <input className="lib-input" type="number" value={f.moraMin} onChange={(e) => setF({ ...f, moraMin: e.target.value })} placeholder="من" aria-label="أقل عدد مورات" />
              <span>—</span>
              <input className="lib-input" type="number" value={f.moraMax} onChange={(e) => setF({ ...f, moraMax: e.target.value })} placeholder="إلى" aria-label="أكثر عدد مورات" />
            </div>
          </div>
          <div className="br-fld">
            <label htmlFor="f-text">بحث نصي</label>
            <input id="f-text" className="lib-input" value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} placeholder="كلمة في البار..." />
          </div>
          <button className="mini-btn" onClick={() => setF({ rawi: '', ridf: '', family: '', gravity: '', moraMin: '', moraMax: '', text: '' })}>تصفير</button>
        </div>

        <div className="br-toolbar">
          <button className="conn-test-btn" onClick={() => {
            if (!selectedBars.length) { toast('حدّد بارات أولاً'); return }
            onSendToMetronome(selectedBars)
          }}>أرسل المحدَّد للميترونوم</button>
          <button className="mini-btn" onClick={() => {
            if (!selectedBars.length) { toast('حدّد بارات أولاً'); return }
            download(JSON.stringify(buildGridPayload(selectedBars), null, 2), 'maqam_grid_payload.json')
            toast('صُدّرت حمولة الشبكة')
          }}>أرسل لشبكة الألغاز</button>
          <button className="mini-btn" onClick={() => setSel(new Set(visible.map((b) => b.id)))}>تحديد الكل</button>
          <button className="mini-btn" onClick={() => setSel(new Set())}>إلغاء التحديد</button>
          <button className="mini-btn" onClick={() => {
            if (!bars.length) { toast('القاعدة فارغة'); return }
            download(JSON.stringify(buildRepoPayload(bars), null, 2), 'maqam_bar_repository.json')
            toast(`صُدّر ${bars.length} بار`)
          }}>⬇ تصدير JSON</button>
          <button className="mini-btn" onClick={() => fileRef.current?.click()}>استيراد</button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} hidden />
          <span className="br-hint mono">{sel.size ? `${sel.size} محدَّد` : 'لم يُحدَّد شيء'} · {visible.length}/{bars.length}</span>
        </div>
      </div>

      {visible.length === 0
        ? <div className="br-empty"><div className="br-empty-ic">◇</div><p>{bars.length ? 'لا بار يطابق التصفية الحالية.' : 'القاعدة فارغة — ابدأ من تبويب الحقن الدفعي.'}</p></div>
        : (
          <div className="br-twrap">
            <table className="br-table">
              <thead>
                <tr>
                  <th aria-label="تحديد" />
                  <th>البار</th><th>بصمة الوزن</th><th>مقاطع</th><th>الروي</th>
                  <th>النبر</th><th>سنكبة</th><th>الوسم</th><th aria-label="تفصيل" />
                </tr>
              </thead>
              <tbody>
                {visible.map((b) => (
                  <tr key={b.id} className={sel.has(b.id) ? 'sel' : ''}>
                    <td><input type="checkbox" checked={sel.has(b.id)} onChange={() => toggle(b.id)} aria-label={`تحديد ${b.raw}`} /></td>
                    <td className="br-td-text">{b.raw}</td>
                    <td className="br-mora mono">{b.moraStr}</td>
                    <td className="mono" dir="ltr">{b.sylCount}/{b.moraCount}</td>
                    <td>{b.rhyme ? <span className="rhyme-badge rhyme-c0">{b.rhyme.keyL2}</span> : '—'}</td>
                    <td className="mono br-dim" dir="ltr">{b.stressPattern}</td>
                    <td className="mono" dir="ltr">{b.synco}</td>
                    <td><span className="rhyme-badge rhyme-c1">{b.tag}</span></td>
                    <td><button className="mini-btn" onClick={() => onOpen(b)}>تفصيل</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  )
}

/* ══════════ تبويب التجميع الذكي ══════════ */
function GroupsTab({ bars, onSendToMetronome }) {
  const [axis, setAxis] = useState('rawi')
  const [minSize, setMinSize] = useState(2)
  const groups = useMemo(() => groupBars(bars, axis, Math.max(1, minSize)), [bars, axis, minSize])

  return (
    <div className="br-groups">
      <div className="br-panel">
        <div className="br-filters">
          <div className="br-fld">
            <label htmlFor="g-axis">محور التجميع</label>
            <select id="g-axis" className="lib-input" value={axis} onChange={(e) => setAxis(e.target.value)}>
              {Object.entries(AXIS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="br-fld">
            <label htmlFor="g-min">أقل حجم للمجموعة</label>
            <input id="g-min" className="lib-input" type="number" min="1" value={minSize}
              onChange={(e) => setMinSize(Number(e.target.value) || 1)} />
          </div>
        </div>
      </div>

      {groups.length === 0
        ? <div className="br-empty"><div className="br-empty-ic">◇</div><p>لا مجموعة تبلغ الحد الأدنى ({minSize}).</p></div>
        : groups.map((g) => (
          <div className="br-gcard" key={g.key}>
            <div className="br-ghead">
              <div>
                <span className="br-gkey">{g.key || '—'}</span>
                <span className="br-glabel">{AXIS_LABEL[axis]} · <b>{g.bars.length}</b> بار</span>
              </div>
              <button className="mini-btn" onClick={() => onSendToMetronome(g.bars)}>أرسل المجموعة للميترونوم</button>
            </div>
            <div className="br-glist">
              {g.bars.map((b) => (
                <div className="br-gitem" key={b.id}>
                  <span>{b.raw}</span>
                  <span className="br-mora mono">{b.moraStr}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}

/* ══════════ تبويب ميترونوم الكلمات ══════════ */
function MetronomeTab({ segments, sourceLabel }) {
  const [bpm, setBpm] = useState(90)
  const [playing, setPlaying] = useState(false)
  const [idx, setIdx] = useState(0)
  const [beat, setBeat] = useState(0)
  const [click, setClick] = useState(true)
  const [loop, setLoop] = useState(false)
  const acRef = useRef(null)
  const timerRef = useRef(null)

  const tick = useCallback((stressed) => {
    if (!click) return
    try {
      if (!acRef.current) acRef.current = new (window.AudioContext || window.webkitAudioContext)()
      const ac = acRef.current
      const t = ac.currentTime
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain); gain.connect(ac.destination)
      osc.type = stressed ? 'triangle' : 'square'
      osc.frequency.setValueAtTime(stressed ? 1760 : 880, t)
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(stressed ? 0.3 : 0.18, t + 0.001)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + (stressed ? 0.1 : 0.045))
      osc.start(t); osc.stop(t + (stressed ? 0.11 : 0.055))
    } catch { /* الصوت غير متاح — التتبّع البصري يستمر */ }
  }, [click])

  // مؤقّت النقر: يُعاد بناؤه عند تغيّر السرعة أو حالة التشغيل فقط
  useEffect(() => {
    if (!playing || !segments.length) return undefined
    const interval = setInterval(() => {
      setIdx((prev) => {
        const next = prev + 1
        if (next >= segments.length) {
          if (loop) return 0
          setPlaying(false)
          return prev
        }
        return next
      })
      setBeat((b) => b + 1)
    }, 60000 / bpm)
    timerRef.current = interval
    return () => clearInterval(interval)
  }, [playing, bpm, loop, segments.length])

  // نقرة مسموعة لكل مقطع يصله المؤشّر
  useEffect(() => {
    if (playing && segments[idx]) tick(segments[idx].stressed)
  }, [idx, playing, segments, tick])

  useEffect(() => { setIdx(0); setBeat(0); setPlaying(false) }, [segments])

  function start() {
    if (!segments.length) return
    if (acRef.current?.state === 'suspended') acRef.current.resume()
    if (idx >= segments.length - 1) { setIdx(0); setBeat(0) }
    setPlaying(true)
  }

  const progress = segments.length ? (idx / segments.length) * 100 : 0
  const current = segments[idx]

  return (
    <div className="br-metro">
      <div className="br-panel br-transport">
        <div className="br-bpm">
          <div className="br-bpm-read"><span className="br-bpm-v mono">{bpm}</span><span className="br-bpm-u mono">BPM</span></div>
          <input type="range" min="40" max="200" value={bpm} onChange={(e) => setBpm(Number(e.target.value))} aria-label="سرعة الميترونوم" />
          <div className="br-bpm-nudge">
            <button className="mini-btn" onClick={() => setBpm((v) => Math.max(40, v - 1))} aria-label="أبطأ">−</button>
            <button className="mini-btn" onClick={() => setBpm((v) => Math.min(200, v + 1))} aria-label="أسرع">+</button>
          </div>
        </div>
        <div className="br-actions">
          <button className="conn-test-btn" onClick={() => (playing ? setPlaying(false) : start())} disabled={!segments.length}>
            {playing ? '⏸ إيقاف مؤقت' : '▶ تشغيل'}
          </button>
          <button className="mini-btn" onClick={() => { setPlaying(false); setIdx(0); setBeat(0) }}>■ توقف</button>
          <button className={`mini-btn${click ? ' on' : ''}`} onClick={() => setClick((v) => !v)}>🔊 النقر</button>
          <button className={`mini-btn${loop ? ' on' : ''}`} onClick={() => setLoop((v) => !v)}>🔁 تكرار</button>
        </div>
      </div>

      <div className="br-panel">
        <div className="br-panel-h">
          <h3>مسار المقاطع</h3>
          <span className="br-hint mono">{sourceLabel}</span>
        </div>

        <div className="br-pulses">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`br-pulse${playing && ((beat - 1) % 4 + 4) % 4 === i ? ' on' : ''}`} />
          ))}
        </div>

        {segments.length === 0
          ? <div className="br-empty"><div className="br-empty-ic">◇</div><p>أرسل بارات من قاعدة البيانات لبدء التتبّع.</p></div>
          : (
            <>
              <div className="br-track">
                {segments.map((s, i) => (
                  <span key={i}
                    className={`br-seg${i === idx ? ' act' : ''}${i < idx ? ' read' : ''}${s.stressed ? ' str' : ''}${s.wordStart ? ' wstart' : ''}`}
                    title={`بار ${s.barId} · كلمة ${s.wordIndex + 1}`}>
                    <span className="br-seg-tri">{s.stressed ? '▲' : ''}</span>
                    <span className="br-seg-c">{s.text}</span>
                    <span className={`br-seg-d w${s.weight}`} />
                  </span>
                ))}
              </div>
              <div className="br-prog-wrap"><div className="br-prog" style={{ width: `${progress}%` }} /></div>
              <div className="br-mstatus mono">
                نبضة <b>{beat}</b> · مقطع <b>{Math.min(idx + 1, segments.length)}</b>/{segments.length}
                {current && <> · بار <b>{current.barId}</b></>}
              </div>
            </>
          )}
      </div>
    </div>
  )
}

/* ══════════ الشاشة الجامعة ══════════ */
export default function BarRepositoryScreen() {
  const lexRef = useRef(null)
  if (!lexRef.current) lexRef.current = createLexicon()

  const bars = useBarRepositoryStore((s) => s.bars)
  const setBars = useBarRepositoryStore((s) => s.setBars)
  const [sel, setSel] = useState(new Set())
  const [tab, setTab] = useState('inject')
  const [detail, setDetail] = useState(null)
  const [segments, setSegments] = useState([])
  const [metroSource, setMetroSource] = useState('لا يوجد محتوى — أرسل بارات من القاعدة')
  const [toastMsg, setToastMsg] = useState('')

  const toast = useCallback((m) => {
    setToastMsg(m)
    setTimeout(() => setToastMsg(''), 2800)
  }, [])

  const nextId = bars.length ? Math.max(...bars.map((b) => b.id)) + 1 : 1

  const ingest = useCallback((newBars) => setBars((prev) => [...prev, ...newBars]), [])

  const importLines = useCallback((lines) => {
    let id = bars.length ? Math.max(...bars.map((b) => b.id)) + 1 : 1
    const accepted = []
    let skipped = 0
    for (const line of lines) {
      const out = processBar(line, { tag: 'مستورد', gridType: '16', id, lex: lexRef.current })
      if (out.bar) { accepted.push(out.bar); id++ } else skipped++
    }
    if (accepted.length) setBars((prev) => [...prev, ...accepted])
    toast(skipped ? `استُورد ${accepted.length} · تُخطّي ${skipped} (يحتاج تشكيل)` : `استُورد ${accepted.length} بار`)
  }, [bars, toast])

  const sendToMetronome = useCallback((list) => {
    const segs = []
    for (const b of list) {
      b.words.forEach((w, wi) => {
        w.syllables.forEach((s, si) => {
          const gi = b.syllables.indexOf(s)
          segs.push({
            text: s.text,
            weight: s.weight,
            stressed: b.stressIndices.includes(gi),
            barId: b.id,
            wordIndex: wi,
            wordStart: si === 0,
          })
        })
      })
    }
    setSegments(segs)
    setMetroSource(`${list.length} بار · ${segs.length} مقطع · ${Math.ceil(list.length / 4)} رباعية`)
    setTab('metro')
    toast(`أُرسل ${list.length} بار إلى الميترونوم`)
  }, [toast])

  const totalSyl = bars.reduce((a, b) => a + b.sylCount, 0)
  const uniqueRawi = new Set(bars.map((b) => b.rhyme?.rawi).filter(Boolean)).size

  const TABS = [
    ['inject', 'الحقن الدفعي', null],
    ['db', 'قاعدة البيانات', bars.length],
    ['groups', 'التجميع الذكي', null],
    ['metro', 'ميترونوم الكلمات', null],
  ]

  return (
    <div className="br-screen">
      <div className="br-stats">
        <span className="br-pill mono">البارات <b>{bars.length}</b></span>
        <span className="br-pill mono">المقاطع <b>{totalSyl}</b></span>
        <span className="br-pill mono">قوافي فريدة <b>{uniqueRawi}</b></span>
      </div>

      <nav className="br-tabs">
        {TABS.map(([id, label, count]) => (
          <button key={id} className={`br-tab${tab === id ? ' on' : ''}`} onClick={() => setTab(id)}>
            {label}{count != null && <span className="br-tab-c mono">{count}</span>}
          </button>
        ))}
      </nav>

      {tab === 'inject' && <InjectTab lex={lexRef.current} nextId={nextId} onIngest={ingest} toast={toast} />}
      {tab === 'db' && (
        <DatabaseTab bars={bars} sel={sel} setSel={setSel} onOpen={setDetail}
          onSendToMetronome={sendToMetronome} onImport={importLines} toast={toast} />
      )}
      {tab === 'groups' && <GroupsTab bars={bars} onSendToMetronome={sendToMetronome} />}
      {tab === 'metro' && <MetronomeTab segments={segments} sourceLabel={metroSource} />}

      {detail && (
        <DetailModal bar={detail} pool={bars} onClose={() => setDetail(null)} onSendToMetronome={sendToMetronome} />
      )}

      {toastMsg && <div className="br-toast">{toastMsg}</div>}
    </div>
  )
}

import { useState } from 'react'
import Coach from './Coach.jsx'
import { weightFingerprint, getRawi, lastWord, normalize } from './lib/rhyme.js'

/* بنك تمرين التقطيع — كلمات مشكولة وبصمتها المحسوبة بنفس محرك التطبيق (اتساق مضمون) */
const TAQTEE_BANK = [
  'مَكْتُوبْ', 'قَلْبِي', 'سَلَامْ', 'دَرْبْ', 'كَلِمَهْ', 'حُرُوفْ', 'شَارِعْ', 'مَوَّالْ',
].map((w) => ({ word: w, fp: weightFingerprint(w).fp }))

/* بنك تمرين الروي — بارات قصيرة وخيارات */
const RAWI_BANK = [
  { bar: 'الليل طال والحبر في إيدي كتاب', options: ['ب', 'ت', 'ك'] },
  { bar: 'صوتي صدى في الحواري القديمة', options: ['م', 'ه', 'ق'] },
  { bar: 'ماشي وحيد والطريق موحش وطويل', options: ['ل', 'ط', 'و'] },
  { bar: 'كل الوجوه هنا شبه بعضها ظلال', options: ['ل', 'ظ', 'ض'] },
  { bar: 'أكتب جراحي على الجدران نقوش', options: ['ش', 'ن', 'ق'] },
  { bar: 'من قاع مدينتي طالع صوتي رصاص', options: ['ص', 'ر', 'ع'] },
].map((x) => ({ ...x, correct: getRawi(lastWord(normalize(x.bar))) }))

function TaqteeExercise({ onScore }) {
  const [idx, setIdx] = useState(0)
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState(null) // null | true | false
  const item = TAQTEE_BANK[idx % TAQTEE_BANK.length]

  function check() {
    const okAns = answer === item.fp
    setResult(okAns)
    onScore(okAns)
  }
  function next() {
    setIdx(idx + 1); setAnswer(''); setResult(null)
  }

  return (
    <div className="exercise wob">
      <h3>تمرين ١ — التقطيع</h3>
      <p className="gate-note">حوّل الكلمة لبصمة وزن: اضغط ● لكل متحرك و ▬ لكل ساكن أو مد (الشدة = ▬ ثم ●).</p>
      <div className="ex-word">{item.word}</div>
      <div className="ex-answer" dir="ltr">{answer || '...'}</div>
      <div className="ex-controls">
        <button className="conn-test-btn ex-key" onClick={() => { setAnswer(answer + '●'); setResult(null) }}>●</button>
        <button className="conn-test-btn ex-key" onClick={() => { setAnswer(answer + '▬'); setResult(null) }}>▬</button>
        <button className="mini-btn" onClick={() => { setAnswer(answer.slice(0, -1)); setResult(null) }}>تراجع</button>
        <button className="mini-btn" onClick={check} disabled={!answer}>تحقق</button>
        <button className="mini-btn" onClick={next}>التالي ←</button>
      </div>
      {result === true && <div className="conn-test-result ok"><span className="conn-test-icon">✓</span> مضبوطة! بصمة {item.word} هي {item.fp}</div>}
      {result === false && <div className="conn-test-result fail"><span className="conn-test-icon">✕</span> قرّب — الصحيح: <span dir="ltr">{item.fp}</span> — انطقها وطبطب الإيقاع</div>}
    </div>
  )
}

function RawiExercise({ onScore }) {
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState(null)
  const item = RAWI_BANK[idx % RAWI_BANK.length]

  function pick(letter) {
    setPicked(letter)
    onScore(letter === item.correct)
  }
  function next() { setIdx(idx + 1); setPicked(null) }

  return (
    <div className="exercise wob">
      <h3>تمرين ٢ — اصطياد الروي</h3>
      <p className="gate-note">الروي هو آخر حرف صحيح في البار (بعد تجاوز المدود وهاء الوصل). اصطده:</p>
      <div className="ex-bar">{item.bar}</div>
      <div className="ex-controls">
        {item.options.map((o) => (
          <button
            key={o}
            className={`conn-test-btn ex-key ${picked === o ? (o === item.correct ? 'ok' : 'no') : ''}`}
            onClick={() => pick(o)}
            disabled={picked !== null}
          >{o}</button>
        ))}
        <button className="mini-btn" onClick={next}>التالي ←</button>
      </div>
      {picked !== null && (picked === item.correct
        ? <div className="conn-test-result ok"><span className="conn-test-icon">✓</span> صيد موفق — الروي {item.correct}</div>
        : <div className="conn-test-result fail"><span className="conn-test-icon">✕</span> الروي الصحيح: {item.correct}</div>)}
    </div>
  )
}

/** تمرين ٣ — المحاذاة (المهارة الرابعة في السُّلَّم): توافق النبر مع ضربات البيت.
 * نافذة STRESS ↔ BEAT ALIGNMENT من هوية v3: صف الضربات ثابت، وصف النبر
 * تفاعلي (نقرة تدور: فارغ ← ● متحرك ← ▬ ساكن)، وخطوط تيل تصل كل توافق. */
const ALIGN_BEAT = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1]

function AlignmentExercise() {
  const [stress, setStress] = useState([1, 0, 2, 0, 1, 1, 2, 0, 1, 0, 2, 1, 1, 2, 0, 1])

  function cycle(i) {
    setStress((s) => s.map((v, j) => (j === i ? (v + 1) % 3 : v)))
  }

  const hits = stress.filter((v, i) => v && ALIGN_BEAT[i]).length
  const total = stress.filter(Boolean).length
  const pct = total ? Math.round((hits / total) * 100) : 0
  const verdict = pct >= 80 ? '● STRONG' : pct >= 55 ? '◐ FAIR' : '○ WEAK'

  const W = 400, H = 190, cw = W / 16

  return (
    <div className="exercise wob">
      <h3>تمرين ٣ — المحاذاة</h3>
      <p className="gate-note">
        بار موزون داخليًا لا يكفي — الثقل ▬ لازم يقع على ضربة البيت ليطق الفلو.
        انقر أي عمود لتغيير نبره (فارغ ← ● ← ▬) وراقب نسبة التوافق.
      </p>
      <div className="align-well">
        <svg viewBox={`0 0 ${W} ${H}`} className="align-svg" role="img" aria-label="توافق النبر مع الضربات">
          {Array.from({ length: 17 }).map((_, i) => (
            <line key={i} x1={i * cw} y1={0} x2={i * cw} y2={H} stroke={`rgba(255,255,255,${i % 4 ? 0.04 : 0.1})`} />
          ))}
          {ALIGN_BEAT.map((b, i) => b ? (
            <rect key={`b${i}`} x={i * cw + 4} y={34} width={cw - 8} height={26} rx={4}
              fill="#8B5CF6" opacity=".9" style={{ filter: 'drop-shadow(0 0 6px #8B5CF6)' }} />
          ) : null)}
          {stress.map((v, i) => {
            if (v === 1) return <circle key={`s${i}`} cx={i * cw + cw / 2} cy={118} r={9} fill="#FF9F1C" style={{ filter: 'drop-shadow(0 0 7px #FF9F1C)' }} />
            if (v === 2) return <rect key={`s${i}`} x={i * cw + 5} y={112} width={cw - 10} height={12} rx={3} fill="#F2C14E" style={{ filter: 'drop-shadow(0 0 7px #F2C14E)' }} />
            return null
          })}
          {stress.map((v, i) => (v && ALIGN_BEAT[i]) ? (
            <line key={`m${i}`} x1={i * cw + cw / 2} y1={62} x2={i * cw + cw / 2} y2={106}
              stroke="#19D3C5" strokeWidth={2.5} strokeDasharray="3 3" style={{ filter: 'drop-shadow(0 0 5px #19D3C5)' }} />
          ) : null)}
          <text x={6} y={24} fontFamily="Cairo" fontSize={11} fontWeight={800} fill="#98A2A8">ضربات البيت</text>
          <text x={6} y={150} fontFamily="Cairo" fontSize={11} fontWeight={800} fill="#98A2A8">نبر السطر ● ▬</text>
          <text x={6} y={180} fontFamily="Space Mono" fontSize={9} fill="#59636A">MUTAHARRIK ● / SAKIN ▬ · 16-GRID</text>
          {Array.from({ length: 16 }).map((_, i) => (
            <rect key={`h${i}`} x={i * cw} y={0} width={cw} height={H} fill="transparent"
              style={{ cursor: 'pointer' }} onClick={() => cycle(i)} />
          ))}
        </svg>
      </div>
      <div className="align-foot">
        <span className="band" style={{ '--bc': 'var(--violet)' }} title="ضربة" />
        <span className="band" style={{ '--bc': 'var(--mango)' }} title="متحرك ●" />
        <span className="band" style={{ '--bc': 'var(--gold)' }} title="ساكن ▬" />
        <span className="band" style={{ '--bc': 'var(--teal)' }} title="توافق" />
        <span className="align-verdict mono">MATCH {pct}% {verdict}</span>
      </div>
    </div>
  )
}

export default function TrainingScreen() {
  const [score, setScore] = useState({ right: 0, total: 0 })
  const onScore = (ok) => setScore((s) => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1 }))

  return (
    <div className="training">
      <div className="score-chip">
        النتيجة: <span className="mono">{score.right} / {score.total}</span>
      </div>
      <TaqteeExercise onScore={onScore} />
      <RawiExercise onScore={onScore} />
      <AlignmentExercise />
      <p className="gate-note">التمارين تستخدم نفس محرك التطبيق — ما تتعلمه هنا هو حرفيًا ما يقيسه الاستوديو. مستويات أعلى ومسارات معزولة حقيقية قادمة مع المرحلة 6 الكاملة.</p>
      <Coach />
    </div>
  )
}

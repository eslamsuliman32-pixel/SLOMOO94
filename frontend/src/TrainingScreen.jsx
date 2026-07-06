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
      <p className="gate-note">التمارين تستخدم نفس محرك التطبيق — ما تتعلمه هنا هو حرفيًا ما يقيسه الاستوديو. مستويات أعلى ومسارات معزولة حقيقية قادمة مع المرحلة 6 الكاملة.</p>
      <Coach />
    </div>
  )
}

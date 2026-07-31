import { useEffect, useMemo, useState } from 'react'
import { weightFingerprint, getRawi, lastWord, normalize } from './lib/rhyme.js'
import { useBarRepositoryStore } from './state/barRepositoryStore.js'

/* بنك احتياطي — يُستخدم فقط حين لا يكفي مستودع البارات الحقيقي بعد لبناء تمرين مفيد */
const FALLBACK_TAQTEE = [
  'مَكْتُوبْ', 'قَلْبِي', 'سَلَامْ', 'دَرْبْ', 'كَلِمَهْ', 'حُرُوفْ', 'شَارِعْ', 'مَوَّالْ',
].map((w) => ({ word: w, fp: weightFingerprint(w).fp }))

const FALLBACK_RAWI = [
  { bar: 'الليل طال والحبر في إيدي كتاب', options: ['ب', 'ت', 'ك'] },
  { bar: 'صوتي صدى في الحواري القديمة', options: ['م', 'ه', 'ق'] },
  { bar: 'ماشي وحيد والطريق موحش وطويل', options: ['ل', 'ط', 'و'] },
  { bar: 'كل الوجوه هنا شبه بعضها ظلال', options: ['ل', 'ظ', 'ض'] },
  { bar: 'أكتب جراحي على الجدران نقوش', options: ['ش', 'ن', 'ق'] },
  { bar: 'من قاع مدينتي طالع صوتي رصاص', options: ['ص', 'ر', 'ع'] },
].map((x) => ({ ...x, correct: getRawi(lastWord(normalize(x.bar))) }))

/* حروف مُشتِّتة لبناء خيارات تمرين الروي على بارات حقيقية — لا رأي لها في الإجابة الصحيحة */
const DISTRACTOR_LETTERS = [
  'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض',
  'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي',
]

function buildRawiOptions(correct) {
  const pool = DISTRACTOR_LETTERS.filter((l) => l !== correct)
  const picked = []
  while (picked.length < 2 && pool.length) {
    const i = Math.floor(Math.random() * pool.length)
    picked.push(pool.splice(i, 1)[0])
  }
  return [correct, ...picked].sort(() => Math.random() - 0.5)
}

/** يبني بنك تقطيع من كلمات البارات الحقيقية في المستودع (مُشكَّلة أصلاً — شرط القبول عند الحقن) */
function buildTaqteePool(bars) {
  const seen = new Map()
  for (const b of bars) {
    for (const w of b.words || []) {
      const word = w.text?.trim()
      if (!word || word.length < 2 || seen.has(word)) continue
      seen.set(word, weightFingerprint(word).fp)
    }
  }
  return [...seen.entries()].map(([word, fp]) => ({ word, fp }))
}

/** يبني بنك روي من البارات الحقيقية — الإجابة الصحيحة محسوبة سلفاً ضمن رحلة الحقن (b.rhyme.rawi) */
function buildRawiPool(bars) {
  return bars
    .filter((b) => b.rhyme?.rawi)
    .map((b) => ({ bar: b.raw, correct: b.rhyme.rawi, options: buildRawiOptions(b.rhyme.rawi) }))
}

function TaqteeExercise({ pool, onScore }) {
  const [idx, setIdx] = useState(0)
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState(null) // null | true | false
  useEffect(() => { setIdx(0); setAnswer(''); setResult(null) }, [pool])
  const item = pool[idx % pool.length]

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

function RawiExercise({ pool, onScore }) {
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState(null)
  useEffect(() => { setIdx(0); setPicked(null) }, [pool])
  const item = pool[idx % pool.length]

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

/* الحد الأدنى من العناصر الحقيقية قبل الاعتماد عليها بدل البنك الاحتياطي */
const MIN_POOL_SIZE = 4

export default function TrainingScreen() {
  const [score, setScore] = useState({ right: 0, total: 0 })
  const onScore = (ok) => setScore((s) => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1 }))

  const bars = useBarRepositoryStore((s) => s.bars)

  const realTaqtee = useMemo(() => buildTaqteePool(bars), [bars])
  const realRawi = useMemo(() => buildRawiPool(bars), [bars])

  const taqteePool = realTaqtee.length >= MIN_POOL_SIZE ? realTaqtee : FALLBACK_TAQTEE
  const rawiPool = realRawi.length >= MIN_POOL_SIZE ? realRawi : FALLBACK_RAWI
  const usingRealData = taqteePool === realTaqtee || rawiPool === realRawi

  return (
    <div className="training">
      <div className="score-chip">
        النتيجة: <span className="mono">{score.right} / {score.total}</span>
      </div>
      {usingRealData && (
        <p className="gate-note">التمارين الآن تسحب من بارات مستودعك الحقيقي (المستودع المعرفي) بدل عيّنة ثابتة، كلما توفّر عدد كافٍ منها.</p>
      )}
      <TaqteeExercise pool={taqteePool} onScore={onScore} />
      <RawiExercise pool={rawiPool} onScore={onScore} />
      <p className="gate-note">التمارين تستخدم نفس محرك التطبيق — ما تتعلمه هنا هو حرفيًا ما يقيسه الاستوديو. مستويات أعلى ومسارات معزولة حقيقية قادمة مع المرحلة 6 الكاملة.</p>
    </div>
  )
}

import { useState } from 'react'

/** رسم شبكة الضربات كزين: خط زمن حبري، downbeats ثقيلة، سلوتات بتظليل ماركر */
function BeatGrid({ profile }) {
  const beats = profile?.rhythm?.beats || []
  const slots = profile?.slots || []
  const dur = profile?.meta?.duration_sec || (beats.length ? beats[beats.length - 1].t + 1 : 1)
  const W = 800, H = 150, PAD = 14
  const x = (t) => PAD + (t / dur) * (W - PAD * 2)
  const energy = profile?.energy?.curve || []
  const eRes = profile?.energy?.resolution_sec || 0.25

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="beatgrid" role="img" aria-label="شبكة الضربات">
      {/* منحنى الطاقة كتظليل رصاصي خلفي */}
      {energy.length > 1 && (
        <polyline
          points={energy.map((v, i) => `${x(i * eRes)},${H - 24 - v * 70}`).join(' ')}
          fill="none" stroke="rgba(24,21,18,0.25)" strokeWidth="2" strokeLinejoin="round"
        />
      )}
      {/* السلوتات: مستطيلات ماركر ذهبي */}
      {slots.map((s) => (
        <rect key={s.id}
          x={x(s.start)} y={38} width={Math.max(2, x(s.start + s.duration) - x(s.start))} height={64}
          fill="rgba(212,175,55,0.28)" stroke="rgba(212,175,55,0.9)" strokeWidth="1.5" rx="3"
        >
          <title>{`سلوت ${s.duration}ث — سعة ${s.capacity_syllables?.min}-${s.capacity_syllables?.max} مقاطع`}</title>
        </rect>
      ))}
      {/* خط الزمن */}
      <line x1={PAD} y1={H - 24} x2={W - PAD} y2={H - 24} stroke="#181512" strokeWidth="2.5" strokeLinecap="round" />
      {/* الضربات */}
      {beats.map((b, i) => (
        <line key={i}
          x1={x(b.t)} y1={b.type === 'downbeat' ? 30 : 52}
          x2={x(b.t)} y2={H - 24}
          stroke={b.type === 'downbeat' ? '#181512' : 'rgba(24,21,18,0.55)'}
          strokeWidth={b.type === 'downbeat' ? 3 : 1.6}
          strokeLinecap="round"
        />
      ))}
      {/* أرقام البارات على الـdownbeats */}
      {beats.filter((b) => b.type === 'downbeat').map((b) => (
        <text key={b.bar} x={x(b.t)} y={22} textAnchor="middle"
          fontFamily="Space Mono" fontSize="11" fill="#D64524">{b.bar}</text>
      ))}
    </svg>
  )
}

export default function AnalysisScreen() {
  const [profile, setProfile] = useState(null)
  const [err, setErr] = useState('')

  function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setErr('')
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const p = JSON.parse(reader.result)
        if (p.schema_version !== 1 || !p.rhythm?.beats) {
          setErr('الملف ليس Beat Profile صالحًا (schema_version 1 مطلوب).')
          return
        }
        setProfile(p)
      } catch {
        setErr('تعذّرت قراءة الملف — تأكد أنه beat_profile.json من معمل التحليل.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="analysis">
      <div className="import-box wob">
        <h3>استيراد ملف بيت</h3>
        <p className="gate-note">
          حلّل تراكك في معمل Kaggle المجاني (الملف الجاهز: <span className="mono-inline">analysis-lab/beat_lab.py</span> في المستودع)
          ثم ارفع beat_profile.json الناتج هنا لترى شبكته.
        </p>
        <input type="file" accept=".json,application/json" onChange={onFile} className="file-input" />
        {err && <div className="conn-test-result fail"><span className="conn-test-icon">✕</span> {err}</div>}
      </div>

      {profile && (
        <div className="profile-view">
          <div className="profile-meta">
            <span className="rhyme-badge rhyme-c0">{profile.meta?.title}</span>
            <span className="rhyme-badge rhyme-c1">BPM {profile.rhythm?.bpm}</span>
            <span className="rhyme-badge rhyme-c3">{Math.round(profile.meta?.duration_sec || 0)} ثانية</span>
            <span className="rhyme-badge rhyme-c5">{(profile.slots || []).length} سلوت</span>
            {profile.stems?.vocals?.present && <span className="rhyme-badge rhyme-c2">فوكال مرجعي</span>}
          </div>
          <BeatGrid profile={profile} />
          <p className="gate-note">
            الخطوط الثقيلة downbeats (بداية كل بار)، الخفيفة ضربات، التظليل الذهبي فراغات قابلة للملء بالفلو،
            والخط الرمادي منحنى الطاقة. المس أي سلوت لمعرفة سعته بالمقاطع.
          </p>
        </div>
      )}
    </div>
  )
}

import React from 'react';
import { useDawra } from '../store/dawra.store';
import { PRESETS, HEEL_HINTS, HEEL_LABELS, ar } from '../constants';
import {
  seqSum, restTotal, grandTotal, isLocked, lockHint, vesselHint, CYCLE,
} from '../engine/cycle.engine';
import type { HeelPattern, AccentMode, GridKind } from '../types';

/* ══════════ شريط القفل — التوقيع ══════════ */
export const LockBar: React.FC = () => {
  const { seq, rest } = useDawra();
  const spoken = seqSum(seq);
  const silent = restTotal(seq, rest);
  const total = grandTotal(seq, rest);
  const ok = isLocked(seq, rest);

  const badge = ok
    ? 'الجملة مقفولة'
    : total > CYCLE
      ? `فائض ${ar(total - CYCLE)}`
      : `ناقص ${ar(CYCLE - total)}`;

  return (
    <div className={`lockbar ${ok ? 'ok' : 'no'}`} role="status" aria-live="polite">
      <div className="eq">
        <b className="sp">{spoken}</b> + <b className="rs">{silent}</b> ={' '}
        <b className="tt">{total}</b>
      </div>
      <div className="bd">{badge}</div>
    </div>
  );
};

/* ══════════ الوعاء — المعايرة ══════════ */
export const VesselCard: React.FC = () => {
  const { bpm, grid, lean, setBpm, setGrid, setLean } = useDawra();

  return (
    <div className="card">
      <h2>الوعاء</h2>
      <p className="sub">اضبط السرعة ونوع الشبكة. النظام يحسب كم بار تحتاج لتخلّص جملتك.</p>

      <div className="fld">
        <label htmlFor="d-bpm">السرعة <b className="mono">{bpm} BPM</b></label>
        <input id="d-bpm" type="range" min={60} max={180} value={bpm}
               onChange={(e) => setBpm(+e.target.value)} />
      </div>

      <div className="fld">
        <label>نوع الشبكة</label>
        <div className="seg" role="radiogroup" aria-label="نوع الشبكة">
          {([16, 12] as GridKind[]).map((g) => (
            <button key={g} role="radio" aria-checked={grid === g}
                    className={grid === g ? 'on' : ''} onClick={() => setGrid(g)}>
              {ar(g)} · {g === 16 ? 'عادي' : 'ثلاثيات'}
            </button>
          ))}
        </div>
        <p className="hint">{vesselHint(grid)}</p>
      </div>

      <div className="fld">
        <label htmlFor="d-lean">
          الميلان <b className="mono">{lean > 0 ? '+' : ''}{lean} ms</b>
        </label>
        <input id="d-lean" type="range" min={-40} max={45} value={lean}
               onChange={(e) => setLean(+e.target.value)} />
        <p className="hint">
          موجب = <em>اتّكاء</em> خلف النبضة (تكاسل) · سالب = <em>اندفاع</em> أمامها (عدوانية).
        </p>
      </div>
    </div>
  );
};

/* ══════════ منحنى الطاقة ══════════ */
export const EnergyCurveCard: React.FC = () => {
  const { seq, rest, presetIdx, applyPreset, setSeqText, setRest } = useDawra();
  const [draft, setDraft] = React.useState(seq.join('-'));

  React.useEffect(() => { setDraft(seq.join('-')); }, [seq]);

  return (
    <div className="card">
      <h2>منحنى الطاقة</h2>
      <p className="sub">
        اختر شكل جملتك <b style={{ color: 'var(--d-gold)' }}>قبل</b> أن تكتب حرفاً.
        كل رقم = جملة بعدد مقاطعها.
      </p>

      <div className="fld">
        <label>القوالب الجاهزة</label>
        <div className="chips">
          {PRESETS.map((p, i) => (
            <button key={p.n} className={`chip ${presetIdx === i ? 'on' : ''}`}
                    title={p.desc} onClick={() => applyPreset(i)}>
              {p.n}
            </button>
          ))}
        </div>
      </div>

      <div className="fld">
        <label htmlFor="d-seq">المنحنى <b className="mono">Σ {seqSum(seq)}</b></label>
        <input id="d-seq" type="text" value={draft} dir="ltr"
               onChange={(e) => { setDraft(e.target.value); setSeqText(e.target.value); }} />
      </div>

      <div className="fld">
        <label htmlFor="d-rest">مسافة السكوت <b className="mono">{ar(rest)} خانة</b></label>
        <input id="d-rest" type="range" min={0} max={12} value={rest}
               onChange={(e) => setRest(+e.target.value)} />
        <p className="hint">{lockHint(seq, rest)}</p>
      </div>
    </div>
  );
};

/* ══════════ العقب واللسان ══════════ */
export const HeelLisanCard: React.FC = () => {
  const { heel, acc, setHeel, setAcc } = useDawra();
  const heels: HeelPattern[] = ['std', 'dsp', 'alt', 'mul'];
  const accs: Array<{ v: AccentMode; l: string }> = [
    { v: '332', l: '٣-٣-٢' },
    { v: 'beat', l: 'مع الطبول' },
    { v: 'off', l: 'مُطفأ' },
  ];

  return (
    <div className="card">
      <h2>العقب واللسان</h2>
      <p className="sub">العقب = مكان هبوط القافية. اللسان = الإيقاع الطبيعي للكلام العربي.</p>

      <div className="fld">
        <label>نمط العقب</label>
        <div className="seg" role="radiogroup" aria-label="نمط العقب">
          {heels.map((h) => (
            <button key={h} role="radio" aria-checked={heel === h}
                    className={heel === h ? 'on' : ''} onClick={() => setHeel(h)}>
              {HEEL_LABELS[h]}
            </button>
          ))}
        </div>
        <p className="hint">{HEEL_HINTS[heel]}</p>
      </div>

      <div className="fld">
        <label>إيقاع اللسان</label>
        <div className="seg" role="radiogroup" aria-label="إيقاع اللسان">
          {accs.map((a) => (
            <button key={a.v} role="radio" aria-checked={acc === a.v}
                    className={acc === a.v ? 'on' : ''} onClick={() => setAcc(a.v)}>
              {a.l}
            </button>
          ))}
        </div>
        <p className="hint">
          الخيط <em>الذهبي</em> نبر اللسان · الخيط{' '}
          <em style={{ color: 'var(--d-drum)' }}>البنفسجي</em> نبض الطبول.
          يلتقيان عند <b>١</b> و<b>٩</b> فقط — والتصارع بينهما هو مصدر الطاقة.
        </p>
      </div>
    </div>
  );
};

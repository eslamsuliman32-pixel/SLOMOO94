import React from 'react';
import { useDawra } from '../store/dawra.store';
import { ar, HEEL_LABELS } from '../constants';
import { healthMetrics } from '../engine/cycle.engine';
import { isDiacritized } from '../engine/syllable.engine';
import { useRepo } from './RepoProvider';
import type { Bar } from '../types';

/* ══════════ محرر المقاطع ══════════ */
export const SyllableEditor: React.FC = () => {
  const { text, syls, setText, setSylSpan, removeSyl, clearText } = useDawra();
  const undiac = text.trim().length > 0 && !isDiacritized(text);

  return (
    <div className="card">
      <h2>المقاطع</h2>
      <p className="sub">
        اكتب البار. المقطع الممدود يأخذ <b style={{ color: 'var(--d-gold)' }}>خانتين</b>{' '}
        تلقائياً — والسهمان يتجاوزان القرار يدوياً.
      </p>

      <textarea rows={2} value={text} placeholder="اكتب باراً هنا…"
                onChange={(e) => setText(e.target.value)} aria-label="نص البار" />

      <div className="chips" style={{ marginTop: 10 }}>
        <button className="chip" onClick={clearText}>تفريغ</button>
      </div>

      <div className="syls">
        {syls.length === 0 && (
          <span style={{ color: 'var(--d-dim2)', fontSize: 12.5 }}>لا توجد مقاطع بعد.</span>
        )}
        {syls.map((s, i) => (
          <span className={`sc ${s.k}`} key={`${s.t}-${i}`}>
            <span>{s.t}</span>
            <i>{s.u}</i>
            <button onClick={() => setSylSpan(i, 1)} title="خانة واحدة" aria-label="خانة واحدة">◂</button>
            <button onClick={() => setSylSpan(i, 2)} title="خانتان" aria-label="خانتان">▸</button>
            <button onClick={() => removeSyl(i)} title="حذف" aria-label="حذف">×</button>
          </span>
        ))}
      </div>

      {undiac && (
        <div className="warnd">
          النص بلا تشكيل — دقة التقطيع{' '}
          <b className="mono" style={{ color: 'var(--d-pulse)' }}>~٧٠٪</b>.
          شكّل النص لترفعها إلى{' '}
          <b className="mono" style={{ color: 'var(--d-lcd)' }}>~٩٥٪</b>،
          أو صحّح كل مقطع بالسهمين. <b>التفاوض قرار بشري، لا خوارزمية.</b>
        </div>
      )}
    </div>
  );
};

/* ══════════ لوحة المستودع — البوابة الواحدة ══════════ */
export const RepoPanel: React.FC = () => {
  const repo = useRepo();
  const { seq, grid, heel, loadBar } = useDawra();
  const [bars, setBars] = React.useState<Bar[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [tick, setTick] = React.useState(0);

  const need = seq[0] ?? 4;
  const lo = Math.max(1, need - 2);
  const hi = need + 3;

  React.useEffect(() => {
    if (!repo.subscribe) return;
    return repo.subscribe(() => setTick((t) => t + 1));
  }, [repo]);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    // البوابة الواحدة — نفس الاستعلام الذي تستخدمه كل أدوات مقام
    repo
      .query({ syl: [lo, hi], grid, limit: 12 })
      .then((r) => { if (alive) setBars(r); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [repo, lo, hi, grid, tick]);

  return (
    <div className="card">
      <h2>مستودع البارات</h2>
      <p className="sub">البوابة الواحدة — نفس الاستعلام الذي تستخدمه كل أدوات مقام.</p>

      <div className="qbar">
        <span className="q">المقاطع <b>{ar(lo)}–{ar(hi)}</b></span>
        <span className="q">الشبكة <b>{ar(grid)}</b></span>
        <span className="q">العقب <b>{HEEL_LABELS[heel]}</b></span>
        <span className="q">النتائج <b>{ar(bars.length)}</b></span>
      </div>

      <div className="rlist">
        {loading && <div className="empty">جارٍ الاستعلام…</div>}
        {!loading && bars.length === 0 && (
          <div className="empty">لا بارات مطابقة — وسّع المنحنى.</div>
        )}
        {!loading && bars.map((b) => (
          <button className="rb" key={b.id} onClick={() => loadBar(b)}>
            <span className="fam" style={{ background: `var(--${b.fam})` }} />
            <span className="txt">{b.text}</span>
            <span className="meta">
              <span><b>{ar(b.syl)}</b> مقطع</span>
              <span><b>{ar(b.cells)}</b> خانة</span>
              <span>σ <b>{b.vSigma}</b></span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

/* ══════════ مؤشرات الصحّة ══════════ */
export const HealthMetrics: React.FC = () => {
  const state = useDawra();
  const metrics = React.useMemo(
    () => healthMetrics(state.nodes, state.config(), state.syls),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.nodes, state.syls, state.grid, state.seq, state.rest, state.heel, state.acc, state.lean]
  );

  return (
    <div className="mts">
      {metrics.map((m) => (
        <div className={`mt ${m.status}`} key={m.key}>
          <div className="k">{m.label}</div>
          <div className="n mono">{m.value}</div>
          <div className="b">
            <i style={{ width: `${Math.min(100, Math.max(0, m.ratio * 100))}%` }} />
          </div>
          <div className="s">{m.note}</div>
        </div>
      ))}
    </div>
  );
};

import React from 'react';
import { useDawra } from '../store/dawra.store';
import { ar, BARS } from '../constants';
import {
  barArcs, heelSteps, isAnchor, isDrum, isFreeBar, stepsPerBeat,
} from '../engine/cycle.engine';
import type { Node, GridKind } from '../types';

/**
 * الرباعية — وحدة العمل الظاهرة (قرار س١).
 * ٤ بارات دائماً. على شبكة ١٦ يُوسَم البار الرابع «مساحة القفلة».
 *
 * الأيقونات الموحّدة (SPEC-04 §3.3):
 *   ▲ ذهبي فوق الخانة  = نبر
 *   ▼ وردي أسفل الخانة = عقب القافية
 *   ⌐‾¬ قوس مرقّم       = تجميع (الرقم = عدد المقاطع)
 *   عمود متدرّج الارتفاع = القوة ٠–٣ (ارتفاع + رقم + لون معاً)
 */

interface CellProps {
  node: Node;
  index: number;
  step: number;
  grid: GridKind;
  isNow: boolean;
  isHeel: boolean;
  anchor: boolean;
  drum: boolean;
  onPower: (i: number) => void;
  onStress: (i: number) => void;
}

const Cell = React.memo<CellProps>(function Cell({
  node, index, step, grid, isNow, isHeel, anchor, drum, onPower, onStress,
}) {
  const cls = [
    'cell',
    (step - 1) % stepsPerBeat(grid) === 0 ? 'beat' : '',
    anchor ? 'anchor' : '',
    drum ? 'drum' : '',
    isHeel ? 'heel' : '',
    isNow ? 'now' : '',
  ].filter(Boolean).join(' ');

  /** النقر أعلى الخانة (١٥ بكسل) = نبر · باقي الخانة = دورة القوة */
  const handle = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (e.clientY - r.top < 15) onStress(index);
    else onPower(index);
  };

  return (
    <div className={cls} data-i={index} onClick={handle} role="gridcell"
         aria-label={`خانة ${step}، القوة ${node.v}`}>
      <div className={`blk v${node.v}`}
           style={{ transform: `translateX(${-(node.mu / 50) * 26}%)` }}>
        <span className="n">{node.v}</span>
        {node.v >= 2 && <span className="tri-up" aria-hidden />}
      </div>
      {isHeel && <span className="tri-dn" aria-hidden />}
    </div>
  );
});

export const QuatrainGrid: React.FC = () => {
  const {
    nodes, grid, heel, acc, step, playing,
    cycleNodePower, toggleNodeStress, setPlaying,
  } = useDawra();

  return (
    <div className="stage">
      <div className="sbar">
        <h2>الرباعية</h2>
        <button className={`play ${playing ? 'on' : ''}`}
                onClick={() => setPlaying(!playing)}>
          {playing ? '■ إيقاف' : '▶ تشغيل'}
        </button>
        <span style={{ fontSize: '11.5px', color: 'var(--d-dim2)' }}>
          اضغط الخانة لتغيير القوة · اضغط فوقها لوضع نبر
        </span>
      </div>

      <div className="grid-host">
        {Array.from({ length: BARS }, (_, b) => {
          const free = isFreeBar(b, grid);
          const heels = heelSteps(b, grid, heel);
          const arcs = barArcs(nodes, b, grid);
          const cols = `repeat(${grid},1fr)`;

          return (
            <div className="qrow" key={b}>
              <div className="qlab">
                <b>بار {ar(b + 1)}</b>
                <i>{b * grid + 1}–{(b + 1) * grid}</i>
                {free && <u>القفلة</u>}
              </div>

              <div style={{ flex: 1 }}>
                {/* الأقواس المرقّمة */}
                <div className="arc-host" aria-hidden>
                  {arcs.map((a, k) => (
                    <div className="arc" key={k}
                         style={{
                           insetInlineStart: `${(a.start * 100) / grid}%`,
                           width: `${(a.len * 100) / grid}%`,
                         }}>
                      <span>{ar(a.len)}</span>
                    </div>
                  ))}
                </div>

                {/* الخانات */}
                <div className={`cells ${free ? 'free' : ''}`}
                     style={{ gridTemplateColumns: cols }} role="row">
                  {Array.from({ length: grid }, (_, s0) => {
                    const s = s0 + 1;
                    const i = b * grid + s0;
                    const nd = nodes[i] ?? { v: 0, g: -1, head: false, mu: 0, syl: '', ext: false };
                    return (
                      <Cell key={i} node={nd} index={i} step={s} grid={grid}
                            isNow={step === i}
                            isHeel={heels.includes(s) && !free}
                            anchor={isAnchor(s, grid, acc)}
                            drum={isDrum(s, grid)}
                            onPower={cycleNodePower}
                            onStress={toggleNodeStress} />
                    );
                  })}
                </div>

                {/* الشريط الناطق */}
                <div className="strip" style={{ gridTemplateColumns: cols }} aria-hidden>
                  {Array.from({ length: grid }, (_, s0) => {
                    const nd = nodes[b * grid + s0];
                    if (nd?.ext) return <div className="ext" key={s0}>ـ</div>;
                    return <div key={s0}>{nd?.syl ?? ''}</div>;
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="legend">
        <span className="lg"><span className="sw" style={{ border: '1px dashed var(--d-line2)' }} /> ٠ فراغ</span>
        <span className="lg"><span className="sw" style={{ background: 'var(--d-lcd)' }} /> ١ خفيف</span>
        <span className="lg"><span className="sw" style={{ background: 'var(--d-gold)' }} /> ٢ نبر</span>
        <span className="lg"><span className="sw" style={{ background: 'var(--d-pulse)' }} /> ٣ ضغط</span>
        <span className="lg"><span style={{ color: 'var(--d-gold)', fontSize: 14 }}>▲</span> نبر</span>
        <span className="lg"><span style={{ color: 'var(--d-pulse)', fontSize: 14 }}>▼</span> عقب القافية</span>
        <span className="lg"><span className="sw" style={{ background: 'var(--d-strip)' }} /> الشريط الناطق</span>
        <span className="lg">
          <span className="sw" style={{
            background: 'repeating-linear-gradient(135deg,var(--d-bg2) 0 4px,var(--d-bg1) 4px 8px)',
            border: '1px solid var(--d-line2)',
          }} /> مساحة القفلة
        </span>
      </div>
    </div>
  );
};

import React from 'react';
import { useDawra } from './store/dawra.store';
import { CycleScheduler } from './engine/audio.scheduler';
import { RepoProvider } from './components/RepoProvider';
import { LockBar, VesselCard, EnergyCurveCard, HeelLisanCard } from './components/Panels';
import { QuatrainGrid } from './components/QuatrainGrid';
import { SyllableEditor, RepoPanel, HealthMetrics } from './components/SidePanels';
import type { BarRepository } from './types';
import './styles/dawra.tokens.css';

/**
 * مقام · وحدة الدورة
 * SPEC-04 — الرباعية وحدة العمل، الدورة فحص القفل، المقطع وحدة القياس.
 *
 * الاستخدام:
 *   <Dawra />                        ← بذرة تجريبية
 *   <Dawra repo={dexieBarRepo} />    ← المستودع الحقيقي
 */
export interface DawraProps {
  repo?: BarRepository;
  /** إخفاء الرأس عند الإدراج داخل تبويب له عنوانه */
  bare?: boolean;
  className?: string;
}

const AudioBridge: React.FC = () => {
  const playing = useDawra((s) => s.playing);
  const setStep = useDawra((s) => s.setStep);
  const ref = React.useRef<CycleScheduler | null>(null);

  React.useEffect(() => {
    ref.current = new CycleScheduler({
      getNodes: () => useDawra.getState().nodes,
      getBpm: () => useDawra.getState().bpm,
      getGrid: () => useDawra.getState().grid,
      onStep: setStep,
    });
    return () => { ref.current?.dispose(); ref.current = null; };
  }, [setStep]);

  React.useEffect(() => {
    if (!ref.current) return;
    if (playing) ref.current.start();
    else ref.current.stop();
  }, [playing]);

  return null;
};

export const Dawra: React.FC<DawraProps> = ({ repo, bare = false, className = '' }) => (
  <RepoProvider repo={repo}>
    <div className={`dawra ${className}`}>
      <div className="wrap">
        {!bare && (
          <header>
            <div className="hrow">
              <div>
                <h1>الــ<span>دورة</span></h1>
                <p className="tag">
                  الرباعية <span className="mono">٦٤</span> خانة وحدة العمل ·
                  الدورة <span className="mono">٤٨</span> خانة فحص القفل ·
                  المقطع وحدة القياس
                </p>
              </div>
              <LockBar />
            </div>
          </header>
        )}
        {bare && <div style={{ paddingTop: 16 }}><LockBar /></div>}

        <div className="g3">
          <VesselCard />
          <EnergyCurveCard />
          <HeelLisanCard />
        </div>

        <QuatrainGrid />
        <HealthMetrics />

        <div className="g2">
          <SyllableEditor />
          <RepoPanel />
        </div>

        <p className="foot">
          مقام · SPEC-04 — الدورة &nbsp;·&nbsp; المقطع وحدة القياس، والمورا عرضه
          &nbsp;·&nbsp; لون واحد = معنى واحد &nbsp;·&nbsp; المستودع هو المصدر الوحيد
        </p>
      </div>
      <AudioBridge />
    </div>
  </RepoProvider>
);

export default Dawra;

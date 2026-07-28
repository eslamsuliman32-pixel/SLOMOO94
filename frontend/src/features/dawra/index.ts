/**
 * مقام · وحدة الدورة — نقطة التصدير الوحيدة
 * SPEC-04
 */

/* المكوّن */
export { Dawra, default } from './Dawra';
export type { DawraProps } from './Dawra';

/* المخزن */
export { useDawra } from './store/dawra.store';
export type { DawraState } from './store/dawra.store';

/* المحركات — قابلة لإعادة الاستخدام في أي أداة أخرى */
export {
  syllabify, scanBar, measure, isDiacritized, bare,
} from './engine/syllable.engine';
export {
  buildNodes, placeSyllables, healthMetrics, barArcs, heelSteps,
  isAnchor, isDrum, isFreeBar, isLocked, lockHint, suggestedRest,
  seqSum, restTotal, grandTotal, parseSequence, vesselHint,
} from './engine/cycle.engine';
export type { CycleConfig, Arc } from './engine/cycle.engine';
export { CycleScheduler } from './engine/audio.scheduler';

/* المستودع — البوابة الواحدة */
export {
  InMemoryBarRepo, DexieBarRepo, applyQuery, matches,
  SEED_BARS, createSeedRepo,
} from './repo/repo.gate';
export {
  fingerprint, makeBar, deriveVProfile, deriveStressMap, lisanMatch, stdDev,
} from './repo/fingerprint';
export { RepoProvider, useRepo } from './components/RepoProvider';

/* الثوابت */
export {
  CYCLE, BARS, PRESETS, LISAN, DRUM, THRESHOLDS, RHYME_FAMILIES,
  HEEL_HINTS, HEEL_LABELS, ICONS, POWER_LABELS,
  quatrainCells, freeCells, cycleBars, stepsPerBeat, crossing, ar,
} from './constants';

/* الأنواع */
export type * from './types';

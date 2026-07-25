// MAQAM · SPEC-03 — نقطة الدخول العامة لمستودع البارات (الطبقة الثانية)

export { processBar, hasTashkeel, gridSpecOf } from './repository.ts'
export { groupBars, groupKey, AXIS_LABEL } from './repository.ts'
export { filterBars, nearestBars } from './repository.ts'
export { buildRepoPayload, buildGridPayload, readRepoPayload, REPO_SCHEMA, GRID_PAYLOAD_SCHEMA } from './repository.ts'
export type { RepoBar, RepoWord, GridType, GroupAxis, BarGroup, RepoFilters, NeighbourMatch, ProcessOutcome } from './repository.ts'

export { extractRhyme } from './rhyme.ts'
export type { RhymeInfo } from './rhyme.ts'

export { classifyLayers } from './layers.ts'
export type { LayerMetrics, WeightProfile } from './layers.ts'

export { LETTERS, letterInfo, LONG_VOWELS } from './letterData.ts'
export type { ArticulationFamily, ArticulationType, LetterInfo } from './letterData.ts'

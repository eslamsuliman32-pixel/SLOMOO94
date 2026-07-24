// MAQAM · SPEC-02 (FINAL) — نقطة الدخول العامة لمطابِق البارات (الطبقة الأولى فوق SPEC-01)
// أربع دوال نقية + بنية فهرسة — §٦

export { matchScore, alignPartial, strictMatch } from './match.ts'
export { ingestBatch, buildIndex, findCandidates } from './repository.ts'
export { PHONETIC_MAP, ESTIMATED_PHONEMES, vectorOf, phoneticDistance, syllableVector } from './phoneticVectors.ts'
export { weightedEditDistance } from './align.ts'
export type * from './types.ts'

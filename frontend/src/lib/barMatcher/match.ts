// §٣ خوارزمية المطابقة الموزونة + §٤ أنماط المطابقة الثلاثة
// matchScore و alignPartial نقيتان تماماً — لا قراءة فهرس، لا حالة داخلية (§٩)

import { syllableVector, phoneticDistance } from './phoneticVectors.ts'
import { weightedEditDistance } from './align.ts'
import { fingerprint } from '../syllabifier/fingerprint.ts'
import type { BarFingerprint, MatchResult, MatchWeights, MoraWindow } from './types.ts'

/** §٤.١ مطابقة صارمة — O(1) عبر مقارنة hash */
export function strictMatch(a: BarFingerprint, b: BarFingerprint): boolean {
  return a.hash === b.hash
}

/** §٣ + §٤.٢ مطابقة تقريبية مرجَّحة كاملة — الدالة الأولى في واجهة الوحدة، §٦ */
export function matchScore(a: BarFingerprint, b: BarFingerprint, opts: MatchWeights): MatchResult {
  const { alignmentPath, metricScore } = weightedEditDistance(a.syllables, b.syllables)

  const dists: number[] = []
  const conflicts: MatchResult['conflicts'] = []

  for (const step of alignmentPath) {
    if (step.opType === 'ins' || step.opType === 'del') {
      conflicts.push({
        position: step.opType === 'del' ? step.i : step.j,
        reason: step.opType === 'del' ? 'مقطع في A بلا نظير في B' : 'مقطع في B بلا نظير في A',
      })
      continue
    }
    const vecA = syllableVector(a.syllables[step.i])
    const vecB = syllableVector(b.syllables[step.j])
    const d = phoneticDistance(vecA, vecB)
    dists.push(d)
    if (step.opType === 'sub' && d > 0.5) {
      conflicts.push({ position: step.i, reason: 'وزن متقارب لكن جرس صوتي متباعد' })
    }
  }

  // §٩: إن لم تُوجَد أي أزواج قابلة للمقارنة (بارَان بلا أي تقاطع بنيوي)، لا معلومة تشابه صوتي تُستَنتَج
  const phoneticScore = dists.length ? 1 - dists.reduce((s, d) => s + d, 0) / dists.length : 0

  const combined = opts.metricWeight * metricScore + opts.phoneticWeight * phoneticScore

  return { metricScore, phoneticScore, combined, alignmentPath, conflicts }
}

/**
 * §٤.٣ مطابقة جزئية/نافذة منزلقة — نفس محرّك matchScore تماماً، بمدخل مقصوص من query فقط.
 * window بمؤشرات المورا؛ يُترجَم داخلياً إلى نطاق مقاطع (تُشمَل المقاطع التي تتقاطع مع النطاق).
 */
export function alignPartial(
  query: BarFingerprint,
  window: MoraWindow,
  target: BarFingerprint,
  opts: MatchWeights = { metricWeight: 0.5, phoneticWeight: 0.5 },
): MatchResult {
  let cursor = 0
  const slice = query.syllables.filter((s) => {
    const start = cursor
    const end = cursor + s.weight
    cursor = end
    return end > window.start && start < window.end
  })
  const slicedFp = fingerprint(slice)
  return matchScore(slicedFp, target, opts)
}

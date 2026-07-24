// §٣.١ خطوة ١ — محاذاة إيقاعية: weightedEditDistance(moraString_A, moraString_B) → alignmentPath + metricScore
//
// المحاذاة تُحسَب على مستوى المقطع (لا الحرف الخام ● / ▬ منفرداً)، لأن alignmentPath يُستهلَك
// مباشرة في الخطوة ٢ كأزواج (syllable_i من A، syllable_j من B) — محاذاة حرفية خالصة كانت
// ستُنتج حدوداً تقطع مقطعاً واحداً بين خانتين مختلفتين، فتفقد المعنى للخطوة الصوتية اللاحقة.
// كلفة الاستبدال مشتقة من moraString كل مقطع (فرق الوزن)، فالمحور يبقى إيقاعياً بحتاً.

import type { Syllable } from '../syllabifier/types.ts'
import type { AlignmentStep } from './types.ts'

const INDEL_COST = 0.5

function subCost(a: Syllable, b: Syllable): number {
  if (a.moras.join('') === b.moras.join('')) return 0
  return Math.abs(a.weight - b.weight) / 2 // فرق الوزن الأقصى (3-1)/2 = 1.0
}

export interface WeightedEditResult {
  alignmentPath: AlignmentStep[]
  metricScore: number
  totalCost: number
}

export function weightedEditDistance(a: Syllable[], b: Syllable[]): WeightedEditResult {
  const M = a.length
  const N = b.length
  const dp: number[][] = Array.from({ length: M + 1 }, () => new Array(N + 1).fill(0))
  const back: ('match' | 'sub' | 'ins' | 'del')[][] = Array.from({ length: M + 1 }, () => new Array(N + 1).fill('match'))

  for (let i = 1; i <= M; i++) { dp[i][0] = dp[i - 1][0] + INDEL_COST; back[i][0] = 'del' }
  for (let j = 1; j <= N; j++) { dp[0][j] = dp[0][j - 1] + INDEL_COST; back[0][j] = 'ins' }

  for (let i = 1; i <= M; i++) {
    for (let j = 1; j <= N; j++) {
      const sc = subCost(a[i - 1], b[j - 1])
      const subOption = dp[i - 1][j - 1] + sc
      const delOption = dp[i - 1][j] + INDEL_COST
      const insOption = dp[i][j - 1] + INDEL_COST

      let best = subOption
      let op: 'match' | 'sub' | 'ins' | 'del' = sc === 0 ? 'match' : 'sub'
      if (delOption < best) { best = delOption; op = 'del' }
      if (insOption < best) { best = insOption; op = 'ins' }

      dp[i][j] = best
      back[i][j] = op
    }
  }

  const path: AlignmentStep[] = []
  let i = M
  let j = N
  while (i > 0 || j > 0) {
    const op = back[i][j]
    if (op === 'match' || op === 'sub') {
      path.push({ i: i - 1, j: j - 1, opType: op })
      i--; j--
    } else if (op === 'del') {
      path.push({ i: i - 1, j: -1, opType: 'del' })
      i--
    } else {
      path.push({ i: -1, j: j - 1, opType: 'ins' })
      j--
    }
  }
  path.reverse()

  const totalCost = dp[M][N]
  const normalizer = Math.max(1, Math.max(M, N))
  const metricScore = Math.max(0, Math.min(1, 1 - totalCost / normalizer))

  return { alignmentPath: path, metricScore, totalCost }
}

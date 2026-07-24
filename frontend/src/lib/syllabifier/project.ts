// §٥.٥ دالة الإسقاط (محاذاة، لا توزيع خطّي) — محاذاة أحادية الاتجاه (monotonic alignment)
// بين متتالية المورات ومتتالية الخانات، عبر برمجة ديناميكية. الترتيب محفوظ دوماً.

import { gridSlots } from './grid.ts'
import type { BarFingerprint, GridProjection, GridSpec, Mora, SlotAssignment, SlotTemplate } from './types.ts'

const W = { attack: 0.4, heavy: 0.3, gap: 0.2, rhyme: 0.1 }
const SKIP_COST = 0.05

interface MoraUnit {
  syllableId: string
  moraIndex: number
  symbol: Mora
  attack: number
  isRhymeLast: boolean
}

function flattenMoras(fp: BarFingerprint): MoraUnit[] {
  const units: MoraUnit[] = []
  for (const s of fp.syllables) {
    s.moras.forEach((symbol, k) => {
      units.push({
        syllableId: s.id,
        moraIndex: k,
        symbol,
        attack: k === 0 ? s.attack : s.attack * 0.5,
        isRhymeLast: s.isRhyme && k === s.weight - 1,
      })
    })
  }
  return units
}

function heavyPenalty(u: MoraUnit, strength: number): number {
  if (u.symbol !== '▬' || strength >= 0.35) return 0
  return (0.35 - strength) * 1.2
}

function rhymePenalty(u: MoraUnit, strength: number): number {
  if (!u.isRhymeLast || strength >= 0.7) return 0
  return 0.7 - strength
}

function costOf(unit: MoraUnit, slot: SlotTemplate, i: number, M: number, N: number): number {
  const target = M > 0 ? i * (N / M) : 0
  const gap = Math.abs(slot.index - target) / Math.max(1, N)
  return (
    W.attack * Math.abs(unit.attack - slot.strength) +
    W.heavy * heavyPenalty(unit, slot.strength) +
    W.gap * gap +
    W.rhyme * rhymePenalty(unit, slot.strength)
  )
}

/** يحاذي مورات البصمة على قوالب الخانات ببرمجة ديناميكية، بسعة أقصاها موراتان لكل خانة */
function align(units: MoraUnit[], slots: SlotTemplate[], capPerSlot: 2 | 3) {
  const M = units.length
  const N = slots.length
  const INF = Infinity
  const dp: number[][] = Array.from({ length: M + 1 }, () => new Array(N + 1).fill(INF))
  const back: (0 | 1 | 2)[][] = Array.from({ length: M + 1 }, () => new Array(N + 1).fill(0))
  dp[0][0] = 0

  for (let j = 1; j <= N; j++) {
    dp[0][j] = dp[0][j - 1] + SKIP_COST
    back[0][j] = 0
  }

  for (let j = 1; j <= N; j++) {
    const slot = slots[j - 1]
    for (let i = 0; i <= M; i++) {
      // خيار ١: اترك الخانة j فارغة
      let best = dp[i][j - 1] + SKIP_COST
      let choice: 0 | 1 | 2 = 0

      // خيار ٢: مورا واحدة في الخانة
      if (i >= 1) {
        const c1 = dp[i - 1][j - 1] + costOf(units[i - 1], slot, i - 1, M, N)
        if (c1 < best) { best = c1; choice = 1 }
      }
      // خيار ٣: موراتان في الخانة نفسها (نصف نقطة، للفلو السريع)
      if (i >= 2 && capPerSlot >= 2) {
        const c2 =
          dp[i - 2][j - 1] +
          costOf(units[i - 2], slot, i - 2, M, N) +
          costOf(units[i - 1], slot, i - 1, M, N)
        if (c2 < best) { best = c2; choice = 2 }
      }

      dp[i][j] = best
      back[i][j] = choice
    }
  }

  return { dp, back, M, N }
}

/** project(fp, grid) → GridProjection — الدالة الخامسة والأخيرة في خط الأنابيب، §٦ */
export function project(fp: BarFingerprint, grid: GridSpec): GridProjection {
  const slots = gridSlots(grid)
  const units = flattenMoras(fp)
  const N = slots.length

  let { dp, back, M } = align(units, slots, 2)
  let capUsed: 2 | 3 = 2
  if (units.length && !isFinite(dp[units.length][N])) {
    ;({ dp, back, M } = align(units, slots, 3))
    capUsed = 3
  }

  const assigned: (SlotAssignment | null)[] = new Array(N).fill(null)
  const conflicts: GridProjection['conflicts'] = []

  if (units.length === 0) {
    return { gridType: grid, slots: assigned, accentOverlay: new Array(N).fill(0), lockScore: 1, conflicts }
  }

  const totalCost = dp[M][N]
  let i = M
  let j = N
  const placements: { i: number; j: number; two: boolean }[] = []
  while (j > 0) {
    const choice = back[i][j]
    if (choice === 0) { j--; continue }
    if (choice === 1) { placements.push({ i: i - 1, j: j - 1, two: false }); i--; j--; continue }
    placements.push({ i: i - 2, j: j - 1, two: true })
    placements.push({ i: i - 1, j: j - 1, two: true })
    i -= 2; j--
  }
  placements.reverse()

  for (const p of placements) {
    const unit = units[p.i]
    const slot = slots[p.j]
    const cost = costOf(unit, slot, p.i, M, N)
    const assignment: SlotAssignment = {
      slot: slot.index,
      syllableId: unit.syllableId,
      moraIndex: unit.moraIndex,
      symbol: unit.symbol,
      cost,
    }
    if (assigned[p.j] === null) {
      assigned[p.j] = assignment
    } else {
      // خانة تحمل موراتين بالفعل — تُسجَّل الثانية كتعارض توثيقي بدل الكتابة فوق الأولى
      conflicts.push({
        slot: slot.index,
        reason: 'خانة تحمل موراتين (نصف نقطة)',
        suggestion: `المورا الثانية من ${unit.syllableId} تشارك الخانة ${slot.index}`,
      })
    }
    if (cost > 0.5) {
      conflicts.push({
        slot: slot.index,
        reason: unit.symbol === '▬' ? 'مقطع ثقيل وقع على خانة ضعيفة' : 'اصطدام غير متسق مع قوة الخانة',
        suggestion: `أزِح ${unit.syllableId} إلى خانة أقوى قريبة`,
      })
    }
  }

  if (capUsed === 3) {
    conflicts.push({ slot: -1, reason: 'البار يحمل مورات أكثر من سعة الشبكة الاعتيادية', suggestion: 'قصّر البار أو استخدم شبكة أكبر' })
  }

  const avgCost = totalCost / Math.max(1, M)
  const lockScore = Math.max(0, Math.min(1, 1 - avgCost))

  return { gridType: grid, slots: assigned, accentOverlay: new Array(N).fill(0), lockScore, conflicts }
}

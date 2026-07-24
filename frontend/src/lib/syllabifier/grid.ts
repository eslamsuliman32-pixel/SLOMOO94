// §٥ الإسقاط على الشبكة — مولّد موحَّد لأي تركيبة (لا شبكتان منفصلتان بالكود)

import type { GridSpec, SlotTemplate } from './types.ts'

const BEAT_WEIGHT: [number, number, number, number] = [1.0, 0.9, 0.85, 0.7]

export function subdivisionCurve(sub: number, n: 3 | 4): number {
  if (sub === 0) return 1.0
  if (n === 4) {
    if (sub === 1) return 0.2 // e
    if (sub === 2) return 0.45 // +
    if (sub === 3) return 0.2 // a
  } else {
    if (sub === 1) return 0.3 // trip
    if (sub === 2) return 0.2 // let
  }
  return 0.2
}

export function beatWeight(beat: 0 | 1 | 2 | 3): number {
  return BEAT_WEIGHT[beat]
}

/** يولّد قوالب الخانات لأي تركيبة (١٦ / ١٢ / مهجّنة) بخوارزمية واحدة — §٥.١ */
export function gridSlots(spec: GridSpec): SlotTemplate[] {
  const out: SlotTemplate[] = []
  let index = 0
  for (let beat = 0 as 0 | 1 | 2 | 3; beat < 4; beat++) {
    const n = spec.subdivisions[beat]
    for (let sub = 0; sub < n; sub++) {
      out.push({
        index: index++,
        beat,
        sub,
        t: beat + sub / n,
        strength: BEAT_WEIGHT[beat] * subdivisionCurve(sub, n),
      })
    }
  }
  return out
}

export const GRID_16: GridSpec = { subdivisions: [4, 4, 4, 4] }
export const GRID_12: GridSpec = { subdivisions: [3, 3, 3, 3] }

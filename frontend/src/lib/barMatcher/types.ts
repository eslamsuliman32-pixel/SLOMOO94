// MAQAM · SPEC-02 (FINAL) — بنية بيانات مطابِق البارات (الطبقة الأولى فوق SPEC-01)

import type { BarFingerprint, Lexicon, Syllable } from '../syllabifier/types.ts'

export type PhoneticVector = [number, number, number, number, number]

export type AlignOp = 'match' | 'sub' | 'ins' | 'del'

export interface AlignmentStep {
  i: number // فهرس المقطع في A (-1 إن كانت العملية ins)
  j: number // فهرس المقطع في B (-1 إن كانت العملية del)
  opType: AlignOp
}

export interface MatchWeights {
  metricWeight: number
  phoneticWeight: number
}

export interface MatchResult {
  metricScore: number
  phoneticScore: number
  combined: number
  alignmentPath: AlignmentStep[]
  conflicts: { position: number; reason: string }[]
}

export interface MoraWindow {
  start: number
  end: number
}

export interface BarIndexEntry {
  id: string
  fp: BarFingerprint
  syllVectors: PhoneticVector[]
  source: { text: string; author?: string; tags?: string[] }
}

export interface BarIndex {
  entries: Map<string, BarIndexEntry>
  bucketByMoraCount: Map<number, string[]> // moraCount → ids
  hashTable: Map<string, string[]> // fp.hash → ids
}

export interface FindOpts extends MatchWeights {
  topK: number
  tolerance?: number // بالمورا، افتراضي ±2 — §٥.٢
}

export interface RankedMatch {
  entry: BarIndexEntry
  result: MatchResult
}

export type { BarFingerprint, Lexicon, Syllable }

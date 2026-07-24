// §٥ مستودع البارات — خط إدخال دُفعي + فهرسة (تصفية أولية رخيصة قبل التسجيل الدقيق المكلف)

import { normalize } from '../syllabifier/normalize.ts'
import { syllabifyWord } from '../syllabifier/syllabify.ts'
import { liaise } from '../syllabifier/liaise.ts'
import { fingerprint } from '../syllabifier/fingerprint.ts'
import { syllableVector } from './phoneticVectors.ts'
import { matchScore, strictMatch } from './match.ts'
import type { BarIndex, BarIndexEntry, FindOpts, Lexicon, RankedMatch } from './types.ts'

let seq = 0
function nextId(): string {
  seq += 1
  return `bar_${Date.now().toString(36)}_${seq}`
}

/** استلام دفعة (حتى ١٠٠ بار) → تقطيع عروضي (SPEC-01) → ترميز صوتي لكل مقطع → حفظ بصمة دائمة — §٥.١ */
export function ingestBatch(rawBars: string[], lex: Lexicon): BarIndexEntry[] {
  return rawBars.map((text) => {
    const words = normalize(text)
    const perWord = words.map((word, wordIndex) =>
      syllabifyWord(word, lex).map((s) => ({ ...s, wordIndex })),
    )
    const syllables = liaise(perWord)
    const fp = fingerprint(syllables)
    const syllVectors = fp.syllables.map((s) => syllableVector(s))
    return { id: nextId(), fp, syllVectors, source: { text } }
  })
}

/** buildIndex(entries) → BarIndex — bucket[moraCount] + hashTable[hash]، §٥.٢ */
export function buildIndex(entries: BarIndexEntry[]): BarIndex {
  const index: BarIndex = { entries: new Map(), bucketByMoraCount: new Map(), hashTable: new Map() }
  for (const e of entries) {
    index.entries.set(e.id, e)

    const bucket = index.bucketByMoraCount.get(e.fp.moraCount) ?? []
    bucket.push(e.id)
    index.bucketByMoraCount.set(e.fp.moraCount, bucket)

    const hashed = index.hashTable.get(e.fp.hash) ?? []
    hashed.push(e.id)
    index.hashTable.set(e.fp.hash, hashed)
  }
  return index
}

/**
 * findCandidates(query, index, opts) — §٥.٢:
 * ١) strictMatch عبر hashTable فوراً بثقة 1.0
 * ٢) خلاف ذلك: bucket[moraCount ± tolerance] فقط كمرشّحين، لا المستودع كله
 * ٣) طبّق matchScore على المرشّحين، رتّب تنازلياً، أعد أفضل topK
 */
export function findCandidates(
  query: { fp: BarIndexEntry['fp'] },
  index: BarIndex,
  opts: FindOpts,
): RankedMatch[] {
  const tolerance = opts.tolerance ?? 2
  const results: RankedMatch[] = []
  const seen = new Set<string>()

  const strictIds = index.hashTable.get(query.fp.hash) ?? []
  for (const id of strictIds) {
    const entry = index.entries.get(id)
    if (!entry || strictMatch(query.fp, entry.fp) === false) continue
    results.push({
      entry,
      result: { metricScore: 1, phoneticScore: 1, combined: 1, alignmentPath: [], conflicts: [] },
    })
    seen.add(id)
  }

  for (let mc = query.fp.moraCount - tolerance; mc <= query.fp.moraCount + tolerance; mc++) {
    const ids = index.bucketByMoraCount.get(mc)
    if (!ids) continue
    for (const id of ids) {
      if (seen.has(id)) continue
      seen.add(id)
      const entry = index.entries.get(id)
      if (!entry) continue
      const result = matchScore(query.fp, entry.fp, opts)
      results.push({ entry, result })
    }
  }

  results.sort((x, y) => y.result.combined - x.result.combined)
  return results.slice(0, opts.topK)
}

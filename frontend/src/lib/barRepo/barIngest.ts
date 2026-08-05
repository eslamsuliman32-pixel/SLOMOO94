// MAQAM · SPEC-03 — وضع المسودّة
// يستوعب نصاً بلا تشكيل صريح كمسوّدة (status: 'draft') بلا استدعاء الطبقات
// التحليلية — لا يُعاد تنفيذ processBar، بل يُغلَّف ويُستدعى لاحقاً عند توفّر
// التشكيل (measureDraft). القاعدة الملزمة تبقى كما هي: الطبقة صفر تحتاج
// تشكيلاً صريحاً لتقطيع دقيق (hasTashkeel) — هذا الملف لا يكسرها، بل يؤجّل
// القياس بدل رفض النص كلياً.

import { sha1 } from '../syllabifier/hash.ts'
import type { Lexicon } from '../syllabifier/types.ts'
import { processBar, hasTashkeel } from './repository.ts'
import type { RepoBar, GridType } from './repository.ts'

/** حقول الطبقات الأربع الفارغة — لمسوّدة لم تُقس بعد فقط */
const DRAFT_LAYERS = {
  moraStr: '',
  moraCount: 0,
  sylCount: 0,
  heavy: 0,
  light: 0,
  weightProfile: 'balanced' as const,
  sonority: [0, 0, 0, 0, 0] as [number, number, number, number, number],
  gravity: 0,
  domFam: '—' as const,
  stressIndices: [] as number[],
  stressPattern: '',
  synco: 0,
  avgAttack: 0,
}

export type IngestOutcome =
  | { status: 'measured'; bar: RepoBar }
  | { status: 'draft'; bar: RepoBar }
  | { status: 'rejected'; reason: 'empty' }

/**
 * يقبل أي نص — مشكولاً كان أم لا. المشكول يُقاس فوراً بخط الأنابيب الكامل
 * (processBar)، وغير المشكول يُخزَّن كمسوّدة draft بلا حساب الطبقات الأربع.
 * لا يُرفض نص إلا إذا كان فارغاً بعد التقليم.
 */
export function textToBar(
  raw: string,
  opts: { tag?: string; gridType?: GridType; id: number; lex: Lexicon },
): IngestOutcome {
  const text = raw.trim()
  if (!text) return { status: 'rejected', reason: 'empty' }

  if (hasTashkeel(text)) {
    const out = processBar(text, opts)
    if (!out.bar) return { status: 'rejected', reason: 'empty' }
    return { status: 'measured', bar: out.bar }
  }

  const gridType = opts.gridType ?? '16'
  const bar: RepoBar = {
    id: opts.id,
    raw: text,
    tag: opts.tag?.trim() || '—',
    gridType,
    status: 'draft',
    words: [],
    syllables: [],
    rhyme: null,
    hash: sha1(text),
    lockScore: 0,
    ts: Date.now(),
    ...DRAFT_LAYERS,
  }
  return { status: 'draft', bar }
}

/**
 * يُستدعى عند إضافة تشكيل لبار مسوّدة — يُعيد القياس بخط الأنابيب الكامل
 * ويُرقّي الحالة إلى measured. إن كان النص لا يزال بلا تشكيل يُعاد كما هو
 * (draft) بلا خطأ — الترقية كسولة وآمنة للاستدعاء المتكرر.
 */
export function measureDraft(draft: RepoBar, opts: { lex: Lexicon }): IngestOutcome {
  if (draft.status !== 'draft') return { status: 'measured', bar: draft }
  const out = processBar(draft.raw, { tag: draft.tag, gridType: draft.gridType, id: draft.id, lex: opts.lex })
  if (!out.bar) return { status: 'draft', bar: draft }
  return { status: 'measured', bar: out.bar }
}

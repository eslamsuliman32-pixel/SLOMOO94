// src/lib/matrixAdapter.js
// يحوّل مخرجات محرك القافية (analyzeLinesV1) إلى شكل مدخلات /api/matrix/layout
// دون لمس rhyme.js — ذلك الملف يلتزم حرفيًا بـ docs/RHYME_PROSODY_SPEC.md،
// وهذا مجرد تكييف عرضي (تقدير مقاطع لكل كلمة على حدة) لخدمة رسم المصفوفة.

import { weightFingerprint, hasTashkeel } from './rhyme.js'

/** تقدير عدد مقاطع كلمة واحدة: بصمة وزن دقيقة إن كانت مشكولة، وإلا تقريب بطول الكلمة. */
export function estimateSyllables(word) {
  if (!word) return 1
  if (hasTashkeel(word)) return Math.max(1, weightFingerprint(word).syllables)
  const letters = [...word].filter((c) => /[ء-ي]/.test(c)).length
  return Math.max(1, Math.round(letters / 2.5))
}

/** يحوّل مصفوفة أسطر analyzeLinesV1 إلى حمولة /api/matrix/layout. */
export function linesToMatrixPayload(lines) {
  return (lines || [])
    .filter((l) => l.text && l.text.trim())
    .map((l, idx) => ({
      index: idx,
      tokens: (l.tokens || []).map((t) => ({ w: t.w, syllables: estimateSyllables(t.w) })),
      color_index: l.colorIndex ?? null,
      inner_indices: l.inner ? [...l.inner] : [],
    }))
}

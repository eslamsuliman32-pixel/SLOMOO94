/**
 * مقام · خط أنابيب الحقن — تحويل نص خام إلى كائن Bar كامل
 *
 * يستخدم processBar من lib/barRepo مع إدارة الـ Lexicon.
 * الـ Lexicon تُنشأ مرة واحدة وتُعاد استخدامها لكفاءة الذاكرة.
 */

import { createLexicon } from './syllabifier/index.ts';
import { processBar } from './barRepo/index.ts';

let sharedLexicon = null;

/**
 * الحصول على الـ Lexicon المشترك (أو إنشاؤه إذا لم يكن موجوداً)
 */
function getLexicon() {
  if (!sharedLexicon) {
    sharedLexicon = createLexicon();
  }
  return sharedLexicon;
}

/**
 * تحويل نص خام إلى Bar كامل (مع hash، rhyme، syllables، moraCount)
 *
 * @param {string} rawText - النص الخام
 * @param {Object} opts - خيارات إضافية
 * @param {string} opts.tag - وسم البار (مثل "فيرس ١")
 * @param {string} opts.gridType - نوع الشبكة ("16" | "12" | "hyb")
 * @param {number} opts.id - معرّف فريد للبار
 * @returns {Object|null} كائن Bar أو null في حالة الفشل
 */
export function textToBar(rawText, opts = {}) {
  const {
    tag = '—',
    gridType = '16',
    id = Date.now() + Math.random(),
  } = opts;

  const lex = getLexicon();
  const outcome = processBar(rawText, { tag, gridType, id, lex });

  if (!outcome.bar) {
    console.warn(`فشل الحقن: ${outcome.reason}`);
    return null;
  }

  return outcome.bar;
}

/**
 * تحويل مصفوفة نصوص إلى مصفوفة Bars
 *
 * @param {string[]} texts - مصفوفة من النصوص
 * @param {Object} opts - نفس خيارات textToBar
 * @returns {Object[]} مصفوفة من Bars (بدون null entries)
 */
export function textsToBar(texts, opts = {}) {
  return texts
    .map((text, i) => textToBar(text, { ...opts, id: opts.id + i }))
    .filter(Boolean);
}

/**
 * مقام · محرك القياس الموحّد
 * SPEC-04 §1 — المقطع هو الوحدة، والامتداد `u` هو عرضه على الشبكة.
 *
 * دالّة نقيّة بالكامل: لا React، لا حالة، لا آثار جانبية.
 * الدقة: ~٩٥٪ على النص المشكول · ~٧٠٪ على غير المشكول (سلوك موثّق في SPEC-01).
 */
import type { Syllable, Measurement, Span } from '../types';

/* ══════════ خرائط الحروف ══════════ */
const FATHA = '\u064E';
const DAMMA = '\u064F';
const KASRA = '\u0650';
const HARAKA = FATHA + DAMMA + KASRA;
const TANWIN = '\u064B\u064C\u064D';
const SUKUN = '\u0652';
const SHADDA = '\u0651';
const DAGGER = '\u0670';
const MARKS = HARAKA + TANWIN + SUKUN + SHADDA + DAGGER + '\u0653\u0654\u0655';
const LONGV = 'اوىيآ';
const TAA_MARBUTA = '\u0629';

const isMark = (c?: string): boolean => c !== undefined && MARKS.includes(c);
const isLong = (c?: string): boolean => c !== undefined && LONGV.includes(c);
const isCons = (c?: string): boolean =>
  c !== undefined && /[\u0621-\u064A]/.test(c) && !isMark(c);

/**
 * صامت خالص: يصلح ساكناً يُغلق المقطع.
 * التاء المربوطة مستثناة — فهي حاملة حركة لا ساكن.
 */
const isPlain = (c?: string): boolean =>
  isCons(c) && !isLong(c) && c !== TAA_MARBUTA;

const MARK_RE = new RegExp('[' + MARKS + ']', 'g');
/** تجريد المقطع من العلامات */
export const bare = (s: string): string => s.replace(MARK_RE, '');

/** هل النص مشكول؟ يحدّد دقة التقطيع المعروضة للمستخدم */
export const isDiacritized = (t: string): boolean =>
  /[\u064E\u064F\u0650\u0652\u064B\u064C\u064D]/.test(t);

/* ══════════ بناء المقطع ══════════ */
function mk(t: string, u: Span, heavy: boolean): Syllable {
  return {
    t: t.trim(),
    u,
    w: u === 2 || heavy ? 'ثقيل' : 'خفيف',
    k: u === 2 ? 'long' : heavy ? 'heavy' : '',
  };
}

/* ══════════ تطبيع ══════════ */
function normalize(word: string): string {
  const w = String(word)
    .replace(/[\u0640\u061F\u060C\u061B.,!?"'()\[\]«»…\-–—]/g, '')
    .replace(/\u0671/g, '\u0627'); // ٱ ← ا
  // ألف التفريق بعد واو الجماعة: بَاعُوا ← بَاعُو
  return w.replace(/([\u064F\u0652]?)\u0648\u0627$/, '$1\u0648');
}

/* ══════════ التنقية اللاحقة ══════════ */
function postPass(list: Syllable[]): Syllable[] {
  const out: Syllable[] = [];

  for (const s of list) {
    const b = bare(s.t);
    const prev = out[out.length - 1];
    // تاء مربوطة أو هاء عارية ← تلتحق بما قبلها
    if (
      prev &&
      b.length === 1 &&
      (b === TAA_MARBUTA || b === '\u0647') &&
      !/[\u064E\u064F\u0650]/.test(s.t)
    ) {
      prev.t += s.t;
      continue;
    }
    out.push({ ...s });
  }

  // صامت خالص أعزل في آخر الكلمة
  if (out.length > 1) {
    const last = out[out.length - 1];
    const lb = bare(last.t);
    if (
      lb.length === 1 &&
      isPlain(lb) &&
      last.u === 1 &&
      !/[\u064E\u064F\u0650\u064B\u064C\u064D]/.test(last.t)
    ) {
      const prev = out[out.length - 2];
      // تحفّظ مقصود: لا ندغم في مقطع مغلق أصلاً.
      // الزيادة أوضح بصرياً من النقص، وتصحيحها بضغطة واحدة.
      if (prev.k !== 'heavy') {
        prev.t += last.t;
        prev.k = prev.u === 2 ? 'long' : 'heavy';
        prev.w = 'ثقيل';
        out.pop();
      }
    }
  }

  return out.filter((x) => bare(x.t).length > 0);
}

/* ══════════ المحرك ══════════ */
export function syllabify(word: string): Syllable[] {
  const w = normalize(word);
  if (!w) return [];

  const out: Syllable[] = [];
  let i = 0;
  const at = (k: number): string | undefined => w[k];

  // ال التعريف ← مقطع مغلق واحد
  const al = w.match(/^\u0627[\u064E\u0650\u064F]?\u0644[\u0652]?/);
  if (al && isCons(w[al[0].length])) {
    out.push(mk('\u0627\u0644', 1, true));
    i = al[0].length;
  }

  const hasDiac = [...w].some(
    (c) => HARAKA.includes(c) || c === SUKUN || TANWIN.includes(c)
  );

  if (hasDiac) {
    /* ───── المسار المشكول ~٩٥٪ ───── */
    while (i < w.length) {
      if (!isCons(w[i])) {
        i++;
        continue;
      }
      let syl = w[i];
      let u: Span = 1;
      let heavy = false;
      let vowel: 'v' | 'n' | 's' | null = null;
      i++;

      while (i < w.length && isMark(w[i])) {
        const c = w[i];
        if (c === SHADDA) heavy = true;
        else if (HARAKA.includes(c) || c === DAGGER) vowel = 'v';
        else if (TANWIN.includes(c)) vowel = 'n';
        else if (c === SUKUN) vowel = 's';
        syl += c;
        i++;
      }

      if (vowel === 'n') {
        if (at(i) === '\u0627') {
          syl += w[i];
          i++;
        }
        out.push(mk(syl, 1, true));
        continue;
      }
      if (vowel === 's') {
        out.push(mk(syl, 1, true));
        continue;
      }
      if (!vowel) {
        out.push(mk(syl, 1, heavy));
        continue;
      }

      // حرف مدّ غير محرّك ← الامتداد خانتان
      // تحذير: لا تستعمل `?? ''` هنا — `HARAKA.includes('')` تُرجع true دائماً
      const after = at(i + 1);
      const afterIsHaraka = after !== undefined && HARAKA.includes(after);
      if (isLong(at(i)) && !afterIsHaraka && after !== SHADDA) {
        syl += w[i];
        i++;
        u = 2;
      }
      // ساكن يُغلق المقطع
      if (isPlain(at(i)) && at(i + 1) === SUKUN) {
        syl += w[i] + SUKUN;
        i += 2;
        heavy = true;
      } else if (
        isPlain(at(i)) &&
        (at(i + 1) === SHADDA || (isMark(at(i + 1)) && at(i + 2) === SHADDA))
      ) {
        syl += w[i];
        heavy = true;
      }
      out.push(mk(syl, u, heavy));
    }
  } else {
    /* ───── المسار غير المشكول ~٧٠٪ ───── */
    while (i < w.length) {
      if (!isCons(w[i])) {
        i++;
        continue;
      }
      let syl = w[i];
      let u: Span = 1;
      let heavy = false;
      i++;

      if (isLong(at(i))) {
        syl += w[i];
        i++;
        u = 2;
      }
      const X = at(i);
      const nx = at(i + 1);
      // ساكن يُغلق: صامت خالص يليه صامت خالص أو نهاية الكلمة
      if (isPlain(X) && (nx === undefined || isPlain(nx))) {
        syl += X;
        i++;
        heavy = true;
      }
      out.push(mk(syl, u, heavy));
    }
  }

  return postPass(out);
}

/** بار كامل → مقاطع، مع حفظ فهرس الكلمة */
export function scanBar(text: string): Syllable[] {
  const syls: Syllable[] = [];
  String(text)
    .split(/\s+/)
    .filter(Boolean)
    .forEach((wd, wi) => {
      syllabify(wd).forEach((s) => syls.push({ ...s, wi }));
    });
  return syls;
}

/** بصمة القياس · SPEC-04 §5.1-أ */
export function measure(text: string): Measurement {
  const syls = scanBar(text);
  return {
    syl: syls.length,
    cells: syls.reduce((a, s) => a + s.u, 0),
    longAt: syls.map((s, i) => (s.u === 2 ? i : -1)).filter((i) => i >= 0),
    syls,
  };
}

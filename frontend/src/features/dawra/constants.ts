/**
 * مقام · وحدة الدورة — الثوابت
 * كل رقم أو لون أو أيقونة في الوحدة يخرج من هنا. لا قيم متناثرة.
 */
import type { EnergyPreset, HeelPattern, GridKind, RhymeFamily } from './types';

/* ══════════ الزمن ══════════ */

/** الدورة — ثابتة أبداً · SPEC-04 §2.3 */
export const CYCLE = 48 as const;

/** الرباعية — وحدة العمل الظاهرة · قرار س١ */
export const BARS = 4 as const;

/** خانات الرباعية حسب الشبكة */
export const quatrainCells = (grid: GridKind) => grid * BARS;

/** مساحة القفلة: ما يفيض عن الدورة داخل الرباعية */
export const freeCells = (grid: GridKind) => grid * BARS - CYCLE;

/** كم بار تحتاجه الدورة لتُغلق */
export const cycleBars = (grid: GridKind) => Math.ceil(CYCLE / grid);

/** خانات النبضة الواحدة */
export const stepsPerBeat = (grid: GridKind) => grid / 4;

/* ══════════ إيقاع اللسان ونبض الطبول · SPEC-04 §3.4 ══════════ */

/** مرساة النبر ٣-٣-٢ — الإيقاع الطبيعي للكلام العربي */
export const LISAN: Record<GridKind, number[]> = {
  16: [1, 4, 7, 9, 12, 15],
  12: [1, 4, 7, 10],
};

/** نبض الطبول */
export const DRUM: Record<GridKind, number[]> = {
  16: [1, 5, 9, 13],
  12: [1, 5, 9],
};

/** نقاط التقاطع — مصدر الطاقة كلها */
export const crossing = (grid: GridKind) =>
  LISAN[grid].filter((s) => DRUM[grid].includes(s));

/* ══════════ منحنى الطاقة · SPEC-04 §6.1 ══════════ */

export const PRESETS: EnergyPreset[] = [
  { n: 'المرجعية', s: [1, 2, 3, 4, 5, 6, 7, 6], r: 2, desc: 'تصاعد متناظر — افتتاحيات' },
  { n: 'الموجة', s: [4, 5, 6, 7, 6, 5], r: 3, desc: 'مدّ وجزر ثابت — فيرس سردي' },
  { n: 'التصاعد', s: [3, 4, 5, 6, 7, 8], r: 3, desc: 'ضغط بلا تراجع — ما قبل الكورَس' },
  { n: 'فيبوناتشي', s: [3, 5, 8, 5, 3], r: 6, desc: 'فراغات واسعة — أسلوب سردي' },
  { n: 'المتناظر', s: [4, 4, 6, 6, 4, 4], r: 4, desc: 'استقرار متماثل — كورَس' },
  { n: 'الانفجار', s: [10, 10, 10], r: 9, desc: 'ثلاث رشقات — صدمة' },
  { n: 'التبادلي', s: [8, 4, 8, 4], r: 8, desc: 'نداء وجواب — جسر' },
];

/* ══════════ أنماط العقب · SPEC-04 §6.2 ══════════ */

export const HEEL_HINTS: Record<HeelPattern, string> = {
  std: 'القافية تهبط على النبضة ٤ في كل بار — استقرار وراحة للمستمع.',
  dsp: 'القافية على النبضة ٢ — طاقة تدفع التراك للأمام باستمرار.',
  alt: 'تناوب ٢↔٤ يفتح فراغاً بـ٦ نبضات: املأه بقوافٍ داخلية متباينة ثم أطلق القفلة كالمقلاع.',
  mul: 'عقبان في البار (٤ ثم ١) — كثافة قصوى وقوافٍ متلاحقة عبر خط الفصل.',
};

export const HEEL_LABELS: Record<HeelPattern, string> = {
  std: 'قياسي',
  dsp: 'مُزاح',
  alt: 'متناوب',
  mul: 'متضاعف',
};

/* ══════════ عتبات مؤشرات الصحّة · SPEC-04 §7.2 ══════════ */

export const THRESHOLDS = {
  /** مساحة النفس الصحّية */
  breathMin: 0.2,
  breathMax: 0.4,
  /** حيوية الأداء — أقل منها = أداء مسطّح */
  sigmaMin: 0.5,
  /** كسرة الثالث */
  thirdDevMin: 0.12,
  /** الميلان الافتراضي (اتّكاء) */
  defaultLean: 18,
} as const;

/* ══════════ الهوية البصرية — أسماء الرموز فقط ══════════
   القيم الفعلية في styles/dawra.tokens.css
   قاعدة حاكمة: لون واحد = معنى واحد في التطبيق كله.
   ═══════════════════════════════════════════════════════ */

export const RHYME_FAMILIES: RhymeFamily[] = ['rA', 'rB', 'rC', 'rD', 'rE', 'rF', 'rG'];

/** دلالات الأيقونات — مرجع للمطوّر، تُرسم في QuatrainGrid */
export const ICONS = {
  /** فوق الخانة — ذهبي */
  stress: '▲',
  /** أسفل الخانة — وردي */
  heel: '▼',
  /** أعلى الشبكة — الرقم = عدد المقاطع في المجموعة */
  group: '⌐‾¬',
  /** متحرّك / ساكن */
  moving: '●',
  still: '▬',
} as const;

/** تسميات القوة — تُعرض للمبتدئ */
export const POWER_LABELS = ['فراغ', 'خفيف', 'نبر', 'ضغط'] as const;

/* ══════════ أدوات عرض ══════════ */

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
/** تحويل الأرقام للعربية — تُستخدم في كل نصوص الواجهة */
export const ar = (n: number | string): string =>
  String(n).replace(/\d/g, (d) => AR_DIGITS[Number(d)]);

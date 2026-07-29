/**
 * مقام · وحدة الدورة — الأنواع الأساسية
 * SPEC-04 §1 (وحدة القياس) · §2 (سلّم الزمن) · §5 (بصمة الدورة)
 */

/* ══════════ ١ · المقطع — وحدة القياس الموحّدة ══════════ */

/** الثقل العروضي: يُستخدم في العروض والتفعيلات */
export type Weight = 'خفيف' | 'ثقيل';

/** الامتداد الأدائي: كم خانة يشغل المقطع على الشبكة */
export type Span = 1 | 2;

/** تصنيف العرض البصري */
export type SylKind = 'long' | 'heavy' | '';

/**
 * المقطع — الوحدة المعيارية لكل أدوات مقام.
 * القاعدة: المقطع هو الوحدة، و`u` هو عرضه على الشبكة.
 */
export interface Syllable {
  /** نص المقطع كما يُنطق */
  t: string;
  /** الامتداد بالخانات (١ أو ٢) — يُشتق من طول الحركة لا من ثقل المقطع */
  u: Span;
  /** الثقل العروضي */
  w: Weight;
  /** تصنيف العرض */
  k: SylKind;
  /** فهرس الكلمة داخل البار */
  wi?: number;
}

/** ناتج قياس نص */
export interface Measurement {
  /** عدد المقاطع — وحدة القياس الظاهرة */
  syl: number;
  /** عدد الخانات = Σu */
  cells: number;
  /** مواضع المقاطع الممدودة */
  longAt: number[];
  syls: Syllable[];
}

/* ══════════ ٢ · الشبكة والدورة ══════════ */

/** نوع الشبكة: ١٦ عادي · ١٢ ثلاثيات */
export type GridKind = 16 | 12;

/** درجة القوة — ترميز ثلاثي: ارتفاع + رقم + لون */
export type Power = 0 | 1 | 2 | 3;

/** نمط العقب — موضع هبوط القافية */
export type HeelPattern = 'std' | 'dsp' | 'alt' | 'mul';

/** إيقاع اللسان */
export type AccentMode = '332' | 'beat' | 'off';

/**
 * الخانة — العقدة الواحدة في الرباعية.
 * الرباعية = grid × 4 خانة (٦٤ أو ٤٨)
 */
export interface Node {
  /** القوة ٠–٣ */
  v: Power;
  /** فهرس المجموعة في منحنى الطاقة (-1 = صمت) */
  g: number;
  /** أوّل خانة في المجموعة */
  head: boolean;
  /** الميلان بالملّي ثانية: موجب = اتّكاء · سالب = اندفاع */
  mu: number;
  /** نص المقطع المُسقَط */
  syl: string;
  /** امتداد مقطع ممدود من الخانة السابقة */
  ext: boolean;
}

/* ══════════ ٣ · المستودع — بصمة الدورة ══════════ */

/** عائلات القافية — ٧ ألوان محجوزة */
export type RhymeFamily = 'rA' | 'rB' | 'rC' | 'rD' | 'rE' | 'rF' | 'rG';

/** بصمة الدورة · SPEC-04 §5.1 */
export interface CycleFingerprint {
  /** أ · القياس الموحّد */
  syl: number;
  cells: number;
  longAt: number[];
  grid: GridKind | 'both';
  /** ب · بصمة الدورة */
  vProfile: Power[];
  vSigma: number;
  breath: number;
  heelBeat: 1 | 2 | 4;
  leanHint: number;
  /** ج · النبر واللسان */
  stressMap: number[];
  lisanMatch: number;
}

/** البار كما يُخزَّن في المستودع */
export interface Bar extends CycleFingerprint {
  id: string;
  text: string;
  fam: RhymeFamily;
  syls: Syllable[];
  /** د · القافية — مفاتيح SPEC-03 */
  rhymeKey?: Record<string, string>;
  /** هـ · التقنيات المكتشفة — TSpec X-Ray */
  techniques?: string[];
}

/** استعلام البوابة الواحدة · SPEC-04 §5.2 */
export interface RepoQuery {
  syl?: number | [number, number];
  cells?: number;
  heelBeat?: 1 | 2 | 4;
  rhyme?: RhymeFamily | string;
  grid?: GridKind | 'both';
  minSigma?: number;
  technique?: string[];
  exclude?: string[];
  limit?: number;
}

/** عقد المستودع — أي مصدر بيانات يجب أن يحقّقه */
export interface BarRepository {
  query(q?: RepoQuery): Promise<Bar[]>;
  getById(id: string): Promise<Bar | undefined>;
  /** حقن دفعي: يحسب بصمة الدورة تلقائياً */
  ingest(texts: Array<{ text: string; fam?: RhymeFamily }>): Promise<Bar[]>;
  count(): Promise<number>;
}

/* ══════════ ٤ · قوالب منحنى الطاقة ══════════ */

export interface EnergyPreset {
  /** الاسم المعروض */
  n: string;
  /** المنحنى: كل رقم = عدد مقاطع جملة */
  s: number[];
  /** مسافة السكوت بين المجموعات */
  r: number;
  /** الشخصية — يُعرض كتلميح */
  desc: string;
}

/* ══════════ ٥ · مؤشرات الصحّة ══════════ */

export interface HealthMetric {
  key: string;
  label: string;
  value: string;
  ratio: number;
  note: string;
  status: 'ok' | 'no' | '';
}

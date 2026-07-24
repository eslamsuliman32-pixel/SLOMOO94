// MAQAM · SPEC-01 (FINAL) — بنية البيانات المشتركة للطبقة صفر
// طبقة صفر: أي كود خارج هذه الوحدة ممنوع من تقطيع نص عربي أو قراءة حركاته.

export type OnsetClass = 'PLOSIVE' | 'FRICATIVE' | 'NASAL' | 'LIQUID' | 'GLIDE' | 'VOWEL'
export type Tajweed = 'SHADID' | 'MUTAWASSIT' | 'RIKHW'

export interface Phoneme {
  ch: string
  cls: OnsetClass
  tajweed: Tajweed
  emphatic: boolean
  attack: number
  borrowed: boolean
}

export type Mora = '●' | '▬'
export type CVShape = 'CV' | 'CVC' | 'CVV' | 'CVVC' | 'CVCC'
export type Nucleus = 'a' | 'i' | 'u' | 'aa' | 'ii' | 'uu'

export interface Syllable {
  id: string
  text: string
  cv: CVShape
  moras: Mora[]
  weight: 1 | 2 | 3
  onset: Phoneme
  nucleus: Nucleus
  coda: Phoneme | null // آخر ساكن في العنقود (المُصدَّر للوصل، §٤.٢)
  codas: Phoneme[] // كامل عنقود السواكن بترتيبه (٠..٢) — تفصيل داخلي يخدم liaise/project
  attack: number
  isRhyme: boolean
  wordIndex: number
  liaised: boolean
}

export interface BarFingerprint {
  raw: string
  syllables: Syllable[]
  moraString: string
  moraCount: number
  sylCount: number
  sonority: [number, number, number, number, number]
  emphaticDensity: number
  hash: string
}

export type SubdivPerBeat = 3 | 4

export interface GridSpec {
  subdivisions: SubdivPerBeat[]
}

export interface SlotTemplate {
  index: number
  beat: 0 | 1 | 2 | 3
  sub: number
  t: number
  strength: number
}

export interface SlotAssignment {
  slot: number
  syllableId: string
  moraIndex: number
  symbol: Mora
  cost: number
}

export interface GridProjection {
  gridType: GridSpec
  slots: (SlotAssignment | null)[]
  accentOverlay: number[]
  lockScore: number
  conflicts: { slot: number; reason: string; suggestion: string }[]
}

// وحدة صامت واحد + حركته (أو مدّ) بعد التطبيع الصوتي §٣.١
export interface PhoneticUnit {
  cons: string // الصامت (أو صامت الالتقاء الصوتي المفكوك)
  harakah: 'a' | 'i' | 'u' | null // فتحة/كسرة/ضمة قصيرة تلي الصامت
  madd: 'aa' | 'ii' | 'uu' | null // مدّ طويل يلي الصامت (تحل محل harakah)
  sukun: boolean // ساكن بلا حركة ولا مدّ
  borrowed: boolean // مصدره تكيّف دخيل
}
export type PhoneticStream = PhoneticUnit[]

export type Lang = 'ar' | 'loan'

export interface Word {
  text: string
  stream: PhoneticStream
  lang: Lang
}

export interface Lexicon {
  personal: Map<string, Syllable[]>
  base: Map<string, Syllable[]>
  loan: Map<string, Syllable[]>
}

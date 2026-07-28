/**
 * مقام · البوابة الواحدة
 * SPEC-04 §5.2 — استعلام واحد لكل أدوات التطبيق.
 *
 * قاعدة معمارية (قرار ق٣): لا أداة تملك بياناتها.
 * الشريط الناطق · منحنى الطاقة · Beat Blueprint · محرك التمارين
 * كلها تنادي `query()` — لا استعلامات خاصة ولا نسخ بيانات.
 */
import type { Bar, RepoQuery, BarRepository, RhymeFamily } from '../types';
import { makeBar } from './fingerprint';

/* ══════════ منطق الترشيح — مشترك بين كل المحوّلات ══════════ */

export function matches(b: Bar, q: RepoQuery): boolean {
  if (q.syl != null) {
    if (Array.isArray(q.syl)) {
      if (b.syl < q.syl[0] || b.syl > q.syl[1]) return false;
    } else if (b.syl !== q.syl) return false;
  }
  if (q.cells != null && b.cells > q.cells) return false;
  if (q.heelBeat != null && b.heelBeat !== q.heelBeat) return false;
  if (q.rhyme && b.fam !== q.rhyme) return false;
  if (q.grid && q.grid !== 'both' && b.grid !== 'both' && b.grid !== q.grid) return false;
  if (q.minSigma != null && b.vSigma < q.minSigma) return false;
  if (q.technique?.length) {
    const t = b.techniques ?? [];
    if (!q.technique.every((x) => t.includes(x))) return false;
  }
  if (q.exclude?.includes(b.id)) return false;
  return true;
}

/** ترتيب افتراضي: الأغنى ديناميكياً أولاً */
export const rankBars = (a: Bar, b: Bar) => b.vSigma - a.vSigma;

export function applyQuery(all: Bar[], q: RepoQuery = {}): Bar[] {
  const r = all.filter((b) => matches(b, q)).sort(rankBars);
  return q.limit ? r.slice(0, q.limit) : r;
}

/* ══════════ محوّل الذاكرة — للتطوير والاختبار ══════════ */

export class InMemoryBarRepo implements BarRepository {
  private db: Bar[];

  constructor(seed: Array<{ text: string; fam?: RhymeFamily }> = []) {
    this.db = seed.map((s, i) => makeBar(s.text, { fam: s.fam, index: i }));
  }

  async query(q: RepoQuery = {}): Promise<Bar[]> {
    return applyQuery(this.db, q);
  }

  async getById(id: string): Promise<Bar | undefined> {
    return this.db.find((b) => b.id === id);
  }

  async ingest(texts: Array<{ text: string; fam?: RhymeFamily }>): Promise<Bar[]> {
    const start = this.db.length;
    const fresh = texts.map((t, i) => makeBar(t.text, { fam: t.fam, index: start + i }));
    this.db.push(...fresh);
    return fresh;
  }

  async count(): Promise<number> {
    return this.db.length;
  }

  /** للاختبار فقط */
  get all(): Bar[] {
    return this.db;
  }
}

/* ══════════ محوّل Dexie — الإنتاج ══════════
   ملاحظة للتنفيذ: عدّل اسم الجدول ليطابق مخطط Maqam03.
   المطلوب فهرسة: syl, cells, fam, vSigma, heelBeat
   ─────────────────────────────────────────────
   في db.ts:
     this.version(N).stores({
       bars: 'id, syl, cells, fam, vSigma, heelBeat, *techniques'
     });
   ═══════════════════════════════════════════ */

/** الحد الأدنى الذي يجب أن يوفّره جدول Dexie */
export interface BarTable {
  toArray(): Promise<Bar[]>;
  get(id: string): Promise<Bar | undefined>;
  bulkAdd(items: Bar[]): Promise<unknown>;
  count(): Promise<number>;
  where(index: string): {
    between(lower: number, upper: number, inclLower?: boolean, inclUpper?: boolean): {
      toArray(): Promise<Bar[]>;
    };
    equals(v: number | string): { toArray(): Promise<Bar[]> };
  };
}

export class DexieBarRepo implements BarRepository {
  constructor(private table: BarTable) {}

  async query(q: RepoQuery = {}): Promise<Bar[]> {
    // نستغل الفهرس حين يكون `syl` محدداً — أسرع مسار
    let rows: Bar[];
    if (Array.isArray(q.syl)) {
      rows = await this.table.where('syl').between(q.syl[0], q.syl[1], true, true).toArray();
    } else if (typeof q.syl === 'number') {
      rows = await this.table.where('syl').equals(q.syl).toArray();
    } else {
      rows = await this.table.toArray();
    }
    // باقي الشروط في الذاكرة — المجموعة صغيرة بعد الفهرس
    return applyQuery(rows, { ...q, syl: undefined });
  }

  async getById(id: string): Promise<Bar | undefined> {
    return this.table.get(id);
  }

  async ingest(texts: Array<{ text: string; fam?: RhymeFamily }>): Promise<Bar[]> {
    const start = await this.table.count();
    const fresh = texts.map((t, i) => makeBar(t.text, { fam: t.fam, index: start + i }));
    await this.table.bulkAdd(fresh);
    return fresh;
  }

  async count(): Promise<number> {
    return this.table.count();
  }
}

/* ══════════ بذرة تجريبية — تُحذف عند وصل المستودع الحقيقي ══════════ */

export const SEED_BARS: Array<{ text: string; fam: RhymeFamily }> = [
  { text: 'في الليل نكتب والنهار يمحي', fam: 'rA' },
  { text: 'كل ما زاد الضغط زاد الماس صلابة', fam: 'rB' },
  { text: 'انتم مختفين مش ظاهرين', fam: 'rC' },
  { text: 'حاول اسمع واخشع', fam: 'rD' },
  { text: 'الوزن ليس في الحروف', fam: 'rA' },
  { text: 'الوزن في النبض', fam: 'rE' },
  { text: 'صوتي يجي من بعيد', fam: 'rF' },
  { text: 'ما بين ضلوعي حكاية', fam: 'rG' },
  { text: 'مشيت الطريق وحدي', fam: 'rD' },
  { text: 'والحلم كان اكبر مني', fam: 'rC' },
  { text: 'يا صاحبي القلب تعب', fam: 'rE' },
  { text: 'مستحيل ينطفي', fam: 'rF' },
  { text: 'اكتب على الورق دمي', fam: 'rA' },
  { text: 'والصمت اقوى من كلام', fam: 'rB' },
  { text: 'نبضة نبضة يبني', fam: 'rG' },
  { text: 'خذني بعيد عن هنا', fam: 'rD' },
  { text: 'ما زلت واقف', fam: 'rC' },
  { text: 'القافية تسقط هنا', fam: 'rE' },
  { text: 'دقيقة قبل الفجر', fam: 'rF' },
  { text: 'احلامنا مرسومة', fam: 'rG' },
  { text: 'على جدار الوقت', fam: 'rA' },
  { text: 'يعلى الصوت', fam: 'rB' },
  { text: 'صدى يرجع لي', fam: 'rD' },
];

export const createSeedRepo = () => new InMemoryBarRepo(SEED_BARS);

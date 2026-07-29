/**
 * مقام · محوّل مستودع الدورة — المستودع الحقيقي في هذا التطبيق
 *
 * INTEGRATION.md §3 يفترض Dexie، لكن Maqam (SLOMOO94) لا يستخدم Dexie في أي
 * وحدة — تخزينه المحلي كله عبر localStorage (انظر src/lib/localStore.js).
 * هذا المحوّل يحقق عقد BarRepository بنفس الأسلوب: بيانات المستخدم تبقى على
 * جهازه وحده، بلا حساب ولا خادم. `DexieBarRepo` يبقى مصدَّراً في repo.gate.ts
 * لليوم الذي يُضاف فيه Dexie فعلياً للمشروع.
 *
 * تنبيه سعة: localStorage محدود بـ ٥-١٠ ميجابايت تقريباً.
 * يكفي لبضع مئات من البارات. عند تجاوز المشروع هذا الحجم،
 * استبدل بـ DexieBarRepo (مُصدَّر جاهز في نفس الملف) دون تعديل
 * أي مكوّن آخر — العقد BarRepository ثابت.
 */
import type { Bar, RepoQuery, BarRepository, RhymeFamily } from '../types';
import { applyQuery, SEED_BARS } from './repo.gate';
import { makeBar } from './fingerprint';

const KEY = 'maqam.dawra.bars.v1';

function seed(): Bar[] {
  return SEED_BARS.map((s, i) => makeBar(s.text, { fam: s.fam, index: i }));
}

function readAll(): Bar[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : seed();
  } catch {
    return seed();
  }
}

function writeAll(bars: Bar[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(bars));
  } catch {
    /* مساحة المتصفح ممتلئة — البارات الجديدة تبقى في الذاكرة لهذه الجلسة فقط */
  }
}

/**
 * محوّل التخزين المحلي — يُبذَر ببذرة SPEC-04 عند أول تشغيل، ثم يحفظ كل
 * حقن لاحق على جهاز المستخدم. لا حقول بصمة الدورة تُعرض في أي واجهة —
 * تُحسب هنا فقط عبر `makeBar` وتُخزَّن كما هي.
 */
export class LocalStorageBarRepo implements BarRepository {
  private cache: Bar[] | null = null;

  private all(): Bar[] {
    if (!this.cache) this.cache = readAll();
    return this.cache;
  }

  async query(q: RepoQuery = {}): Promise<Bar[]> {
    return applyQuery(this.all(), q);
  }

  async getById(id: string): Promise<Bar | undefined> {
    return this.all().find((b) => b.id === id);
  }

  async ingest(texts: Array<{ text: string; fam?: RhymeFamily }>): Promise<Bar[]> {
    const all = this.all();
    const start = all.length;
    const fresh = texts.map((t, i) => makeBar(t.text, { fam: t.fam, index: start + i }));
    this.cache = [...all, ...fresh];
    writeAll(this.cache);
    return fresh;
  }

  async count(): Promise<number> {
    return this.all().length;
  }
}

/** نسخة واحدة يشترك فيها كل التطبيق — البوابة الواحدة الحقيقية */
export const appBarRepo = new LocalStorageBarRepo();

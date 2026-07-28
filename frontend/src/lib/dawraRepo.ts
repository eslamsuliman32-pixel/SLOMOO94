/**
 * محوّل مستودع وحدة الدورة إلى التخزين المحلي.
 *
 * INTEGRATION.md §٣ يفترض Dexie (`DexieBarRepo`)، وهذا المشروع لا يستخدمه —
 * التخزين محلي على الجهاز منذ إزالة الحساب (D16). لكن الوحدة صُمِّمت على واجهة
 * `BarRepository` المجرّدة ومنطق ترشيح مشترك (`applyQuery`)، فالتوسعة الصحيحة
 * محوّل ثالث لا تعديل في الوحدة: نفس العقد، نفس الاستعلام، وجهة تخزين مختلفة.
 */
import { applyQuery, makeBar } from '../features/dawra'
import type { Bar, BarRepository, RepoQuery, RhymeFamily } from '../features/dawra'

const KEY = 'maqam.dawra.bars'

function read(): Bar[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(rows: Bar[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(rows))
  } catch {
    // مساحة المتصفح ممتلئة — الاستعلام يبقى عاملاً على ما هو محفوظ
  }
}

export class LocalStorageBarRepo implements BarRepository {
  async query(q: RepoQuery = {}): Promise<Bar[]> {
    return applyQuery(read(), q)
  }

  async getById(id: string): Promise<Bar | undefined> {
    return read().find((b) => b.id === id)
  }

  /** حقن دفعي: البصمة تُحسب داخل makeBar، فلا يُخزَّن بار بلا بصمة دورة */
  async ingest(texts: Array<{ text: string; fam?: RhymeFamily }>): Promise<Bar[]> {
    const existing = read()
    const fresh = texts.map((t, i) =>
      makeBar(t.text, { fam: t.fam, index: existing.length + i }),
    )
    write([...existing, ...fresh])
    return fresh
  }

  async count(): Promise<number> {
    return read().length
  }
}

export const dawraRepo = new LocalStorageBarRepo()

/**
 * مقام · محوّل المستودع الحقيقي
 * يقرأ من useBarRepositoryStore (بارات BarRepositoryScreen الفعلية)
 * ويحوّلها لعقد BarRepository الذي تفهمه وحدة الدورة.
 *
 * ملاحظة تحويل: moraCount في البار الحالي = Σu (عدد الخانات) في وحدة
 * الدورة تماماً — كل مقطع خفيف = مورا واحدة (u=1)، كل ثقيل/ممدود = مورتان
 * (u=2). هذا يطابق القرار المعماري الأصلي: "المورا محور الزمن".
 */
import type { Bar, BarRepository, RepoQuery, RhymeFamily, Syllable } from '../types';
import { applyQuery } from './repo.gate';
import { useBarRepositoryStore } from '../../../state/barRepositoryStore';

const FAM_ORDER: RhymeFamily[] = ['rA', 'rB', 'rC', 'rD', 'rE', 'rF', 'rG'];

/** تجزئة ثابتة: نفس الروي يحصل دائماً على نفس اللون */
function mapFamily(b: any): RhymeFamily {
  const key = b.rhyme?.family ?? b.domFam ?? b.rhyme?.rawi ?? 'default';
  let h = 0;
  for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FAM_ORDER[h % FAM_ORDER.length];
}

function mapSyllables(b: any): Syllable[] {
  return (b.syllables ?? []).map((s: any) => {
    const u: 1 | 2 = (s.weight === 'heavy' || (s.moras?.length ?? 1) >= 2) ? 2 : 1;
    return {
      t: s.text ?? '',
      u,
      w: u === 2 ? 'ثقيل' : 'خفيف',
      k: u === 2 ? 'long' : (s.weight === 'heavy' ? 'heavy' : ''),
    } as Syllable;
  });
}

function toDawraBar(b: any): Bar {
  const syls = mapSyllables(b);
  const cells = b.moraCount ?? syls.reduce((a: number, s: Syllable) => a + s.u, 0);
  const syl = b.sylCount ?? syls.length;
  return {
    id: String(b.id),
    text: b.raw ?? '',
    fam: mapFamily(b),
    syls,
    syl,
    cells,
    longAt: syls.map((s, i) => (s.u === 2 ? i : -1)).filter((i) => i >= 0),
    grid: cells <= 12 ? 'both' : 16,
    vProfile: syls.map((s, i) => (i === syls.length - 1 ? 3 : (s.w === 'ثقيل' ? 2 : 1))) as any,
    vSigma: 0,
    breath: 0,
    heelBeat: 4,
    leanHint: 18,
    stressMap: b.stressIndices ?? [],
    lisanMatch: 0,
    rhymeKey: b.rhyme,
  };
}

export class ExistingBarRepo implements BarRepository {
  async query(q: RepoQuery = {}): Promise<Bar[]> {
    return applyQuery(useBarRepositoryStore.getState().bars.map(toDawraBar), q);
  }

  async getById(id: string) {
    const raw = useBarRepositoryStore.getState().bars.find((b: any) => String(b.id) === id);
    return raw ? toDawraBar(raw) : undefined;
  }

  async ingest(): Promise<Bar[]> {
    throw new Error('الحقن يتم من BarRepositoryScreen مباشرة — هذا المحوّل للقراءة فقط حالياً');
  }

  async count(): Promise<number> {
    return useBarRepositoryStore.getState().bars.length;
  }

  subscribe(onChange: () => void) {
    return useBarRepositoryStore.subscribe(onChange);
  }
}

export const existingBarRepo = new ExistingBarRepo();

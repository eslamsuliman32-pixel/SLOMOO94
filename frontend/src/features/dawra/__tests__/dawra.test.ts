/**
 * مقام · وحدة الدورة — الاختبارات
 * تشغيل: npx vitest run src/features/dawra
 */
import { describe, it, expect } from 'vitest';
import { measure, scanBar, isDiacritized } from '../engine/syllable.engine';
import {
  buildNodes, barArcs, heelSteps, isAnchor, isDrum, isFreeBar,
  isLocked, grandTotal, seqSum, suggestedRest, placeSyllables,
  healthMetrics, type CycleConfig,
} from '../engine/cycle.engine';
import { PRESETS, CYCLE, LISAN, DRUM, crossing, quatrainCells, freeCells } from '../constants';
import { InMemoryBarRepo, SEED_BARS, applyQuery } from '../repo/repo.gate';
import { makeBar, deriveVProfile } from '../repo/fingerprint';

const cfg = (over: Partial<CycleConfig> = {}): CycleConfig => ({
  grid: 16, seq: PRESETS[0].s, rest: PRESETS[0].r,
  heel: 'std', acc: '332', lean: 18, ...over,
});

/* ══════════ ١ · محرك القياس ══════════ */
describe('محرك القياس — المقطع وحدة القياس', () => {
  it('المقطع الممدود يشغل خانتين', () => {
    expect(measure('قَالَ').syl).toBe(2);
    expect(measure('قَالَ').cells).toBe(3); // قَا(٢) + لَ(١)
  });

  it('المقطع المفتوح القصير خانة واحدة', () => {
    const m = measure('كَتَبَ');
    expect(m.syl).toBe(3);
    expect(m.cells).toBe(3);
  });

  it('ال التعريف مقطع مغلق واحد', () => {
    expect(scanBar('الليل')[0].t).toBe('ال');
  });

  it('التاء المربوطة تلتحق بما قبلها', () => {
    expect(measure('مَدْرَسَة').syl).toBe(3);
    expect(measure('ساعة').syl).toBe(2);
  });

  it('الساكن الأخير يُدغم في مقطع مفتوح لا مغلق', () => {
    expect(measure('نور').syl).toBe(1);   // نو + ر → نور
    expect(measure('يشتعل').syl).toBe(3); // يش + تع + ل (تحفّظ مقصود)
  });

  it('ألف التفريق بعد واو الجماعة تُهمَل', () => {
    expect(measure('بَاعُوا').syl).toBe(2);
  });

  it('يكشف التشكيل بدقة', () => {
    expect(isDiacritized('مَدْرَسَة')).toBe(true);
    expect(isDiacritized('مدرسة')).toBe(false);
  });

  it('Σu يساوي مجموع امتدادات المقاطع', () => {
    const m = measure('في الليل نكتب والنهار يمحي');
    expect(m.cells).toBe(m.syls.reduce((a, s) => a + s.u, 0));
  });
});

/* ══════════ ٢ · القفل ══════════ */
describe('قانون القفل — Σ = ٤٨', () => {
  it.each(PRESETS.map((p) => [p.n, p.s, p.r] as const))(
    'القالب «%s» يقفل على ٤٨',
    (_n, s, r) => {
      expect(grandTotal(s, r)).toBe(CYCLE);
      expect(isLocked(s, r)).toBe(true);
    }
  );

  it('يقترح مسافة السكوت الصحيحة', () => {
    expect(suggestedRest([1, 2, 3, 4, 5, 6, 7, 6])).toBe(2);
    expect(suggestedRest([4, 5, 6, 7, 6, 5])).toBe(3);
  });

  it('يرفض المنحنى غير القابل للقفل', () => {
    expect(suggestedRest([5, 5, 5])).toBeNull(); // (48-15)/2 = 16.5
  });
});

/* ══════════ ٣ · سلّم الزمن ══════════ */
describe('الرباعية والدورة — قرار س١', () => {
  it('شبكة ١٦: رباعية ٦٤ · حرّ ١٦', () => {
    expect(quatrainCells(16)).toBe(64);
    expect(freeCells(16)).toBe(16);
  });

  it('شبكة ١٢: رباعية ٤٨ · بلا مساحة حرّة', () => {
    expect(quatrainCells(12)).toBe(48);
    expect(freeCells(12)).toBe(0);
  });

  it('البار الرابع حرّ على ١٦ فقط', () => {
    expect(isFreeBar(3, 16)).toBe(true);
    expect(isFreeBar(2, 16)).toBe(false);
    expect(isFreeBar(3, 12)).toBe(false);
  });

  it('البار الرابع خالٍ من العقد النشطة على شبكة ١٦', () => {
    const nodes = buildNodes(cfg());
    expect(nodes.slice(CYCLE).every((n) => n.v === 0)).toBe(true);
  });
});

/* ══════════ ٤ · اللسان والطبول ══════════ */
describe('التقاطع الذهبي/البنفسجي — SPEC-04 §3.4', () => {
  it('اللسان ٣-٣-٢ على شبكة ١٦', () => {
    expect(LISAN[16]).toEqual([1, 4, 7, 9, 12, 15]);
  });

  it('الطبول على ١ ٥ ٩ ١٣', () => {
    expect(DRUM[16]).toEqual([1, 5, 9, 13]);
  });

  it('يلتقيان عند ١ و٩ فقط', () => {
    expect(crossing(16)).toEqual([1, 9]);
  });

  it('isAnchor يتبع الوضع المختار', () => {
    expect(isAnchor(4, 16, '332')).toBe(true);
    expect(isAnchor(4, 16, 'beat')).toBe(false);
    expect(isAnchor(5, 16, 'beat')).toBe(true);
    expect(isAnchor(4, 16, 'off')).toBe(false);
    expect(isDrum(5, 16)).toBe(true);
  });
});

/* ══════════ ٥ · العقب ══════════ */
describe('أنماط العقب', () => {
  it('قياسي على النبضة ٤', () => expect(heelSteps(0, 16, 'std')).toEqual([13]));
  it('مُزاح على النبضة ٢', () => expect(heelSteps(0, 16, 'dsp')).toEqual([5]));
  it('متناوب ٢ ↔ ٤', () => {
    expect(heelSteps(0, 16, 'alt')).toEqual([5]);
    expect(heelSteps(1, 16, 'alt')).toEqual([13]);
  });
  it('متضاعف يعطي عقبين', () => expect(heelSteps(0, 16, 'mul')).toEqual([13, 1]));
});

/* ══════════ ٦ · الأقواس والإسقاط ══════════ */
describe('الأقواس المرقّمة والإسقاط المقطعي', () => {
  it('مجموع الأقواس = Σ المنحنى', () => {
    const nodes = buildNodes(cfg());
    const total = [0, 1, 2, 3]
      .flatMap((b) => barArcs(nodes, b, 16))
      .reduce((a, g) => a + g.len, 0);
    expect(total).toBe(seqSum(PRESETS[0].s));
  });

  it('المقطع الممدود يحجز خانتين — التفاوض العضوي', () => {
    const nodes = buildNodes(cfg());
    const syls = scanBar('قَالَ نُورْ');
    const placed = placeSyllables(nodes, syls);
    const longCount = syls.filter((s) => s.u === 2).length;
    expect(placed.filter((n) => n.ext).length).toBe(longCount);
  });
});

/* ══════════ ٧ · مؤشرات الصحّة ══════════ */
describe('مؤشرات الصحّة', () => {
  it('القالب المرجعي يعطي حيوية فوق العتبة', () => {
    const c = cfg();
    const nodes = buildNodes(c);
    const sigma = healthMetrics(nodes, c, []).find((m) => m.key === 'sigma');
    expect(Number(sigma?.value)).toBeGreaterThanOrEqual(0.5);
    expect(sigma?.status).toBe('ok');
  });

  it('القفل ينعكس في المؤشر', () => {
    const c = cfg({ rest: 5 }); // يكسر القفل
    const m = healthMetrics(buildNodes(c), c, []).find((x) => x.key === 'lock');
    expect(m?.status).toBe('no');
  });
});

/* ══════════ ٨ · البوابة الواحدة ══════════ */
describe('مستودع البارات — البوابة الواحدة', () => {
  const repo = new InMemoryBarRepo(SEED_BARS);

  it('يحسب بصمة الدورة تلقائياً وقت الحقن', async () => {
    const all = await repo.query();
    expect(all.length).toBe(SEED_BARS.length);
    all.forEach((b) => {
      expect(b.vProfile.length).toBe(b.syl);
      expect(b.cells).toBeGreaterThanOrEqual(b.syl);
      expect(b.vSigma).toBeGreaterThanOrEqual(0);
    });
  });

  it('vProfile يُشتق من النبر — قرار س٢', () => {
    const b = makeBar('قَالَ نُورْ');
    expect(deriveVProfile(b.syls).at(-1)).toBe(3); // الأخير = هبوط القافية
  });

  it('يرشّح بعدد المقاطع', async () => {
    const r = await repo.query({ syl: [4, 6] });
    expect(r.every((b) => b.syl >= 4 && b.syl <= 6)).toBe(true);
  });

  it('يرشّح بعائلة القافية', async () => {
    const r = await repo.query({ rhyme: 'rA' });
    expect(r.every((b) => b.fam === 'rA')).toBe(true);
  });

  it('يستبعد البارات المستهلكة', async () => {
    const all = await repo.query();
    const r = await repo.query({ exclude: [all[0].id] });
    expect(r.find((b) => b.id === all[0].id)).toBeUndefined();
  });

  it('يحترم الحدّ ويرتّب بالحيوية', async () => {
    const r = await repo.query({ limit: 5 });
    expect(r.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < r.length; i++) {
      expect(r[i - 1].vSigma).toBeGreaterThanOrEqual(r[i].vSigma);
    }
  });

  it('الحقن الدفعي يضيف بارات ببصمة كاملة', async () => {
    const before = await repo.count();
    const fresh = await repo.ingest([{ text: 'بار جديد للاختبار' }]);
    expect(await repo.count()).toBe(before + 1);
    expect(fresh[0].vProfile.length).toBe(fresh[0].syl);
  });

  it('applyQuery نقيّة ولا تعدّل المدخل', () => {
    const bars = SEED_BARS.map((s, i) => makeBar(s.text, { fam: s.fam, index: i }));
    const snapshot = bars.length;
    applyQuery(bars, { syl: 5 });
    expect(bars.length).toBe(snapshot);
  });
});

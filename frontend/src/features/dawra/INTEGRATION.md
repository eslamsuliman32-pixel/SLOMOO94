# وحدة الدورة — دليل التنفيذ في `Maqam03`

> **لمن يقرأ:** هذا الملف موجّه لجلسة Claude Code تعمل مباشرة على المستودع.
> الوحدة مكتملة ومختبَرة (٤١/٤١ اختبار · TypeScript strict نظيف). المطلوب **وصلها**، لا إعادة كتابتها.

---

## ١ · المكان والشجرة

انسخ المجلد كما هو إلى:

```
src/features/dawra/
├── index.ts                        نقطة التصدير الوحيدة
├── types.ts                        كل الأنواع
├── constants.ts                    الثوابت + رموز الهوية + ar()
├── Dawra.tsx                       المكوّن الجذر
├── engine/
│   ├── syllable.engine.ts          محرك القياس (المقطع + u + w) — نقي
│   ├── cycle.engine.ts             القفل · العقد · العقب · اللسان · المؤشرات — نقي
│   └── audio.scheduler.ts          مجدول AudioContext استباقي
├── repo/
│   ├── fingerprint.ts              حساب بصمة الدورة
│   └── repo.gate.ts                البوابة الواحدة + محوّلا الذاكرة و Dexie
├── store/
│   └── dawra.store.ts              Zustand
├── components/
│   ├── RepoProvider.tsx            حقن المستودع
│   ├── Panels.tsx                  القفل · الوعاء · منحنى الطاقة · العقب واللسان
│   ├── QuatrainGrid.tsx            الرباعية + الأقواس + المثلثات + الشريط الناطق
│   └── SidePanels.tsx              محرر المقاطع · المستودع · المؤشرات
├── styles/
│   └── dawra.tokens.css            رموز الهوية وأنماط الوحدة
└── __tests__/
    └── dawra.test.ts               ٤١ اختبار
```

**التبعيات:** `react` · `zustand` — كلاهما موجود في المشروع. **لا مكتبات جديدة.**

---

## ٢ · الإدراج الفوري (يعمل بلا أي تعديل)

```tsx
import { Dawra } from '@/features/dawra';

export default function DawraTab() {
  return <Dawra />;   // يستخدم بذرة ٢٣ باراً في الذاكرة
}
```

هذا كافٍ لرؤية الوحدة تعمل. الخطوة التالية هي وصل المستودع الحقيقي.

---

## ٣ · وصل مستودع البارات (الأهم)

### ٣٫١ ترقية مخطط Dexie

في ملف قاعدة البيانات (`db.ts` أو ما يقابله)، ارفع رقم النسخة وأضف الفهارس:

```ts
this.version(NEXT_VERSION).stores({
  bars: 'id, syl, cells, fam, vSigma, heelBeat, *techniques',
}).upgrade(async (tx) => {
  // احسب بصمة الدورة للبارات القديمة
  const { fingerprint } = await import('@/features/dawra');
  const rows = await tx.table('bars').toArray();
  for (const b of rows) {
    if (b.vProfile) continue;               // محسوبة سابقاً
    await tx.table('bars').update(b.id, fingerprint(b.text));
  }
});
```

الحقول التي تُضاف لكل بار: `syl` · `cells` · `longAt` · `grid` · `vProfile` · `vSigma` · `breath` · `heelBeat` · `leanHint` · `stressMap` · `lisanMatch`.

> **مهم:** لا تُعرض أي من هذه الحقول في الواجهة. كلها تُحسب وتُخزَّن في المعامل الخلفية — تماماً كما في نظام الترميز الصوتي العشري.

### ٣٫٢ حقن المستودع في المكوّن

```tsx
import { Dawra, DexieBarRepo } from '@/features/dawra';
import { db } from '@/lib/db';

const barRepo = new DexieBarRepo(db.bars as any);

export default function DawraTab() {
  return <Dawra repo={barRepo} />;
}
```

`DexieBarRepo` يستغل فهرس `syl` للمسار السريع، ثم يرشّح الباقي في الذاكرة.

### ٣٫٣ وصل الحقن الدفعي الموجود

في خط أنابيب الحقن في قسم مستودع البارات، أضف `fingerprint()` كخطوة أخيرة قبل الحفظ:

```ts
import { fingerprint } from '@/features/dawra';

const enriched = parsedBars.map((b) => ({ ...b, ...fingerprint(b.text) }));
await db.bars.bulkAdd(enriched);
```

---

## ٤ · المرحلة ٣ — توحيد الأدوات تحت البوابة الواحدة

هذه هي القيمة الحقيقية للوحدة. **كل أداة تستبدل مصدر بياناتها الخاص بـ `repo.query()`.**

| الأداة | ما تفعله الآن | ما يجب أن تفعله |
|---|---|---|
| الشريط الناطق | يقرأ نصاً مُمرَّراً | `repo.query({ syl: n, grid })` |
| Beat Blueprint | قائمة بارات محلية | `repo.query({ cells: n, minSigma: 0.5 })` |
| NewRapAcademy | تقنيات كنصوص ثابتة | `repo.query({ technique: ['p02'], syl: n })` |
| محرك التمارين | أمثلة مكتوبة يدوياً | `repo.query({ technique: [id] })` — على بارات المستخدم نفسه |

**النمط الموحّد:**

```tsx
const repo = useRepo();
const [bars, setBars] = useState<Bar[]>([]);

useEffect(() => {
  let alive = true;
  repo.query({ /* شروطك */ }).then((r) => alive && setBars(r));
  return () => { alive = false; };
}, [repo, /* deps */]);
```

لفّ جذر التطبيق مرة واحدة:

```tsx
<RepoProvider repo={barRepo}>
  <App />
</RepoProvider>
```

بعدها أي مكوّن ينادي `useRepo()` — **لا استيراد مباشر لـ Dexie من أي مكوّن.**

---

## ٥ · توحيد الهوية البصرية

`dawra.tokens.css` يقرأ من رموز التطبيق العامة ثم يسقط على الافتراضي:

```css
--d-gold: var(--mq-gold, #D4AF37);
```

**عرّف هذه في `:root` عالمياً** لتتبع كل الأدوات هوية واحدة:

```css
:root {
  --mq-bg:#070707; --mq-bg1:#0d0d0e; --mq-bg2:#141416; --mq-bg3:#1c1c1f;
  --mq-line:#2a2a2e; --mq-line2:#3a3a40;
  --mq-gold:#D4AF37;   /* النبر والشدّة — حصري */
  --mq-pulse:#ff3d81;  /* الآن + الذروة — حصري */
  --mq-lcd:#4ade80;    /* القراءات الرقمية — حصري */
  --mq-strip:#e8c94a;  /* الشريط الناطق */
  --mq-drum:#9A7BC4;   /* نبض الطبول */
  --mq-ink:#ece9e2; --mq-dim:#8b8781; --mq-dim2:#5c5954;
  --mq-rA:#d94f4f; --mq-rB:#e0803a; --mq-rC:#8fbf3f; --mq-rD:#3fb6a8;
  --mq-rE:#4a86d9; --mq-rF:#a05fd0; --mq-rG:#d84090;
  --mq-font-display:'Rakkas',serif;
  --mq-font-ui:'Cairo',system-ui,sans-serif;
  --mq-font-mono:'Space Mono',monospace;
}
```

**قاعدة حاكمة لا تُخالَف:** لون واحد = معنى واحد. عائلات القافية `rA…rG` محجوزة للقافية وحدها.

### الأيقونات الموحّدة

| الأيقونة | المعنى | الموضع |
|---|---|---|
| ▲ ذهبي | نبر | فوق الخانة |
| ▼ وردي | عقب القافية | أسفل الخانة |
| ⌐‾¬ مرقّم | تجميع (الرقم = عدد المقاطع) | أعلى البار |
| عمود متدرّج | القوة ٠–٣ | داخل الخانة |
| حافة ذهبية | مقطع ممدود (خانتان) | بطاقة المقطع |
| شريط أصفر | الشريط الناطق | أسفل الشبكة |
| خيط ذهبي / بنفسجي متقطّع | لسان / طبول | عمودي |

القوة تُرمَّز **ثلاثياً دائماً**: ارتفاع + رقم + لون — حلٌّ مقصود لعمى الألوان. **لا تحذف الرقم.**

---

## ٦ · الاختبارات

```bash
npx vitest run src/features/dawra
```

النتيجة المتوقعة: **٤١/٤١ ✓**

تغطي: محرك القياس · قانون القفل عبر القوالب السبعة · سلّم الزمن · التقاطع الذهبي/البنفسجي · أنماط العقب · الأقواس · التفاوض العضوي · مؤشرات الصحّة · البوابة الواحدة.

---

## ٧ · سلوكيات مقصودة — لا تُصلَحها كأخطاء

1. **تحفّظ التقطيع.** المحرك لا يُدغم الساكن الأخير في مقطع مغلق أصلاً. «الوزن» تُقطَّع ٣ مقاطع لا ٢ بلا تشكيل. الزيادة أوضح بصرياً من النقص وتصحيحها بضغطة `◂` واحدة. هذا اختيار موثّق، ليس خللاً.

2. **دقة ~٧٠٪ بلا تشكيل، ~٩٥٪ معه.** سلوك موثّق في SPEC-01. الواجهة تعرض النسبة صراحةً وتوفّر محرّراً يدوياً لكل مقطع.

3. **البار الرابع خالٍ على شبكة ١٦.** هذا هو التصميم — مساحة القفلة والرجعة والنفس. على شبكة ١٢ تمتلئ الرباعية بالكامل.

4. **الميلان يُزيح الضربة لا المترونوم.** المترونوم يبقى ثابتاً على الشبكة، وضربة المقطع وحدها تتأخر أو تندفع. بغير ذلك يختفي الإحساس بالجيب.

⚠️ **فخّ برمجي انكسر عليه المحرك مرة:** لا تستعمل `?? ''` مع `String.includes` في فحص الحركات — `HARAKA.includes('')` تُرجع `true` دائماً. الحارس الصحيح موجود في `syllable.engine.ts` مع تعليق تحذيري.

---

## ٨ · الخطوة التالية بعد الوصل

المرحلتان ٤ و٥ من SPEC-04:

- إضافة التقنيات `c01…c07` وحقل `cycle` للـ ٤٢ تقنية النواة
- توسيع `Bar.techniques` بنتائج TSpec X-Ray ليصير `repo.query({ technique })` مثمراً فعلاً

`fingerprint.ts` مصمَّم ليستقبل هذه الحقول بلا كسر — أضفها إلى `CycleFingerprint` واملأها في خط الحقن.

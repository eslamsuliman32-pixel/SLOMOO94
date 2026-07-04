# مواصفة Beat Profile — عقد بيانات التحليل الصوتي (الإصدار 1)

**الغرض:** الوثيقة الرقمية الموحدة لكل تراك محلَّل. يكتبها معمل التحليل مرة واحدة، وتقرأها كل واجهات العرض والكتابة والتدريب. أي تعديل على بنيتها يرفع رقم `schema_version`.

**مبدأ التصميم:** كل الأزمنة بالثواني (أرقام عشرية)، كل الترددات بالهرتز، النغمات بأرقام MIDI. الملف JSON واحد لكل تراك، يُخزن في Firestore (البيانات الخفيفة) مع روابط ملفات R2 (المسارات الصوتية ومنحنى الطاقة عالي الدقة).

---

## 1. البنية الكاملة

```json
{
  "schema_version": 1,
  "track_id": "trk_xxxxxxxx",
  "meta": {
    "title": "اسم التراك",
    "source_file": "r2://tracks/trk_xxxxxxxx/original.wav",
    "duration_sec": 182.4,
    "sample_rate": 44100,
    "analyzed_at": "2026-07-04T00:00:00Z",
    "lab_versions": { "demucs": "4.x", "madmom": "0.x", "basic_pitch": "x", "essentia": "x" }
  },

  "stems": {
    "drums":  { "url": "r2://tracks/trk_xxxxxxxx/stems/drums.wav" },
    "bass":   { "url": "r2://tracks/trk_xxxxxxxx/stems/bass.wav" },
    "melody": { "url": "r2://tracks/trk_xxxxxxxx/stems/melody.wav" },
    "vocals": { "url": null, "present": false }
  },

  "rhythm": {
    "bpm": 92.0,
    "bpm_is_stable": true,
    "time_signature": "4/4",
    "beats": [
      { "t": 0.652, "type": "downbeat", "bar": 1, "pos": 1 },
      { "t": 1.304, "type": "beat",     "bar": 1, "pos": 2 }
    ],
    "onsets": {
      "kick":  [0.652, 1.956],
      "snare": [1.304, 2.608],
      "hihat": [0.652, 0.978, 1.304]
    }
  },

  "slots": [
    {
      "id": "slot_001",
      "start": 0.652,
      "duration": 1.28,
      "bar_range": [1, 1],
      "section": "verse_1",
      "capacity_syllables": { "min": 4, "max": 9 },
      "weight_template": "●▬●●▬●▬▬",
      "density_context": "sparse"
    }
  ],

  "melodic": {
    "key": "F# minor",
    "melody_notes": [
      { "midi": 66, "start": 0.65, "duration": 0.42, "confidence": 0.93 }
    ],
    "bass_notes": [
      { "midi": 42, "start": 0.65, "duration": 0.85, "confidence": 0.95 }
    ],
    "pitch_curve_url": "r2://tracks/trk_xxxxxxxx/analysis/pitch_curve.json"
  },

  "energy": {
    "curve_url": "r2://tracks/trk_xxxxxxxx/analysis/energy_curve.json",
    "curve_resolution_sec": 0.1,
    "peak_moments": [45.2, 98.7],
    "quiet_moments": [0.0, 120.3]
  },

  "sections": [
    { "id": "intro",   "label": "إنترو",  "start": 0.0,  "end": 10.4 },
    { "id": "verse_1", "label": "فيرس 1", "start": 10.4, "end": 52.1 },
    { "id": "hook_1",  "label": "هوك",    "start": 52.1, "end": 73.0 }
  ],

  "vibe": {
    "metrics": {
      "brightness": 0.34,
      "density": 0.61,
      "dynamic_range": 0.48
    },
    "description_ar": "يبدأ متأملًا بمساحات واسعة ثم يشتد بعد منتصف الفيرس الأول...",
    "described_by": "llm_layer_v1"
  }
}
```

## 2. قواعد الحقول الأساسية

**rhythm.beats** — كل ضربة بزمنها الدقيق ونوعها (downbeat يفتح البار). ترقيم البارات هنا هو المرجع الوحيد لترقيم البارات في كل النظام، بما فيه ربط البارات المكتوبة بالتراك.

**slots.weight_template** — قالب بصمة الوزن للسلوت (تسلسل ● متحرك / ▬ ساكن المستنتَج من إيقاع أونسيت السلوت وفق منهجية الوزن الصوتي). حقل اختياري (null إن تعذر الاستنتاج بثقة): البار المكتوب تُقاس بصمته ضده مقطعًا بمقطع، مع تطابق صارم في المواضع المحاذية للضربات القوية وهامش مرن فيما بينها.

**slots** — خريطة الفراغات: تُستخرج من فجوات الأونسيت والكثافة. `capacity_syllables` تُحسب من مدة السلوت وسرعة النطق المريحة (نطاق min–max لا رقم واحد، احترامًا لتنوع أساليب الأداء). هذا الحقل هو نقطة الالتقاء مع محرك القافية: عدد مقاطع البار المكتوب يُقارن بهذا النطاق (الخطوة 50).

**melodic.melody_notes** — بنية الـpiano-roll التي يُرسم منها مسار الآلة في الاستوديو. حقل `confidence` من النموذج يسمح للواجهة بإخفاء النغمات منخفضة الثقة أو تبهيتها.

**vocals.present** — كاشف الحالة الخاصة: يصبح true فقط عند رفع أغنية مرجعية كاملة، فيظهر المسار الرابع في الواجهة تلقائيًا.

**المنحنيات الثقيلة (energy, pitch_curve)** — لا تُخزن داخل الوثيقة بل كملفات JSON مستقلة على R2، حفاظًا على خفة وثيقة Firestore وسرعة تحميلها.

## 3. عقد القراءة (لكل مستهلكي الملف)

- الواجهة لا تفترض وجود حقل اختياري — تتحقق أولًا (vocals قد يغيب، vibe.description قد يتأخر).
- لا يعدّل أي مستهلك الوثيقة؛ الكتابة حصرية لمعمل التحليل. تصحيحات المستخدم اليدوية (تعديل موضع downbeat مثلًا) تُحفظ في وثيقة تراكب منفصلة `beat_profile_overrides` تُطبق فوق الأصل عند العرض — فيبقى ناتج التحليل الأصلي محفوظًا دائمًا.
- عند رفع `schema_version` يُكتب محوِّل ترقية للوثائق القديمة قبل نشر أي واجهة تعتمد النسخة الجديدة.

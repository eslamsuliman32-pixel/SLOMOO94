# مواصفة خادم الاستوديو (backend/) — عقود JSON لأدوات الاستوديو الثلاث

**الغرض:** مرجع العقود بين الواجهة (`frontend/src/lib/api.js`) وخادم مقام
(`backend/`) لأدوات الاستوديو الثلاث: مصفوفة القوافي، لوحة التركيب،
ومولّد الإيقاع المقطعي.
**مبدأ الفصل:** الخادم طبقة حساب هندسي بلا حالة (إحداثيات/تداخل/توزيع) —
لا يُعيد تحليل القوافي لغويًا (ذلك حصرًا في `frontend/src/lib/rhyme.js`
وفق `docs/RHYME_PROSODY_SPEC.md`)، ولا يخزّن شيئًا (التخزين حصرًا في
Firestore عبر `frontend/src/lib/pieces.js`). كل استجابة تلتزم شكل
`{ok, data, error, meta}` من `docs/MODULE_CONTRACT.md` حرفيًا.

المخطط الكامل (Pydantic) في `backend/app/models.py`؛ هذا ملخص تشغيلي.

## POST /api/matrix/layout — شبكة هندسة القوافي والمقاطع

**مدخل:** `{ lines: [{ index, tokens: [{w, syllables}], color_index, inner_indices, tail_index? }] }`
مصدر `color_index`/`inner_indices` هو مباشرة مخرجات `analyzeLinesV1` (عبر
`frontend/src/lib/matrixAdapter.js`) — الخادم لا يحسبها.

**مخرج:** `{ blocks: [{id, line, token_index, text, x, y, width, height, lane, color_index, is_tail, syllables}], connections: [{from_block, to_block, color_index, kind}], lanes, timeline_width }`

- المحور الصادي (`y`/`lane`): ٩ ممرات — ٨ عائلات قافية (٠-٧) + ممر محايد (٨) للكلمات غير القافوية.
- المحور السيني (`x`): خط زمني متصل عبر كل الأبيات (لا يُعاد إلى الصفر بين بيت وآخر)؛ عرض كل كتلة يتناسب مع `syllables`.
- `connections.kind`: `tail_chain` (يربط قوافي النهاية المتتالية من نفس العائلة عبر الأبيات) أو `inner_echo` (يربط قافية داخلية بذيل بيتها).

## POST /api/structure/layout — ترتيب تلقائي للوحة التركيب

**مدخل:** `{ patterns: [{id, label, kind, length_bars}], track_count }`

**مخرج:** `{ patterns: [{...PatternLayout, track, start_bar, end_bar, x, y, width, height, color_token}], track_count, total_bars, timeline_width }`

يُجمَّع كل `kind` (فيرس/هوك/جسر...) في مسار خاص به (بترتيب أول ظهور)،
وتُرصّ أنماط نفس النوع تباعًا بلا تداخل. `color_token` اسم رمزي
(`blue`/`green`/...) يقابل متغيرات `--neon-*` في `styles.css` — لا Hex
مباشر، فتبقى الواجهة مالكة القيم البصرية الفعلية.

## POST /api/structure/validate-move — فحص تداخل عند السحب

**مدخل:** `{ patterns: [...PatternLayout], moving_id, proposed_track, proposed_start_bar }`
(`patterns` هو الترتيب الحالي الكامل من العميل — الخادم بلا حالة، لا يحتفظ به.)

**مخرج:** `{ accepted, track, start_bar, end_bar, x, y, reason? }`

إن لم يتداخل الموضع المقترح مع غيره على نفس المسار: `accepted=true`
بنفس القيم المقترحة. إن تداخل: يُصحَّح لأقرب فجوة خالية على نفس المسار
(`accepted=false` مع `reason`)، أو يعود للموضع الأصلي إن تعذّر إيجاد فجوة
(حماية دفاعية لبيانات عميل غير متسقة).

## POST /api/sequencer/autofill — توزيع كلمات بار على شبكة الإيقاع

**مدخل:** `{ words: [{text, syllables}], steps }` (افتراضي `steps=16`، المدى المسموح ٤-٦٤)

**مخرج:** `{ steps: [{index, active, word?, syllable_part?}], steps_total }`

توزَّع الكلمات على امتدادات متتالية من الخطوات بالتناسب مع عدد مقاطعها؛
الخطوة الأولى من امتداد كل كلمة تحمل `word` (نص الكلمة)، وما بعدها
`syllable_part` (٢، ٣...) لتمييز الامتداد المقطعي. عند تجاوز عدد الكلمات
عدد الخطوات تتدهور الدقة بأمان (بلا خطأ) بدل الفشل.

## التشغيل والاختبار

انظر `backend/README.md` للتشغيل المحلي وخيارات النشر. الاختبارات في
`backend/tests/` (`python -m pytest -q` من داخل `backend/`) تغطي الحالات
الحدّية الثلاث: عدم وجود قافية (الممر المحايد)، تسلسل قوافي عبر أبيات
متعددة، وتصحيح تداخل السحب لأقرب فجوة.

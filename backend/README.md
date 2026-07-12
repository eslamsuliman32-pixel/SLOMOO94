# Maqam Studio API

خادم FastAPI بلا حالة (stateless) — طبقة حساب هندسي فقط. يحوّل تحليلاً
لغويًا جاهزًا (من `frontend/src/lib/rhyme.js`) إلى إحداثيات لثلاث أدوات
الاستوديو: مصفوفة القوافي، لوحة التركيب، ومولّد الإيقاع المقطعي.

لا قاعدة بيانات هنا عن قصد: التخزين يبقى حصرًا في Firestore عبر
`frontend/src/lib/pieces.js` (عقد الوحدات — لا يُزدوَج مالك البيانات).

## التشغيل محليًا

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

يقرأ الخادم `MAQAM_CORS_ORIGINS` (قائمة أصول مفصولة بفواصل) للسماح لمنشأ
الواجهة؛ افتراضيًا `http://localhost:5173,http://127.0.0.1:5173` (Vite dev).

الواجهة تتصل به عبر `VITE_API_URL` (انظر `frontend/src/lib/api.js`).

## الاختبارات

```bash
python -m pytest -q
```

## نقاط النهاية

| المسار | الوظيفة |
|---|---|
| `POST /api/matrix/layout` | إحداثيات كتل المصفوفة (المقاطع/القوافي) على شبكة زمنية |
| `POST /api/structure/layout` | ترتيب تلقائي للأنماط (فيرس/هوك) كمسارات |
| `POST /api/structure/validate-move` | فحص تداخل عند سحب نمط + اقتراح أقرب فجوة خالية |
| `POST /api/sequencer/autofill` | توزيع كلمات بار على شبكة خطوات بالتناسب المقطعي |
| `GET /api/health` | فحص حياة الخادم |

كل استجابة تلتزم شكل `{ok, data, error, meta}` من `docs/MODULE_CONTRACT.md`.

## النشر

لا يُنشر هذا الخادم تلقائيًا مع الواجهة على Vercel (مشروع Vercel الحالي
مضبوط على `frontend/` فقط). للتشغيل الفعلي اختر أحد المسارين:

- **دالة Python بلا خادم على Vercel**: أضف مشروع Vercel منفصل جذره
  `backend/` مع `vercel.json` يوجّه لـ `app.main:app` عبر runtime بايثون.
- **خادم مستقل** (Render/Railway/Fly...): انشر `backend/` كخدمة عادية،
  ثم اضبط `VITE_API_URL` في مشروع الواجهة على رابطها.

بلا أحد الخيارين، لوحات الاستوديو الثلاث (المصفوفة/التركيب/المولّد)
تتحول تلقائيًا لعرض محلي بلا حساب خادم (انظر رسالة الحالة في كل لوحة).

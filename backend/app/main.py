"""نقطة تشغيل خادم مقام — طبقة حساب الإحداثيات لأدوات الاستوديو.
تشغيل محلي: uvicorn app.main:app --reload --port 8000 (من داخل backend/).
الخادم بلا حالة (stateless) — لا قاعدة بيانات هنا؛ التخزين يبقى حصرًا في
Firestore عبر frontend/src/lib/*.js وفق عقد الوحدات (لا ازدواج مالك البيانات)."""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import matrix, structure, sequencer

app = FastAPI(title="Maqam Studio API", version="1.0.0")

_origins = os.environ.get("MAQAM_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins.split(",") if o.strip()],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(matrix.router)
app.include_router(structure.router)
app.include_router(sequencer.router)


@app.get("/api/health")
def health():
    return {"ok": True, "data": {"status": "up"}, "error": None, "meta": {"module": "health", "version": "1.0.0", "took_ms": 0}}

"""عقد الوحدات الموحد (Python) — يطابق docs/MODULE_CONTRACT.md حرفيًا.
كل نقطة نهاية في هذا الخادم تُرجع نفس شكل ModuleResult المستخدم في lib/*.js
بالواجهة: {ok, data, error, meta}. الفشل صريح دائمًا — لا استثناء غير ملتقط."""

import time
from typing import Optional
from pydantic import BaseModel


class ModuleError(BaseModel):
    code: str
    message_ar: str
    recoverable: bool = True


class ModuleMeta(BaseModel):
    module: str
    version: str
    took_ms: int


def ok(data, module: str, version: str, started_at: float) -> dict:
    return {
        "ok": True,
        "data": data,
        "error": None,
        "meta": {"module": module, "version": version, "took_ms": int((time.perf_counter() - started_at) * 1000)},
    }


def fail(code: str, message_ar: str, module: str, version: str, started_at: float, recoverable: bool = True) -> dict:
    return {
        "ok": False,
        "data": None,
        "error": {"code": code, "message_ar": message_ar, "recoverable": recoverable},
        "meta": {"module": module, "version": version, "took_ms": int((time.perf_counter() - started_at) * 1000)},
    }

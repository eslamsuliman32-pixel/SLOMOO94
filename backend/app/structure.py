"""لوحة التركيب الهيكلي (Structure Canvas) — بديل قائمة التشغيل.
يجمّع الأنماط (فيرسات/هوكات) كمسارات على شبكة زمنية بالبارات، ويفحص
تداخل المواضع عند السحب اليدوي مقترحًا أقرب فجوة خالية بدل الرفض الصامت."""

import time
from fastapi import APIRouter

from .contracts import ok, fail
from .models import (
    StructureLayoutRequest, PatternLayout, StructureLayoutData,
    MoveCheckRequest, MoveCheckData,
)

router = APIRouter(prefix="/api/structure", tags=["structure"])

MODULE = "structure-layout"
VERSION = "1.0.0"

# ترميز الألوان الرمزي حسب نوع النمط (يقابل متغيرات --neon-* في الواجهة)
KIND_COLOR_ORDER = ["blue", "green", "pink", "purple", "amber", "teal", "lime", "red"]


def color_for(index: int) -> str:
    return KIND_COLOR_ORDER[index % len(KIND_COLOR_ORDER)]


@router.post("/layout")
def compute_layout(req: StructureLayoutRequest):
    t0 = time.perf_counter()
    try:
        kind_order: list[str] = []
        track_cursor: dict[int, int] = {}
        layouts: list[PatternLayout] = []

        for p in req.patterns:
            if p.kind not in kind_order:
                kind_order.append(p.kind)
            track = kind_order.index(p.kind) % req.track_count
            start_bar = track_cursor.get(track, 0)
            end_bar = start_bar + p.length_bars
            track_cursor[track] = end_bar

            layouts.append(PatternLayout(
                id=p.id, label=p.label, kind=p.kind,
                track=track, start_bar=start_bar, end_bar=end_bar,
                x=start_bar * req.bar_width, y=track * req.track_height,
                width=p.length_bars * req.bar_width, height=req.track_height,
                color_token=color_for(kind_order.index(p.kind)),
            ))

        total_bars = max(track_cursor.values()) if track_cursor else 0
        data = StructureLayoutData(
            patterns=layouts, track_count=req.track_count,
            total_bars=total_bars, timeline_width=total_bars * req.bar_width,
        )
        return ok(data.model_dump(), MODULE, VERSION, t0)
    except Exception:
        return fail("STRUCTURE_LAYOUT_FAILED", "تعذّر ترتيب لوحة التركيب.", MODULE, VERSION, t0)


@router.post("/validate-move")
def validate_move(req: MoveCheckRequest):
    t0 = time.perf_counter()
    try:
        moving = next((p for p in req.patterns if p.id == req.moving_id), None)
        if not moving:
            return fail("PATTERN_NOT_FOUND", "النمط المطلوب تحريكه غير موجود.", MODULE, VERSION, t0)

        length = moving.end_bar - moving.start_bar
        others = [p for p in req.patterns if p.id != req.moving_id and p.track == req.proposed_track]
        others.sort(key=lambda p: p.start_bar)

        def overlaps(start: int) -> bool:
            end = start + length
            return any(start < o.end_bar and end > o.start_bar for o in others)

        def to_layout(track: int, start: int, reason: str | None) -> MoveCheckData:
            return MoveCheckData(
                accepted=reason is None, track=track, start_bar=start, end_bar=start + length,
                x=start * req.bar_width, y=track * req.track_height, reason=reason,
            )

        if not overlaps(req.proposed_start_bar):
            return ok(to_layout(req.proposed_track, req.proposed_start_bar, None).model_dump(), MODULE, VERSION, t0)

        # ابحث عن أقرب فجوة خالية تسع الطول المطلوب (قبل الأول، بين النمطين، أو بعد الأخير)
        candidates = [0] + [o.end_bar for o in others]
        for start in candidates:
            if not overlaps(start):
                return ok(
                    to_layout(req.proposed_track, start, "تم التصحيح لأقرب فجوة خالية — الموضع المطلوب متداخل").model_dump(),
                    MODULE, VERSION, t0,
                )

        # لا فجوة متاحة على هذا المسار: أعد الموضع الأصلي
        return ok(
            to_layout(moving.track, moving.start_bar, "لا فجوة كافية على هذا المسار — أُعيد للموضع السابق").model_dump(),
            MODULE, VERSION, t0,
        )
    except Exception:
        return fail("MOVE_VALIDATION_FAILED", "تعذّر التحقق من صحة الموضع الجديد.", MODULE, VERSION, t0)

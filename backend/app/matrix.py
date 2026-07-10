"""شبكة هندسة القوافي (Rhyme & Syllable Matrix) — بديل مخطط البيانو.
يحوّل تحليل الأسطر الجاهز (من محرك القافية في الواجهة) إلى إحداثيات:
المحور الصادي (lane) = عائلة القافية، المحور السيني (x) = موضع زمني متصل
عبر كل الأبيات، والعرض متناسب مع عدد المقاطع (كطول النوتة في مخطط بيانو)."""

import time
from fastapi import APIRouter

from .contracts import ok, fail
from .models import MatrixLayoutRequest, MatrixBlock, MatrixConnection, MatrixLayoutData

router = APIRouter(prefix="/api/matrix", tags=["matrix"])

MODULE = "matrix-layout"
VERSION = "1.0.0"
NEUTRAL_LANE = 8
LANES_TOTAL = 9  # 0-7 عائلات القافية + 1 محايد


@router.post("/layout")
def compute_layout(req: MatrixLayoutRequest):
    t0 = time.perf_counter()
    try:
        blocks: list[MatrixBlock] = []
        tail_by_color: dict[int, list[str]] = {}
        inner_links: list[MatrixConnection] = []

        cursor = 0.0
        for line in req.lines:
            if not line.tokens:
                continue
            tail_idx = line.tail_index if line.tail_index is not None else len(line.tokens) - 1
            line_start = cursor
            tail_block_id = None

            for ti, tok in enumerate(line.tokens):
                width = max(1, tok.syllables) * req.unit_width
                is_tail = ti == tail_idx
                lane = line.color_index if (line.color_index is not None and is_tail) else NEUTRAL_LANE
                # القوافي الداخلية تُلوَّن بنفس عائلة قافية البيت (تعكس تراكب القافية الممتدة)
                if ti in line.inner_indices and line.color_index is not None:
                    lane = line.color_index

                block_id = f"l{line.index}-t{ti}"
                blocks.append(MatrixBlock(
                    id=block_id, line=line.index, token_index=ti, text=tok.w,
                    x=cursor, y=lane * req.lane_height, width=width, height=req.lane_height,
                    lane=lane, color_index=line.color_index if lane != NEUTRAL_LANE else None,
                    is_tail=is_tail, syllables=max(1, tok.syllables),
                ))

                if is_tail:
                    tail_block_id = block_id
                elif ti in line.inner_indices and line.color_index is not None:
                    inner_links.append(MatrixConnection(
                        from_block=block_id, to_block="",  # يُستكمل بعد معرفة تذييل نفس السطر
                        color_index=line.color_index, kind="inner_echo",
                    ))

                cursor += width

            # اربط أي قافية داخلية بذيل بيتها بعد أن عرفنا معرّف كتلة الذيل
            if tail_block_id:
                for link in inner_links:
                    if link.to_block == "" and link.from_block.startswith(f"l{line.index}-"):
                        link.to_block = tail_block_id

            cursor = cursor + req.line_gap_units * req.unit_width if line.tokens else line_start

        # سلسلة قوافي النهاية عبر الأبيات: صِل كل ظهور بالتالي له بنفس العائلة
        for b in sorted((x for x in blocks if x.is_tail and x.color_index is not None), key=lambda x: x.x):
            tail_by_color.setdefault(b.color_index, []).append(b.id)

        chain_links = [
            MatrixConnection(from_block=ids[i], to_block=ids[i + 1], color_index=color, kind="tail_chain")
            for color, ids in tail_by_color.items()
            for i in range(len(ids) - 1)
        ]

        connections = [l for l in inner_links if l.to_block] + chain_links
        data = MatrixLayoutData(
            blocks=blocks, connections=connections, lanes=LANES_TOTAL,
            timeline_width=cursor,
        )
        return ok(data.model_dump(), MODULE, VERSION, t0)
    except Exception:
        return fail("MATRIX_LAYOUT_FAILED", "تعذّر حساب إحداثيات المصفوفة.", MODULE, VERSION, t0)

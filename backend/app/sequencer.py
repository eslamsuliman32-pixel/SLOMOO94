"""مولّد الإيقاع المقطعي (Syllable Beat Generator) — بديل الـ Step Sequencer.
يوزّع كلمات بار واحد على شبكة خطوات (افتراضيًا 16) بالتناسب مع عدد مقاطع
كل كلمة، فتضيء الخطوة الأولى لكل كلمة وتُظلَّل خطوات امتدادها المقطعي."""

import time
from fastapi import APIRouter

from .contracts import ok, fail
from .models import SequencerAutofillRequest, SequencerStepOut, SequencerAutofillData

router = APIRouter(prefix="/api/sequencer", tags=["sequencer"])

MODULE = "sequencer-autofill"
VERSION = "1.0.0"


@router.post("/autofill")
def autofill(req: SequencerAutofillRequest):
    t0 = time.perf_counter()
    try:
        steps_out: list[SequencerStepOut | None] = [None] * req.steps

        if req.words:
            total_syllables = sum(max(1, w.syllables) for w in req.words)
            cursor = 0
            remaining_steps = req.steps
            n = len(req.words)

            for i, w in enumerate(req.words):
                syl = max(1, w.syllables)
                words_left_after = n - i - 1
                if i == n - 1:
                    span = remaining_steps
                else:
                    span = max(1, round(req.steps * syl / total_syllables))
                    span = min(span, max(1, remaining_steps - words_left_after))

                for j in range(span):
                    idx = cursor + j
                    if idx >= req.steps:
                        break
                    steps_out[idx] = SequencerStepOut(
                        index=idx, active=True,
                        word=w.text if j == 0 else None,
                        syllable_part=None if j == 0 else j + 1,
                    )
                cursor += span
                remaining_steps -= span
                if remaining_steps <= 0 and i < n - 1:
                    break

        final_steps = [s if s is not None else SequencerStepOut(index=i, active=False) for i, s in enumerate(steps_out)]
        data = SequencerAutofillData(steps=final_steps, steps_total=req.steps)
        return ok(data.model_dump(), MODULE, VERSION, t0)
    except Exception:
        return fail("SEQUENCER_AUTOFILL_FAILED", "تعذّر توزيع الكلمات على شبكة الإيقاع.", MODULE, VERSION, t0)

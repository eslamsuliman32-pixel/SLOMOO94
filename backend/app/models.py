"""هياكل البيانات (JSON contracts) لخادم مقام — طبقة حساب الإحداثيات الهندسية
لأدوات الاستوديو الثلاث: مصفوفة القوافي (Matrix)، لوحة التركيب (Structure)،
ومولّد الإيقاع المقطعي (Sequencer). الخادم لا يعيد تحليل القوافي لغويًا —
ذلك محسوب مسبقًا في محرك القافية (frontend/src/lib/rhyme.js) ويُرسَل هنا
جاهزًا؛ مسؤولية هذا الخادم حصرًا: تحويل الدلالة إلى إحداثيات هندسية على
شبكة زمنية، وفحص التداخل، والتوزيع النسبي — دون ازدواج منطق لغوي بلغتين."""

from typing import Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------- Matrix ----

class TokenIn(BaseModel):
    w: str = Field(..., description="نص الكلمة/المقطع")
    syllables: int = Field(1, ge=1, description="عدد المقاطع المحسوبة لهذه الكلمة")


class LineIn(BaseModel):
    index: int
    tokens: list[TokenIn]
    color_index: Optional[int] = Field(None, ge=0, le=7, description="عائلة القافية 0-7، أو null إن لا قافية")
    inner_indices: list[int] = Field(default_factory=list, description="مواضع القوافي الداخلية ضمن tokens")
    tail_index: Optional[int] = Field(None, description="فهرس كلمة القافية؛ افتراضيًا آخر عنصر")


class MatrixLayoutRequest(BaseModel):
    lines: list[LineIn]
    lane_height: float = 46.0
    unit_width: float = 22.0
    line_gap_units: float = 2.0


class MatrixBlock(BaseModel):
    id: str
    line: int
    token_index: int
    text: str
    x: float
    y: float
    width: float
    height: float
    lane: int
    color_index: Optional[int]
    is_tail: bool
    syllables: int


class MatrixConnection(BaseModel):
    from_block: str
    to_block: str
    color_index: int
    kind: str  # "tail_chain" | "inner_echo"


class MatrixLayoutData(BaseModel):
    blocks: list[MatrixBlock]
    connections: list[MatrixConnection]
    lanes: int
    timeline_width: float


# ------------------------------------------------------------- Structure ----

class PatternIn(BaseModel):
    id: str
    label: str
    kind: str = "verse"
    length_bars: int = Field(4, ge=1)


class StructureLayoutRequest(BaseModel):
    patterns: list[PatternIn]
    track_count: int = Field(4, ge=1, le=12)
    bar_width: float = 32.0
    track_height: float = 56.0


class PatternLayout(BaseModel):
    id: str
    label: str
    kind: str
    track: int
    start_bar: int
    end_bar: int
    x: float
    y: float
    width: float
    height: float
    color_token: str  # اسم رمزي (blue/green/purple...) يقابل متغيرات --neon-* في الواجهة، لا Hex مباشر


class StructureLayoutData(BaseModel):
    patterns: list[PatternLayout]
    track_count: int
    total_bars: int
    timeline_width: float


class MoveCheckRequest(BaseModel):
    patterns: list[PatternLayout]
    moving_id: str
    proposed_track: int = Field(..., ge=0)
    proposed_start_bar: int = Field(..., ge=0)
    bar_width: float = 32.0
    track_height: float = 56.0


class MoveCheckData(BaseModel):
    accepted: bool
    track: int
    start_bar: int
    end_bar: int
    x: float
    y: float
    reason: Optional[str] = None


# ------------------------------------------------------------- Sequencer ----

class WordIn(BaseModel):
    text: str
    syllables: int = Field(1, ge=1)


class SequencerAutofillRequest(BaseModel):
    words: list[WordIn]
    steps: int = Field(16, ge=4, le=64)


class SequencerStepOut(BaseModel):
    index: int
    active: bool
    word: Optional[str] = None
    syllable_part: Optional[int] = None


class SequencerAutofillData(BaseModel):
    steps: list[SequencerStepOut]
    steps_total: int

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _line(index, words, color_index=None, inner_indices=None):
    return {
        "index": index,
        "tokens": [{"w": w, "syllables": s} for w, s in words],
        "color_index": color_index,
        "inner_indices": inner_indices or [],
    }


def test_layout_basic_block_count_and_timeline_progresses():
    payload = {
        "lines": [
            _line(0, [("مكتوب", 3), ("قلبي", 2)], color_index=0),
            _line(1, [("مجروح", 3), ("صعبي", 2)], color_index=0),
        ],
    }
    r = client.post("/api/matrix/layout", json=payload)
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    blocks = body["data"]["blocks"]
    assert len(blocks) == 4

    line0_blocks = [b for b in blocks if b["line"] == 0]
    line1_blocks = [b for b in blocks if b["line"] == 1]
    # كل الأبيات تبدأ عند x=0 منطقيًا لكن السطر الثاني يبدأ بعد انتهاء الأول زمنيًا
    assert min(b["x"] for b in line1_blocks) > max(b["x"] for b in line0_blocks)


def test_tail_chain_connects_matching_rhyme_families_across_lines():
    payload = {
        "lines": [
            _line(0, [("كتبت", 2), ("حروف", 2)], color_index=3),
            _line(1, [("عرفت", 2), ("صروف", 2)], color_index=3),
            _line(2, [("بعيد", 2), ("طويل", 2)], color_index=5),
        ],
    }
    r = client.post("/api/matrix/layout", json=payload)
    data = r.json()["data"]
    chains = [c for c in data["connections"] if c["kind"] == "tail_chain"]
    assert len(chains) == 1
    assert chains[0]["color_index"] == 3
    assert chains[0]["from_block"] == "l0-t1"
    assert chains[0]["to_block"] == "l1-t1"


def test_inner_rhyme_links_to_line_tail():
    payload = {
        "lines": [
            _line(0, [("نور", 1), ("في", 1), ("سطور", 1)], color_index=2, inner_indices=[0]),
        ],
    }
    r = client.post("/api/matrix/layout", json=payload)
    data = r.json()["data"]
    inner = [c for c in data["connections"] if c["kind"] == "inner_echo"]
    assert len(inner) == 1
    assert inner[0]["from_block"] == "l0-t0"
    assert inner[0]["to_block"] == "l0-t2"


def test_neutral_lane_for_lines_without_rhyme_family():
    payload = {"lines": [_line(0, [("كلمة", 2)], color_index=None)]}
    r = client.post("/api/matrix/layout", json=payload)
    block = r.json()["data"]["blocks"][0]
    assert block["lane"] == 8
    assert block["color_index"] is None


def test_empty_lines_returns_empty_layout():
    r = client.post("/api/matrix/layout", json={"lines": []})
    body = r.json()
    assert body["ok"] is True
    assert body["data"]["blocks"] == []
    assert body["data"]["connections"] == []

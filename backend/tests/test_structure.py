from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_patterns_grouped_by_kind_into_separate_tracks():
    payload = {
        "patterns": [
            {"id": "v1", "label": "فيرس ١", "kind": "verse", "length_bars": 4},
            {"id": "h1", "label": "هوك", "kind": "hook", "length_bars": 2},
            {"id": "v2", "label": "فيرس ٢", "kind": "verse", "length_bars": 4},
        ],
        "track_count": 4,
    }
    r = client.post("/api/structure/layout", json=payload)
    assert r.status_code == 200
    data = r.json()["data"]
    by_id = {p["id"]: p for p in data["patterns"]}

    assert by_id["v1"]["track"] == by_id["v2"]["track"]
    assert by_id["v1"]["track"] != by_id["h1"]["track"]
    # الفيرس الثاني يبدأ حيث انتهى الأول على نفس المسار (لا تداخل)
    assert by_id["v2"]["start_bar"] == by_id["v1"]["end_bar"]
    assert data["total_bars"] == 8  # مسار الفيرس: 4+4


def test_validate_move_accepts_non_overlapping_position():
    patterns = [
        {"id": "v1", "label": "فيرس ١", "kind": "verse", "track": 0, "start_bar": 0, "end_bar": 4,
         "x": 0, "y": 0, "width": 128, "height": 56, "color_token": "blue"},
    ]
    r = client.post("/api/structure/validate-move", json={
        "patterns": patterns, "moving_id": "v1", "proposed_track": 1, "proposed_start_bar": 0,
    })
    data = r.json()["data"]
    assert data["accepted"] is True
    assert data["track"] == 1
    assert data["start_bar"] == 0


def test_validate_move_snaps_to_nearest_gap_when_overlapping():
    patterns = [
        {"id": "v1", "label": "فيرس ١", "kind": "verse", "track": 0, "start_bar": 0, "end_bar": 4,
         "x": 0, "y": 0, "width": 128, "height": 56, "color_token": "blue"},
        {"id": "h1", "label": "هوك", "kind": "hook", "track": 0, "start_bar": 6, "end_bar": 8,
         "x": 192, "y": 0, "width": 64, "height": 56, "color_token": "green"},
    ]
    # نحاول إسقاط v1 (طوله 4 بارات) عند البار 2 على نفس المسار — يتداخل مع نفسه أصلاً
    # لكن الأهم: نتأكد أن اقتراح موضع يتداخل مع h1 يُصحَّح لفجوة خالية
    r = client.post("/api/structure/validate-move", json={
        "patterns": patterns, "moving_id": "v1", "proposed_track": 0, "proposed_start_bar": 5,
    })
    data = r.json()["data"]
    assert data["accepted"] is False
    assert data["reason"] is not None
    # الفجوة الصالحة التالية بعد h1 (ينتهي عند 8) أو قبل h1 عند 0
    assert data["start_bar"] in (0, 8)


def test_validate_move_snaps_past_a_densely_packed_track():
    # مسار مزدحم بالكامل من البار 0 إلى 6 بلا أي فجوة تسع 4 بارات بينها
    patterns = [
        {"id": "v1", "label": "فيرس ١", "kind": "verse", "track": 0, "start_bar": 10, "end_bar": 14,
         "x": 0, "y": 0, "width": 128, "height": 56, "color_token": "blue"},
        {"id": "a", "label": "أ", "kind": "hook", "track": 0, "start_bar": 0, "end_bar": 2,
         "x": 0, "y": 0, "width": 64, "height": 56, "color_token": "green"},
        {"id": "b", "label": "ب", "kind": "hook", "track": 0, "start_bar": 2, "end_bar": 4,
         "x": 0, "y": 0, "width": 64, "height": 56, "color_token": "green"},
        {"id": "c", "label": "ج", "kind": "hook", "track": 0, "start_bar": 4, "end_bar": 6,
         "x": 0, "y": 0, "width": 64, "height": 56, "color_token": "green"},
    ]
    r = client.post("/api/structure/validate-move", json={
        "patterns": patterns, "moving_id": "v1", "proposed_track": 0, "proposed_start_bar": 1,
    })
    data = r.json()["data"]
    assert data["accepted"] is False
    assert data["reason"] is not None
    # لا فجوة تسع 4 بارات قبل البار 6 (مزدحم)، فيُدفع الموضع لما بعد آخر كتلة مباشرة
    assert data["start_bar"] == 6


def test_unknown_moving_id_fails_explicitly():
    r = client.post("/api/structure/validate-move", json={
        "patterns": [], "moving_id": "ghost", "proposed_track": 0, "proposed_start_bar": 0,
    })
    body = r.json()
    assert body["ok"] is False
    assert body["error"]["code"] == "PATTERN_NOT_FOUND"

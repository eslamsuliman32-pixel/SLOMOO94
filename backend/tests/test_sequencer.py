from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_two_equal_words_split_grid_evenly():
    payload = {"words": [{"text": "مكتوب", "syllables": 2}, {"text": "قلبي", "syllables": 2}], "steps": 4}
    r = client.post("/api/sequencer/autofill", json=payload)
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    steps = body["data"]["steps"]
    assert len(steps) == 4
    assert all(s["active"] for s in steps)
    assert steps[0]["word"] == "مكتوب"
    assert steps[1]["word"] is None and steps[1]["syllable_part"] == 2
    assert steps[2]["word"] == "قلبي"
    assert steps[3]["word"] is None and steps[3]["syllable_part"] == 2


def test_single_word_spans_all_steps():
    r = client.post("/api/sequencer/autofill", json={"words": [{"text": "كلمة", "syllables": 3}], "steps": 8})
    steps = r.json()["data"]["steps"]
    assert len(steps) == 8
    assert all(s["active"] for s in steps)
    assert steps[0]["word"] == "كلمة"


def test_empty_words_returns_fully_inactive_grid():
    r = client.post("/api/sequencer/autofill", json={"words": [], "steps": 16})
    data = r.json()["data"]
    assert data["steps_total"] == 16
    assert len(data["steps"]) == 16
    assert all(not s["active"] for s in data["steps"])


def test_more_words_than_steps_degrades_without_error():
    words = [{"text": f"كلمة{i}", "syllables": 1} for i in range(20)]
    r = client.post("/api/sequencer/autofill", json={"words": words, "steps": 8})
    body = r.json()
    assert body["ok"] is True
    steps = body["data"]["steps"]
    assert len(steps) == 8
    assert sum(1 for s in steps if s["active"]) <= 8


def test_steps_below_minimum_is_rejected_with_validation_error():
    r = client.post("/api/sequencer/autofill", json={"words": [], "steps": 1})
    assert r.status_code == 422

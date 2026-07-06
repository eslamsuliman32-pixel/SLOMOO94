# -*- coding: utf-8 -*-
"""
معمل تحليل مقام — beat_lab.py (v0)
====================================
يشتغل على Kaggle أو Colab (GPU مجاني). الاستخدام:
1) أنشئ Notebook جديدًا على kaggle.com (فعّل GPU من Settings → Accelerator)
2) ارفع ملف البيت (mp3/wav) عبر Add Input → Upload، أو اسحبه لمجلد /kaggle/working
3) الصق محتوى هذا الملف في خلية، عدّل TRACK_PATH، وشغّل
4) حمّل النتائج من مجلد output: المسارات الثلاثة + beat_profile.json
5) ارفع beat_profile.json في تطبيق مقام → ركن التحليل الموسيقي → «استيراد ملف بيت»

المنهجية: HPSS + كشف الأونسيت على مسار الدرامز المعزول (وفق SYSTEM_MAP:
منهج RMS الساذج مرفوض نهائيًا — القرار المعماري الثابت).
"""

# ============ الإعداد ============
TRACK_PATH = "/kaggle/working/beat.mp3"   # ← عدّل لمسار ملفك
OUTPUT_DIR = "/kaggle/working/output"

import subprocess, sys, os, json, glob

def sh(cmd):
    print(">>", cmd)
    subprocess.run(cmd, shell=True, check=True)

# تثبيت الاعتمادات (مرة واحدة لكل جلسة)
sh(f"{sys.executable} -m pip -q install demucs librosa soundfile")

import librosa
import numpy as np
import soundfile as sf

os.makedirs(OUTPUT_DIR, exist_ok=True)
track_name = os.path.splitext(os.path.basename(TRACK_PATH))[0]

# ============ 1) العزل الثلاثي (Demucs v4) ============
print("\n=== المرحلة 1: عزل المسارات (قد تأخذ دقائق) ===")
sh(f'{sys.executable} -m demucs -n htdemucs -o "{OUTPUT_DIR}/stems" "{TRACK_PATH}"')

stem_dir = os.path.join(OUTPUT_DIR, "stems", "htdemucs", track_name)
stems = {name: os.path.join(stem_dir, f"{name}.wav") for name in ["drums", "bass", "other", "vocals"]}

# كشف الفوكال: إن كان شبه صامت (بيت انسترومنتال) يُستبعد — قرار D6
y_voc, sr_voc = librosa.load(stems["vocals"], sr=22050, mono=True)
vocals_present = bool(np.sqrt(np.mean(y_voc ** 2)) > 0.01)
print(f"مسار الفوكال: {'موجود (أغنية مرجعية)' if vocals_present else 'فارغ — بيت انسترومنتال (٣ مسارات)'}")

# ============ 2) التحليل الإيقاعي على مسار الدرامز المعزول ============
print("\n=== المرحلة 2: الشبكة الإيقاعية (HPSS + Onsets) ===")
y, sr = librosa.load(stems["drums"], sr=44100, mono=True)
duration = float(len(y) / sr)

# HPSS: نعزل المكوّن الإيقاعي النقي قبل أي كشف (المنهج المعتمد)
_, y_perc = librosa.effects.hpss(y)

tempo, beat_frames = librosa.beat.beat_track(y=y_perc, sr=sr, units="frames")
beat_times = librosa.frames_to_time(beat_frames, sr=sr)
tempo = float(np.atleast_1d(tempo)[0])

# افتراض 4/4 في v0: أول كل مجموعة أربع ضربات downbeat (يُصحَّح يدويًا عبر overrides لاحقًا)
beats = []
for i, t in enumerate(beat_times):
    beats.append({
        "t": round(float(t), 3),
        "type": "downbeat" if i % 4 == 0 else "beat",
        "bar": i // 4 + 1,
        "pos": i % 4 + 1,
    })

# أونسيت Spectral Flux على المكوّن الإيقاعي
onset_env = librosa.onset.onset_strength(y=y_perc, sr=sr)
onset_times = librosa.frames_to_time(
    librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr), sr=sr
)
onsets = [round(float(t), 3) for t in onset_times]

# ============ 3) خريطة الفراغات (السلوتات) ============
# فجوة > 0.35 ثانية بين أونسيتين = سلوت قابل للملء؛ السعة من سرعة نطق 2.5–5.5 مقطع/ثانية
print("=== المرحلة 3: خريطة الفراغات ===")
slots, slot_id = [], 1
points = [0.0] + onsets + [duration]
for a, b in zip(points, points[1:]):
    gap = b - a
    if gap >= 0.35:
        slots.append({
            "id": f"slot_{slot_id:03d}",
            "start": round(a, 3),
            "duration": round(gap, 3),
            "capacity_syllables": {
                "min": max(1, int(gap * 2.5)),
                "max": max(2, int(gap * 5.5)),
            },
        })
        slot_id += 1

# ============ 4) منحنى الطاقة (مختصر داخل الملف) ============
y_full, _ = librosa.load(TRACK_PATH, sr=22050, mono=True)
hop = int(22050 * 0.25)  # نقطة كل ربع ثانية — خفيف وكافٍ للعرض
rms = librosa.feature.rms(y=y_full, hop_length=hop)[0]
energy = [round(float(v), 4) for v in (rms / (rms.max() or 1))]

# ============ 5) كتابة Beat Profile (وفق docs/BEAT_PROFILE_SPEC.md) ============
profile = {
    "schema_version": 1,
    "track_id": f"trk_{track_name}",
    "meta": {
        "title": track_name,
        "duration_sec": round(duration, 2),
        "sample_rate": sr,
        "lab": "kaggle-v0",
    },
    "stems": {
        "drums": {"file": "drums.wav"},
        "bass": {"file": "bass.wav"},
        "melody": {"file": "other.wav"},
        "vocals": {"present": vocals_present},
    },
    "rhythm": {
        "bpm": round(tempo, 1),
        "time_signature": "4/4 (مفترض v0)",
        "beats": beats,
        "onsets_count": len(onsets),
    },
    "slots": slots,
    "energy": {"resolution_sec": 0.25, "curve": energy},
}

out_json = os.path.join(OUTPUT_DIR, "beat_profile.json")
with open(out_json, "w", encoding="utf-8") as f:
    json.dump(profile, f, ensure_ascii=False, indent=1)

print("\n" + "=" * 50)
print(f"✓ BPM: {profile['rhythm']['bpm']} | ضربات: {len(beats)} | سلوتات: {len(slots)}")
print(f"✓ Beat Profile: {out_json}")
print(f"✓ المسارات المعزولة: {stem_dir}")
print("حمّل beat_profile.json وارفعه في مقام → التحليل الموسيقي → استيراد")

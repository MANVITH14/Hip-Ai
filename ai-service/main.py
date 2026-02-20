import math
import os
from typing import Dict, Tuple

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile

app = FastAPI(title="HipAlign AI Service", version="1.0.0")

PIXEL_TO_MM = float(os.getenv("PIXEL_TO_MM", "0.05"))
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024


def calculate_distance(p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
    return math.sqrt((p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2)


def pixels_to_mm(px: float) -> float:
    return px * PIXEL_TO_MM


def mm_to_cm(mm: float) -> float:
    return mm / 10.0


def check_symmetry(area_left: float, area_right: float) -> Tuple[float, bool]:
    if area_left <= 0 or area_right <= 0:
        raise ValueError("Foramen areas must be > 0.")
    avg_area = (area_left + area_right) / 2.0
    deviation_pct = abs(area_left - area_right) / avg_area * 100.0
    return deviation_pct, deviation_pct <= 10.0


def detect_mock_landmarks(image: np.ndarray) -> Dict[str, Dict[str, float]]:
    h, w = image.shape[:2]

    # Fixed mock coordinates in pixels (deterministic by design).
    # Distances:
    # coccyx -> pubic_symphysis = 400 px = 20 mm = 2.0 cm (PASS)
    # left_trochanter_start -> left_trochanter_end = 60 px = 3 mm (PASS)
    base = {
        "coccyx": {"x": 512.0, "y": 220.0},
        "pubic_symphysis": {"x": 512.0, "y": 620.0},
        "left_trochanter_start": {"x": 360.0, "y": 700.0},
        "left_trochanter_end": {"x": 360.0, "y": 760.0},
    }

    # Keep points inside current image if a smaller image is uploaded.
    for key, point in base.items():
        point["x"] = float(max(0.0, min(point["x"], w - 1)))
        point["y"] = float(max(0.0, min(point["y"], h - 1)))
        base[key] = point

    return base


def evaluate_results(area_left: float, area_right: float, landmarks: Dict[str, Dict[str, float]]) -> Dict:
    symmetry_deviation_pct, symmetry_pass = check_symmetry(area_left, area_right)

    coccyx_px = calculate_distance(
        (landmarks["coccyx"]["x"], landmarks["coccyx"]["y"]),
        (landmarks["pubic_symphysis"]["x"], landmarks["pubic_symphysis"]["y"]),
    )
    coccyx_cm = mm_to_cm(pixels_to_mm(coccyx_px))
    coccyx_pass = 1.0 <= coccyx_cm <= 3.0

    trochanter_px = calculate_distance(
        (landmarks["left_trochanter_start"]["x"], landmarks["left_trochanter_start"]["y"]),
        (landmarks["left_trochanter_end"]["x"], landmarks["left_trochanter_end"]["y"]),
    )
    trochanter_mm = pixels_to_mm(trochanter_px)
    trochanter_pass = trochanter_mm < 5.0

    overall_pass = symmetry_pass and coccyx_pass and trochanter_pass

    # Confidence derived from symmetry deviation only, clamped to [0, 1].
    confidence = max(0.0, min(1.0, 1.0 - (symmetry_deviation_pct / 10.0)))

    return {
        "symmetryScore": round(symmetry_deviation_pct, 4),
        "symmetryPass": symmetry_pass,
        "coccyxDistanceCm": round(coccyx_cm, 4),
        "coccyxPass": coccyx_pass,
        "trochanterSizeMm": round(trochanter_mm, 4),
        "trochanterPass": trochanter_pass,
        "overallPass": overall_pass,
        "confidence": round(confidence, 4),
        "landmarks": landmarks,
        "calibration": {"pixelToMm": PIXEL_TO_MM},
    }


@app.get("/health")
def health():
    return {"status": "ok", "service": "hipalign-ai-service"}


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are allowed.")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Image exceeds 10MB size limit.")

    np_arr = np.frombuffer(content, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Invalid image data.")

    landmarks = detect_mock_landmarks(image)

    # Deterministic mock measurements for obturator foramen area (pixels^2).
    area_left = 16000.0
    area_right = 15200.0

    try:
        result = evaluate_results(area_left, area_right, landmarks)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return result

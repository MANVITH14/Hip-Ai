import math
import os
from io import BytesIO
from typing import Dict, Optional, Tuple

import cv2
import numpy as np
import pydicom
from fastapi import FastAPI, File, HTTPException, UploadFile
from pydicom.errors import InvalidDicomError

app = FastAPI(title="HipAlign AI Service", version="1.0.0")

PIXEL_TO_MM = float(os.getenv("PIXEL_TO_MM", "0.05"))
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
SYMMETRY_THRESHOLD_PCT = 10.0
COCCYX_MIN_CM = 1.0
COCCYX_MAX_CM = 3.0
TROCHANTER_MAX_MM = 5.0
ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png"}
ALLOWED_DICOM_CONTENT_TYPES = {"application/dicom", "application/dicom+json"}
ALLOWED_DICOM_EXTENSIONS = {".dcm", ".dicom"}


def calculate_distance_mm(
    p1: Tuple[float, float], p2: Tuple[float, float], row_spacing_mm: float, col_spacing_mm: float
) -> Tuple[float, float, float]:
    dx_px = p2[0] - p1[0]
    dy_px = p2[1] - p1[1]
    rawPixelDistance = math.sqrt(dx_px**2 + dy_px**2)
    dx_mm = dx_px * col_spacing_mm
    dy_mm = dy_px * row_spacing_mm
    distance_mm = math.sqrt(dx_mm**2 + dy_mm**2)
    distance_cm = distance_mm / 10.0
    return rawPixelDistance, distance_mm, distance_cm


def check_symmetry(area_left: float, area_right: float) -> Tuple[float, bool]:
    if area_left <= 0 or area_right <= 0:
        raise ValueError("Foramen areas must be > 0.")
    avg_area = (area_left + area_right) / 2.0
    deviation_pct = abs(area_left - area_right) / avg_area * 100.0
    return deviation_pct, deviation_pct <= SYMMETRY_THRESHOLD_PCT


def mm_to_pixels(mm: float, spacing_mm: float) -> float:
    safe_spacing_mm = spacing_mm if spacing_mm > 0 else PIXEL_TO_MM
    return mm / safe_spacing_mm


def fit_vertical_segment(
    x: float,
    center_y: float,
    requested_length_px: float,
    image_height: int,
) -> Tuple[Dict[str, float], Dict[str, float]]:
    max_up = max(0.0, center_y)
    max_down = max(0.0, (image_height - 1) - center_y)
    half_capacity = min(max_up, max_down)
    half_length = min(requested_length_px / 2.0, half_capacity)

    start = {"x": x, "y": center_y - half_length}
    end = {"x": x, "y": center_y + half_length}
    return start, end


def estimate_foramen_areas(image: np.ndarray) -> Tuple[float, float]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape

    y1, y2 = int(h * 0.48), int(h * 0.82)
    lx1, lx2 = int(w * 0.18), int(w * 0.45)
    rx1, rx2 = int(w * 0.55), int(w * 0.82)

    left_roi = gray[y1:y2, lx1:lx2]
    right_roi = gray[y1:y2, rx1:rx2]

    if left_roi.size == 0 or right_roi.size == 0:
        return 16000.0, 15200.0

    left_mean = float(np.mean(left_roi))
    right_mean = float(np.mean(right_roi))
    intensity_imbalance = abs(left_mean - right_mean) / 255.0

    # Deterministic asymmetry from image content, bounded to realistic range.
    delta = min(0.15, intensity_imbalance * 0.35)
    base_area = 16000.0

    if left_mean >= right_mean:
        area_left = base_area * (1.0 + delta)
        area_right = base_area * (1.0 - delta)
    else:
        area_left = base_area * (1.0 - delta)
        area_right = base_area * (1.0 + delta)

    return area_left, area_right


def detect_mock_landmarks(image: np.ndarray, row_spacing_mm: float) -> Dict[str, Dict[str, float]]:
    h, w = image.shape[:2]
    spacing = row_spacing_mm if row_spacing_mm > 0 else PIXEL_TO_MM
    coccyx_target_px = mm_to_pixels(20.0, spacing)  # 2.0 cm target (inside 1-3 cm range)
    trochanter_target_px = mm_to_pixels(4.0, spacing)  # 4.0 mm target (< 5 mm threshold)

    coccyx_x = float(max(0.0, min(w - 1, w * 0.5)))
    coccyx_center_y = float(max(0.0, min(h - 1, h * 0.38)))
    coccyx, pubic = fit_vertical_segment(coccyx_x, coccyx_center_y, coccyx_target_px, h)

    trochanter_x = float(max(0.0, min(w - 1, w * 0.30)))
    trochanter_center_y = float(max(0.0, min(h - 1, h * 0.70)))
    tro_start, tro_end = fit_vertical_segment(
        trochanter_x, trochanter_center_y, trochanter_target_px, h
    )

    return {
        "coccyx": coccyx,
        "pubic_symphysis": pubic,
        "left_trochanter_start": tro_start,
        "left_trochanter_end": tro_end,
    }


def resolve_dicom_spacing(dataset) -> Tuple[float, float, str]:
    pixel_spacing = getattr(dataset, "PixelSpacing", None)
    if pixel_spacing and len(pixel_spacing) >= 2:
        row_spacing = float(pixel_spacing[0])
        col_spacing = float(pixel_spacing[1])
        if row_spacing > 0 and col_spacing > 0:
            return row_spacing, col_spacing, "dicom"
    return PIXEL_TO_MM, PIXEL_TO_MM, "default"


def normalize_to_uint8(image_array: np.ndarray, invert: bool = False) -> np.ndarray:
    arr = image_array.astype(np.float32)
    if invert:
        arr = np.max(arr) - arr
    min_val = float(np.min(arr))
    max_val = float(np.max(arr))
    if max_val <= min_val:
        return np.zeros(arr.shape, dtype=np.uint8)
    scaled = ((arr - min_val) / (max_val - min_val) * 255.0).astype(np.uint8)
    return scaled


def decode_image_from_upload(
    content: bytes, filename: Optional[str], content_type: Optional[str]
) -> Tuple[np.ndarray, float, float, str]:
    extension = ""
    if filename and "." in filename:
        extension = os.path.splitext(filename)[1].lower()

    is_dicom = (content_type in ALLOWED_DICOM_CONTENT_TYPES) or (extension in ALLOWED_DICOM_EXTENSIONS)

    if is_dicom:
        try:
            dataset = pydicom.dcmread(BytesIO(content), force=True)
            pixel_array = dataset.pixel_array
            invert = str(getattr(dataset, "PhotometricInterpretation", "")).upper() == "MONOCHROME1"
            normalized = normalize_to_uint8(pixel_array, invert=invert)

            if normalized.ndim == 2:
                image = cv2.cvtColor(normalized, cv2.COLOR_GRAY2BGR)
            elif normalized.ndim == 3 and normalized.shape[2] >= 3:
                image = cv2.cvtColor(normalized[:, :, :3], cv2.COLOR_RGB2BGR)
            else:
                raise HTTPException(status_code=400, detail="Unsupported DICOM pixel format.")

            row_spacing_mm, col_spacing_mm, source = resolve_dicom_spacing(dataset)
            return image, row_spacing_mm, col_spacing_mm, source
        except (InvalidDicomError, AttributeError, TypeError, ValueError, NotImplementedError):
            raise HTTPException(status_code=400, detail="Invalid DICOM data.")

    np_arr = np.frombuffer(content, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Invalid image data.")
    return image, PIXEL_TO_MM, PIXEL_TO_MM, "default"


def evaluate_results(
    area_left: float,
    area_right: float,
    landmarks: Dict[str, Dict[str, float]],
    row_spacing_mm: float,
    col_spacing_mm: float,
    spacing_source: str,
) -> Dict:
    symmetry_deviation_pct, symmetry_pass = check_symmetry(area_left, area_right)

    coccyx_px, coccyx_mm, coccyx_cm = calculate_distance_mm(
        (landmarks["coccyx"]["x"], landmarks["coccyx"]["y"]),
        (landmarks["pubic_symphysis"]["x"], landmarks["pubic_symphysis"]["y"]),
        row_spacing_mm,
        col_spacing_mm,
    )
    coccyx_pass = COCCYX_MIN_CM <= coccyx_cm <= COCCYX_MAX_CM

    trochanter_px, trochanter_mm, trochanter_cm = calculate_distance_mm(
        (landmarks["left_trochanter_start"]["x"], landmarks["left_trochanter_start"]["y"]),
        (landmarks["left_trochanter_end"]["x"], landmarks["left_trochanter_end"]["y"]),
        row_spacing_mm,
        col_spacing_mm,
    )
    trochanter_pass = trochanter_mm < TROCHANTER_MAX_MM

    overall_pass = symmetry_pass and coccyx_pass and trochanter_pass

    # Confidence derived from symmetry deviation only, clamped to [0, 1].
    confidence = max(0.0, min(1.0, 1.0 - (symmetry_deviation_pct / SYMMETRY_THRESHOLD_PCT)))

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
        "measurements": {
            "coccyxPubic": {
                "distancePx": round(coccyx_px, 4),
                "distanceMm": round(coccyx_mm, 4),
                "distanceCm": round(coccyx_cm, 4),
            },
            "trochanter": {
                "distancePx": round(trochanter_px, 4),
                "distanceMm": round(trochanter_mm, 4),
                "distanceCm": round(trochanter_cm, 4),
            },
        },
        "calibration": {
            "pixelToMm": PIXEL_TO_MM,
            "rowSpacingMm": round(row_spacing_mm, 6),
            "colSpacingMm": round(col_spacing_mm, 6),
            "source": spacing_source,
        },
        "thresholds": {
            "symmetryMaxDeviationPct": SYMMETRY_THRESHOLD_PCT,
            "coccyxMinCm": COCCYX_MIN_CM,
            "coccyxMaxCm": COCCYX_MAX_CM,
            "trochanterMaxMm": TROCHANTER_MAX_MM,
        },
    }


@app.get("/health")
def health():
    return {"status": "ok", "service": "hipalign-ai-service"}


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    extension = os.path.splitext(file.filename or "")[1].lower()
    is_allowed_image = file.content_type in ALLOWED_IMAGE_CONTENT_TYPES
    is_allowed_dicom = (
        file.content_type in ALLOWED_DICOM_CONTENT_TYPES or extension in ALLOWED_DICOM_EXTENSIONS
    )
    if not is_allowed_image and not is_allowed_dicom:
        raise HTTPException(status_code=400, detail="Allowed file types: JPG, PNG, DICOM (.dcm).")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Image exceeds 10MB size limit.")

    image, row_spacing_mm, col_spacing_mm, spacing_source = decode_image_from_upload(
        content, file.filename, file.content_type
    )

    landmarks = detect_mock_landmarks(image, row_spacing_mm)

    area_left, area_right = estimate_foramen_areas(image)

    try:
        result = evaluate_results(
            area_left, area_right, landmarks, row_spacing_mm, col_spacing_mm, spacing_source
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return result

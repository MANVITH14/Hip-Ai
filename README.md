# HIP ALIGN AI

Hip X-ray positioning analysis system with:
- `frontend` (React + Vite)
- `backend` (Node.js + Express + Prisma)
- `ai-service` (FastAPI + OpenCV)

## Supported Upload Types

- JPG / JPEG
- PNG
- DICOM (`.dcm`, `.dicom`)

Webcam capture is removed. Upload-only workflow is used.

## Project Structure

- `frontend/` UI, annotation canvas, debug grid toggle
- `backend/` auth, upload, persistence, AI proxy integration
- `ai-service/` image/DICOM analysis and measurement logic

## Run Locally

## 1) Frontend

```bash
cd frontend
npm install
npm run dev
```

## 2) Backend

```bash
cd backend
npm install
npm run dev
```

## 3) AI Service

```bash
cd ai-service
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8001
```

## Notes

- DICOM spacing uses:
  - `row_spacing = PixelSpacing[0]`
  - `col_spacing = PixelSpacing[1]`
- Distance conversion:
  - `dx_mm = (x2 - x1) * col_spacing`
  - `dy_mm = (y2 - y1) * row_spacing`
- Annotation rendering uses natural image coordinates on canvas internal resolution.
- Debug mode: enable **Show Debug Grid** in Dashboard to visualize 50px grid, coordinate labels, natural size, and spacing metadata.

## Environment Caveat

If you are on Python 3.8, some newer pinned package versions may not resolve in a clean install. Python 3.10+ is recommended.

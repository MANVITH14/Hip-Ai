import fs from "node:fs";
import path from "node:path";
import axios from "axios";
import FormData from "form-data";
import { env } from "../config/env";
import { AppError } from "../utils/app-error";

export type AIAnalyzeResponse = {
  symmetryScore: number;
  symmetryPass: boolean;
  coccyxDistanceCm: number;
  coccyxPass: boolean;
  trochanterSizeMm: number;
  trochanterPass: boolean;
  overallPass: boolean;
  confidence: number;
  landmarks?: Record<string, { x: number; y: number }>;
  measurements?: {
    coccyxPubic?: {
      distancePx: number;
      distanceMm: number;
      distanceCm: number;
    };
    trochanter?: {
      distancePx: number;
      distanceMm: number;
      distanceCm: number;
    };
  };
  calibration?: {
    pixelToMm?: number;
    rowSpacingMm?: number;
    colSpacingMm?: number;
    source?: "dicom" | "default";
  };
};

export async function analyzeImageWithAI(imagePath: string): Promise<AIAnalyzeResponse> {
  if (!fs.existsSync(imagePath)) {
    throw new AppError("Image file not found on server", 404);
  }

  const form = new FormData();
  form.append("file", fs.createReadStream(imagePath), path.basename(imagePath));

  try {
    const response = await axios.post<AIAnalyzeResponse>(env.AI_SERVICE_URL, form, {
      headers: form.getHeaders(),
      timeout: 15000
    });
    return response.data;
  } catch {
    throw new AppError("AI service is unavailable or returned invalid response", 502);
  }
}

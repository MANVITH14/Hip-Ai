export type User = {
  id: string;
  email: string;
  name?: string | null;
};

export type AuthResponse = {
  message: string;
  token: string;
  user: User;
};

export type AIResult = {
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
  thresholds?: {
    symmetryMaxDeviationPct: number;
    coccyxMinCm: number;
    coccyxMaxCm: number;
    trochanterMaxMm: number;
  };
};

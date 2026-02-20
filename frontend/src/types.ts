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
};

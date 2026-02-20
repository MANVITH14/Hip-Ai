import type { AIResult, AuthResponse } from "../types";

async function parseJson<T>(response: Response): Promise<T> {
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || json.detail || "Request failed");
  }
  return json as T;
}

export async function registerUser(payload: {
  email: string;
  password: string;
  name?: string;
}): Promise<void> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  await parseJson<{ message: string }>(response);
}

export async function loginUser(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseJson<AuthResponse>(response);
}

export async function uploadForPersistence(file: File, token: string): Promise<void> {
  const form = new FormData();
  form.append("image", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  await parseJson(response);
}

export async function analyzeWithAiService(file: File): Promise<AIResult> {
  const form = new FormData();
  form.append("file", file);

  const response = await fetch("/ai/analyze", {
    method: "POST",
    body: form
  });
  return parseJson<AIResult>(response);
}

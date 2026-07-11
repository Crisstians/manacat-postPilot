import { apiUrl } from "../config/api";
import type { AuthSession } from "../shared/auth";

interface ApiErrorBody {
  error?: string;
  code?: string;
}

interface LoginResponse {
  data: AuthSession;
}

const parseError = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return body.error ?? "Cererea a eșuat.";
  } catch {
    return "Cererea a eșuat.";
  }
};

const postJson = async <T>(path: string, body: unknown): Promise<T> => {
  const response = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return (await response.json()) as T;
};

export const login = async (email: string, password: string): Promise<AuthSession> => {
  const result = await postJson<LoginResponse>("/auth/login", { email, password });
  return result.data;
};

export const refreshSession = async (refreshToken: string): Promise<AuthSession> => {
  const result = await postJson<LoginResponse>("/auth/refresh", { refreshToken });
  return result.data;
};

export const logout = async (refreshToken: string): Promise<void> => {
  await postJson<{ data: { success: boolean } }>("/auth/logout", { refreshToken });
};

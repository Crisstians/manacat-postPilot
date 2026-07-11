const DEFAULT_API_URL = "https://server-manacat-production.up.railway.app";

export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? DEFAULT_API_URL).replace(/\/$/, "");

export const apiUrl = (path: string): string => `${API_BASE_URL}/api/v1${path}`;

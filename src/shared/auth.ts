export type UserRole = "ADMIN" | "EMPLOYEE";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export const AUTH_STORAGE_KEY = "manacat_auth_session";

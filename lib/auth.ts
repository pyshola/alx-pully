import { User } from "@/types";

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export const AUTH_STORAGE_KEY = "auth_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_STORAGE_KEY);
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_STORAGE_KEY, token);
}

export function removeStoredToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch {
    return true;
  }
}

export function decodeToken(token: string): any {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export function getUserFromToken(token: string): User | null {
  const payload = decodeToken(token);
  if (!payload || !payload.user) return null;
  return payload.user;
}

export async function refreshToken(): Promise<string | null> {
  try {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      throw new AuthError("Failed to refresh token");
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error("Token refresh failed:", error);
    return null;
  }
}

export async function validateSession(): Promise<User | null> {
  const token = getStoredToken();

  if (!token) return null;

  if (isTokenExpired(token)) {
    const newToken = await refreshToken();
    if (!newToken) {
      removeStoredToken();
      return null;
    }
    setStoredToken(newToken);
    return getUserFromToken(newToken);
  }

  return getUserFromToken(token);
}

export function createAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: createAuthHeaders(),
      credentials: "include",
    });
  } catch (error) {
    console.error("Logout request failed:", error);
  } finally {
    removeStoredToken();
    // Redirect to login page
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }
}

export function requireAuth(): User {
  const token = getStoredToken();
  if (!token || isTokenExpired(token)) {
    throw new AuthError("Authentication required", "AUTH_REQUIRED");
  }

  const user = getUserFromToken(token);
  if (!user) {
    throw new AuthError("Invalid authentication", "INVALID_TOKEN");
  }

  return user;
}

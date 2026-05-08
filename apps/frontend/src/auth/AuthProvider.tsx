import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./auth-context";
import { AuthResponse, AuthUser } from "./auth-types";

const ACCESS_TOKEN_KEY = "erp.accessToken";
const REFRESH_TOKEN_KEY = "erp.refreshToken";

function saveAuth(response: AuthResponse) {
  localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
}

function clearAuthStorage() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem(ACCESS_TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      throw new Error("No refresh token available.");
    }

    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      throw new Error("Session refresh failed.");
    }

    const data = (await response.json()) as AuthResponse;
    saveAuth(data);
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.accessToken;
  }, []);

  const authFetch = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const token = accessToken ?? localStorage.getItem(ACCESS_TOKEN_KEY);
      const headers = new Headers(init.headers);
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      let response = await fetch(input, { ...init, headers });
      if (response.status !== 401) {
        return response;
      }

      const nextToken = await refresh();
      headers.set("Authorization", `Bearer ${nextToken}`);
      response = await fetch(input, { ...init, headers });
      return response;
    },
    [accessToken, refresh]
  );

  const login = useCallback(async (identifier: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password })
    });

    if (!response.ok) {
      throw new Error("Invalid email or password.");
    }

    const data = (await response.json()) as AuthResponse;
    saveAuth(data);
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    clearAuthStorage();
    setAccessToken(null);
    setUser(null);

    if (refreshToken) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken })
      }).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        if (!localStorage.getItem(ACCESS_TOKEN_KEY) && !localStorage.getItem(REFRESH_TOKEN_KEY)) {
          return;
        }

        const response = await authFetch("/api/auth/me");
        if (!response.ok) {
          throw new Error("Unable to load current user.");
        }

        const currentUser = (await response.json()) as AuthUser;
        if (active) {
          setUser(currentUser);
        }
      } catch {
        clearAuthStorage();
        if (active) {
          setAccessToken(null);
          setUser(null);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, [authFetch]);

  const value = useMemo(
    () => ({ user, accessToken, isLoading, login, logout, authFetch }),
    [accessToken, authFetch, isLoading, login, logout, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

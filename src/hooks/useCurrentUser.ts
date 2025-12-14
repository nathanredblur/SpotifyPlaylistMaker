/**
 * Hook to get the current authenticated user's information
 * Also handles OAuth callback (token in URL hash)
 */

import { useState, useEffect, useCallback } from "react";
import {
  getAccessToken,
  clearAccessToken,
  setAccessToken,
} from "@/lib/spotify-auth";
import { STORAGE_KEYS } from "@/config/constants";

export interface CurrentUser {
  id: string;
  displayName: string;
  email: string | null;
  profileImage: string | null;
  role: "admin" | "regular";
  isAdmin: boolean;
  lastSyncAt: string | null;
}

export interface UseCurrentUserResult {
  user: CurrentUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  logout: () => void;
}

/**
 * Process OAuth callback from URL hash
 * Returns the token if found and processed, null otherwise
 */
function processOAuthCallback(): string | null {
  if (typeof window === "undefined") return null;

  const hash = window.location.hash;
  if (!hash) return null;

  const params = new URLSearchParams(hash.substring(1));
  const accessToken = params.get("access_token");
  const expiresIn = params.get("expires_in");
  const error = params.get("error");

  // Handle OAuth error
  if (error) {
    console.error("OAuth error:", error);
    // Clean up URL
    window.history.replaceState(null, "", window.location.pathname);
    return null;
  }

  // Process access token
  if (accessToken) {
    console.log("✅ Processing OAuth callback, storing token...");

    // Store the token using the auth helper
    try {
      setAccessToken(accessToken, parseInt(expiresIn || "3600", 10));
    } catch {
      // Fallback to direct localStorage if setAccessToken fails
      const tokenData = {
        token: accessToken,
        expiresAt: Date.now() + parseInt(expiresIn || "3600", 10) * 1000,
        createdAt: Date.now(),
      };
      localStorage.setItem(
        STORAGE_KEYS.ACCESS_TOKEN,
        JSON.stringify(tokenData)
      );
    }

    // Clean up URL (remove hash)
    window.history.replaceState(null, "", window.location.pathname);

    return accessToken;
  }

  return null;
}

export function useCurrentUser(): UseCurrentUserResult {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async (token?: string) => {
    const accessToken = token || getAccessToken();

    if (!accessToken) {
      setUser(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          clearAccessToken();
          setUser(null);
          setError(null);
        } else {
          const data = await response.json();
          setError(data.message || "Failed to fetch user");
        }
        return;
      }

      const data = await response.json();

      if (data.success && data.user) {
        setUser({
          id: data.user.id,
          displayName: data.user.displayName,
          email: data.user.email,
          profileImage: data.user.profileImage,
          role: data.user.role,
          isAdmin: data.user.isAdmin,
          lastSyncAt: data.user.lastSyncAt,
        });
      }
    } catch (err) {
      console.error("Error fetching user:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearAccessToken();
    setUser(null);
    setError(null);
    // Reload to reset app state
    window.location.reload();
  }, []);

  // Initial load: check for OAuth callback, then fetch user
  useEffect(() => {
    const initAuth = async () => {
      // First, check for OAuth callback in URL hash
      const callbackToken = processOAuthCallback();

      // Fetch user (with callback token if present, or from localStorage)
      await fetchUser(callbackToken || undefined);
    };

    initAuth();
  }, [fetchUser]);

  return {
    user,
    isLoading,
    isAuthenticated: user !== null,
    error,
    refetch: () => fetchUser(),
    logout,
  };
}

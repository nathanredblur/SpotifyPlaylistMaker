import { getAuthorizationUrl } from "@/config/spotify";

/**
 * Redirects the user to Spotify's authorization page
 * @throws {ConfigurationError} If Spotify configuration is invalid
 */
export function authorizeSpotify(): void {
  try {
    const authUrl = getAuthorizationUrl();
    window.location.href = authUrl;
  } catch (error) {
    // Log the error and show user-friendly message
    console.error("Failed to authorize with Spotify:", error);

    if (error instanceof Error) {
      alert(
        `Configuration Error:\n\n${error.message}\n\n` +
          `Please check your .env file and restart the development server.`
      );
    }

    throw error;
  }
}

const STORAGE_KEY = "spotify_access_token" as const;

interface StoredToken {
  token: string;
  expiresAt: number;
  createdAt: number;
}

/**
 * Validates a stored token object
 */
function isValidStoredToken(data: unknown): data is StoredToken {
  if (!data || typeof data !== "object") return false;

  const token = data as Record<string, unknown>;
  return (
    typeof token.token === "string" &&
    typeof token.expiresAt === "number" &&
    typeof token.createdAt === "number" &&
    token.token.length > 0
  );
}

/**
 * Gets the stored access token if it exists and is valid
 * @returns The access token or null if not found/expired
 */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const data: unknown = JSON.parse(stored);

    if (!isValidStoredToken(data)) {
      console.warn("Invalid token data in localStorage, clearing...");
      clearAccessToken();
      return null;
    }

    // Check if token is expired
    if (Date.now() >= data.expiresAt) {
      console.info("Access token expired, clearing...");
      clearAccessToken();
      return null;
    }

    return data.token;
  } catch (error) {
    console.error("Error reading access token:", error);
    clearAccessToken();
    return null;
  }
}

/**
 * Stores the access token with expiration time
 * @param token - The Spotify access token
 * @param expiresIn - Token lifetime in seconds (default: 3600 = 1 hour)
 * @throws {Error} If token is empty or expiresIn is invalid
 */
export function setAccessToken(token: string, expiresIn = 3600): void {
  if (typeof window === "undefined") return;

  if (!token || token.trim() === "") {
    throw new Error("Cannot store empty access token");
  }

  if (expiresIn <= 0) {
    throw new Error("Token expiration time must be positive");
  }

  const now = Date.now();
  const tokenData: StoredToken = {
    token: token.trim(),
    expiresAt: now + expiresIn * 1000,
    createdAt: now,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tokenData));
  } catch (error) {
    console.error("Error storing access token:", error);
    throw new Error("Failed to store access token in localStorage");
  }
}

/**
 * Removes the stored access token
 */
export function clearAccessToken(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing access token:", error);
  }
}

/**
 * Checks if the user has a valid access token
 * @returns true if a valid token exists, false otherwise
 */
export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

/**
 * Gets information about the current token
 * @returns Token info or null if no valid token exists
 */
export function getTokenInfo(): {
  expiresIn: number;
  createdAt: Date;
  expiresAt: Date;
} | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const data: unknown = JSON.parse(stored);
    if (!isValidStoredToken(data)) return null;

    const now = Date.now();
    if (now >= data.expiresAt) return null;

    return {
      expiresIn: Math.floor((data.expiresAt - now) / 1000),
      createdAt: new Date(data.createdAt),
      expiresAt: new Date(data.expiresAt),
    };
  } catch {
    return null;
  }
}

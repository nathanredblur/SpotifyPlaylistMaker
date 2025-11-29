/**
 * Spotify API Configuration
 *
 * This module handles Spotify OAuth configuration using environment variables.
 * All variables must be set in .env file - no fallbacks are provided.
 *
 * @see {@link ../env.d.ts} for TypeScript definitions
 * @see {@link ../../docs/ENVIRONMENT_VARIABLES.md} for setup instructions
 */

class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

/**
 * Safely gets an environment variable or throws an error if not found
 * @throws {ConfigurationError} If the environment variable is not set
 */
function getRequiredEnvVar(key: keyof ImportMetaEnv): string {
  // Check if we're in a browser/build environment
  if (typeof import.meta === "undefined" || !import.meta.env) {
    throw new ConfigurationError(
      "Environment variables are not available. This should not happen in Astro."
    );
  }

  const value = import.meta.env[key];

  if (!value || value.trim() === "") {
    throw new ConfigurationError(
      `Missing required environment variable: ${key}\n` +
        `Please check your .env file and ensure ${key} is set.\n` +
        `See .env.example for reference.`
    );
  }

  return value.trim();
}

/**
 * Validates that a URL is properly formatted
 * @throws {ConfigurationError} If the URL is invalid
 */
function validateUrl(url: string, varName: string): string {
  try {
    new URL(url);
    return url;
  } catch {
    throw new ConfigurationError(
      `Invalid URL for ${varName}: "${url}"\n` +
        `Please ensure it's a valid URL (e.g., http://localhost:4321/ or https://example.com/)`
    );
  }
}

/**
 * Initialize and validate Spotify configuration
 * This runs at module load time and will throw if configuration is invalid
 */
function initializeConfig() {
  const clientId = getRequiredEnvVar("PUBLIC_SPOTIFY_CLIENT_ID");
  const localUri = getRequiredEnvVar("PUBLIC_SPOTIFY_REDIRECT_URI_LOCAL");
  const remoteUri = getRequiredEnvVar("PUBLIC_SPOTIFY_REDIRECT_URI_REMOTE");

  // Validate URLs
  validateUrl(localUri, "PUBLIC_SPOTIFY_REDIRECT_URI_LOCAL");
  validateUrl(remoteUri, "PUBLIC_SPOTIFY_REDIRECT_URI_REMOTE");

  // Validate client ID format (should be alphanumeric)
  if (!/^[a-zA-Z0-9]+$/.test(clientId)) {
    throw new ConfigurationError(
      `Invalid Spotify Client ID format. Expected alphanumeric string, got: "${clientId}"`
    );
  }

  return {
    clientId,
    redirectUri: {
      local: localUri,
      remote: remoteUri,
    },
    scopes: [
      "user-library-read",
      "playlist-modify-public",
      "playlist-modify-private",
    ] as const,
  };
}

/**
 * Spotify configuration object
 * @throws {ConfigurationError} If any required environment variable is missing or invalid
 */
export const SPOTIFY_CONFIG = initializeConfig();

/**
 * Get the appropriate redirect URI based on the current environment
 * @returns The redirect URI for the current hostname (local or remote)
 */
export function getRedirectUri(): string {
  if (typeof window === "undefined") {
    // Server-side: default to remote
    return SPOTIFY_CONFIG.redirectUri.remote;
  }

  // Client-side: check hostname
  const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "";

  return isLocal
    ? SPOTIFY_CONFIG.redirectUri.local
    : SPOTIFY_CONFIG.redirectUri.remote;
}

/**
 * Generate a random string for PKCE code verifier
 */
function generateCodeVerifier(length: number): string {
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values)
    .map((x) => possible[x % possible.length])
    .join("");
}

/**
 * Generate code challenge from verifier for PKCE
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/**
 * Get the redirect URI for OAuth callback
 * This points to our backend endpoint that handles the token exchange
 */
export function getCallbackUri(): string {
  if (typeof window === "undefined") {
    // Server-side: use environment variable or default
    return (
      import.meta.env.PUBLIC_SPOTIFY_REDIRECT_URI_LOCAL ||
      "http://localhost:4321/api/auth/callback"
    );
  }

  // Client-side: build from current origin
  return `${window.location.origin}/api/auth/callback`;
}

/**
 * Get the full authorization URL for Spotify OAuth with PKCE
 * @returns The complete Spotify authorization URL with all required parameters
 */
export async function getAuthorizationUrl(): Promise<string> {
  // Generate PKCE code verifier and challenge
  const codeVerifier = generateCodeVerifier(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const params = new URLSearchParams({
    client_id: SPOTIFY_CONFIG.clientId,
    response_type: "code",
    redirect_uri: getCallbackUri(),
    scope: SPOTIFY_CONFIG.scopes.join(" "),
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    state: codeVerifier, // Pass verifier through state for backend to use
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

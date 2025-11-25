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
 * Get the full authorization URL for Spotify OAuth
 * @returns The complete Spotify authorization URL with all required parameters
 */
export function getAuthorizationUrl(): string {
  const params = new URLSearchParams({
    client_id: SPOTIFY_CONFIG.clientId,
    response_type: "token",
    redirect_uri: getRedirectUri(),
    scope: SPOTIFY_CONFIG.scopes.join(" "),
    show_dialog: "false",
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

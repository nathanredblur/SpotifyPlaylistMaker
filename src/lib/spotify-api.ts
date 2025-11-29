import type {
  SpotifyUser,
  SpotifyPaginatedResponse,
  SavedTrackItem,
  PlaylistTrackItem,
  SpotifyPlaylist,
  AudioFeaturesResponse,
  ArtistsResponse,
  AlbumsResponse,
  AudioFeatures,
  SpotifyArtist,
  SpotifyAlbum,
} from "@/types/spotify";

import { SPOTIFY_API } from "@/config/constants";

const BASE_URL = "https://api.spotify.com/v1";
const MAX_RETRIES = SPOTIFY_API.MAX_RETRIES;

interface SpotifyRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: any;
  params?: Record<string, string | number>;
}

class SpotifyAPIError extends Error {
  constructor(message: string, public status: number, public response?: any) {
    super(message);
    this.name = "SpotifyAPIError";
  }
}

export class SpotifyAPI {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: SpotifyRequestOptions = {}
  ): Promise<T> {
    const { method = "GET", body, params } = options;
    let retries = 0;

    const makeRequest = async (): Promise<T> => {
      let url = `${BASE_URL}${endpoint}`;

      if (params) {
        // Build query string manually to avoid encoding commas in ID lists
        const queryParts: string[] = [];
        Object.entries(params).forEach(([key, value]) => {
          // For 'ids' parameter, don't encode commas
          if (key === "ids") {
            queryParts.push(`${key}=${value}`);
          } else {
            queryParts.push(`${key}=${encodeURIComponent(String(value))}`);
          }
        });
        if (queryParts.length > 0) {
          url += `?${queryParts.join("&")}`;
        }
      }

      const headers: HeadersInit = {
        Authorization: `Bearer ${this.accessToken}`,
      };

      if (body) {
        headers["Content-Type"] = "application/json";
      }

      try {
        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });

        // Handle 2XX responses
        if (response.ok) {
          // Some endpoints return no content
          const text = await response.text();
          return text ? JSON.parse(text) : ({} as T);
        }

        // Handle 401 - Unauthorized
        if (response.status === 401) {
          // Only redirect in browser context
          if (typeof window !== "undefined") {
            window.location.href = "/";
          }
          throw new SpotifyAPIError("Unauthorized", 401);
        }

        // Handle 429 - Rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After");
          const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : 2000;

          if (retries < MAX_RETRIES) {
            retries++;
            console.log(
              `Rate limited. Retry ${retries}/${MAX_RETRIES} after ${delay}ms`
            );
            await new Promise((resolve) =>
              setTimeout(resolve, delay + retries * SPOTIFY_API.RETRY_DELAY)
            );
            return makeRequest();
          }
          throw new SpotifyAPIError("Rate limit exceeded", 429);
        }

        // Handle 5XX - Server errors
        if (response.status >= 500 && response.status < 600) {
          if (retries < MAX_RETRIES) {
            retries++;
            console.log(`Server error. Retry ${retries}/${MAX_RETRIES}`);
            await new Promise((resolve) =>
              setTimeout(resolve, SPOTIFY_API.RETRY_DELAY)
            );
            return makeRequest();
          }
          throw new SpotifyAPIError("Server error", response.status);
        }

        // Other errors
        const errorData = await response.json().catch(() => ({}));
        throw new SpotifyAPIError(
          errorData.error?.message || "Request failed",
          response.status,
          errorData
        );
      } catch (error) {
        if (error instanceof SpotifyAPIError) {
          throw error;
        }
        throw new SpotifyAPIError(
          error instanceof Error ? error.message : "Network error",
          0
        );
      }
    };

    return makeRequest();
  }

  // User Profile
  async getCurrentUser(): Promise<SpotifyUser> {
    return this.request<SpotifyUser>("/me");
  }

  // Saved Tracks
  async getSavedTracks(
    limit = 50,
    offset = 0
  ): Promise<SpotifyPaginatedResponse<SavedTrackItem>> {
    return this.request<SpotifyPaginatedResponse<SavedTrackItem>>(
      "/me/tracks",
      {
        params: { limit, offset, market: "from_token" },
      }
    );
  }

  // Playlists
  async getUserPlaylists(
    limit = 50,
    offset = 0
  ): Promise<SpotifyPaginatedResponse<SpotifyPlaylist>> {
    return this.request<SpotifyPaginatedResponse<SpotifyPlaylist>>(
      "/me/playlists",
      {
        params: { limit, offset },
      }
    );
  }

  async getPlaylistTracks(
    playlistId: string,
    limit = 50,
    offset = 0
  ): Promise<SpotifyPaginatedResponse<PlaylistTrackItem>> {
    return this.request<SpotifyPaginatedResponse<PlaylistTrackItem>>(
      `/playlists/${playlistId}/tracks`,
      {
        params: { limit, offset, market: "from_token" },
      }
    );
  }

  async createPlaylist(
    userId: string,
    name: string,
    isPublic = false
  ): Promise<SpotifyPlaylist> {
    return this.request<SpotifyPlaylist>(`/users/${userId}/playlists`, {
      method: "POST",
      body: { name, public: isPublic },
    });
  }

  async addTracksToPlaylist(
    playlistId: string,
    uris: string[]
  ): Promise<{ snapshot_id: string }> {
    return this.request<{ snapshot_id: string }>(
      `/playlists/${playlistId}/tracks`,
      {
        method: "POST",
        body: { uris },
      }
    );
  }

  // Audio Features (no client-side caching - handled by server/SQLite)
  async getAudioFeatures(trackIds: string[]): Promise<AudioFeaturesResponse> {
    if (trackIds.length === 0) {
      return { audio_features: [] };
    }

    return this.request<AudioFeaturesResponse>("/audio-features", {
      params: { ids: trackIds.join(",") },
    });
  }

  // Artists (no client-side caching - handled by server/SQLite)
  async getArtists(artistIds: string[]): Promise<ArtistsResponse> {
    if (artistIds.length === 0) {
      return { artists: [] };
    }

    return this.request<ArtistsResponse>("/artists", {
      params: { ids: artistIds.join(",") },
    });
  }

  // Albums (no client-side caching - handled by server/SQLite)
  async getAlbums(albumIds: string[]): Promise<AlbumsResponse> {
    if (albumIds.length === 0) {
      return { albums: [] };
    }

    return this.request<AlbumsResponse>("/albums", {
      params: { ids: albumIds.join(",") },
    });
  }
}

/**
 * Parse authorization callback from URL
 * The backend handles the code exchange and returns the token in the hash
 */
export function parseAuthCallback(): {
  accessToken?: string;
  expiresIn?: number;
  error?: string;
} {
  if (typeof window === "undefined") return {};

  // Check for error in query parameters
  const searchParams = new URLSearchParams(window.location.search);
  const queryError = searchParams.get("error");

  if (queryError) {
    return { error: queryError };
  }

  // Check for access_token in hash (returned by our backend)
  const hash = window.location.hash.replace("#", "");
  const hashParams = new URLSearchParams(hash);
  const accessToken = hashParams.get("access_token");
  const expiresIn = hashParams.get("expires_in");
  const hashError = hashParams.get("error");

  return {
    accessToken: accessToken || undefined,
    expiresIn: expiresIn ? parseInt(expiresIn, 10) : undefined,
    error: hashError || undefined,
  };
}

// Helper to parse URL hash for access token (kept for compatibility)
export function parseAuthHash(): { accessToken?: string; error?: string } {
  const result = parseAuthCallback();
  return {
    accessToken: result.accessToken,
    error: result.error,
  };
}

// Helper to clear callback params from URL
export function clearAuthHash(): void {
  if (typeof window !== "undefined") {
    window.history.replaceState(null, "", window.location.pathname);
  }
}

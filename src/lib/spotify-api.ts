import type {
  SpotifyUser,
  SpotifyPaginatedResponse,
  SavedTrackItem,
  PlaylistTrackItem,
  SpotifyPlaylist,
  AudioFeaturesResponse,
  ArtistsResponse,
  AlbumsResponse,
} from "@/types/spotify";

const BASE_URL = "https://api.spotify.com/v1";
const MAX_RETRIES = 10;

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
      const url = new URL(`${BASE_URL}${endpoint}`);

      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, String(value));
        });
      }

      const headers: HeadersInit = {
        Authorization: `Bearer ${this.accessToken}`,
      };

      if (body) {
        headers["Content-Type"] = "application/json";
      }

      try {
        const response = await fetch(url.toString(), {
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
          window.location.href = "/";
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
              setTimeout(resolve, delay + retries * delay)
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
            await new Promise((resolve) => setTimeout(resolve, 500));
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

  // Audio Features
  async getAudioFeatures(trackIds: string[]): Promise<AudioFeaturesResponse> {
    return this.request<AudioFeaturesResponse>("/audio-features", {
      params: { ids: trackIds.join(",") },
    });
  }

  // Artists
  async getArtists(artistIds: string[]): Promise<ArtistsResponse> {
    return this.request<ArtistsResponse>("/artists", {
      params: { ids: artistIds.join(",") },
    });
  }

  // Albums
  async getAlbums(albumIds: string[]): Promise<AlbumsResponse> {
    return this.request<AlbumsResponse>("/albums", {
      params: { ids: albumIds.join(",") },
    });
  }
}

// Helper to parse URL hash for access token
export function parseAuthHash(): { accessToken?: string; error?: string } {
  if (typeof window === "undefined") return {};

  const hash = window.location.hash.replace("#", "");
  const params = new URLSearchParams(hash);

  return {
    accessToken: params.get("access_token") || undefined,
    error: params.get("error") || undefined,
  };
}

// Helper to clear hash from URL
export function clearAuthHash(): void {
  if (typeof window !== "undefined") {
    window.history.replaceState(null, "", window.location.pathname);
  }
}

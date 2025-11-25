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
import { useSpotifyCache } from "@/stores/useSpotifyCache";

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

  // Audio Features (with caching)
  async getAudioFeatures(trackIds: string[]): Promise<AudioFeaturesResponse> {
    const cache = useSpotifyCache.getState();
    
    // Check cache for existing data
    const { cached, missing } = cache.getMultipleAudioFeatures(trackIds);
    
    // If all tracks are cached, return immediately
    if (missing.length === 0) {
      console.log(`✅ Cache hit: ${cached.length} audio features from cache`);
      return { audio_features: cached };
    }
    
    // Fetch missing tracks from API
    console.log(
      `🔄 Fetching ${missing.length} audio features (${cached.length} from cache)`
    );
    
    const response = await this.request<AudioFeaturesResponse>("/audio-features", {
      params: { ids: missing.join(",") },
    });
    
    // Store fetched data in cache
    if (response.audio_features) {
      const validFeatures = response.audio_features.filter(
        (f): f is AudioFeatures => f !== null
      );
      cache.setMultipleAudioFeatures(validFeatures);
    }
    
    // Combine cached and freshly fetched data
    const allFeatures = [...cached, ...(response.audio_features || [])];
    
    return { audio_features: allFeatures };
  }

  // Artists (with caching)
  async getArtists(artistIds: string[]): Promise<ArtistsResponse> {
    const cache = useSpotifyCache.getState();
    
    // Check cache for existing data
    const { cached, missing } = cache.getMultipleArtists(artistIds);
    
    // If all artists are cached, return immediately
    if (missing.length === 0) {
      console.log(`✅ Cache hit: ${cached.length} artists from cache`);
      return { artists: cached };
    }
    
    // Fetch missing artists from API
    console.log(
      `🔄 Fetching ${missing.length} artists (${cached.length} from cache)`
    );
    
    const response = await this.request<ArtistsResponse>("/artists", {
      params: { ids: missing.join(",") },
    });
    
    // Store fetched data in cache
    if (response.artists) {
      const validArtists = response.artists.filter(
        (a): a is SpotifyArtist => a !== null
      );
      cache.setMultipleArtists(validArtists);
    }
    
    // Combine cached and freshly fetched data
    const allArtists = [...cached, ...(response.artists || [])];
    
    return { artists: allArtists };
  }

  // Albums (with caching)
  async getAlbums(albumIds: string[]): Promise<AlbumsResponse> {
    const cache = useSpotifyCache.getState();
    
    // Check cache for existing data
    const { cached, missing } = cache.getMultipleAlbums(albumIds);
    
    // If all albums are cached, return immediately
    if (missing.length === 0) {
      console.log(`✅ Cache hit: ${cached.length} albums from cache`);
      return { albums: cached };
    }
    
    // Fetch missing albums from API
    console.log(
      `🔄 Fetching ${missing.length} albums (${cached.length} from cache)`
    );
    
    const response = await this.request<AlbumsResponse>("/albums", {
      params: { ids: missing.join(",") },
    });
    
    // Store fetched data in cache
    if (response.albums) {
      const validAlbums = response.albums.filter(
        (a): a is SpotifyAlbum => a !== null
      );
      cache.setMultipleAlbums(validAlbums);
    }
    
    // Combine cached and freshly fetched data
    const allAlbums = [...cached, ...(response.albums || [])];
    
    return { albums: allAlbums };
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

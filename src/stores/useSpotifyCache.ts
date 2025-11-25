import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { get, set, del } from "idb-keyval";
import type {
  AudioFeatures,
  SpotifyArtist,
  SpotifyAlbum,
} from "@/types/spotify";

/**
 * Custom IndexedDB storage for Zustand
 */
const storage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const value = await get(name);
    return value || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

/**
 * Cache entry with timestamp for TTL (Time To Live)
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Spotify Cache State
 */
interface SpotifyCacheState {
  // Audio Features cache: trackId -> AudioFeatures
  audioFeatures: Record<string, CacheEntry<AudioFeatures>>;

  // Artists cache: artistId -> Artist
  artists: Record<string, CacheEntry<SpotifyArtist>>;

  // Albums cache: albumId -> Album
  albums: Record<string, CacheEntry<SpotifyAlbum>>;

  // Cache statistics
  stats: {
    audioFeaturesHits: number;
    artistsHits: number;
    albumsHits: number;
    totalRequests: number;
  };
}

/**
 * Spotify Cache Actions
 */
interface SpotifyCacheActions {
  // Audio Features
  getAudioFeatures: (trackId: string) => AudioFeatures | null;
  setAudioFeatures: (trackId: string, data: AudioFeatures) => void;
  getMultipleAudioFeatures: (
    trackIds: string[]
  ) => { cached: AudioFeatures[]; missing: string[] };

  // Artists
  getArtist: (artistId: string) => SpotifyArtist | null;
  setArtist: (artistId: string, data: SpotifyArtist) => void;
  getMultipleArtists: (
    artistIds: string[]
  ) => { cached: SpotifyArtist[]; missing: string[] };

  // Albums
  getAlbum: (albumId: string) => SpotifyAlbum | null;
  setAlbum: (albumId: string, data: SpotifyAlbum) => void;
  getMultipleAlbums: (
    albumIds: string[]
  ) => { cached: SpotifyAlbum[]; missing: string[] };

  // Batch operations
  setMultipleAudioFeatures: (features: AudioFeatures[]) => void;
  setMultipleArtists: (artists: SpotifyArtist[]) => void;
  setMultipleAlbums: (albums: SpotifyAlbum[]) => void;

  // Cache management
  clearCache: () => void;
  clearExpiredEntries: () => void;
  getStats: () => SpotifyCacheState["stats"];
}

// Cache TTL: 7 days in milliseconds
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

/**
 * Check if a cache entry is still valid
 */
function isValidEntry<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
  if (!entry) return false;
  const now = Date.now();
  return now - entry.timestamp < CACHE_TTL;
}

/**
 * Create a cache entry with current timestamp
 */
function createEntry<T>(data: T): CacheEntry<T> {
  return {
    data,
    timestamp: Date.now(),
  };
}

/**
 * Zustand store for Spotify data caching with IndexedDB persistence
 */
export const useSpotifyCache = create<SpotifyCacheState & SpotifyCacheActions>()(
  persist(
    (set, get) => ({
      // Initial state
      audioFeatures: {},
      artists: {},
      albums: {},
      stats: {
        audioFeaturesHits: 0,
        artistsHits: 0,
        albumsHits: 0,
        totalRequests: 0,
      },

      // Audio Features methods
      getAudioFeatures: (trackId: string) => {
        const entry = get().audioFeatures[trackId];
        if (isValidEntry(entry)) {
          set((state) => ({
            stats: {
              ...state.stats,
              audioFeaturesHits: state.stats.audioFeaturesHits + 1,
              totalRequests: state.stats.totalRequests + 1,
            },
          }));
          return entry.data;
        }
        set((state) => ({
          stats: {
            ...state.stats,
            totalRequests: state.stats.totalRequests + 1,
          },
        }));
        return null;
      },

      setAudioFeatures: (trackId: string, data: AudioFeatures) => {
        set((state) => ({
          audioFeatures: {
            ...state.audioFeatures,
            [trackId]: createEntry(data),
          },
        }));
      },

      getMultipleAudioFeatures: (trackIds: string[]) => {
        const cached: AudioFeatures[] = [];
        const missing: string[] = [];

        trackIds.forEach((id) => {
          const entry = get().audioFeatures[id];
          if (isValidEntry(entry)) {
            cached.push(entry.data);
          } else {
            missing.push(id);
          }
        });

        if (cached.length > 0) {
          set((state) => ({
            stats: {
              ...state.stats,
              audioFeaturesHits: state.stats.audioFeaturesHits + cached.length,
              totalRequests: state.stats.totalRequests + trackIds.length,
            },
          }));
        }

        return { cached, missing };
      },

      setMultipleAudioFeatures: (features: AudioFeatures[]) => {
        set((state) => {
          const newFeatures = { ...state.audioFeatures };
          features.forEach((feature) => {
            newFeatures[feature.id] = createEntry(feature);
          });
          return { audioFeatures: newFeatures };
        });
      },

      // Artists methods
      getArtist: (artistId: string) => {
        const entry = get().artists[artistId];
        if (isValidEntry(entry)) {
          set((state) => ({
            stats: {
              ...state.stats,
              artistsHits: state.stats.artistsHits + 1,
              totalRequests: state.stats.totalRequests + 1,
            },
          }));
          return entry.data;
        }
        set((state) => ({
          stats: {
            ...state.stats,
            totalRequests: state.stats.totalRequests + 1,
          },
        }));
        return null;
      },

      setArtist: (artistId: string, data: SpotifyArtist) => {
        set((state) => ({
          artists: {
            ...state.artists,
            [artistId]: createEntry(data),
          },
        }));
      },

      getMultipleArtists: (artistIds: string[]) => {
        const cached: SpotifyArtist[] = [];
        const missing: string[] = [];

        artistIds.forEach((id) => {
          const entry = get().artists[id];
          if (isValidEntry(entry)) {
            cached.push(entry.data);
          } else {
            missing.push(id);
          }
        });

        if (cached.length > 0) {
          set((state) => ({
            stats: {
              ...state.stats,
              artistsHits: state.stats.artistsHits + cached.length,
              totalRequests: state.stats.totalRequests + artistIds.length,
            },
          }));
        }

        return { cached, missing };
      },

      setMultipleArtists: (artists: SpotifyArtist[]) => {
        set((state) => {
          const newArtists = { ...state.artists };
          artists.forEach((artist) => {
            newArtists[artist.id] = createEntry(artist);
          });
          return { artists: newArtists };
        });
      },

      // Albums methods
      getAlbum: (albumId: string) => {
        const entry = get().albums[albumId];
        if (isValidEntry(entry)) {
          set((state) => ({
            stats: {
              ...state.stats,
              albumsHits: state.stats.albumsHits + 1,
              totalRequests: state.stats.totalRequests + 1,
            },
          }));
          return entry.data;
        }
        set((state) => ({
          stats: {
            ...state.stats,
            totalRequests: state.stats.totalRequests + 1,
          },
        }));
        return null;
      },

      setAlbum: (albumId: string, data: SpotifyAlbum) => {
        set((state) => ({
          albums: {
            ...state.albums,
            [albumId]: createEntry(data),
          },
        }));
      },

      getMultipleAlbums: (albumIds: string[]) => {
        const cached: SpotifyAlbum[] = [];
        const missing: string[] = [];

        albumIds.forEach((id) => {
          const entry = get().albums[id];
          if (isValidEntry(entry)) {
            cached.push(entry.data);
          } else {
            missing.push(id);
          }
        });

        if (cached.length > 0) {
          set((state) => ({
            stats: {
              ...state.stats,
              albumsHits: state.stats.albumsHits + cached.length,
              totalRequests: state.stats.totalRequests + albumIds.length,
            },
          }));
        }

        return { cached, missing };
      },

      setMultipleAlbums: (albums: SpotifyAlbum[]) => {
        set((state) => {
          const newAlbums = { ...state.albums };
          albums.forEach((album) => {
            newAlbums[album.id] = createEntry(album);
          });
          return { albums: newAlbums };
        });
      },

      // Cache management
      clearCache: () => {
        set({
          audioFeatures: {},
          artists: {},
          albums: {},
          stats: {
            audioFeaturesHits: 0,
            artistsHits: 0,
            albumsHits: 0,
            totalRequests: 0,
          },
        });
      },

      clearExpiredEntries: () => {
        const now = Date.now();

        set((state) => {
          // Clear expired audio features
          const validAudioFeatures: Record<string, CacheEntry<AudioFeatures>> = {};
          Object.entries(state.audioFeatures).forEach(([id, entry]) => {
            if (now - entry.timestamp < CACHE_TTL) {
              validAudioFeatures[id] = entry;
            }
          });

          // Clear expired artists
          const validArtists: Record<string, CacheEntry<SpotifyArtist>> = {};
          Object.entries(state.artists).forEach(([id, entry]) => {
            if (now - entry.timestamp < CACHE_TTL) {
              validArtists[id] = entry;
            }
          });

          // Clear expired albums
          const validAlbums: Record<string, CacheEntry<SpotifyAlbum>> = {};
          Object.entries(state.albums).forEach(([id, entry]) => {
            if (now - entry.timestamp < CACHE_TTL) {
              validAlbums[id] = entry;
            }
          });

          return {
            audioFeatures: validAudioFeatures,
            artists: validArtists,
            albums: validAlbums,
          };
        });
      },

      getStats: () => {
        return get().stats;
      },
    }),
    {
      name: "spotify-cache-storage", // unique name in IndexedDB
      storage: createJSONStorage(() => storage),
      // Only persist the cache data, not the stats
      partialize: (state) => ({
        audioFeatures: state.audioFeatures,
        artists: state.artists,
        albums: state.albums,
      }),
    }
  )
);

/**
 * Hook to get cache statistics
 */
export function useCacheStats() {
  const stats = useSpotifyCache((state) => state.stats);

  const hitRate =
    stats.totalRequests > 0
      ? ((stats.audioFeaturesHits + stats.artistsHits + stats.albumsHits) /
          stats.totalRequests) *
        100
      : 0;

  return {
    ...stats,
    hitRate: hitRate.toFixed(2),
  };
}


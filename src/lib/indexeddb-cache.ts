/**
 * IndexedDB Cache System
 *
 * Efficient caching using IndexedDB with separate stores for each data type
 */

import { openDB, type IDBPDatabase } from "idb";
import { CACHE_TTL } from "@/config/cache";
import type {
  AudioFeatures,
  SpotifyArtist,
  SpotifyAlbum,
  SavedTrackItem,
} from "@/types/spotify";

const DB_NAME = "spotify-cache";
const DB_VERSION = 1;

// Store names (tables)
const STORES = {
  AUDIO_FEATURES: "audio-features",
  ARTISTS: "artists",
  ALBUMS: "albums",
  TRACKS: "tracks",
  METADATA: "metadata",
} as const;

// Metadata keys
const META_KEYS = {
  TRACKS_LAST_SYNC: "tracks-last-sync",
  TRACKS_TOTAL: "tracks-total",
  FAILED_AUDIO_FEATURES: "failed-audio-features",
} as const;

interface CacheEntry<T> {
  id: string;
  data: T;
  timestamp: number;
}

interface FailedRequest {
  ids: string[];
  timestamp: number;
}

let dbInstance: IDBPDatabase | null = null;

/**
 * Initialize IndexedDB
 */
async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.AUDIO_FEATURES)) {
        db.createObjectStore(STORES.AUDIO_FEATURES, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.ARTISTS)) {
        db.createObjectStore(STORES.ARTISTS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.ALBUMS)) {
        db.createObjectStore(STORES.ALBUMS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.TRACKS)) {
        db.createObjectStore(STORES.TRACKS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA);
      }
    },
  });

  return dbInstance;
}

/**
 * Check if a cache entry is still valid
 */
function isValid(timestamp: number, ttl: number): boolean {
  return Date.now() - timestamp < ttl;
}

/**
 * Audio Features Cache
 */
export const AudioFeaturesCache = {
  async get(id: string): Promise<AudioFeatures | null> {
    const db = await getDB();
    const entry = await db.get(STORES.AUDIO_FEATURES, id);
    if (!entry || !isValid(entry.timestamp, CACHE_TTL.METADATA)) {
      return null;
    }
    return entry.data;
  },

  async getMultiple(ids: string[]): Promise<{
    cached: AudioFeatures[];
    missing: string[];
  }> {
    const db = await getDB();
    const cached: AudioFeatures[] = [];
    const missing: string[] = [];

    await Promise.all(
      ids.map(async (id) => {
        const entry = await db.get(STORES.AUDIO_FEATURES, id);
        if (entry && isValid(entry.timestamp, CACHE_TTL.METADATA)) {
          cached.push(entry.data);
        } else {
          missing.push(id);
        }
      })
    );

    return { cached, missing };
  },

  async set(feature: AudioFeatures): Promise<void> {
    const db = await getDB();
    const entry: CacheEntry<AudioFeatures> = {
      id: feature.id,
      data: feature,
      timestamp: Date.now(),
    };
    await db.put(STORES.AUDIO_FEATURES, entry);
  },

  async setMultiple(features: AudioFeatures[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(STORES.AUDIO_FEATURES, "readwrite");
    const now = Date.now();

    await Promise.all([
      ...features.map((feature) =>
        tx.store.put({
          id: feature.id,
          data: feature,
          timestamp: now,
        })
      ),
      tx.done,
    ]);
  },

  async clear(): Promise<void> {
    const db = await getDB();
    await db.clear(STORES.AUDIO_FEATURES);
  },
};

/**
 * Artists Cache
 */
export const ArtistsCache = {
  async get(id: string): Promise<SpotifyArtist | null> {
    const db = await getDB();
    const entry = await db.get(STORES.ARTISTS, id);
    if (!entry || !isValid(entry.timestamp, CACHE_TTL.METADATA)) {
      return null;
    }
    return entry.data;
  },

  async getMultiple(ids: string[]): Promise<{
    cached: SpotifyArtist[];
    missing: string[];
  }> {
    const db = await getDB();
    const cached: SpotifyArtist[] = [];
    const missing: string[] = [];

    await Promise.all(
      ids.map(async (id) => {
        const entry = await db.get(STORES.ARTISTS, id);
        if (entry && isValid(entry.timestamp, CACHE_TTL.METADATA)) {
          cached.push(entry.data);
        } else {
          missing.push(id);
        }
      })
    );

    return { cached, missing };
  },

  async set(artist: SpotifyArtist): Promise<void> {
    const db = await getDB();
    const entry: CacheEntry<SpotifyArtist> = {
      id: artist.id,
      data: artist,
      timestamp: Date.now(),
    };
    await db.put(STORES.ARTISTS, entry);
  },

  async setMultiple(artists: SpotifyArtist[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(STORES.ARTISTS, "readwrite");
    const now = Date.now();

    await Promise.all([
      ...artists.map((artist) =>
        tx.store.put({
          id: artist.id,
          data: artist,
          timestamp: now,
        })
      ),
      tx.done,
    ]);
  },

  async clear(): Promise<void> {
    const db = await getDB();
    await db.clear(STORES.ARTISTS);
  },
};

/**
 * Albums Cache
 */
export const AlbumsCache = {
  async get(id: string): Promise<SpotifyAlbum | null> {
    const db = await getDB();
    const entry = await db.get(STORES.ALBUMS, id);
    if (!entry || !isValid(entry.timestamp, CACHE_TTL.METADATA)) {
      return null;
    }
    return entry.data;
  },

  async getMultiple(ids: string[]): Promise<{
    cached: SpotifyAlbum[];
    missing: string[];
  }> {
    const db = await getDB();
    const cached: SpotifyAlbum[] = [];
    const missing: string[] = [];

    await Promise.all(
      ids.map(async (id) => {
        const entry = await db.get(STORES.ALBUMS, id);
        if (entry && isValid(entry.timestamp, CACHE_TTL.METADATA)) {
          cached.push(entry.data);
        } else {
          missing.push(id);
        }
      })
    );

    return { cached, missing };
  },

  async set(album: SpotifyAlbum): Promise<void> {
    const db = await getDB();
    const entry: CacheEntry<SpotifyAlbum> = {
      id: album.id,
      data: album,
      timestamp: Date.now(),
    };
    await db.put(STORES.ALBUMS, entry);
  },

  async setMultiple(albums: SpotifyAlbum[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(STORES.ALBUMS, "readwrite");
    const now = Date.now();

    await Promise.all([
      ...albums.map((album) =>
        tx.store.put({
          id: album.id,
          data: album,
          timestamp: now,
        })
      ),
      tx.done,
    ]);
  },

  async clear(): Promise<void> {
    const db = await getDB();
    await db.clear(STORES.ALBUMS);
  },
};

/**
 * Saved Tracks Cache
 */
export const SavedTracksCache = {
  async getAll(): Promise<SavedTrackItem[] | null> {
    const db = await getDB();
    const lastSync = await db.get(STORES.METADATA, META_KEYS.TRACKS_LAST_SYNC);

    if (!lastSync || !isValid(lastSync, CACHE_TTL.SAVED_TRACKS)) {
      return null;
    }

    const entries = await db.getAll(STORES.TRACKS);
    return entries.map((entry) => entry.data);
  },

  async setAll(tracks: SavedTrackItem[], total: number): Promise<void> {
    const db = await getDB();
    const tx = db.transaction([STORES.TRACKS, STORES.METADATA], "readwrite");
    const now = Date.now();

    // Clear existing tracks
    await tx.objectStore(STORES.TRACKS).clear();

    // Store all tracks
    await Promise.all([
      ...tracks.map((track) =>
        tx.objectStore(STORES.TRACKS).put({
          id: track.track.id,
          data: track,
          timestamp: now,
        })
      ),
      tx.objectStore(STORES.METADATA).put(now, META_KEYS.TRACKS_LAST_SYNC),
      tx.objectStore(STORES.METADATA).put(total, META_KEYS.TRACKS_TOTAL),
      tx.done,
    ]);

    console.log(`💾 Cached ${tracks.length} saved tracks in IndexedDB`);
  },

  async getMetadata(): Promise<{ lastSync: number; total: number } | null> {
    const db = await getDB();
    const lastSync = await db.get(STORES.METADATA, META_KEYS.TRACKS_LAST_SYNC);
    const total = await db.get(STORES.METADATA, META_KEYS.TRACKS_TOTAL);

    if (!lastSync) return null;

    return { lastSync, total: total || 0 };
  },

  async clear(): Promise<void> {
    const db = await getDB();
    const tx = db.transaction([STORES.TRACKS, STORES.METADATA], "readwrite");
    await Promise.all([
      tx.objectStore(STORES.TRACKS).clear(),
      tx.objectStore(STORES.METADATA).delete(META_KEYS.TRACKS_LAST_SYNC),
      tx.objectStore(STORES.METADATA).delete(META_KEYS.TRACKS_TOTAL),
      tx.done,
    ]);
  },
};

/**
 * Failed Requests Cache (403 errors)
 */
export const FailedRequestsCache = {
  async getFailedAudioFeatures(): Promise<string[]> {
    const db = await getDB();
    const entry: FailedRequest | undefined = await db.get(
      STORES.METADATA,
      META_KEYS.FAILED_AUDIO_FEATURES
    );

    if (!entry || !isValid(entry.timestamp, CACHE_TTL.METADATA)) {
      return [];
    }

    return entry.ids;
  },

  async markAudioFeaturesFailed(ids: string[]): Promise<void> {
    const db = await getDB();
    const existing = await this.getFailedAudioFeatures();
    const combined = [...new Set([...existing, ...ids])];

    const entry: FailedRequest = {
      ids: combined,
      timestamp: Date.now(),
    };

    await db.put(STORES.METADATA, entry, META_KEYS.FAILED_AUDIO_FEATURES);
    console.log(
      `❌ Marked ${ids.length} audio features as failed (total: ${combined.length})`
    );
  },

  async clear(): Promise<void> {
    const db = await getDB();
    await db.delete(STORES.METADATA, META_KEYS.FAILED_AUDIO_FEATURES);
  },
};

/**
 * Clear all cache
 */
export async function clearAllCache(): Promise<void> {
  await Promise.all([
    AudioFeaturesCache.clear(),
    ArtistsCache.clear(),
    AlbumsCache.clear(),
    SavedTracksCache.clear(),
    FailedRequestsCache.clear(),
  ]);
  console.log("🗑️ All cache cleared");
}

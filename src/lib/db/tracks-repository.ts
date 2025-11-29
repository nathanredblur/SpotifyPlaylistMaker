/**
 * Repository for tracks table operations
 * Handles all CRUD operations for tracks
 */

import { getDatabase } from "./database";
import type { Database } from "better-sqlite3";

/**
 * Track data structure (matches database schema)
 * Note: added_at is now in user_tracks table, not here
 */
export interface TrackRecord {
  spotify_id: string;
  soundcharts_uuid?: string | null;
  spotify_data: string; // JSON string
  soundcharts_data?: string | null;
  soundcharts_fetched_at?: string | null;
  name: string;
  duration_ms?: number | null;
  explicit?: number; // 0 or 1 (SQLite boolean)
  popularity?: number | null;
  preview_url?: string | null;
  isrc?: string | null;
  tempo?: number | null;
  energy?: number | null;
  danceability?: number | null;
  valence?: number | null;
  acousticness?: number | null;
  instrumentalness?: number | null;
  liveness?: number | null;
  loudness?: number | null;
  speechiness?: number | null;
  key?: number | null;
  mode?: number | null;
  time_signature?: number | null;
  artists_json?: string | null; // JSON string
  created_at?: string;
  updated_at?: string;
}

/**
 * Input data for creating a new track
 * Note: added_at is now in user_tracks table, not tracks
 */
export interface CreateTrackInput {
  spotify_id: string;
  spotify_data: string;
  name: string;
  duration_ms?: number;
  explicit?: boolean;
  popularity?: number;
  preview_url?: string;
  artists_json?: string;
  isrc?: string; // ISRC code from Spotify
}

/**
 * Input data for updating track with SoundCharts data
 */
export interface UpdateTrackWithSoundChartsInput {
  soundcharts_uuid?: string;
  soundcharts_data: string;
  soundcharts_fetched_at: string;
  isrc?: string;
  tempo?: number;
  energy?: number;
  danceability?: number;
  valence?: number;
  acousticness?: number;
  instrumentalness?: number;
  liveness?: number;
  loudness?: number;
  speechiness?: number;
  key?: number;
  mode?: number;
  time_signature?: number;
}

export class TracksRepository {
  private db: Database;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Check if a track exists by Spotify ID
   */
  exists(spotifyId: string): boolean {
    const result = this.db
      .prepare("SELECT 1 FROM tracks WHERE spotify_id = ? LIMIT 1")
      .get(spotifyId);
    return !!result;
  }

  /**
   * Get a track by Spotify ID
   */
  getBySpotifyId(spotifyId: string): TrackRecord | null {
    const result = this.db
      .prepare("SELECT * FROM tracks WHERE spotify_id = ?")
      .get(spotifyId) as TrackRecord | undefined;
    return result || null;
  }

  /**
   * Get multiple tracks by Spotify IDs
   */
  getBySpotifyIds(spotifyIds: string[]): TrackRecord[] {
    if (spotifyIds.length === 0) return [];

    const placeholders = spotifyIds.map(() => "?").join(",");
    const results = this.db
      .prepare(`SELECT * FROM tracks WHERE spotify_id IN (${placeholders})`)
      .all(...spotifyIds) as TrackRecord[];
    return results;
  }

  /**
   * Get all tracks
   */
  getAll(): TrackRecord[] {
    const results = this.db
      .prepare("SELECT * FROM tracks ORDER BY created_at DESC")
      .all() as TrackRecord[];
    return results;
  }

  /**
   * Get tracks without SoundCharts data
   */
  getTracksWithoutSoundCharts(limit = 100): TrackRecord[] {
    const results = this.db
      .prepare(
        `SELECT * FROM tracks 
         WHERE soundcharts_data IS NULL 
         ORDER BY created_at DESC 
         LIMIT ?`
      )
      .all(limit) as TrackRecord[];
    return results;
  }

  /**
   * Create a new track
   * Uses INSERT OR REPLACE to handle duplicates (updates existing track)
   */
  create(input: CreateTrackInput): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO tracks (
        spotify_id, spotify_data, name, 
        duration_ms, explicit, popularity, preview_url, artists_json, isrc
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      input.spotify_id,
      input.spotify_data,
      input.name,
      input.duration_ms || null,
      input.explicit ? 1 : 0,
      input.popularity || null,
      input.preview_url || null,
      input.artists_json || null,
      input.isrc || null
    );
  }

  /**
   * Create multiple tracks in a transaction
   * Uses INSERT OR REPLACE to handle duplicates (updates existing tracks)
   */
  createMany(inputs: CreateTrackInput[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO tracks (
        spotify_id, spotify_data, name, 
        duration_ms, explicit, popularity, preview_url, artists_json, isrc
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((tracks: CreateTrackInput[]) => {
      for (const track of tracks) {
        stmt.run(
          track.spotify_id,
          track.spotify_data,
          track.name,
          track.duration_ms || null,
          track.explicit ? 1 : 0,
          track.popularity || null,
          track.preview_url || null,
          track.artists_json || null,
          track.isrc || null
        );
      }
    });

    insertMany(inputs);
  }

  /**
   * Update track with SoundCharts data
   */
  updateWithSoundCharts(
    spotifyId: string,
    input: UpdateTrackWithSoundChartsInput
  ): void {
    const stmt = this.db.prepare(`
      UPDATE tracks SET
        soundcharts_uuid = ?,
        soundcharts_data = ?,
        soundcharts_fetched_at = ?,
        isrc = ?,
        tempo = ?,
        energy = ?,
        danceability = ?,
        valence = ?,
        acousticness = ?,
        instrumentalness = ?,
        liveness = ?,
        loudness = ?,
        speechiness = ?,
        key = ?,
        mode = ?,
        time_signature = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE spotify_id = ?
    `);

    stmt.run(
      input.soundcharts_uuid || null,
      input.soundcharts_data,
      input.soundcharts_fetched_at,
      input.isrc || null,
      input.tempo || null,
      input.energy || null,
      input.danceability || null,
      input.valence || null,
      input.acousticness || null,
      input.instrumentalness || null,
      input.liveness || null,
      input.loudness || null,
      input.speechiness || null,
      input.key || null,
      input.mode || null,
      input.time_signature || null,
      spotifyId
    );
  }

  /**
   * Update track's added_at timestamp
   */
  updateAddedAt(spotifyId: string, addedAt: string): void {
    this.db
      .prepare(
        "UPDATE tracks SET added_at = ?, updated_at = CURRENT_TIMESTAMP WHERE spotify_id = ?"
      )
      .run(addedAt, spotifyId);
  }

  /**
   * Update track's ISRC code
   */
  updateIsrc(spotifyId: string, isrc: string): void {
    this.db
      .prepare(
        "UPDATE tracks SET isrc = ?, updated_at = CURRENT_TIMESTAMP WHERE spotify_id = ?"
      )
      .run(isrc, spotifyId);
  }

  /**
   * Delete a track
   */
  delete(spotifyId: string): void {
    this.db.prepare("DELETE FROM tracks WHERE spotify_id = ?").run(spotifyId);
  }

  /**
   * Get count of tracks
   */
  count(): number {
    const result = this.db
      .prepare("SELECT COUNT(*) as count FROM tracks")
      .get() as { count: number };
    return result.count;
  }

  /**
   * Get count of tracks with SoundCharts data
   */
  countWithSoundCharts(): number {
    const result = this.db
      .prepare(
        "SELECT COUNT(*) as count FROM tracks WHERE soundcharts_data IS NOT NULL"
      )
      .get() as { count: number };
    return result.count;
  }

  /**
   * Get the most recently created track (by created_at)
   * Note: added_at is now in user_tracks table
   */
  getMostRecentlyCreated(): TrackRecord | null {
    const result = this.db
      .prepare("SELECT * FROM tracks ORDER BY created_at DESC LIMIT 1")
      .get() as TrackRecord | undefined;
    return result || null;
  }
}

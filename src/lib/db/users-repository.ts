/**
 * Repository for users table operations
 * Handles Spotify user information and their track associations
 */

import { getDatabase } from "./database";
import type { Database } from "better-sqlite3";
import type { UserRole } from "./schema";

/**
 * User record structure
 */
export interface UserRecord {
  spotify_user_id: string;
  role: UserRole;
  display_name?: string | null;
  email?: string | null;
  profile_image_url?: string | null;
  country?: string | null;
  spotify_user_data?: string | null;
  last_sync_at?: string | null;
  last_track_added_at?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a new user
 */
export interface CreateUserInput {
  spotify_user_id: string;
  role?: UserRole;
  display_name?: string;
  email?: string;
  profile_image_url?: string;
  country?: string;
  spotify_user_data?: string;
}

/**
 * User track association
 */
export interface UserTrackRecord {
  user_id: string;
  track_id: string;
  added_at: string;
  created_at: string;
}

export class UsersRepository {
  private db: Database;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Create or update a user
   * Note: role is only set on INSERT, not on UPDATE (to prevent accidental role changes)
   */
  upsert(input: CreateUserInput): void {
    const stmt = this.db.prepare(`
      INSERT INTO users (
        spotify_user_id, role, display_name, email, profile_image_url, 
        country, spotify_user_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(spotify_user_id) DO UPDATE SET
        display_name = excluded.display_name,
        email = excluded.email,
        profile_image_url = excluded.profile_image_url,
        country = excluded.country,
        spotify_user_data = excluded.spotify_user_data,
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(
      input.spotify_user_id,
      input.role || "regular",
      input.display_name || null,
      input.email || null,
      input.profile_image_url || null,
      input.country || null,
      input.spotify_user_data || null
    );
  }

  /**
   * Get a user by Spotify user ID
   */
  getBySpotifyId(spotifyUserId: string): UserRecord | null {
    const result = this.db
      .prepare("SELECT * FROM users WHERE spotify_user_id = ?")
      .get(spotifyUserId) as UserRecord | undefined;
    return result || null;
  }

  /**
   * Update last sync timestamp
   */
  updateLastSync(spotifyUserId: string, lastTrackAddedAt?: string): void {
    this.db
      .prepare(
        `UPDATE users 
         SET last_sync_at = CURRENT_TIMESTAMP,
             last_track_added_at = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE spotify_user_id = ?`
      )
      .run(lastTrackAddedAt || null, spotifyUserId);
  }

  /**
   * Add a track to user's library
   */
  addTrack(userId: string, trackId: string, addedAt: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_tracks (user_id, track_id, added_at)
      VALUES (?, ?, ?)
    `);
    stmt.run(userId, trackId, addedAt);
  }

  /**
   * Add multiple tracks to user's library (batch operation)
   */
  addTracks(
    userId: string,
    tracks: Array<{ trackId: string; addedAt: string }>
  ): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_tracks (user_id, track_id, added_at)
      VALUES (?, ?, ?)
    `);

    const insertMany = this.db.transaction(
      (userId: string, tracks: Array<{ trackId: string; addedAt: string }>) => {
        for (const track of tracks) {
          stmt.run(userId, track.trackId, track.addedAt);
        }
      }
    );

    insertMany(userId, tracks);
  }

  /**
   * Remove a track from user's library
   */
  removeTrack(userId: string, trackId: string): void {
    this.db
      .prepare("DELETE FROM user_tracks WHERE user_id = ? AND track_id = ?")
      .run(userId, trackId);
  }

  /**
   * Get all tracks for a user
   */
  getUserTracks(userId: string): UserTrackRecord[] {
    return this.db
      .prepare(
        `SELECT * FROM user_tracks 
         WHERE user_id = ? 
         ORDER BY added_at DESC`
      )
      .all(userId) as UserTrackRecord[];
  }

  /**
   * Get user's track IDs only (for quick lookups)
   */
  getUserTrackIds(userId: string): string[] {
    const results = this.db
      .prepare("SELECT track_id FROM user_tracks WHERE user_id = ?")
      .all(userId) as Array<{ track_id: string }>;
    return results.map((r) => r.track_id);
  }

  /**
   * Get count of user's tracks
   */
  getUserTrackCount(userId: string): number {
    const result = this.db
      .prepare("SELECT COUNT(*) as count FROM user_tracks WHERE user_id = ?")
      .get(userId) as { count: number };
    return result.count;
  }

  /**
   * Check if user has a specific track
   */
  hasTrack(userId: string, trackId: string): boolean {
    const result = this.db
      .prepare(
        "SELECT 1 FROM user_tracks WHERE user_id = ? AND track_id = ? LIMIT 1"
      )
      .get(userId, trackId);
    return !!result;
  }

  /**
   * Get tracks added since a specific date
   */
  getTracksAddedSince(userId: string, since: string): UserTrackRecord[] {
    return this.db
      .prepare(
        `SELECT * FROM user_tracks 
         WHERE user_id = ? AND added_at > ?
         ORDER BY added_at DESC`
      )
      .all(userId, since) as UserTrackRecord[];
  }

  /**
   * Get all users
   */
  getAll(): UserRecord[] {
    return this.db
      .prepare("SELECT * FROM users ORDER BY created_at DESC")
      .all() as UserRecord[];
  }

  /**
   * Delete a user and all their track associations
   */
  delete(spotifyUserId: string): void {
    // Foreign key cascade will automatically delete user_tracks
    this.db
      .prepare("DELETE FROM users WHERE spotify_user_id = ?")
      .run(spotifyUserId);
  }

  // ============================================
  // Role Management Methods
  // ============================================

  /**
   * Get the admin user (there should be only one)
   */
  getAdmin(): UserRecord | null {
    const result = this.db
      .prepare("SELECT * FROM users WHERE role = 'admin' LIMIT 1")
      .get() as UserRecord | undefined;
    return result || null;
  }

  /**
   * Check if a user is an admin
   */
  isAdmin(spotifyUserId: string): boolean {
    const result = this.db
      .prepare(
        "SELECT 1 FROM users WHERE spotify_user_id = ? AND role = 'admin' LIMIT 1"
      )
      .get(spotifyUserId);
    return !!result;
  }

  /**
   * Set a user's role
   * Note: Use promoteToAdmin() for making a user admin (includes validation)
   */
  setRole(spotifyUserId: string, role: UserRole): void {
    this.db
      .prepare(
        `UPDATE users 
         SET role = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE spotify_user_id = ?`
      )
      .run(role, spotifyUserId);
  }

  /**
   * Promote a user to admin
   * Validates that no other admin exists (only one admin allowed)
   * @returns true if promotion succeeded, false if another admin exists
   */
  promoteToAdmin(spotifyUserId: string): boolean {
    const existingAdmin = this.getAdmin();

    // If there's already an admin and it's not this user, fail
    if (existingAdmin && existingAdmin.spotify_user_id !== spotifyUserId) {
      return false;
    }

    // Promote the user
    this.setRole(spotifyUserId, "admin");
    return true;
  }

  /**
   * Demote admin to regular user
   * Warning: This will leave the system without an admin!
   */
  demoteAdmin(spotifyUserId: string): void {
    this.setRole(spotifyUserId, "regular");
  }

  /**
   * Check if any admin exists in the system
   */
  hasAdmin(): boolean {
    const result = this.db
      .prepare("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1")
      .get();
    return !!result;
  }

  /**
   * Get user count by role
   */
  countByRole(role: UserRole): number {
    const result = this.db
      .prepare("SELECT COUNT(*) as count FROM users WHERE role = ?")
      .get(role) as { count: number };
    return result.count;
  }
}

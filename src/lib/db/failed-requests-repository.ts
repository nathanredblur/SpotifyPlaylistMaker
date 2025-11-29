/**
 * Repository for failed_requests table operations
 * Tracks failed SoundCharts requests for retry logic
 */

import { getDatabase } from "./database";
import type { Database } from "better-sqlite3";

export interface FailedRequestRecord {
  id: number;
  spotify_id: string;
  error_code?: number | null;
  error_message?: string | null;
  error_response?: string | null;
  attempt_count: number;
  max_attempts: number;
  next_retry_at?: string | null;
  status: "pending" | "retrying" | "failed" | "resolved";
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFailedRequestInput {
  spotify_id: string;
  error_code?: number;
  error_message?: string;
  error_response?: string;
  max_attempts?: number;
}

export class FailedRequestsRepository {
  private db: Database;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Create a new failed request record
   */
  create(input: CreateFailedRequestInput): number {
    const result = this.db
      .prepare(
        `INSERT INTO failed_requests 
         (spotify_id, error_code, error_message, error_response, max_attempts) 
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        input.spotify_id,
        input.error_code || null,
        input.error_message || null,
        input.error_response || null,
        input.max_attempts || 3
      );

    return result.lastInsertRowid as number;
  }

  /**
   * Get a failed request by Spotify ID (most recent)
   */
  getBySpotifyId(spotifyId: string): FailedRequestRecord | null {
    const result = this.db
      .prepare(
        `SELECT * FROM failed_requests 
         WHERE spotify_id = ? 
         ORDER BY created_at DESC 
         LIMIT 1`
      )
      .get(spotifyId) as FailedRequestRecord | undefined;
    return result || null;
  }

  /**
   * Get all pending retry requests
   */
  getPendingRetries(): FailedRequestRecord[] {
    const now = new Date().toISOString();
    const results = this.db
      .prepare(
        `SELECT * FROM failed_requests 
         WHERE status = 'pending' 
         AND attempt_count < max_attempts 
         AND (next_retry_at IS NULL OR next_retry_at <= ?)
         ORDER BY created_at ASC`
      )
      .all(now) as FailedRequestRecord[];
    return results;
  }

  /**
   * Get all permanently failed requests (max attempts reached)
   */
  getPermanentlyFailed(): FailedRequestRecord[] {
    const results = this.db
      .prepare(
        `SELECT * FROM failed_requests 
         WHERE status = 'failed' 
         OR attempt_count >= max_attempts`
      )
      .all() as FailedRequestRecord[];
    return results;
  }

  /**
   * Increment attempt count and schedule next retry
   */
  incrementAttempt(id: number, nextRetryMinutes = 30): void {
    const nextRetry = new Date();
    nextRetry.setMinutes(nextRetry.getMinutes() + nextRetryMinutes);

    this.db
      .prepare(
        `UPDATE failed_requests SET 
         attempt_count = attempt_count + 1,
         next_retry_at = ?,
         status = CASE 
           WHEN attempt_count + 1 >= max_attempts THEN 'failed'
           ELSE 'pending'
         END,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .run(nextRetry.toISOString(), id);
  }

  /**
   * Mark a failed request as resolved
   */
  markResolved(spotifyId: string): void {
    this.db
      .prepare(
        `UPDATE failed_requests SET 
         status = 'resolved',
         resolved_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
         WHERE spotify_id = ? AND status != 'resolved'`
      )
      .run(spotifyId);
  }

  /**
   * Check if a track has a pending failed request
   */
  hasPendingFailure(spotifyId: string): boolean {
    const result = this.db
      .prepare(
        `SELECT 1 FROM failed_requests 
         WHERE spotify_id = ? 
         AND status IN ('pending', 'retrying')
         LIMIT 1`
      )
      .get(spotifyId);
    return !!result;
  }

  /**
   * Check if a track has permanently failed (404 or max attempts)
   */
  isPermanentlyFailed(spotifyId: string): boolean {
    const result = this.db
      .prepare(
        `SELECT 1 FROM failed_requests 
         WHERE spotify_id = ? 
         AND (status = 'failed' OR (error_code = 404 AND max_attempts = 1))
         LIMIT 1`
      )
      .get(spotifyId);
    return !!result;
  }

  /**
   * Delete resolved failed requests older than specified days
   */
  deleteOldResolved(daysOld = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = this.db
      .prepare(
        `DELETE FROM failed_requests 
         WHERE status = 'resolved' 
         AND resolved_at < ?`
      )
      .run(cutoffDate.toISOString());

    return result.changes;
  }

  /**
   * Get statistics
   */
  getStats(): {
    pending: number;
    retrying: number;
    failed: number;
    resolved: number;
  } {
    const result = this.db
      .prepare(
        `SELECT 
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
         SUM(CASE WHEN status = 'retrying' THEN 1 ELSE 0 END) as retrying,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
         SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved
         FROM failed_requests`
      )
      .get() as any;

    return {
      pending: result.pending || 0,
      retrying: result.retrying || 0,
      failed: result.failed || 0,
      resolved: result.resolved || 0,
    };
  }
}


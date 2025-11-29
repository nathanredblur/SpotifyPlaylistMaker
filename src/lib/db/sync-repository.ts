/**
 * Repository for sync_history table operations
 * Tracks synchronization operations
 */

import { getDatabase } from "./database";
import type { Database } from "better-sqlite3";

export interface SyncRecord {
  id: number;
  user_id?: string | null;
  collection_type: string;
  total_tracks: number;
  new_tracks: number;
  updated_tracks: number;
  soundcharts_fetched: number;
  failed_tracks: number;
  started_at: string;
  completed_at?: string | null;
  duration_ms?: number | null;
  last_added_at?: string | null;
  status: "in_progress" | "completed" | "failed";
  error_message?: string | null;
  created_at: string;
}

export interface CreateSyncInput {
  user_id?: string;
  collection_type: string;
  started_at: string;
}

export interface UpdateSyncInput {
  total_tracks?: number;
  new_tracks?: number;
  updated_tracks?: number;
  soundcharts_fetched?: number;
  failed_tracks?: number;
  completed_at?: string;
  duration_ms?: number;
  last_added_at?: string;
  status?: "in_progress" | "completed" | "failed";
  error_message?: string;
}

export class SyncRepository {
  private db: Database;

  constructor() {
    this.db = getDatabase();
  }

  /**
   * Create a new sync record
   */
  create(input: CreateSyncInput): number {
    const result = this.db
      .prepare(
        `INSERT INTO sync_history (user_id, collection_type, started_at) 
         VALUES (?, ?, ?)`
      )
      .run(input.user_id || null, input.collection_type, input.started_at);

    return result.lastInsertRowid as number;
  }

  /**
   * Update a sync record
   */
  update(id: number, input: UpdateSyncInput): void {
    const fields: string[] = [];
    const values: any[] = [];

    if (input.total_tracks !== undefined) {
      fields.push("total_tracks = ?");
      values.push(input.total_tracks);
    }
    if (input.new_tracks !== undefined) {
      fields.push("new_tracks = ?");
      values.push(input.new_tracks);
    }
    if (input.updated_tracks !== undefined) {
      fields.push("updated_tracks = ?");
      values.push(input.updated_tracks);
    }
    if (input.soundcharts_fetched !== undefined) {
      fields.push("soundcharts_fetched = ?");
      values.push(input.soundcharts_fetched);
    }
    if (input.failed_tracks !== undefined) {
      fields.push("failed_tracks = ?");
      values.push(input.failed_tracks);
    }
    if (input.completed_at !== undefined) {
      fields.push("completed_at = ?");
      values.push(input.completed_at);
    }
    if (input.duration_ms !== undefined) {
      fields.push("duration_ms = ?");
      values.push(input.duration_ms);
    }
    if (input.last_added_at !== undefined) {
      fields.push("last_added_at = ?");
      values.push(input.last_added_at);
    }
    if (input.status !== undefined) {
      fields.push("status = ?");
      values.push(input.status);
    }
    if (input.error_message !== undefined) {
      fields.push("error_message = ?");
      values.push(input.error_message);
    }

    if (fields.length === 0) return;

    values.push(id);
    const sql = `UPDATE sync_history SET ${fields.join(", ")} WHERE id = ?`;
    this.db.prepare(sql).run(...values);
  }

  /**
   * Get a sync record by ID
   */
  getById(id: number): SyncRecord | null {
    const result = this.db
      .prepare("SELECT * FROM sync_history WHERE id = ?")
      .get(id) as SyncRecord | undefined;
    return result || null;
  }

  /**
   * Get the last completed sync
   */
  getLastCompleted(collectionType?: string): SyncRecord | null {
    let sql = `SELECT * FROM sync_history WHERE status = 'completed'`;
    const params: any[] = [];

    if (collectionType) {
      sql += ` AND collection_type = ?`;
      params.push(collectionType);
    }

    sql += ` ORDER BY completed_at DESC LIMIT 1`;

    const result = this.db.prepare(sql).get(...params) as SyncRecord | undefined;
    return result || null;
  }

  /**
   * Get all sync records
   */
  getAll(limit = 50): SyncRecord[] {
    const results = this.db
      .prepare("SELECT * FROM sync_history ORDER BY created_at DESC LIMIT ?")
      .all(limit) as SyncRecord[];
    return results;
  }

  /**
   * Get in-progress syncs
   */
  getInProgress(): SyncRecord[] {
    const results = this.db
      .prepare("SELECT * FROM sync_history WHERE status = 'in_progress'")
      .all() as SyncRecord[];
    return results;
  }

  /**
   * Mark a sync as completed
   */
  markCompleted(id: number, stats: {
    total_tracks: number;
    new_tracks: number;
    soundcharts_fetched: number;
    failed_tracks: number;
    last_added_at?: string;
  }): void {
    const startedAt = this.getById(id)?.started_at;
    const completedAt = new Date().toISOString();
    const durationMs = startedAt
      ? new Date(completedAt).getTime() - new Date(startedAt).getTime()
      : null;

    this.update(id, {
      status: "completed",
      completed_at: completedAt,
      duration_ms: durationMs || undefined,
      total_tracks: stats.total_tracks,
      new_tracks: stats.new_tracks,
      soundcharts_fetched: stats.soundcharts_fetched,
      failed_tracks: stats.failed_tracks,
      last_added_at: stats.last_added_at,
    });
  }

  /**
   * Mark a sync as failed
   */
  markFailed(id: number, errorMessage: string): void {
    const startedAt = this.getById(id)?.started_at;
    const completedAt = new Date().toISOString();
    const durationMs = startedAt
      ? new Date(completedAt).getTime() - new Date(startedAt).getTime()
      : null;

    this.update(id, {
      status: "failed",
      completed_at: completedAt,
      duration_ms: durationMs || undefined,
      error_message: errorMessage,
    });
  }
}


/**
 * Database manager for SQLite
 * Handles database initialization, connections, and basic operations
 */

import Database from "better-sqlite3";
import { ALL_TABLES, SCHEMA_VERSION } from "./schema";
import type { Database as DatabaseType } from "better-sqlite3";

let dbInstance: DatabaseType | null = null;

/**
 * Database configuration
 */
export const DB_CONFIG = {
  path: process.env.DB_PATH || "./data/spotify-cache.db",
  options: {
    verbose: process.env.NODE_ENV === "development" ? console.log : undefined,
  },
} as const;

/**
 * Initialize the database and create tables if they don't exist
 */
export function initDatabase(): DatabaseType {
  if (dbInstance) {
    return dbInstance;
  }

  console.log(`📦 Initializing database at: ${DB_CONFIG.path}`);

  // Create database instance
  dbInstance = new Database(DB_CONFIG.path, DB_CONFIG.options);

  // Enable WAL mode for better concurrent access
  dbInstance.pragma("journal_mode = WAL");

  // Enable foreign keys
  dbInstance.pragma("foreign_keys = ON");

  // Create all tables
  console.log("🔨 Creating database schema...");
  for (const sql of ALL_TABLES) {
    dbInstance.exec(sql);
  }

  // Check/update schema version
  const currentVersion = dbInstance
    .prepare("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1")
    .get() as { version: number } | undefined;

  if (!currentVersion || currentVersion.version < SCHEMA_VERSION) {
    console.log(
      `📝 Updating schema version to ${SCHEMA_VERSION} (was ${
        currentVersion?.version || 0
      })`
    );
    dbInstance
      .prepare("INSERT OR REPLACE INTO schema_version (version) VALUES (?)")
      .run(SCHEMA_VERSION);
  }

  console.log("✅ Database initialized successfully");

  return dbInstance;
}

/**
 * Get the database instance (initializes if needed)
 */
export function getDatabase(): DatabaseType {
  if (!dbInstance) {
    return initDatabase();
  }
  return dbInstance;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (dbInstance) {
    console.log("🔒 Closing database connection");
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Run a database operation in a transaction
 */
export function runInTransaction<T>(fn: (db: DatabaseType) => T): T {
  const db = getDatabase();
  const transaction = db.transaction(fn);
  return transaction(db);
}

/**
 * Database statistics
 */
export function getDatabaseStats() {
  const db = getDatabase();

  const trackCount = db
    .prepare("SELECT COUNT(*) as count FROM tracks")
    .get() as { count: number };

  const soundchartsCount = db
    .prepare(
      "SELECT COUNT(*) as count FROM tracks WHERE soundcharts_data IS NOT NULL"
    )
    .get() as { count: number };

  const failedCount = db
    .prepare(
      "SELECT COUNT(*) as count FROM failed_requests WHERE status = 'pending'"
    )
    .get() as { count: number };

  const lastSync = db
    .prepare(
      "SELECT * FROM sync_history WHERE status = 'completed' ORDER BY completed_at DESC LIMIT 1"
    )
    .get();

  return {
    totalTracks: trackCount.count,
    tracksWithSoundCharts: soundchartsCount.count,
    pendingRetries: failedCount.count,
    lastSync,
  };
}

/**
 * Clean up old data (optional maintenance function)
 */
export function cleanupOldData(daysToKeep = 90): void {
  const db = getDatabase();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  const cutoffISO = cutoffDate.toISOString();

  // Clean up old failed requests that are resolved
  const deletedFailed = db
    .prepare(
      "DELETE FROM failed_requests WHERE status = 'resolved' AND resolved_at < ?"
    )
    .run(cutoffISO);

  // Clean up old sync history
  const deletedSync = db
    .prepare("DELETE FROM sync_history WHERE completed_at < ?")
    .run(cutoffISO);

  // Clean up old usage stats
  const deletedStats = db
    .prepare(
      "DELETE FROM usage_stats WHERE date < date(?, '-' || ? || ' days')"
    )
    .run(new Date().toISOString().split("T")[0], daysToKeep);

  console.log(
    `🧹 Cleanup complete: ${deletedFailed.changes} failed requests, ` +
      `${deletedSync.changes} sync history, ${deletedStats.changes} usage stats removed`
  );
}

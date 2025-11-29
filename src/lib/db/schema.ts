/**
 * Database schema definitions for SQLite
 * This file contains all table creation SQL statements
 */

export const SCHEMA_VERSION = 1;

/**
 * Tracks table - stores complete Spotify + SoundCharts data
 */
export const CREATE_TRACKS_TABLE = `
CREATE TABLE IF NOT EXISTS tracks (
  spotify_id TEXT PRIMARY KEY,
  soundcharts_uuid TEXT UNIQUE,
  
  -- Spotify data (saved track response)
  spotify_data TEXT NOT NULL,           -- JSON: Complete Spotify track object
  added_at TEXT,                        -- When user added to library
  
  -- SoundCharts data (audio features + metadata)
  soundcharts_data TEXT,                -- JSON: Complete SoundCharts response
  soundcharts_fetched_at TEXT,          -- ISO datetime when we got SoundCharts data
  
  -- Denormalized fields for fast queries (from Spotify)
  name TEXT NOT NULL,
  duration_ms INTEGER,
  explicit INTEGER DEFAULT 0,           -- SQLite uses INTEGER for boolean
  popularity INTEGER,
  preview_url TEXT,
  
  -- Denormalized fields (from SoundCharts)
  isrc TEXT,
  tempo REAL,
  energy REAL,
  danceability REAL,
  valence REAL,
  acousticness REAL,
  instrumentalness REAL,
  liveness REAL,
  loudness REAL,
  speechiness REAL,
  key INTEGER,
  mode INTEGER,
  time_signature INTEGER,
  
  -- Artists (denormalized for search)
  artists_json TEXT,                    -- JSON: Array of artist objects
  
  -- Metadata
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`;

export const CREATE_TRACKS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_tracks_name ON tracks(name);
CREATE INDEX IF NOT EXISTS idx_tracks_isrc ON tracks(isrc);
CREATE INDEX IF NOT EXISTS idx_tracks_added_at ON tracks(added_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_soundcharts_uuid ON tracks(soundcharts_uuid);
CREATE INDEX IF NOT EXISTS idx_tracks_created_at ON tracks(created_at DESC);
`;

/**
 * Failed Requests table - tracks failed SoundCharts requests for retry logic
 */
export const CREATE_FAILED_REQUESTS_TABLE = `
CREATE TABLE IF NOT EXISTS failed_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  spotify_id TEXT NOT NULL,
  
  -- Error details
  error_code INTEGER,
  error_message TEXT,
  error_response TEXT,                  -- JSON: Full error response
  
  -- Retry logic
  attempt_count INTEGER DEFAULT 1,
  max_attempts INTEGER DEFAULT 3,
  next_retry_at TEXT,                   -- ISO datetime
  
  -- Status
  status TEXT DEFAULT 'pending',        -- 'pending', 'retrying', 'failed', 'resolved'
  resolved_at TEXT,
  
  -- Metadata
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`;

export const CREATE_FAILED_REQUESTS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_failed_requests_spotify_id ON failed_requests(spotify_id);
CREATE INDEX IF NOT EXISTS idx_failed_requests_status ON failed_requests(status);
CREATE INDEX IF NOT EXISTS idx_failed_requests_next_retry ON failed_requests(next_retry_at);
`;

/**
 * Sync History table - tracks synchronization operations
 */
export const CREATE_SYNC_HISTORY_TABLE = `
CREATE TABLE IF NOT EXISTS sync_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,                         -- Optional: for multi-user support
  collection_type TEXT NOT NULL,        -- 'saved', 'playlists', 'all'
  
  -- Sync results
  total_tracks INTEGER DEFAULT 0,
  new_tracks INTEGER DEFAULT 0,
  updated_tracks INTEGER DEFAULT 0,
  soundcharts_fetched INTEGER DEFAULT 0,
  failed_tracks INTEGER DEFAULT 0,
  
  -- Timing
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_ms INTEGER,
  
  -- Last added_at timestamp from Spotify (for incremental sync)
  last_added_at TEXT,
  
  -- Status
  status TEXT DEFAULT 'in_progress',    -- 'in_progress', 'completed', 'failed'
  error_message TEXT,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`;

export const CREATE_SYNC_HISTORY_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_sync_history_status ON sync_history(status);
CREATE INDEX IF NOT EXISTS idx_sync_history_completed ON sync_history(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_history_collection ON sync_history(collection_type);
`;

/**
 * Usage Stats table - daily usage statistics
 */
export const CREATE_USAGE_STATS_TABLE = `
CREATE TABLE IF NOT EXISTS usage_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,            -- YYYY-MM-DD format
  
  -- Request counts
  total_requests INTEGER DEFAULT 0,
  cache_hits INTEGER DEFAULT 0,
  soundcharts_calls INTEGER DEFAULT 0,
  failed_calls INTEGER DEFAULT 0,
  
  -- Performance metrics
  avg_response_time_ms INTEGER,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`;

export const CREATE_USAGE_STATS_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_usage_stats_date ON usage_stats(date DESC);
`;

/**
 * Schema version table - tracks database migrations
 */
export const CREATE_SCHEMA_VERSION_TABLE = `
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`;

/**
 * All table creation statements in order
 */
export const ALL_TABLES = [
  CREATE_TRACKS_TABLE,
  CREATE_TRACKS_INDEXES,
  CREATE_FAILED_REQUESTS_TABLE,
  CREATE_FAILED_REQUESTS_INDEXES,
  CREATE_SYNC_HISTORY_TABLE,
  CREATE_SYNC_HISTORY_INDEXES,
  CREATE_USAGE_STATS_TABLE,
  CREATE_USAGE_STATS_INDEXES,
  CREATE_SCHEMA_VERSION_TABLE,
] as const;

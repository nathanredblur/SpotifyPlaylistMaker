# Cache System - Server-Side SQLite

## Overview

The application uses **SQLite** for server-side persistent caching. All track data and audio features are stored in a local database file, eliminating the need for repeated API calls.

## Architecture

```
┌─────────────────────────────────────────────┐
│              Client (Browser)               │
│  - Fetches tracks from /api/gallery/tracks  │
│  - No local caching needed                  │
└──────────────────┬──────────────────────────┘
                   │ HTTP GET
                   ▼
┌─────────────────────────────────────────────┐
│           Astro API Endpoints               │
│  - /api/gallery/tracks (public)             │
│  - /api/sync (admin)                        │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│           SQLite Database                   │
│  - tracks (immutable data)                  │
│  - users (admin info)                       │
│  - failed_requests (retry queue)            │
│  - sync_history (audit log)                 │
└─────────────────────────────────────────────┘
```

## Key Principles

### 1. Immutable Track Data

Track data (audio features, metadata) **never changes**:
- Fetched once from SoundCharts API
- Stored permanently in SQLite
- No expiration, no cache invalidation

### 2. Server-Side Only

All caching happens on the server:
- No IndexedDB or localStorage for track data
- Simpler client code
- Works with SSR

### 3. Incremental Sync

Admin sync only fetches new tracks:
- Compares with last sync timestamp
- Only requests tracks added since last sync
- Reduces API calls significantly

## Database Location

```
data/spotify-cache.db      # Main database file
data/spotify-cache.db-shm  # Shared memory file
data/spotify-cache.db-wal  # Write-ahead log
```

## Tables

### `tracks` - Track Data Cache

Stores all track information including audio features:

```sql
CREATE TABLE tracks (
  spotify_id TEXT PRIMARY KEY,
  soundcharts_uuid TEXT,
  spotify_data TEXT NOT NULL,      -- JSON: Spotify track object
  soundcharts_data TEXT,           -- JSON: SoundCharts response
  name TEXT NOT NULL,
  tempo REAL,
  energy REAL,
  danceability REAL,
  -- ... other audio features
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### `failed_requests` - Retry Queue

Tracks failed SoundCharts API calls:

```sql
CREATE TABLE failed_requests (
  spotify_id TEXT PRIMARY KEY,
  error_code INTEGER,
  error_message TEXT,
  attempt_count INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending'
);
```

### `sync_history` - Audit Log

Records all sync operations:

```sql
CREATE TABLE sync_history (
  id INTEGER PRIMARY KEY,
  total_tracks INTEGER,
  new_tracks INTEGER,
  soundcharts_fetched INTEGER,
  failed_tracks INTEGER,
  started_at TEXT,
  completed_at TEXT
);
```

## Benefits

### 1. Performance
- **First load**: ~30-60 seconds (fetches all tracks)
- **Subsequent loads**: ~1-2 seconds (reads from SQLite)
- **Incremental sync**: ~5-10 seconds (only new tracks)

### 2. Reliability
- Data persists across server restarts
- No client-side storage limits
- Automatic retry for failed requests

### 3. Simplicity
- No cache invalidation logic
- No TTL management
- No client-side sync issues

## API Endpoints

### Public (No Auth)

```
GET /api/gallery/tracks
  - Returns all tracks from database
  - Supports pagination, sorting, search
  - No API calls made

GET /api/gallery/stats
  - Returns gallery statistics
  - Reads from database
```

### Admin (Auth Required)

```
POST /api/sync
  - Fetches new tracks from Spotify
  - Saves to database
  - Fetches audio features from SoundCharts
```

## Comparison with Previous System

| Feature | Old (IndexedDB) | New (SQLite) |
|---------|-----------------|--------------|
| Location | Client browser | Server |
| Persistence | Per browser | Global |
| SSR Support | ❌ No | ✅ Yes |
| Cache Sharing | ❌ No | ✅ Yes |
| Size Limits | ~50MB | Unlimited |
| Complexity | High | Low |

## Debugging

### Check Database Contents

```bash
sqlite3 data/spotify-cache.db

# View track count
SELECT COUNT(*) FROM tracks;

# Check audio features coverage
SELECT COUNT(*) FROM tracks WHERE soundcharts_data IS NOT NULL;

# View recent syncs
SELECT * FROM sync_history ORDER BY id DESC LIMIT 5;
```

### Clear Database (Development)

```bash
rm data/spotify-cache.db*
# Restart server to recreate
```

## References

- [better-sqlite3 Documentation](https://github.com/WiseLibs/better-sqlite3)
- [SQLite Documentation](https://www.sqlite.org/docs.html)

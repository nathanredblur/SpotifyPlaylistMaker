# Database Architecture - Immutable Data Model

**Last Updated**: December 6, 2025  
**Schema Version**: 4

## Overview

The Spotify Playlist Maker uses a **hybrid data model** with a **gallery concept**:

- **Admin user** syncs their tracks → These become the public gallery
- **Visitors** browse the admin's tracks (no authentication required)
- **Immutable data** (audio features, metadata) is stored once and never changes

## Core Principle: Immutability

### What is Immutable?

**Immutable data** is information that, once fetched, never changes:

- ✅ **Audio Features**: Tempo, energy, danceability, etc. are permanent properties
- ✅ **Track Metadata**: Name, duration, ISRC, explicit flag are fixed
- ✅ **Artist Information**: Artist names and IDs don't change
- ✅ **Album Information**: Album details are static
- ✅ **SoundCharts Data**: Audio analysis results are permanent

### What is Mutable?

**Mutable data** is user-specific and changes over time:

- ❌ **Admin's Saved Tracks**: Admin adds and removes tracks from their library
- ❌ **User Profile**: Display name, email, profile picture can change
- ❌ **Sync Status**: Last sync time updates with each sync

## Database Schema

### 1. `users` Table

**Purpose**: Store user information and roles

```sql
CREATE TABLE users (
  spotify_user_id TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'regular' CHECK(role IN ('admin', 'regular')),
  display_name TEXT,
  email TEXT,
  profile_image_url TEXT,
  country TEXT,
  spotify_user_data TEXT,              -- JSON: Complete Spotify user object
  last_sync_at TEXT,                   -- When admin last synced
  last_track_added_at TEXT,            -- Most recent track from Spotify
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Characteristics**:

- **Admin user**: Only ONE admin exists (gallery owner)
  - First user to authenticate becomes admin automatically
  - Can sync tracks from Spotify
  - Tracks become the public gallery
- **Regular users**: Not currently used (visitors don't need accounts)

### 2. `tracks` Table

**Purpose**: Store IMMUTABLE track data (The Gallery)

```sql
CREATE TABLE tracks (
  spotify_id TEXT PRIMARY KEY,
  soundcharts_uuid TEXT,  -- NOT UNIQUE (multiple Spotify tracks can share)

  -- IMMUTABLE Spotify data
  spotify_data TEXT NOT NULL,          -- JSON: Complete Spotify track object

  -- IMMUTABLE SoundCharts data
  soundcharts_data TEXT,               -- JSON: Complete SoundCharts response
  soundcharts_fetched_at TEXT,

  -- Denormalized fields for fast queries
  name TEXT NOT NULL,
  duration_ms INTEGER,
  explicit INTEGER DEFAULT 0,
  popularity INTEGER,
  preview_url TEXT,
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
  artists_json TEXT,                   -- JSON: Array of artists

  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Characteristics**:

- **NEVER deleted** - Once a track is in the database, it stays forever
- **NEVER expires** - Audio features and metadata don't change
- **No UNIQUE on soundcharts_uuid** - Same song can have multiple Spotify IDs

### 3. `user_tracks` Table (Junction Table)

**Purpose**: Link admin to their tracks (gallery ownership)

```sql
CREATE TABLE user_tracks (
  user_id TEXT NOT NULL,
  track_id TEXT NOT NULL,
  added_at TEXT NOT NULL,              -- When admin added to Spotify library

  PRIMARY KEY (user_id, track_id),
  FOREIGN KEY (user_id) REFERENCES users(spotify_user_id) ON DELETE CASCADE,
  FOREIGN KEY (track_id) REFERENCES tracks(spotify_id) ON DELETE CASCADE
);
```

### 4. Supporting Tables

- `failed_requests`: Tracks failed SoundCharts API calls
- `sync_history`: Logs each sync operation
- `usage_stats`: Tracks API usage (optional)
- `schema_version`: Database migration tracking

## Data Flow

### Admin Sync Flow

```
1. Admin authenticates via Spotify OAuth
   ↓
2. System verifies admin role
   ↓
3. Fetch saved tracks from Spotify (incremental)
   ↓
4. For each new track:
   - Insert track data into `tracks` table
   - Insert into `user_tracks` (admin's library)
   ↓
5. Fetch SoundCharts data for tracks without audio features
   ↓
6. Update `tracks` table with audio features
   ↓
7. Update admin's last_sync_at
```

### Public Gallery Access

```
1. Visitor requests /api/gallery/tracks
   ↓
2. Query all tracks from `tracks` table
   ↓
3. Return tracks with audio features (no auth required)
```

## Benefits of This Architecture

### 1. **Efficiency**

- No redundant data fetching
- Audio features fetched once, stored forever
- Incremental syncs only fetch new tracks

### 2. **Simplicity**

- Single admin model
- No complex multi-user track management
- Clear separation of concerns

### 3. **Data Integrity**

- Immutable data can't be corrupted by updates
- Clear separation between user data and track data
- Foreign key constraints ensure referential integrity

### 4. **Performance**

- Fast queries (no expiration checks)
- Denormalized fields for common queries
- Indexes on frequently queried columns

## Example Queries

### Get All Gallery Tracks

```sql
SELECT * FROM tracks
ORDER BY created_at DESC
LIMIT 50 OFFSET 0;
```

### Get Tracks with Audio Features

```sql
SELECT * FROM tracks
WHERE soundcharts_data IS NOT NULL
ORDER BY popularity DESC;
```

### Get Admin's Track Count

```sql
SELECT COUNT(*) as count
FROM user_tracks ut
JOIN users u ON ut.user_id = u.spotify_user_id
WHERE u.role = 'admin';
```

### Find Tracks Without Audio Features

```sql
SELECT spotify_id, name
FROM tracks
WHERE soundcharts_data IS NULL
LIMIT 100;
```

## Best Practices

1. **Never delete tracks**: Once fetched, keep them forever
2. **Fetch audio features once**: Don't re-fetch SoundCharts data
3. **Use incremental sync**: Only fetch tracks newer than last sync
4. **Index properly**: Add indexes on frequently queried fields

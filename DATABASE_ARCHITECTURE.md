# Database Architecture - Immutable Data Model

**Last Updated**: November 29, 2025  
**Schema Version**: 3

## Overview

The Spotify Playlist Maker uses a **hybrid data model** with a **gallery concept**:
- **Admin user** syncs their tracks → These become the public gallery
- **Regular users** browse the admin's tracks (no personal tracks)
- **Immutable data** (audio features, metadata) is stored once and never changes
- **Mutable data** (user relationships, playlists) changes over time

## Core Principle: Immutability

### What is Immutable?

**Immutable data** is information that, once fetched, never changes:

- ✅ **Audio Features**: Tempo, energy, danceability, etc. are permanent properties of a track
- ✅ **Track Metadata**: Name, duration, ISRC, explicit flag are fixed
- ✅ **Artist Information**: Artist names and IDs don't change
- ✅ **Album Information**: Album details are static
- ✅ **SoundCharts Data**: Audio analysis results are permanent

### What is Mutable?

**Mutable data** is user-specific and changes over time:

- ❌ **User's Saved Tracks**: Users add and remove tracks from their library
- ❌ **User Profile**: Display name, email, profile picture can change
- ❌ **Sync Status**: Last sync time updates with each sync

## Database Schema

### 1. `users` Table
**Purpose**: Store user information and roles

```sql
CREATE TABLE users (
  spotify_user_id TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'regular' CHECK(role IN ('admin', 'regular')), -- TODO: Add this column
  display_name TEXT,
  email TEXT,
  profile_image_url TEXT,
  last_sync_at TEXT,              -- When admin last synced (admin only)
  last_track_added_at TEXT,       -- Most recent track from Spotify (admin only)
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Characteristics**:
- **Admin user**: Only ONE admin allowed (gallery owner)
  - Can sync tracks
  - Tracks become the public gallery
  - Has access to admin dashboard
- **Regular users**: Multiple users allowed (gallery visitors)
  - Browse admin's tracks
  - Can create personal playlists (future)
  - No personal track syncing

### 2. `tracks` Table
**Purpose**: Store IMMUTABLE track data (The Gallery)

```sql
CREATE TABLE tracks (
  spotify_id TEXT PRIMARY KEY,
  soundcharts_uuid TEXT,  -- NOT UNIQUE (multiple Spotify tracks can share same SoundCharts song)
  
  -- IMMUTABLE Spotify data
  spotify_data TEXT NOT NULL,
  
  -- IMMUTABLE SoundCharts data
  soundcharts_data TEXT,
  soundcharts_fetched_at TEXT,
  
  -- Denormalized fields for fast queries
  name TEXT NOT NULL,
  duration_ms INTEGER,
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
  artists_json TEXT,  -- JSON array of artists
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Characteristics**:
- **NEVER deleted** - Once a track is in the database, it stays forever
- **NEVER expires** - Audio features and metadata don't change
- **Admin's tracks only** - Only admin can add tracks (the gallery)
- **Public catalog** - All users see these tracks
- **No UNIQUE on soundcharts_uuid** - Same song can have multiple Spotify IDs (different albums, versions)

### 3. `user_tracks` Table (Junction Table)
**Purpose**: Link admin to their tracks (gallery ownership)

```sql
CREATE TABLE user_tracks (
  user_id TEXT NOT NULL,
  track_id TEXT NOT NULL,
  added_at TEXT NOT NULL,        -- When admin added to their Spotify library
  
  PRIMARY KEY (user_id, track_id),
  FOREIGN KEY (user_id) REFERENCES users(spotify_user_id) ON DELETE CASCADE,
  FOREIGN KEY (track_id) REFERENCES tracks(spotify_id) ON DELETE CASCADE
);
```

**Characteristics**:
- **Admin only** - Currently only stores admin's track relationships
- Rows are added when admin syncs new tracks
- `added_at` is when admin added track to their Spotify library
- **Future**: May store regular users' favorites/playlists

### 4. Supporting Tables

- `failed_requests`: Tracks failed SoundCharts API calls
- `sync_history`: Logs each sync operation
- `usage_stats`: Tracks API usage (optional)

## Data Flow

### Initial Sync (New User)

```
1. User logs in
   ↓
2. Create user record in `users` table
   ↓
3. Fetch user's saved tracks from Spotify
   ↓
4. For each track:
   - Check if track exists in `tracks` table
   - If not, insert track data (IMMUTABLE)
   - Insert into `user_tracks` (user_id, track_id, added_at)
   ↓
5. Fetch SoundCharts data for tracks without audio features
   ↓
6. Update `tracks` table with audio features (one-time)
```

### Incremental Sync (Existing User)

```
1. User requests sync
   ↓
2. Get user's last_track_added_at from `users` table
   ↓
3. Fetch only tracks added AFTER last_track_added_at from Spotify
   ↓
4. For each new track:
   - Check if track exists in `tracks` table
   - If not, insert track data
   - Insert into `user_tracks`
   ↓
5. Update user's last_sync_at and last_track_added_at
```

## Benefits of This Architecture

### 1. **Efficiency**
- No redundant data fetching
- Audio features fetched once, shared across all users
- Incremental syncs only fetch new tracks

### 2. **Scalability**
- Supports multiple users without data duplication
- Track data is shared (one track, many users)
- Database grows linearly with unique tracks, not user-track combinations

### 3. **Data Integrity**
- Immutable data can't be corrupted by updates
- Clear separation between user data and track data
- Foreign key constraints ensure referential integrity

### 4. **Performance**
- Fast queries (no need to check expiration dates)
- Efficient joins between users and tracks
- Indexes on frequently queried fields

## Cache Strategy

### No Expiration for Immutable Data

```typescript
// OLD (incorrect)
CACHE_TTL: {
  AUDIO_FEATURES: 24 * 60 * 60 * 1000, // 24 hours ❌
  ARTISTS: 24 * 60 * 60 * 1000,        // 24 hours ❌
}

// NEW (correct)
IMMUTABLE_DATA: {
  AUDIO_FEATURES: true,   // Never expires ✅
  ARTISTS: true,          // Never expires ✅
  ALBUMS: true,           // Never expires ✅
  TRACK_METADATA: true,   // Never expires ✅
}
```

### Refresh Only User Data

```typescript
CACHE_TTL: {
  // Only check for NEW/REMOVED tracks every 24 hours
  USER_TRACKS_REFRESH: 24 * 60 * 60 * 1000,
  
  // User profile can change
  USER_PROFILE: 7 * 24 * 60 * 60 * 1000,
}
```

## Example Queries

### Get User's Tracks with Audio Features

```sql
SELECT 
  t.*,
  ut.added_at as user_added_at
FROM user_tracks ut
JOIN tracks t ON ut.track_id = t.spotify_id
WHERE ut.user_id = ?
ORDER BY ut.added_at DESC;
```

### Find Tracks Without Audio Features

```sql
SELECT spotify_id, name
FROM tracks
WHERE soundcharts_data IS NULL
LIMIT 100;
```

### Get User's Track Count

```sql
SELECT COUNT(*) as count
FROM user_tracks
WHERE user_id = ?;
```

### Check if User Has Track

```sql
SELECT 1
FROM user_tracks
WHERE user_id = ? AND track_id = ?
LIMIT 1;
```

## Migration Strategy

### From Old Schema to New Schema

If you have existing data in the old schema (with `added_at` in `tracks` table):

1. Create new `users` and `user_tracks` tables
2. Create a default user from current session
3. Migrate existing tracks to `user_tracks`:
   ```sql
   INSERT INTO user_tracks (user_id, track_id, added_at)
   SELECT 'default_user_id', spotify_id, added_at
   FROM tracks
   WHERE added_at IS NOT NULL;
   ```
4. Remove `added_at` column from `tracks` table (optional)

## Best Practices

1. **Never delete tracks**: Once fetched, keep them forever
2. **Only update user_tracks**: Add/remove rows as user saves/unsaves tracks
3. **Fetch audio features once**: Don't re-fetch SoundCharts data
4. **Use incremental sync**: Only fetch tracks newer than last sync
5. **Index properly**: Add indexes on `user_id`, `track_id`, `added_at`

## Future Enhancements

- **Playlists**: Add `user_playlists` and `playlist_tracks` tables
- **Collaborative Filtering**: Recommend tracks based on similar users
- **Statistics**: Track listening patterns across users
- **Caching Layer**: Add Redis for frequently accessed data


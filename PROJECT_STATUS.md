# 🎵 Spotify Playlist Maker - Project Status

**Last Updated**: November 29, 2025  
**Current Phase**: Multi-User Architecture Implementation  
**Status**: 🟡 In Progress

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Concept](#architecture-concept)
3. [Current State](#current-state)
4. [Recent Changes](#recent-changes)
5. [Implementation Checklist](#implementation-checklist)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Known Issues](#known-issues)
9. [Next Steps](#next-steps)

---

## 🎯 Project Overview

**Spotify Playlist Maker** is a web application that serves as a **music gallery** where:
- An **admin user** (the owner) syncs their Spotify library
- **Regular users** can browse the admin's music collection
- Users can create personalized playlists from the admin's tracks (future feature)

### Key Technologies
- **Frontend**: Astro + React + TypeScript + Tailwind CSS v4
- **Backend**: Astro API Routes (Node.js)
- **Database**: SQLite (`better-sqlite3`)
- **Authentication**: Spotify OAuth 2.0 (PKCE Flow)
- **Audio Features**: SoundCharts API
- **State Management**: Zustand (minimal usage)
- **UI Components**: shadcn/ui + Lucide icons

---

## 🏗️ Architecture Concept

### User Roles

#### 👑 **ADMIN User** (Gallery Owner)
- **Access**: Special admin area at `/admin`
- **Authentication**: Required (Spotify OAuth)
- **Permissions**:
  - ✅ Sync personal Spotify tracks to the gallery
  - ✅ Fetch audio features from SoundCharts
  - ✅ Run maintenance operations (migrate, clear failed requests)
  - ✅ View detailed statistics and logs
  - ✅ Manage the music catalog
- **Data**: Admin's tracks = THE GALLERY (public catalog)

#### 👤 **REGULAR User** (Gallery Visitor)
- **Access**: Main app at `/`
- **Authentication**: NOT required to browse (optional for future features)
- **Permissions**:
  - ✅ Browse admin's music gallery
  - ✅ View track details and audio features
  - ✅ Filter and search tracks
  - 🔜 Create personal playlists from admin's tracks (future)
  - 🔜 Save favorites (future)
  - 🔜 Share playlists (future)
- **Data**: No personal tracks, only interacts with admin's catalog

### Data Flow

```
┌─────────────────────────────────────────────────────┐
│                   ADMIN (Owner)                     │
│  - Logs in to /admin                                │
│  - Syncs Spotify tracks                             │
│  - Manages catalog                                  │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │   TRACKS TABLE      │ ◄─── Immutable data
         │  (The Gallery)      │      (audio features, metadata)
         └─────────────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │  USER_TRACKS TABLE  │ ◄─── Admin's track associations
         │  (Admin only)       │
         └─────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────┐
│              REGULAR USERS (Visitors)                │
│  - Browse gallery (no login required)                │
│  - See all admin's tracks                            │
│  - Create playlists (future, requires login)         │
└──────────────────────────────────────────────────────┘
```

---

## 📊 Current State

### Database Statistics
- **Total Tracks**: 2,872
- **SoundCharts Coverage**: 100% (2,871/2,872)
- **Failed Requests**: 1
- **Database Size**: ~14 MB
- **Schema Version**: 3

### Working Features
- ✅ Spotify OAuth 2.0 (PKCE Flow)
- ✅ Track synchronization from Spotify
- ✅ SoundCharts audio features integration
- ✅ Admin dashboard with statistics
- ✅ Failed requests tracking and retry logic
- ✅ Database maintenance tools
- ✅ Music categorization system
- ✅ Track visualization and filtering

### Partially Implemented
- 🟡 Multi-user architecture (tables exist, not fully used)
- 🟡 User roles (needs implementation)
- 🟡 Admin-only sync (needs role verification)

### Not Yet Implemented
- ❌ Regular user browsing without login
- ❌ Role-based access control
- ❌ Personal playlists for regular users
- ❌ User favorites system
- ❌ Playlist sharing

---

## 🔄 Recent Changes (Nov 29, 2025)

### 1. **Fixed UNIQUE Constraint Error**
**Problem**: Multiple Spotify tracks can have the same SoundCharts UUID (same song, different versions).

**Solution**: Removed `UNIQUE` constraint from `soundcharts_uuid` column.

```sql
-- Before (❌)
soundcharts_uuid TEXT UNIQUE,

-- After (✅)
soundcharts_uuid TEXT,  -- Multiple tracks can share same UUID
```

**Impact**: No more false "failed to fetch" errors for duplicate UUIDs.

---

### 2. **Removed `added_at` from `tracks` Table**
**Problem**: `added_at` is user-specific data, not track data.

**Solution**: Moved `added_at` to `user_tracks` table.

**Changes Made**:
- ✅ Updated `TrackRecord` interface (removed `added_at`)
- ✅ Updated `CreateTrackInput` interface (removed `added_at`)
- ✅ Updated `create()` and `createMany()` methods
- ✅ Changed `getAll()` to use `ORDER BY created_at` instead of `added_at`
- ✅ Renamed `getMostRecentlyAdded()` → `getMostRecentlyCreated()`
- ✅ Updated all API endpoints (`/api/sync`, `/api/stats`, `/api/tracks`)
- ✅ Removed `idx_tracks_added_at` index

**Rationale**: 
- Track data is **immutable** (audio features never change)
- User-track relationships are **mutable** (users add/remove tracks)
- Separation enables multi-user support

---

### 3. **Fixed Token Expiration Handling**
**Problem**: Admin dashboard didn't handle expired Spotify tokens gracefully.

**Solution**: Added token validation and user-friendly error messages.

```typescript
// Check if token is expired before making request
if (Date.now() >= expiresAt) {
  setMaintenanceMessage({
    type: "error",
    text: "Your Spotify session has expired. Please go back to the home page and log in again.",
  });
  return;
}

// Handle 401 responses
if (response.status === 401) {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  // Show error with "Go to Login" button
}
```

---

### 4. **Removed Client-Side Caching**
**Problem**: IndexedDB caching was causing issues on server-side rendering.

**Solution**: Removed all client-side caching logic from `spotify-api.ts`.

**Changes**:
- ✅ Removed `indexeddb-cache` imports
- ✅ Simplified `getAudioFeatures()`, `getArtists()`, `getAlbums()`
- ✅ All caching now happens server-side in SQLite
- ✅ Fixed `window is not defined` error

---

### 5. **Updated Schema Version to 3**
**Changes**:
- Removed `UNIQUE` constraint from `soundcharts_uuid`
- Removed `added_at` column from `tracks`
- Added `users` and `user_tracks` tables (not yet fully used)

---

## ✅ Implementation Checklist

### Phase 1: Role-Based Architecture ⏳ IN PROGRESS

#### 1.1 Database Schema Updates
- [x] Create `users` table
- [x] Create `user_tracks` table
- [ ] Add `role` column to `users` table (`'admin' | 'regular'`)
- [ ] Add unique constraint on admin role (only one admin allowed)
- [ ] Create migration script for existing data

#### 1.2 User Management
- [ ] Create `UsersRepository` methods for role management
  - [ ] `getAdmin()` - Get the admin user
  - [ ] `isAdmin(userId)` - Check if user is admin
  - [ ] `setRole(userId, role)` - Set user role
- [ ] Create admin initialization script
- [ ] Add admin verification middleware

#### 1.3 Authentication & Authorization
- [ ] Update `/api/auth/callback` to create user record
- [ ] Add role detection logic
- [ ] Create auth middleware for admin routes
- [ ] Protect `/api/sync` endpoint (admin only)
- [ ] Protect `/api/migrate-isrc` endpoint (admin only)
- [ ] Protect `/api/clear-failed` endpoint (admin only)

---

### Phase 2: Admin Sync Flow 🔜 NEXT

#### 2.1 Update Sync Endpoint
- [ ] Get or create admin user in `/api/sync`
- [ ] Verify user is admin before syncing
- [ ] Save tracks to `tracks` table (immutable data)
- [ ] Create `user_tracks` entries for admin
- [ ] Update `users.last_sync_at` timestamp
- [ ] Return appropriate errors for non-admin users

#### 2.2 Sync Logic Updates
```typescript
// Pseudocode
async function syncAdminTracks(adminUserId, spotifyToken) {
  // 1. Verify user is admin
  if (!repos.users.isAdmin(adminUserId)) {
    throw new Error("Only admin can sync tracks");
  }

  // 2. Fetch tracks from Spotify
  const spotifyTracks = await fetchSpotifyTracks(spotifyToken);

  // 3. Save tracks (immutable data)
  repos.tracks.createMany(spotifyTracks);

  // 4. Create user_tracks entries (admin's tracks)
  repos.users.addTracks(adminUserId, spotifyTracks);

  // 5. Fetch audio features from SoundCharts
  await fetchAudioFeatures(spotifyTracks);

  // 6. Update admin's last_sync_at
  repos.users.updateLastSync(adminUserId);
}
```

---

### Phase 3: Public Gallery View 🔜 PENDING

#### 3.1 Create Public Tracks Endpoint
- [ ] Create `/api/gallery/tracks` endpoint
  - [ ] Fetch admin's tracks (JOIN `user_tracks` + `tracks`)
  - [ ] No authentication required
  - [ ] Support pagination, filtering, sorting
  - [ ] Return full track data + audio features

#### 3.2 Update Frontend
- [ ] Update `UnifiedApp` to show gallery by default
- [ ] Remove login requirement for browsing
- [ ] Update `useMusicLoaderV3` to use `/api/gallery/tracks`
- [ ] Update `MusicOrganizer` to work without auth token

#### 3.3 Gallery Features
- [ ] Display all admin's tracks
- [ ] Show audio features (tempo, energy, etc.)
- [ ] Enable filtering and sorting
- [ ] Show track metadata (artist, album, etc.)

---

### Phase 4: Regular User Features 🔮 FUTURE

#### 4.1 Optional User Login
- [ ] Add "Login" button for regular users
- [ ] Create user record on first login
- [ ] Set role to 'regular' automatically
- [ ] Store user session

#### 4.2 Personal Playlists
- [ ] Create `playlists` table
  ```sql
  CREATE TABLE playlists (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(spotify_user_id)
  );
  ```
- [ ] Create `playlist_tracks` table
  ```sql
  CREATE TABLE playlist_tracks (
    playlist_id TEXT NOT NULL,
    track_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    added_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (playlist_id, track_id),
    FOREIGN KEY (playlist_id) REFERENCES playlists(id),
    FOREIGN KEY (track_id) REFERENCES tracks(spotify_id)
  );
  ```
- [ ] Create playlist CRUD endpoints
- [ ] Add UI for creating/editing playlists
- [ ] Add "Add to Playlist" button on tracks

#### 4.3 Favorites System
- [ ] Create `favorites` table
- [ ] Add "Favorite" button on tracks
- [ ] Show user's favorites list
- [ ] Filter gallery by favorites

#### 4.4 Social Features
- [ ] Make playlists shareable (public/private)
- [ ] Generate shareable links
- [ ] Show popular playlists
- [ ] User profiles (optional)

---

## 🗄️ Database Schema

### Current Schema (Version 3)

#### `tracks` - Immutable Track Data
```sql
CREATE TABLE tracks (
  spotify_id TEXT PRIMARY KEY,
  soundcharts_uuid TEXT,  -- NOT UNIQUE (multiple tracks can share)
  
  -- Spotify data (IMMUTABLE)
  spotify_data TEXT NOT NULL,  -- JSON: Complete Spotify track object
  
  -- SoundCharts data (IMMUTABLE)
  soundcharts_data TEXT,       -- JSON: Complete SoundCharts response
  soundcharts_fetched_at TEXT, -- ISO datetime
  
  -- Denormalized fields (from Spotify)
  name TEXT NOT NULL,
  duration_ms INTEGER,
  explicit INTEGER DEFAULT 0,
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
  
  -- Artists (denormalized)
  artists_json TEXT,  -- JSON: Array of artist objects
  
  -- Metadata
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### `users` - User Information
```sql
CREATE TABLE users (
  spotify_user_id TEXT PRIMARY KEY,
  -- TODO: Add role column
  -- role TEXT NOT NULL DEFAULT 'regular' CHECK(role IN ('admin', 'regular')),
  display_name TEXT,
  email TEXT,
  profile_image_url TEXT,
  last_sync_at TEXT,
  last_track_added_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### `user_tracks` - User-Track Relationships
```sql
CREATE TABLE user_tracks (
  user_id TEXT NOT NULL,
  track_id TEXT NOT NULL,
  added_at TEXT NOT NULL,  -- When user added this track
  
  PRIMARY KEY (user_id, track_id),
  FOREIGN KEY (user_id) REFERENCES users(spotify_user_id) ON DELETE CASCADE,
  FOREIGN KEY (track_id) REFERENCES tracks(spotify_id) ON DELETE CASCADE
);
```

#### `failed_requests` - Failed SoundCharts Requests
```sql
CREATE TABLE failed_requests (
  spotify_id TEXT PRIMARY KEY,
  error_code INTEGER,
  error_message TEXT,
  error_response TEXT,
  attempt_count INTEGER DEFAULT 1,
  max_attempts INTEGER DEFAULT 3,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'failed', 'resolved')),
  last_attempt_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (spotify_id) REFERENCES tracks(spotify_id) ON DELETE CASCADE
);
```

#### `sync_history` - Sync Operations Log
```sql
CREATE TABLE sync_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collection_type TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'completed', 'failed')),
  total_tracks INTEGER,
  new_tracks INTEGER,
  soundcharts_fetched INTEGER,
  failed_tracks INTEGER,
  last_added_at TEXT,
  error_message TEXT
);
```

#### `usage_stats` - API Usage Tracking
```sql
CREATE TABLE usage_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### `schema_version` - Schema Versioning
```sql
CREATE TABLE schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔌 API Endpoints

### Public Endpoints (No Auth Required)

#### `GET /api/gallery/tracks` 🔜 TO BE CREATED
Get admin's tracks for public browsing.
```typescript
// Query params
{
  limit?: number;    // Default: 50
  offset?: number;   // Default: 0
  sort?: 'name' | 'created_at' | 'popularity';
  order?: 'asc' | 'desc';
  search?: string;   // Search by name/artist
}

// Response
{
  tracks: Track[];
  total: number;
  limit: number;
  offset: number;
}
```

### Admin Endpoints (Auth Required)

#### `POST /api/sync`
Sync admin's Spotify tracks and fetch audio features.
```typescript
// Headers
Authorization: Bearer <spotify_token>

// Body
{
  collectionType: 'saved' | 'playlist';
  playlistUri?: string;
}

// Response
{
  success: boolean;
  stats: {
    totalTracks: number;
    newTracks: number;
    fetchedFromSoundCharts: number;
    failedTracks: number;
    duration: number;
  };
}
```

#### `GET /api/stats`
Get database statistics and sync history.
```typescript
// Response
{
  tracks: {
    total: number;
    withSoundCharts: number;
    withoutSoundCharts: number;
    coveragePercentage: string;
  };
  failedRequests: {
    pending: number;
    permanentlyFailed: number;
    resolved: number;
  };
  syncs: {
    total: number;
    lastSync: SyncRecord | null;
    recent: SyncRecord[];
  };
  database: {
    sizeBytes: number;
    sizeMB: string;
  };
}
```

#### `GET /api/failed-tracks`
Get tracks with failed audio feature requests.
```typescript
// Query params
{
  limit?: number;  // Default: 50
}

// Response
{
  tracks: FailedTrack[];
  total: number;
}
```

#### `POST /api/migrate-isrc`
Migrate ISRC codes from Spotify data to track records.

#### `POST /api/clear-failed`
Clear all failed request records.

### Current Endpoints (Need Updates)

#### `GET /api/tracks` ⚠️ NEEDS UPDATE
Currently returns all tracks. Should be replaced by `/api/gallery/tracks`.

---

## 🐛 Known Issues

### Critical
- None currently

### Important
- [ ] Multi-user architecture not fully implemented
- [ ] No role-based access control
- [ ] `/api/sync` doesn't verify admin role
- [ ] Frontend still requires login to browse

### Minor
- [ ] Admin dashboard could show more detailed stats
- [ ] No user profile management
- [ ] No way to change admin user

---

## 🚀 Next Steps (Priority Order)

### Immediate (This Session)
1. ✅ ~~Fix UNIQUE constraint error~~ DONE
2. ✅ ~~Fix `added_at` column errors~~ DONE
3. ✅ ~~Fix token expiration handling~~ DONE
4. ✅ ~~Document current state~~ DONE

### Next Session (High Priority)
1. **Add `role` column to `users` table**
   - Create migration script
   - Add role validation
   - Ensure only one admin exists

2. **Implement admin verification**
   - Update `/api/sync` to check admin role
   - Add auth middleware
   - Protect admin endpoints

3. **Create public gallery endpoint**
   - `/api/gallery/tracks` for public browsing
   - No auth required
   - Returns admin's tracks

4. **Update frontend**
   - Remove login requirement for browsing
   - Show gallery by default
   - Update `useMusicLoaderV3`

### Future (Lower Priority)
1. Implement personal playlists for regular users
2. Add favorites system
3. Add social features (sharing, popular playlists)
4. Optimize performance for large catalogs
5. Add export/import functionality

---

## 📝 Important Notes

### Design Decisions

1. **Why separate `tracks` and `user_tracks`?**
   - Track data (audio features, metadata) is **immutable**
   - User-track relationships are **mutable**
   - Enables efficient multi-user support
   - Avoids data duplication

2. **Why only one admin?**
   - Simplifies the gallery concept
   - One source of truth for the catalog
   - Easier permission management
   - Can be extended to multiple admins later if needed

3. **Why no auth for browsing?**
   - Lowers barrier to entry
   - Gallery should be publicly accessible
   - Auth only needed for personalization features

### Performance Considerations

- **Database size**: ~14 MB for 2,872 tracks (acceptable)
- **Query optimization**: Indexes on frequently queried columns
- **Caching**: Server-side only (SQLite)
- **API rate limits**: SoundCharts has rate limits, handled with delays

### Security Considerations

- **Spotify tokens**: Stored in localStorage (client-side)
- **Admin verification**: Must be implemented before production
- **SQL injection**: Using prepared statements (safe)
- **CORS**: Configure for production domain

---

## 🔗 Related Documentation

- [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md) - Database design details
- [src/config/README.md](./src/config/README.md) - Configuration constants
- [AUTHENTICATION_FLOW.md](./docs/AUTHENTICATION_FLOW.md) - OAuth flow details

---

## 📞 Contact & Support

**Project Owner**: nathanredblur  
**Last Updated**: November 29, 2025  
**Version**: 0.1.0 (Alpha)

---

## 🎯 Success Metrics

### Current
- ✅ 2,872 tracks synced
- ✅ 100% SoundCharts coverage
- ✅ Admin dashboard functional
- ✅ Zero critical bugs

### Target (End of Next Phase)
- 🎯 Role-based access control implemented
- 🎯 Public gallery accessible without login
- 🎯 Admin-only sync verification
- 🎯 Clean separation between admin and regular users

---

**End of Document**


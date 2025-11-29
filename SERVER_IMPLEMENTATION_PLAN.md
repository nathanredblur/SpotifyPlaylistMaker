# Server Implementation Plan - Persistent Track Database

## 🎯 Project Overview

Create a server-side persistent database system to store complete track metadata from SoundCharts API, eliminating dependency on Spotify's deprecated Audio Features endpoint.

### Key Goals

- ✅ Store track metadata persistently in SQLite
- ✅ Minimize API calls through intelligent caching
- ✅ Rotate SoundCharts API keys automatically
- ✅ Handle failures gracefully with retry mechanism
- ✅ Provide simple API endpoints for client consumption

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser)                      │
│  - OAuth with Spotify (user authentication)             │
│  - Fetch saved tracks list                              │
│  - Request track data from server                       │
└──────────────────┬──────────────────────────────────────┘
                   │ HTTP POST /api/tracks/batch
                   │ { trackIds: [...] }
                   ↓
┌─────────────────────────────────────────────────────────┐
│              Astro API Endpoints (Server)                │
│  POST /api/tracks/batch    - Get multiple tracks        │
│  GET  /api/tracks/[id]     - Get single track           │
│  POST /api/retry-failed    - Retry failed requests      │
│  GET  /api/stats           - Usage statistics           │
│  POST /api/keys/add        - Add new API key            │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ↓                     ↓
┌──────────────────┐  ┌──────────────────┐
│  SQLite Database │  │  SoundCharts API │
│  (Persistent)    │  │                  │
│                  │  │  Headers:        │
│  - tracks        │  │  x-quota-remaining│
│  - failed_req    │  │  x-ratelimit-*   │
│  - api_keys      │  └──────────────────┘
│  - usage_stats   │
└──────────────────┘
```

---

## 📊 Database Schema

### Table: `tracks`

Complete track information from Spotify + SoundCharts

```sql
CREATE TABLE tracks (
  spotify_id TEXT PRIMARY KEY,
  soundcharts_uuid TEXT UNIQUE,

  -- Spotify data (saved track response)
  spotify_data JSON NOT NULL,           -- Complete Spotify track object
  added_at TEXT,                        -- When user added to library

  -- SoundCharts data (audio features + metadata)
  soundcharts_data JSON,                -- Complete SoundCharts response
  soundcharts_fetched_at DATETIME,      -- When we got SoundCharts data

  -- Denormalized fields for fast queries (from Spotify)
  name TEXT NOT NULL,
  duration_ms INTEGER,
  explicit BOOLEAN,
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
  artists_json JSON,

  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tracks_name ON tracks(name);
CREATE INDEX idx_tracks_isrc ON tracks(isrc);
CREATE INDEX idx_tracks_added_at ON tracks(added_at DESC);
CREATE INDEX idx_tracks_soundcharts_uuid ON tracks(soundcharts_uuid);
```

### Table: `failed_requests`

Retry queue for failed SoundCharts requests

```sql
CREATE TABLE failed_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  spotify_id TEXT NOT NULL UNIQUE,
  error_message TEXT,
  error_code INTEGER,
  http_status INTEGER,
  attempt_count INTEGER DEFAULT 1,
  max_attempts INTEGER DEFAULT 3,
  last_attempt DATETIME DEFAULT CURRENT_TIMESTAMP,
  next_retry DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_failed_next_retry ON failed_requests(next_retry)
  WHERE next_retry IS NOT NULL;
```

### Table: `api_keys`

SoundCharts API key management and rotation

```sql
CREATE TABLE api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id TEXT NOT NULL,
  api_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT 1,

  -- Quota tracking from SoundCharts headers
  quota_limit INTEGER,              -- x-quota-remaining initial value
  quota_remaining INTEGER,          -- x-quota-remaining current
  ratelimit_limit INTEGER,          -- x-ratelimit-limit
  ratelimit_remaining INTEGER,      -- x-ratelimit-remaining
  ratelimit_reset INTEGER,          -- x-ratelimit-reset (seconds)
  ratelimit_reset_at DATETIME,      -- Calculated reset time

  -- Usage tracking
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  last_used DATETIME,
  last_response_headers JSON,       -- Store last headers for debugging

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(app_id, api_key)
);

CREATE INDEX idx_api_keys_active ON api_keys(is_active, quota_remaining)
  WHERE is_active = 1;
```

### Table: `usage_stats`

Daily usage statistics

```sql
CREATE TABLE usage_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL UNIQUE,

  -- Request counts
  total_requests INTEGER DEFAULT 0,
  cache_hits INTEGER DEFAULT 0,
  soundcharts_calls INTEGER DEFAULT 0,
  failed_calls INTEGER DEFAULT 0,

  -- Performance metrics
  avg_response_time_ms INTEGER,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usage_stats_date ON usage_stats(date DESC);
```

---

## 🔄 Data Flow (Server-Driven Sync)

> **💡 Improvement**: Server handles Spotify API calls and determines new tracks automatically

### 1. Client Authentication

```typescript
// Client-side (already implemented)
// User authenticates with Spotify OAuth Implicit Flow
const token = getAccessToken();
```

### 2. Client Requests Sync

```typescript
// Client requests server to sync and return tracks
const response = await fetch("/api/sync", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${spotifyToken}`, // User's Spotify token
  },
  body: JSON.stringify({
    collectionType: "saved", // or 'playlists', 'all'
  }),
});

const result = await response.json();
// {
//   tracks: Track[],           // Complete track data (Spotify + SoundCharts)
//   stats: {
//     total: 2971,
//     cached: 2900,
//     newFromSpotify: 71,
//     fetchedFromSoundCharts: 71,
//     failed: 0
//   }
// }
```

### 3. Server Fetches from Spotify

```typescript
// Server uses client's token to fetch saved tracks
async function syncUserTracks(spotifyToken: string) {
  const spotifyAPI = new SpotifyAPI(spotifyToken);

  // 3.1 Get last sync info from DB
  const lastSync = await db.getLastSync();
  const lastAddedAt = lastSync?.last_added_at;

  // 3.2 Fetch saved tracks from Spotify (incremental)
  let newTracks = [];
  let offset = 0;
  let foundExisting = false;

  while (!foundExisting) {
    const response = await spotifyAPI.getSavedTracks(50, offset);

    // 3.3 Check if we've reached previously synced tracks
    for (const item of response.items) {
      const exists = await db.trackExists(item.track.id);

      if (exists && item.added_at <= lastAddedAt) {
        foundExisting = true;
        break;
      }

      newTracks.push(item);
    }

    if (!response.next || foundExisting) break;
    offset += 50;
  }

  return newTracks;
}
```

### 4. Server Saves Spotify Data

```typescript
// Save Spotify track data to DB
const newTrackIds = [];

for (const item of spotifyTracks) {
  const track = item.track;

  // 4.1 Save track with Spotify data
  await db.saveTrack({
    spotify_id: track.id,
    spotify_data: JSON.stringify(track),
    added_at: item.added_at,
    name: track.name,
    duration_ms: track.duration_ms,
    explicit: track.explicit,
    popularity: track.popularity,
    preview_url: track.preview_url,
    artists_json: JSON.stringify(track.artists),
  });

  newTrackIds.push(track.id);
}

// 4.2 Update last sync timestamp
await db.updateLastSync(spotifyTracks[0]?.added_at);
```

### 5. Server Fetches SoundCharts Data

```typescript
// Fetch SoundCharts data for new tracks only
for (const trackId of newTrackIds) {
  try {
    // 5.1 Fetch from SoundCharts
    const { data, headers } = await soundcharts.getTrackBySpotifyId(trackId);

    // 5.2 Update API key stats from headers
    await apiKeyManager.updateFromHeaders(keyId, headers);

    // 5.3 Update track with SoundCharts data
    await db.updateTrackWithSoundCharts(trackId, {
      soundcharts_uuid: data.object.uuid,
      soundcharts_data: JSON.stringify(data),
      soundcharts_fetched_at: new Date().toISOString(),
      isrc: data.object.isrc?.value,
      tempo: data.object.audio?.tempo,
      energy: data.object.audio?.energy,
      danceability: data.object.audio?.danceability,
      // ... other audio features
    });

  } catch (error) {
    // 5.4 Handle errors
    if (error.status === 429) {
      await apiKeyManager.rotateKey();
      // Retry with new key
    } else if (error.status === 404) {
      await db.saveFailedRequest(trackId, error, maxAttempts: 1);
    } else {
      await db.saveFailedRequest(trackId, error);
    }
  }
}
```

### 6. Server Returns Complete Data

```typescript
// Return all tracks from DB (cached + newly fetched)
const allTracks = await db.getAllTracks();

return {
  tracks: allTracks.map((track) => ({
    ...JSON.parse(track.spotify_data),
    audioFeatures: track.soundcharts_data
      ? JSON.parse(track.soundcharts_data).object.audio
      : null,
    soundchartsUuid: track.soundcharts_uuid,
  })),
  stats: {
    total: allTracks.length,
    cached: allTracks.length - newTrackIds.length,
    newFromSpotify: newTrackIds.length,
    fetchedFromSoundCharts: successCount,
    failed: failedCount,
  },
};
```

### 4. Error Handling & Retry

```typescript
// Automatic retry on server restart
async function retryFailedRequests() {
  const failed = db.getRetryableRequests();

  for (const request of failed) {
    if (request.attempt_count >= request.max_attempts) {
      // Max attempts reached - mark as permanent failure
      db.markAsPermanentFailure(request.spotify_id);
      continue;
    }

    try {
      const data = await soundcharts.getTrack(request.spotify_id);
      await db.saveTrack(request.spotify_id, data);
      await db.removeFailedRequest(request.spotify_id);
    } catch (error) {
      await db.incrementFailedAttempt(request.spotify_id);
    }
  }
}
```

### 5. API Key Rotation

```typescript
class APIKeyManager {
  async getActiveKey() {
    // Get key with highest quota remaining
    const key = db
      .query(
        `
      SELECT * FROM api_keys 
      WHERE is_active = 1 
        AND quota_remaining > 10
        AND (ratelimit_reset_at IS NULL OR ratelimit_reset_at < datetime('now'))
      ORDER BY quota_remaining DESC
      LIMIT 1
    `
      )
      .get();

    if (!key) {
      throw new Error(
        "No API keys available. Please add new key via /api/keys/add"
      );
    }

    return key;
  }

  async updateFromHeaders(keyId: number, headers: Headers) {
    const quotaRemaining = parseInt(headers.get("x-quota-remaining") || "0");
    const ratelimitRemaining = parseInt(
      headers.get("x-ratelimit-remaining") || "0"
    );
    const ratelimitReset = parseInt(headers.get("x-ratelimit-reset") || "0");

    db.query(
      `
      UPDATE api_keys 
      SET quota_remaining = ?,
          ratelimit_remaining = ?,
          ratelimit_reset = ?,
          ratelimit_reset_at = datetime('now', '+' || ? || ' seconds'),
          last_used = datetime('now'),
          last_response_headers = ?,
          total_requests = total_requests + 1,
          successful_requests = successful_requests + 1
      WHERE id = ?
    `
    ).run(
      quotaRemaining,
      ratelimitRemaining,
      ratelimitReset,
      ratelimitReset,
      JSON.stringify(Object.fromEntries(headers.entries())),
      keyId
    );

    // Auto-deactivate if quota exhausted
    if (quotaRemaining < 10) {
      console.warn(
        `⚠️ API Key ${keyId} quota low: ${quotaRemaining} remaining`
      );

      if (quotaRemaining === 0) {
        await this.deactivateKey(keyId);
      }
    }
  }
}
```

---

## 📁 File Structure

```
src/
├── server/
│   ├── db/
│   │   ├── schema.sql                    # Database schema
│   │   ├── connection.ts                 # SQLite connection
│   │   ├── migrations.ts                 # Migration runner
│   │   └── seed.ts                       # Seed initial data
│   ├── services/
│   │   ├── soundcharts-api.ts            # SoundCharts client
│   │   ├── track-service.ts              # Track business logic
│   │   └── stats-service.ts              # Statistics
│   ├── utils/
│   │   ├── api-key-manager.ts            # API key rotation
│   │   ├── retry-queue.ts                # Retry logic
│   │   └── logger.ts                     # Logging utility
│   └── types/
│       └── soundcharts.ts                # SoundCharts types
├── pages/
│   └── api/
│       ├── tracks/
│       │   ├── [id].ts                   # GET /api/tracks/:id
│       │   └── batch.ts                  # POST /api/tracks/batch
│       ├── retry-failed.ts               # POST /api/retry-failed
│       ├── stats.ts                      # GET /api/stats
│       └── keys/
│           ├── add.ts                    # POST /api/keys/add
│           └── list.ts                   # GET /api/keys/list
├── config/
│   └── soundcharts.ts                    # SoundCharts config
└── data/
    └── spotify-cache.db                  # SQLite database file
```

---

## 🚀 Implementation Phases

### Phase 1: Database Setup ✅

**Estimated time: 1 hour**

- [ ] Install dependencies

  ```bash
  pnpm add better-sqlite3
  pnpm add -D @types/better-sqlite3
  ```

- [ ] Create database schema

  - [ ] `src/server/db/schema.sql`
  - [ ] `src/server/db/connection.ts`
  - [ ] `src/server/db/migrations.ts`

- [ ] Initialize database

  - [ ] Create `data/` directory
  - [ ] Run migrations
  - [ ] Add `.gitignore` entries

- [ ] Seed initial API key
  ```sql
  INSERT INTO api_keys (app_id, api_key, quota_limit)
  VALUES ('SDOJU-API_72ECDD2E', 'b87f85822b609b91', 1000);
  ```

### Phase 2: SoundCharts Client ✅

**Estimated time: 2 hours**

- [ ] Create SoundCharts API client

  - [ ] `src/server/services/soundcharts-api.ts`
  - [ ] Implement `getTrackBySpotifyId(spotifyId: string)`
  - [ ] Parse response headers
  - [ ] Error handling (404, 429, 500)

- [ ] Create API key manager

  - [ ] `src/server/utils/api-key-manager.ts`
  - [ ] `getActiveKey()` - Get best available key
  - [ ] `updateFromHeaders()` - Update quota from response
  - [ ] `rotateKey()` - Switch to next available key
  - [ ] `deactivateKey()` - Mark key as exhausted

- [ ] Create types
  - [ ] `src/server/types/soundcharts.ts`
  - [ ] Type definitions from SoundCharts response

### Phase 3: Track Service ✅

**Estimated time: 2 hours**

- [ ] Create track service

  - [ ] `src/server/services/track-service.ts`
  - [ ] `getTrack(spotifyId)` - Get single track
  - [ ] `getTracks(spotifyIds[])` - Get multiple tracks
  - [ ] `saveTrack(spotifyId, data)` - Save to DB
  - [ ] Cache checking logic

- [ ] Create retry queue

  - [ ] `src/server/utils/retry-queue.ts`
  - [ ] `saveFailedRequest()` - Queue failed request
  - [ ] `getRetryableRequests()` - Get pending retries
  - [ ] `retryFailed()` - Process retry queue

- [ ] Create stats service
  - [ ] `src/server/services/stats-service.ts`
  - [ ] `recordCacheHit()`
  - [ ] `recordAPICall()`
  - [ ] `getStats()` - Get usage statistics

### Phase 4: API Endpoints ✅

**Estimated time: 3 hours**

- [ ] Create track endpoints

  - [ ] `src/pages/api/tracks/[id].ts`

    ```typescript
    GET /api/tracks/:id
    Response: { track: SoundChartsTrack }
    ```

  - [ ] `src/pages/api/tracks/batch.ts`
    ```typescript
    POST /api/tracks/batch
    Body: { trackIds: string[] }
    Response: {
      tracks: SoundChartsTrack[],
      cached: number,
      fetched: number,
      failed: string[]
    }
    ```

- [ ] Create admin endpoints

  - [ ] `src/pages/api/retry-failed.ts`

    ```typescript
    POST /api/retry-failed
    Response: {
      processed: number,
      succeeded: number,
      failed: number
    }
    ```

  - [ ] `src/pages/api/stats.ts`

    ```typescript
    GET /api/stats
    Response: {
      totalTracks: number,
      cacheHitRate: number,
      apiKeysStatus: Array<{
        id: number,
        quotaRemaining: number,
        isActive: boolean
      }>,
      failedRequests: number
    }
    ```

  - [ ] `src/pages/api/keys/add.ts`
    ```typescript
    POST /api/keys/add
    Body: { appId: string, apiKey: string }
    Response: { success: boolean, keyId: number }
    ```

### Phase 5: Client Integration ✅

**Estimated time: 2 hours**

- [ ] Update music loader

  - [ ] Modify `src/hooks/useMusicLoader.ts`
  - [ ] Replace direct Spotify API calls with server endpoints
  - [ ] Batch track requests (50-100 at a time)
  - [ ] Handle server errors gracefully

- [ ] Remove old cache system

  - [ ] Delete `src/lib/indexeddb-cache.ts`
  - [ ] Remove IndexedDB dependencies
  - [ ] Update imports

- [ ] Update track processor
  - [ ] Modify `src/lib/track-processor.ts`
  - [ ] Use SoundCharts data format
  - [ ] Map audio features from SoundCharts response

### Phase 6: Configuration & Environment ✅

**Estimated time: 30 minutes**

- [ ] Update environment variables

  ```bash
  # .env
  # SoundCharts API Keys (add more as needed)
  SOUNDCHARTS_APP_ID_1=SDOJU-API_72ECDD2E
  SOUNDCHARTS_API_KEY_1=b87f85822b609b91

  # Database
  DB_PATH=./data/spotify-cache.db

  # Optional: Spotify Server-Side (for future use)
  # SPOTIFY_CLIENT_SECRET=your_secret
  ```

- [ ] Update `.gitignore`

  ```gitignore
  # Database files
  data/*.db
  data/*.db-journal
  data/*.db-wal

  # Keep directory
  !data/.gitkeep
  ```

- [ ] Create config file
  - [ ] `src/config/soundcharts.ts`

### Phase 7: Testing & Validation ✅

**Estimated time: 2 hours**

- [ ] Unit tests

  - [ ] Test API key rotation
  - [ ] Test retry logic
  - [ ] Test cache hits/misses

- [ ] Integration tests

  - [ ] Test full flow: client → server → SoundCharts → DB
  - [ ] Test error scenarios
  - [ ] Test quota exhaustion

- [ ] Manual testing
  - [ ] Load 100 tracks
  - [ ] Verify cache works
  - [ ] Trigger retry queue
  - [ ] Exhaust API key quota

### Phase 8: Admin UI (Optional) ✅

**Estimated time: 3 hours**

- [ ] Create admin page
  - [ ] `src/pages/admin.astro`
  - [ ] Display statistics
  - [ ] List API keys with status
  - [ ] Show failed requests
  - [ ] Add new API key form
  - [ ] Trigger retry button

---

## 🔧 Configuration

### SoundCharts API Headers Reference

```typescript
interface SoundChartsHeaders {
  "cache-control": "no-cache, private";
  "content-type": "application/json; charset=utf-8";
  "x-quota-remaining": string; // Remaining quota (e.g., "999")
  "x-ratelimit-limit": string; // Total rate limit (e.g., "10000")
  "x-ratelimit-remaining": string; // Remaining in current window (e.g., "9999")
  "x-ratelimit-reset": string; // Seconds until reset (e.g., "13")
  "x-ratelimit-used": string; // Used in current window (e.g., "1")
  "x-request-id": string; // Request ID for debugging
}
```

### API Key Rotation Strategy

1. **Priority**: Use key with highest `quota_remaining`
2. **Rate Limit**: Respect `x-ratelimit-reset` before reusing key
3. **Auto-deactivate**: When `quota_remaining` reaches 0
4. **Notification**: Alert when all keys exhausted

### Retry Strategy

| Attempt | Wait Time | Trigger                     |
| ------- | --------- | --------------------------- |
| 1       | Immediate | On first failure            |
| 2       | 1 hour    | On server restart or manual |
| 3       | 24 hours  | On server restart or manual |
| Failed  | Never     | Mark as permanent failure   |

---

## 📊 Success Metrics

### Performance Targets

- ✅ Cache hit rate: > 90% after initial load
- ✅ API response time: < 200ms (cached), < 2s (SoundCharts)
- ✅ Batch processing: 100 tracks in < 10 seconds
- ✅ Database size: < 100MB for 10,000 tracks

### Reliability Targets

- ✅ Uptime: 99.9%
- ✅ Failed request recovery: > 95%
- ✅ API key rotation: Automatic, zero downtime

---

## ⚠️ Important Considerations

### Database Management

- **Backup**: Regular backups of `spotify-cache.db`
- **Size**: Monitor database size, implement cleanup if needed
- **Migrations**: Version control schema changes

### API Key Management

- **Security**: Never commit API keys to public repos
- **Rotation**: Prepare multiple keys in advance
- **Monitoring**: Set up alerts for quota exhaustion

### Error Handling

- **404 Not Found**: Track doesn't exist in SoundCharts (don't retry)
- **429 Rate Limit**: Rotate to next key immediately
- **500 Server Error**: Retry with exponential backoff

### Privacy & Security

- **Private Use**: This system is for personal use only
- **No Sharing**: Don't expose API endpoints publicly
- **Authentication**: Consider adding auth if deploying

---

## 🎯 Next Steps After Implementation

1. **Monitor Usage**

   - Track daily API calls
   - Monitor cache hit rate
   - Watch for failed requests

2. **Optimize**

   - Identify most requested tracks
   - Pre-fetch popular tracks
   - Implement background sync

3. **Scale**

   - Add more API keys as needed
   - Consider paid SoundCharts plan
   - Implement distributed caching

4. **Enhance**
   - Add track similarity search
   - Implement playlist recommendations
   - Export database for backup

---

## 📚 Resources

- [SoundCharts API Documentation](https://developers.soundcharts.com/documentation/reference/song/get-song-by-platform-id)
- [Astro Endpoints Guide](https://docs.astro.build/en/guides/endpoints/)
- [Better SQLite3 Documentation](https://github.com/WiseLibs/better-sqlite3)
- [SQLite Documentation](https://www.sqlite.org/docs.html)

---

## ✅ Pre-Implementation Checklist

- [ ] SoundCharts API key obtained and tested
- [ ] Database schema reviewed and approved
- [ ] File structure created
- [ ] Dependencies installed
- [ ] Environment variables configured
- [ ] `.gitignore` updated
- [ ] Backup strategy planned

---

**Total Estimated Time**: 15-16 hours

**Priority**: High - Blocks audio features functionality

**Status**: Ready to implement

---

_Last Updated: 2024-11-27_

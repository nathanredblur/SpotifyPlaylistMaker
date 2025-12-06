# 🎵 Spotify Playlist Maker - Project Status

**Last Updated**: December 6, 2025  
**Current Phase**: Gallery Implementation Complete  
**Status**: 🟢 Operational

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Current State](#current-state)
4. [Implementation Status](#implementation-status)
5. [API Reference](#api-reference)
6. [Database Schema](#database-schema)
7. [Next Steps](#next-steps)

---

## 🎯 Project Overview

**Spotify Playlist Maker** is a web application that serves as a **public music gallery** where:

- An **admin user** (the owner) syncs their Spotify library
- **Visitors** can browse the admin's music collection without authentication
- Audio features are fetched from SoundCharts API

### Key Technologies

- **Frontend**: Astro + React 19 + TypeScript + Tailwind CSS v4
- **Backend**: Astro API Routes (Node.js)
- **Database**: SQLite (`better-sqlite3`)
- **Authentication**: Spotify OAuth 2.0 (PKCE Flow) - Admin only
- **Audio Features**: SoundCharts API
- **UI Components**: shadcn/ui + Lucide icons

---

## 🏗️ Architecture

### Gallery Concept

```
┌─────────────────────────────────────────────────────┐
│                   ADMIN (Owner)                     │
│  - Logs in to /admin via Spotify OAuth              │
│  - Syncs personal Spotify tracks                    │
│  - Manages the music catalog                        │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │   TRACKS TABLE      │ ◄─── Immutable data
         │  (The Gallery)      │      (audio features, metadata)
         └─────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────┐
│              VISITORS (Public)                       │
│  - Browse gallery at / (no login required)           │
│  - See all admin's tracks with audio features        │
│  - Filter by genre, energy, tempo, etc.             │
└──────────────────────────────────────────────────────┘
```

### User Roles

| Role        | Access   | Authentication | Permissions                             |
| ----------- | -------- | -------------- | --------------------------------------- |
| **Admin**   | `/admin` | Spotify OAuth  | Sync tracks, manage catalog, view stats |
| **Visitor** | `/`      | None required  | Browse gallery, filter tracks           |

> **Note**: Regular users never need to log in. Only the admin authenticates to sync tracks.

---

## 📊 Current State

### Database Statistics

- **Total Tracks**: 2,872
- **SoundCharts Coverage**: 100% (2,871/2,872)
- **Failed Requests**: 1
- **Database Size**: ~14 MB
- **Schema Version**: 4

### Admin User

- **User ID**: `kb5az9dhti3mkx2dr2js64lm1`
- **Display Name**: Nathan Redblur
- **Role**: `admin`

---

## ✅ Implementation Status

### 1. Role System ✅ COMPLETE

- [x] `role` column in `users` table (`'admin' | 'regular'`)
- [x] First user automatically becomes admin
- [x] Role methods in `UsersRepository`:
  - `getAdmin()` - Get the admin user
  - `isAdmin(userId)` - Check if user is admin
  - `setRole(userId, role)` - Set user role
  - `promoteToAdmin(userId)` - Promote to admin (validates single admin)
  - `hasAdmin()` - Check if admin exists

### 2. Admin Protection ✅ COMPLETE

Protected endpoints (require admin authentication):

- [x] `POST /api/sync` - Sync admin's Spotify tracks
- [x] `POST /api/migrate-isrc` - Migrate ISRC codes
- [x] `POST /api/clear-failed` - Clear failed requests
- [x] `GET /api/stats` - Detailed database statistics

**Implementation**:

```typescript
// All admin endpoints use verifyAdmin()
const authResult = await verifyAdmin(request);
if (!authResult.success || !authResult.isAdmin) {
  return createAuthErrorResponse(authResult);
}
```

### 3. Public Gallery ✅ COMPLETE

Public endpoints (no authentication required):

- [x] `GET /api/gallery/tracks` - Get gallery tracks (paginated)
- [x] `GET /api/gallery/stats` - Get gallery statistics

**Features**:

- Pagination support (limit, offset)
- Sorting (name, created_at, popularity, tempo, energy, danceability)
- Search by track name or artist
- CORS enabled for public access

### 4. Frontend ✅ COMPLETE

- [x] `UnifiedApp.tsx` - Shows gallery without login requirement
- [x] `GalleryViewer.tsx` - Public gallery viewer component
- [x] `useGalleryLoader.ts` - Loads tracks from `/api/gallery/tracks`
- [x] `MainApp.tsx` - Main application with categorization

---

## 🔌 API Reference

### Public Endpoints

#### `GET /api/gallery/tracks`

Get gallery tracks (no auth required).

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Max tracks per page (max 500) |
| `offset` | number | 0 | Pagination offset |
| `sort` | string | created_at | Sort field |
| `order` | string | desc | Sort order (asc/desc) |
| `search` | string | - | Search by name/artist |

**Response**:

```json
{
  "tracks": [...],
  "pagination": {
    "total": 2872,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  },
  "gallery": {
    "totalTracks": 2872,
    "tracksWithAudioFeatures": 2871,
    "coveragePercentage": "99.9"
  }
}
```

#### `GET /api/gallery/stats`

Get gallery statistics (no auth required).

**Response**:

```json
{
  "gallery": {
    "totalTracks": 2872,
    "tracksWithAudioFeatures": 2871,
    "coveragePercentage": "99.9"
  },
  "owner": {
    "displayName": "Nathan Redblur"
  },
  "lastUpdated": "2025-11-29T..."
}
```

### Admin Endpoints

#### `POST /api/sync`

Sync admin's Spotify tracks (admin auth required).

**Headers**:

```
Authorization: Bearer <spotify_token>
```

**Body**:

```json
{
  "collectionType": "saved"
}
```

**Response**:

```json
{
  "success": true,
  "tracks": [...],
  "stats": {
    "total": 2872,
    "cached": 2872,
    "newFromSpotify": 0,
    "fetchedFromSoundCharts": 0,
    "failed": 0,
    "duration": 1234
  }
}
```

---

## 🗄️ Database Schema

### Schema Version: 4

#### `users` Table

```sql
CREATE TABLE users (
  spotify_user_id TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'regular' CHECK(role IN ('admin', 'regular')),
  display_name TEXT,
  email TEXT,
  profile_image_url TEXT,
  country TEXT,
  spotify_user_data TEXT,
  last_sync_at TEXT,
  last_track_added_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### `tracks` Table

```sql
CREATE TABLE tracks (
  spotify_id TEXT PRIMARY KEY,
  soundcharts_uuid TEXT,  -- NOT UNIQUE (multiple tracks can share)
  spotify_data TEXT NOT NULL,
  soundcharts_data TEXT,
  soundcharts_fetched_at TEXT,
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
  artists_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### `user_tracks` Table

```sql
CREATE TABLE user_tracks (
  user_id TEXT NOT NULL,
  track_id TEXT NOT NULL,
  added_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, track_id),
  FOREIGN KEY (user_id) REFERENCES users(spotify_user_id) ON DELETE CASCADE,
  FOREIGN KEY (track_id) REFERENCES tracks(spotify_id) ON DELETE CASCADE
);
```

---

## 🚀 Next Steps

### Potential Improvements

1. **UI/UX Enhancements**

   - Add track visualization plots (scatter plots for audio features)
   - Improve mobile responsiveness
   - Add dark/light mode toggle

2. **Gallery Features**

   - Add more filtering options
   - Implement track recommendations
   - Add playlist creation for visitors (would require auth)

3. **Performance**

   - Implement server-side caching
   - Add Redis for frequently accessed data
   - Optimize large gallery queries

4. **Social Features** (Future)
   - Personal playlists for logged-in users
   - Favorites system
   - Playlist sharing

---

## 📝 Key Design Decisions

1. **Gallery Concept**: Admin's tracks are the public catalog

   - Simplifies the model
   - Clear ownership and control
   - No need for multi-user track management

2. **Immutable Track Data**: Audio features never expire

   - Reduces API calls
   - Improves performance
   - Data stored once, used forever

3. **No Auth for Browsing**: Public gallery access

   - Lowers barrier to entry
   - Better user experience
   - Auth only needed for admin features

4. **First User = Admin**: Automatic promotion
   - Simplifies setup
   - No manual configuration needed
   - Single admin model

---

**Project Owner**: nathanredblur  
**Last Updated**: December 6, 2025  
**Version**: 1.0.0

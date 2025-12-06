# Admin Dashboard Guide

## Overview

The admin section (`/admin`) provides tools for syncing your Spotify library and monitoring the database.

## Access

**URL**: `/admin`

**Authentication**: Requires Spotify OAuth login. The first user to authenticate becomes the admin automatically.

## Features

### Sync Tracks

1. Click "Sync Tracks" button
2. Authenticate with Spotify (if not already)
3. The system will:
   - Fetch your saved tracks from Spotify
   - Save new tracks to the database
   - Fetch audio features from SoundCharts
   - Update statistics

### Statistics Dashboard

View real-time statistics:

- **Total Tracks**: Number of tracks in the gallery
- **SoundCharts Coverage**: Percentage of tracks with audio features
- **Failed Requests**: Tracks that couldn't be fetched from SoundCharts
- **Database Size**: Size of the SQLite database

### Maintenance Operations

Available via API endpoints (admin auth required):

| Endpoint                 | Description                  |
| ------------------------ | ---------------------------- |
| `POST /api/sync`         | Sync tracks from Spotify     |
| `POST /api/migrate-isrc` | Migrate ISRC codes from JSON |
| `POST /api/clear-failed` | Clear failed request records |

## API Reference

### POST `/api/sync`

Triggers a sync operation.

**Headers**:

```
Authorization: Bearer <spotify_access_token>
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
    "cached": 2800,
    "newFromSpotify": 72,
    "fetchedFromSoundCharts": 72,
    "failed": 0,
    "duration": 15234
  }
}
```

### GET `/api/stats`

Returns database statistics.

**Response**:

```json
{
  "success": true,
  "tracks": {
    "total": 2872,
    "withSoundCharts": 2871,
    "withoutSoundCharts": 1,
    "coveragePercentage": "99.9"
  },
  "failedRequests": {
    "pending": 1,
    "permanentlyFailed": 0
  },
  "syncs": {
    "total": 51,
    "lastSync": {...}
  }
}
```

## Understanding Error Codes

When SoundCharts requests fail:

| Code | Meaning                  | Action                   |
| ---- | ------------------------ | ------------------------ |
| 404  | Track not in SoundCharts | Expected for some tracks |
| 402  | Quota exceeded           | Update API credentials   |
| 429  | Rate limited             | Wait before retrying     |
| 403  | Forbidden                | Check API credentials    |

## Troubleshooting

### Low SoundCharts Coverage

1. Check if ISRCs are populated (run migrate-isrc)
2. Clear failed requests to allow retry
3. Trigger a new sync

### Sync Taking Too Long

- Normal duration: 5-35 seconds
- First sync can take longer (30-60 seconds for 1000+ tracks)
- Subsequent syncs are incremental (only new tracks)

### Quota Issues

If you see "Quota exceeded" errors:

1. Check your SoundCharts plan
2. Update API credentials in `.env`
3. Wait for quota reset

## Security Note

Admin endpoints require:

1. Valid Spotify access token
2. User must have `admin` role in database

The first user to authenticate automatically becomes admin.

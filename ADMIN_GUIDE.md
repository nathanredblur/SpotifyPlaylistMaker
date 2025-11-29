# Admin Dashboard Guide

## Overview

The admin section provides comprehensive tools for monitoring and maintaining the Spotify Playlist Maker database.

## Pages

### 1. Admin Dashboard (`/admin`)

**Purpose**: Real-time monitoring and statistics visualization

**Features**:
- **Key Metrics Cards**
  - Total tracks in database
  - SoundCharts coverage percentage
  - Failed requests count
  - Database size

- **Track Coverage**
  - Audio features coverage
  - ISRC codes coverage
  - Missing data breakdown

- **Sync History**
  - Last sync details
  - Average sync duration
  - Recent sync operations

- **Audio Features Coverage**
  - Individual feature coverage (tempo, energy, danceability, etc.)
  - Per-feature statistics

- **Failed Requests Breakdown**
  - Errors by HTTP status code
  - 404 (Not Found), 403 (Forbidden), 429 (Rate Limited), etc.

- **Recent Tracks**
  - Latest tracks added to database
  - ISRC and audio features status

**Auto-refresh**: Dashboard refreshes every 30 seconds automatically

### 2. Database Maintenance (`/maintenance`)

**Purpose**: Manual database operations and maintenance tasks

**Operations**:

1. **Migrate ISRCs**
   - Extracts ISRC codes from `spotify_data` JSON
   - Populates the `isrc` column for better SoundCharts lookups
   - Shows migration statistics

2. **Clear Failed Requests**
   - Removes all failed request records
   - Allows retry with updated strategies
   - Requires confirmation

3. **Trigger Manual Sync**
   - Manually initiates a sync operation
   - Fetches new tracks from Spotify
   - Updates SoundCharts data
   - Shows sync progress and results

## API Endpoints

### GET `/api/stats`

Returns comprehensive database statistics.

**Response Structure**:
```json
{
  "success": true,
  "timestamp": "2025-11-29T02:39:32.456Z",
  "tracks": {
    "total": 2872,
    "withSoundCharts": 377,
    "withoutSoundCharts": 2495,
    "withISRC": 2870,
    "withoutISRC": 2,
    "coveragePercentage": "13.1",
    "isrcPercentage": "99.9"
  },
  "audioFeatures": {
    "coverage": {
      "tempo": { "count": 373 },
      "energy": { "count": 374 },
      // ... more features
    },
    "averageCoverage": 12.24
  },
  "failedRequests": {
    "pending": 9,
    "permanentlyFailed": 0,
    "resolved": 0,
    "byErrorCode": [
      { "error_code": 404, "count": 5 }
    ]
  },
  "syncs": {
    "total": 51,
    "lastSync": {
      "id": 51,
      "startedAt": "2025-11-29T02:30:39.271Z",
      "completedAt": "2025-11-29T02:31:14.227Z",
      "duration": 34956,
      "totalTracks": 1,
      "newTracks": 0,
      "soundchartsFetched": 97,
      "failedTracks": 3
    },
    "avgDuration": 7342,
    "recent": [/* last 10 syncs */]
  },
  "database": {
    "sizeBytes": 12812288,
    "sizeMB": "12.22"
  },
  "recentTracks": [/* last 5 tracks */]
}
```

### POST `/api/migrate-isrc`

Migrates ISRC codes from JSON to dedicated column.

**Response**:
```json
{
  "success": true,
  "message": "ISRC migration complete",
  "totalTracks": 2872,
  "updatedCount": 2870,
  "alreadyHadIsrcCount": 0,
  "noIsrcInSpotifyData": 2
}
```

### POST `/api/clear-failed`

Clears all failed request records.

**Response**:
```json
{
  "success": true,
  "message": "Cleared 9 failed requests.",
  "clearedCount": 9
}
```

### POST `/api/sync`

Triggers a manual sync operation.

**Request Body**:
```json
{
  "collectionType": "saved",
  "playlistUri": null
}
```

**Response**:
```json
{
  "success": true,
  "tracks": [/* array of tracks */],
  "stats": {
    "total": 2872,
    "cached": 2872,
    "newFromSpotify": 0,
    "fetchedFromSoundCharts": 97,
    "failed": 3,
    "duration": 34956
  }
}
```

## Usage Tips

### Monitoring Database Health

1. Visit `/admin` to see current database status
2. Check **SoundCharts Coverage** - aim for >80%
3. Monitor **Failed Requests** - investigate if >100
4. Review **Recent Tracks** to ensure new tracks are being processed

### Improving Audio Features Coverage

1. Run **Migrate ISRCs** (if not done already)
2. **Clear Failed Requests** to retry previously failed tracks
3. **Trigger Manual Sync** to fetch audio features
4. Monitor progress in dashboard

### Understanding Error Codes

- **404 (Not Found)**: Track not available in SoundCharts database (expected for some tracks)
- **403 (Forbidden)**: Authentication issue or quota exceeded
- **429 (Rate Limited)**: Too many requests, wait before retrying
- **402 (Quota Exceeded)**: SoundCharts API quota exhausted, update API key

## Performance Metrics

### Current Stats (Example)
- **Total Tracks**: 2,872
- **SoundCharts Coverage**: 13.1% (377 tracks)
- **ISRC Coverage**: 99.9% (2,870 tracks)
- **Database Size**: 12.22 MB
- **Average Sync Duration**: 7.3 seconds

### Optimization Goals
- Increase SoundCharts coverage to >80%
- Reduce failed requests to <50
- Maintain ISRC coverage >95%

## Troubleshooting

### Low SoundCharts Coverage
1. Check if ISRCs are populated
2. Clear failed requests
3. Trigger manual sync
4. Check SoundCharts API quota

### High Failed Requests
1. Review error codes in dashboard
2. If mostly 404s, tracks may not exist in SoundCharts
3. If 403/429/402, check API credentials and quota

### Sync Taking Too Long
- Normal sync duration: 5-35 seconds
- If >1 minute, check network connection
- Review SoundCharts rate limits

## Access Control

Currently, admin pages are publicly accessible. Consider implementing authentication for production use.

**Recommended**: Add middleware to protect `/admin` and `/maintenance` routes.


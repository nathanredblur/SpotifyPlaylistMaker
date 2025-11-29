# Configuration Files

This directory contains all configuration files for the Spotify Playlist Maker application.

## Files

### `constants.ts`
Centralized application constants for rate limits, timeouts, cache TTLs, and other configurable values.

**Usage:**
```typescript
import { SPOTIFY_API, SOUNDCHARTS_API, ADMIN_DASHBOARD } from "@/config/constants";

// Use in your code
const maxRetries = SPOTIFY_API.MAX_RETRIES;
const refreshInterval = ADMIN_DASHBOARD.REFRESH_INTERVAL;
```

**Categories:**
- **API Rate Limits**: Spotify and SoundCharts API configuration
- **Cache & Storage**: TTL values and storage keys (with immutable data support)
- **Database**: Pagination and batch sizes
- **UI Configuration**: Dashboard refresh intervals and display limits
- **Sync Configuration**: Batch processing and timing
- **Error Codes**: HTTP status codes and error messages
- **Feature Flags**: Enable/disable features
- **Audio Features**: Thresholds and ranges for audio analysis

## Important: Immutable Data

Some data in the application **NEVER expires** because it's immutable:

- **Audio Features** (tempo, energy, danceability, etc.) - These are permanent properties of a track
- **Artist Information** - Artist names and metadata don't change
- **Album Information** - Album details are static
- **Track Metadata** - Track name, duration, ISRC are permanent

Only **user-specific data** changes over time:
- User's saved tracks list (tracks can be added/removed)
- User profile information

The database schema reflects this with:
- `tracks` table: Stores immutable track data (never deleted, only added)
- `users` table: Stores user profile information
- `user_tracks` table: Junction table linking users to their tracks (this is what changes)

### `spotify.ts`
Spotify OAuth configuration including client ID, redirect URIs, and scopes.

**Environment Variables Required:**
- `PUBLIC_SPOTIFY_CLIENT_ID`
- `PUBLIC_SPOTIFY_REDIRECT_URI_LOCAL`
- `PUBLIC_SPOTIFY_REDIRECT_URI_REMOTE`

## Modifying Constants

To change application behavior, edit the values in `constants.ts`:

### Example: Change Auto-Refresh Interval
```typescript
export const ADMIN_DASHBOARD = {
  REFRESH_INTERVAL: 60000, // Change from 30s to 60s
  // ...
} as const;
```

### Example: Adjust Rate Limits
```typescript
export const SOUNDCHARTS_API = {
  MAX_TRACKS_PER_SYNC: 200, // Increase from 100 to 200
  REQUEST_DELAY: 200,        // Increase delay to avoid rate limiting
  // ...
} as const;
```

### Example: Enable Debug Logging
```typescript
export const FEATURES = {
  DEBUG_LOGGING: true, // Enable debug logs
  // ...
} as const;
```

## Type Safety

All constants are exported with TypeScript types for type-safe access:

```typescript
import type { SpotifyApiConfig, AdminDashboardConfig } from "@/config/constants";

// Type-safe configuration
const config: SpotifyApiConfig = SPOTIFY_API;
```

## Best Practices

1. **Use constants instead of magic numbers**: Always reference constants rather than hardcoding values
2. **Document changes**: Add comments when modifying values to explain the reasoning
3. **Test after changes**: Verify that changes don't break existing functionality
4. **Keep values reasonable**: Don't set extremely high or low values that could cause issues

## Related Files

- `src/lib/spotify-api.ts` - Uses `SPOTIFY_API` constants
- `src/lib/spotify-auth.ts` - Uses `STORAGE_KEYS` constants
- `src/pages/api/sync.ts` - Uses `SOUNDCHARTS_API` and `FAILED_REQUESTS` constants
- `src/components/AdminDashboard.tsx` - Uses `ADMIN_DASHBOARD` constants


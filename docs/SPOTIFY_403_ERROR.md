# Fixing Spotify 403 Error on Audio Features

## Problem

You may encounter a `403 (Forbidden)` error when the app tries to fetch audio features:

```
GET https://api.spotify.com/v1/audio-features?ids=... 403 (Forbidden)
```

## Why This Happens

The Spotify API has different access levels:

1. **Development Mode** (Default)
   - Limited to 25 users
   - Some endpoints may be restricted
   - **Audio Features endpoint may return 403**

2. **Extended Quota Mode**
   - Request from Spotify Dashboard
   - Full API access
   - No user limits

## Solution 1: Request Extended Quota (Recommended)

### Steps:

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Select your app
3. Click "Settings"
4. Scroll down to "API Access"
5. Click "Request Extension"
6. Fill out the form explaining your use case
7. Wait for approval (usually 1-2 business days)

### What to write in the request:

```
App Name: Organize Your Music
Use Case: Personal music organization tool that analyzes audio features
         (energy, danceability, tempo, etc.) to categorize and organize
         Spotify music collections.
Commercial: No (or Yes if applicable)
Users: Personal use / Small user base
```

## Solution 2: App Works Without Audio Features

**Good news**: The app will still work without audio features!

When audio features fail:
- ✅ Tracks still load
- ✅ Basic info still available (title, artist, album, year)
- ✅ Genre categorization still works
- ✅ Playlists can still be created
- ❌ No mood categorization (energy, danceability, etc.)
- ❌ No audio analysis features

The app automatically handles this and continues loading your music.

## Solution 3: Use a Different Spotify App

If you need audio features immediately:

1. Create a new Spotify app in the Dashboard
2. Some apps get extended quota automatically
3. Update your `.env` file with the new Client ID
4. Restart the dev server

## Checking Your App Status

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Select your app
3. Look for "Quota" or "API Access" section
4. Check if it says "Development" or "Extended"

## Technical Details

### Why 403 Instead of 401?

- **401 (Unauthorized)**: Invalid or expired token
- **403 (Forbidden)**: Valid token, but insufficient permissions/quota

### Affected Endpoints

In Development mode, these endpoints may be restricted:
- `/v1/audio-features` ⚠️ Most commonly affected
- `/v1/audio-analysis/{id}` ⚠️ May be restricted
- `/v1/recommendations` ⚠️ May be restricted

### Unaffected Endpoints

These always work in Development mode:
- `/v1/me` ✅ User profile
- `/v1/me/tracks` ✅ Saved tracks
- `/v1/playlists/{id}` ✅ Playlist data
- `/v1/artists` ✅ Artist info
- `/v1/albums` ✅ Album info

## Workaround for Development

If you're just testing and don't need audio features:

The app will automatically skip audio features and continue working. You'll see a warning in the console:

```
Skipping audio features for N tracks.
This usually happens if your Spotify app is in Development mode.
Tracks will still be loaded but without audio analysis data.
```

## Testing Audio Features

To test if audio features work:

```javascript
// In browser console
const token = localStorage.getItem('spotify_access_token');
const { token: accessToken } = JSON.parse(token);

fetch('https://api.spotify.com/v1/audio-features?ids=11dFghVXANMlKmJXsNCbNl', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

**Expected results**:
- ✅ **200 OK**: Audio features work!
- ❌ **403 Forbidden**: Need extended quota
- ❌ **401 Unauthorized**: Token expired

## FAQ

### Q: Will my app work without audio features?
**A**: Yes! You'll still be able to organize by genre, year, artist, and create playlists.

### Q: How long does quota extension take?
**A**: Usually 1-2 business days, sometimes instant.

### Q: Can I use someone else's app?
**A**: No, each developer needs their own app with their own quota.

### Q: Is there a free tier with audio features?
**A**: Yes, but you need to request Extended Quota (still free).

### Q: What if my request is denied?
**A**: Rare, but you can reapply with more details about your use case.

## References

- [Spotify Web API Reference](https://developer.spotify.com/documentation/web-api)
- [Audio Features Endpoint](https://developer.spotify.com/documentation/web-api/reference/get-several-audio-features)
- [Quota Extension Guide](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)


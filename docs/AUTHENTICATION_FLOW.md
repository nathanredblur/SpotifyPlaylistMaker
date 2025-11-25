# Authentication Flow

This document explains how the Spotify OAuth authentication works in this application.

## Flow Diagram

```
┌─────────────┐
│   User at   │
│     /       │
│  (Landing)  │
└──────┬──────┘
       │
       │ 1. Clicks "Organize your music"
       │    (Saves collection_info to localStorage)
       │
       v
┌─────────────────────┐
│  authorizeSpotify() │
│  Redirects to:      │
│  Spotify OAuth      │
└──────┬──────────────┘
       │
       │ 2. User authorizes app
       │
       v
┌─────────────────────┐
│   Spotify OAuth     │
│   Redirects to:     │
│   /app#access_token │
└──────┬──────────────┘
       │
       │ 3. With access_token in URL hash
       │
       v
┌─────────────────────┐
│    /app page        │
│  - Parse hash       │
│  - Store token      │
│  - Clear hash       │
│  - Mount React app  │
└──────┬──────────────┘
       │
       │ 4. Token stored in localStorage
       │
       v
┌─────────────────────┐
│  <MusicOrganizer /> │
│  - Load user data   │
│  - Load music       │
│  - Show main UI     │
└─────────────────────┘
```

## Step-by-Step Explanation

### 1. User Initiates Authorization

**Location**: `src/components/LandingPage.tsx`

```typescript
const handleStart = () => {
  // Save collection preferences
  localStorage.setItem('collection_info', JSON.stringify({
    type: collectionType,
    uri: playlistUri, // if applicable
  }));

  // Redirect to Spotify
  authorizeSpotify();
};
```

**What happens**:
- User selects what music to organize
- Collection info is saved to localStorage
- User is redirected to Spotify OAuth

### 2. Spotify Authorization

**Location**: `src/lib/spotify-auth.ts`

```typescript
export function authorizeSpotify(): void {
  const authUrl = getAuthorizationUrl();
  window.location.href = authUrl;
}
```

**Authorization URL format**:
```
https://accounts.spotify.com/authorize?
  client_id=YOUR_CLIENT_ID
  &response_type=token
  &redirect_uri=http://localhost:4321/app
  &scope=user-library-read+playlist-modify-public+playlist-modify-private
  &show_dialog=false
```

**What happens**:
- User sees Spotify's authorization page
- User logs in (if not already)
- User grants permissions to the app
- Spotify redirects back to our app

### 3. OAuth Callback Handling

**Location**: `src/pages/app.astro`

**Redirect URL format**:
```
http://localhost:4321/app#access_token=BQC...&token_type=Bearer&expires_in=3600
```

**What happens**:
```typescript
// Parse the hash
const { accessToken, error } = parseAuthHash();

if (error) {
  // Handle error
  alert(`Authorization failed: ${error}`);
  window.location.href = "/";
  return;
}

if (accessToken) {
  // Store the token
  setAccessToken(accessToken);
  
  // Clean up URL
  clearAuthHash();
}
```

### 4. Token Storage

**Location**: `src/lib/spotify-auth.ts`

```typescript
interface StoredToken {
  token: string;
  expiresAt: number;
  createdAt: number;
}

export function setAccessToken(token: string, expiresIn = 3600): void {
  const tokenData: StoredToken = {
    token: token.trim(),
    expiresAt: Date.now() + expiresIn * 1000,
    createdAt: Date.now(),
  };
  
  localStorage.setItem('spotify_access_token', JSON.stringify(tokenData));
}
```

**What's stored**:
- `token`: The actual access token
- `expiresAt`: When the token expires (timestamp)
- `createdAt`: When the token was created (timestamp)

### 5. App Initialization

**Location**: `src/components/MusicOrganizer.tsx`

```typescript
export function MusicOrganizer({ accessToken }: { accessToken: string }) {
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    const api = new SpotifyAPI(accessToken);
    const user = await api.getCurrentUser();
    // ... load music
  };
}
```

## Important Configuration

### Redirect URIs

**Must be configured in two places**:

1. **Environment variables** (`.env`):
```bash
PUBLIC_SPOTIFY_REDIRECT_URI_LOCAL=http://localhost:4321/app
PUBLIC_SPOTIFY_REDIRECT_URI_REMOTE=https://your-domain.com/app
```

2. **Spotify Developer Dashboard**:
   - Go to your app settings
   - Add redirect URIs:
     - `http://localhost:4321/app` (for development)
     - `https://your-domain.com/app` (for production)

⚠️ **The URIs must match exactly** (including trailing slashes or lack thereof)

### Token Expiration

- **Default lifetime**: 3600 seconds (1 hour)
- **Handled automatically**: Token is checked on every `getAccessToken()` call
- **Auto-redirect**: If token is expired, user is redirected to landing page

## Security Considerations

### Why Implicit Grant Flow?

This app uses the **Implicit Grant Flow** (response_type=token) because:
- ✅ No backend server required
- ✅ Suitable for client-side apps
- ✅ Token is short-lived (1 hour)
- ❌ Token is visible in URL (briefly)
- ❌ No refresh token

### Token Storage

**localStorage** is used because:
- ✅ Persists across page reloads
- ✅ Simple to implement
- ✅ Suitable for short-lived tokens
- ⚠️ Accessible to JavaScript (XSS risk)
- ⚠️ Not suitable for sensitive data

**Security measures**:
- Token is cleared from URL immediately
- Token expiration is validated
- Token is cleared on logout
- No sensitive data is stored

## Troubleshooting

### "Authorization failed"

**Possible causes**:
1. User denied permissions
2. Invalid client ID
3. Redirect URI mismatch

**Solution**:
- Check Spotify Developer Dashboard settings
- Verify `.env` configuration
- Ensure redirect URIs match exactly

### "No valid access token found"

**Possible causes**:
1. Token expired
2. localStorage was cleared
3. User never authorized

**Solution**:
- User needs to authorize again
- Check browser console for errors

### Token not being saved

**Possible causes**:
1. localStorage is disabled
2. Browser in private/incognito mode
3. Storage quota exceeded

**Solution**:
- Check browser settings
- Clear localStorage
- Use normal browsing mode

## Testing the Flow

### Manual Test

1. Start dev server: `pnpm dev`
2. Go to `http://localhost:4321`
3. Select collection type
4. Click "Organize your music"
5. Authorize on Spotify
6. Should redirect to `/app` with token
7. Check localStorage: `spotify_access_token` should exist
8. App should load user data

### Debugging

**Check token in console**:
```javascript
// In browser console
const token = localStorage.getItem('spotify_access_token');
console.log(JSON.parse(token));
```

**Check token info**:
```javascript
import { getTokenInfo } from '@/lib/spotify-auth';
console.log(getTokenInfo());
```

## References

- [Spotify Authorization Guide](https://developer.spotify.com/documentation/web-api/concepts/authorization)
- [Implicit Grant Flow](https://developer.spotify.com/documentation/web-api/tutorials/implicit-flow)
- [OAuth 2.0 Implicit Grant](https://oauth.net/2/grant-types/implicit/)


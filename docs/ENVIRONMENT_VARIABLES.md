# Environment Variables

This document explains how environment variables are used in this project.

## Astro Environment Variables

Astro uses `import.meta.env` to access environment variables. Variables are loaded from `.env` files at build time.

### Public vs Private Variables

- **Public variables** (prefixed with `PUBLIC_`): Exposed to client-side code
- **Private variables** (no prefix): Only available server-side

Since this app uses Spotify OAuth which requires the client ID in the browser, we use `PUBLIC_` prefix.

## Required Variables

### `PUBLIC_SPOTIFY_CLIENT_ID`

**Required**: Yes  
**Type**: String  
**Description**: Your Spotify application client ID

Get this from your [Spotify Developer Dashboard](https://developer.spotify.com/dashboard):
1. Create a new app or select an existing one
2. Copy the "Client ID" from the app settings

**Example**:
```
PUBLIC_SPOTIFY_CLIENT_ID=a7b44a3926144ba1ad1ea2b5207ab495
```

### `PUBLIC_SPOTIFY_REDIRECT_URI_LOCAL`

**Required**: No (has default)  
**Type**: String  
**Default**: `http://localhost:4321/`  
**Description**: Redirect URI for local development

This must match one of the redirect URIs configured in your Spotify app settings.

**Example**:
```
PUBLIC_SPOTIFY_REDIRECT_URI_LOCAL=http://localhost:4321/
```

### `PUBLIC_SPOTIFY_REDIRECT_URI_REMOTE`

**Required**: No (has default)  
**Type**: String  
**Default**: `https://oym.c7.ee/`  
**Description**: Redirect URI for production deployment

This must match one of the redirect URIs configured in your Spotify app settings.

**Example**:
```
PUBLIC_SPOTIFY_REDIRECT_URI_REMOTE=https://your-domain.com/
```

## Setup Instructions

### 1. Create `.env` file

```bash
cp .env.example .env
```

### 2. Configure Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app or select existing one
3. Click "Edit Settings"
4. Add your redirect URIs:
   - `http://localhost:4321/` (for local development)
   - Your production URL (for deployment)
5. Save settings

### 3. Update `.env` file

```bash
# .env
PUBLIC_SPOTIFY_CLIENT_ID=your_actual_client_id_here
PUBLIC_SPOTIFY_REDIRECT_URI_LOCAL=http://localhost:4321/
PUBLIC_SPOTIFY_REDIRECT_URI_REMOTE=https://your-domain.com/
```

### 4. Restart dev server

If the dev server is running, restart it to load the new environment variables:

```bash
# Stop the server (Ctrl+C)
# Start again
pnpm dev
```

## Deployment

When deploying to production (Vercel, Netlify, etc.), add the environment variables in your hosting platform's dashboard:

### Vercel
1. Go to Project Settings → Environment Variables
2. Add each `PUBLIC_*` variable
3. Redeploy

### Netlify
1. Go to Site Settings → Environment Variables
2. Add each `PUBLIC_*` variable
3. Trigger a new deploy

## Security Notes

⚠️ **Important**:
- Never commit `.env` to git (it's in `.gitignore`)
- The Spotify Client ID is public and safe to expose in client-side code
- Never expose your Client Secret (we don't use it in this app)
- Redirect URIs must be exactly configured in Spotify settings

## Troubleshooting

### Error: "Invalid client ID"
- Check that `PUBLIC_SPOTIFY_CLIENT_ID` is set correctly
- Verify the client ID in your Spotify Developer Dashboard

### Error: "Invalid redirect URI"
- Ensure the redirect URI in `.env` matches exactly what's in Spotify settings
- Include trailing slashes if present in Spotify settings
- Check for http vs https

### Variables not loading
- Restart the dev server after changing `.env`
- Verify variable names start with `PUBLIC_`
- Check for typos in variable names

## Example `.env` file

```bash
# Spotify API Configuration
PUBLIC_SPOTIFY_CLIENT_ID=a7b44a3926144ba1ad1ea2b5207ab495
PUBLIC_SPOTIFY_REDIRECT_URI_LOCAL=http://localhost:4321/
PUBLIC_SPOTIFY_REDIRECT_URI_REMOTE=https://oym.c7.ee/
```

## References

- [Astro Environment Variables](https://docs.astro.build/en/guides/environment-variables/)
- [Spotify Web API Authorization](https://developer.spotify.com/documentation/web-api/concepts/authorization)
- [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)


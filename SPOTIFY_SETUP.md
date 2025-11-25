# 🎵 Spotify App Setup Guide

This guide will help you configure your Spotify Developer App to work with this application.

## ⚠️ IMPORTANT: Update Required

**The redirect URIs have changed!** You need to update your Spotify App settings.

### Old URIs (don't work anymore):
- ❌ `http://localhost:4321/`
- ❌ `https://your-domain.com/`

### New URIs (required):
- ✅ `http://localhost:4321/app`
- ✅ `https://your-domain.com/app`

---

## Step-by-Step Setup

### 1. Go to Spotify Developer Dashboard

Visit: [https://developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)

### 2. Select Your App

- If you already have an app, click on it
- If not, click "Create app"

### 3. Edit Settings

Click the "Settings" or "Edit Settings" button

### 4. Update Redirect URIs

In the "Redirect URIs" section:

#### For Local Development:
```
http://localhost:4321/app
```

#### For Production (replace with your domain):
```
https://spotify.nathanredblur.dev/app
```

**Important notes**:
- ✅ Include `/app` at the end
- ✅ No trailing slash
- ✅ Use `http://` for localhost
- ✅ Use `https://` for production
- ⚠️ URIs are case-sensitive
- ⚠️ Must match exactly what's in `.env`

### 5. Save Changes

Click "Save" at the bottom of the settings page

### 6. Copy Your Client ID

You'll need this for your `.env` file

---

## Update Your .env File

### 1. Open `.env` in your project root

### 2. Update the values:

```bash
# Your Spotify Client ID
PUBLIC_SPOTIFY_CLIENT_ID=your_client_id_here

# Redirect URIs (must match Spotify Dashboard)
PUBLIC_SPOTIFY_REDIRECT_URI_LOCAL=http://localhost:4321/app
PUBLIC_SPOTIFY_REDIRECT_URI_REMOTE=https://your-domain.com/app
```

### 3. Restart the dev server

```bash
# Stop the server (Ctrl+C)
pnpm dev
```

---

## Verification Checklist

Before testing, verify:

- [ ] Redirect URIs in Spotify Dashboard include `/app`
- [ ] `.env` file has correct Client ID
- [ ] `.env` redirect URIs match Spotify Dashboard exactly
- [ ] Dev server has been restarted
- [ ] No typos in the URIs

---

## Testing the Setup

### 1. Start the app

```bash
pnpm dev
```

### 2. Open in browser

```
http://localhost:4321
```

### 3. Test authorization

1. Select a collection type
2. Click "Organize your music"
3. You should be redirected to Spotify
4. After authorizing, you should return to `/app`
5. The app should load your music

### 4. Check for errors

**If you see an error**:
- Check browser console (F12)
- Verify redirect URIs match
- Check that Client ID is correct
- Ensure dev server was restarted

---

## Common Issues

### "Invalid redirect URI"

**Problem**: Spotify rejects the redirect URI

**Solutions**:
1. Check for typos in Spotify Dashboard
2. Ensure URIs match exactly (including `/app`)
3. Check for trailing slashes
4. Verify http vs https

### "Authorization failed"

**Problem**: Can't complete authorization

**Solutions**:
1. Check Client ID in `.env`
2. Verify redirect URIs are saved in Spotify Dashboard
3. Clear browser cache and cookies
4. Try in incognito mode

### "No valid access token found"

**Problem**: Token isn't being saved

**Solutions**:
1. Check that you're redirected to `/app` (not `/`)
2. Look for errors in browser console
3. Verify localStorage isn't disabled
4. Check that redirect URI in `.env` includes `/app`

---

## Production Deployment

### 1. Add Production Redirect URI

In Spotify Dashboard, add:
```
https://your-actual-domain.com/app
```

### 2. Update Environment Variables

In your hosting platform (Vercel, Netlify, etc.):

```bash
PUBLIC_SPOTIFY_CLIENT_ID=your_client_id_here
PUBLIC_SPOTIFY_REDIRECT_URI_REMOTE=https://your-actual-domain.com/app
```

### 3. Deploy

Your app should now work in production!

---

## Screenshots

### Spotify Dashboard - Redirect URIs

```
┌─────────────────────────────────────────┐
│ Redirect URIs                            │
├─────────────────────────────────────────┤
│ http://localhost:4321/app        [×]    │
│ https://spotify.nathanredblur.dev/app [×]│
│                                          │
│ [Add URI]                                │
└─────────────────────────────────────────┘
```

### .env File

```bash
# Spotify API Configuration
PUBLIC_SPOTIFY_CLIENT_ID=92a8eca2e40f4a0a84278c541c766d9e

# Redirect URIs
PUBLIC_SPOTIFY_REDIRECT_URI_LOCAL=http://localhost:4321/app
PUBLIC_SPOTIFY_REDIRECT_URI_REMOTE=https://spotify.nathanredblur.dev/app
```

---

## Need Help?

- 📖 Read [AUTHENTICATION_FLOW.md](./docs/AUTHENTICATION_FLOW.md) for technical details
- 📖 Read [ENVIRONMENT_VARIABLES.md](./docs/ENVIRONMENT_VARIABLES.md) for configuration help
- 🐛 Check browser console for error messages
- 💬 Open an issue on GitHub

---

## Quick Reference

| Setting | Value |
|---------|-------|
| **Spotify Dashboard** | https://developer.spotify.com/dashboard |
| **Local Redirect URI** | `http://localhost:4321/app` |
| **Production Redirect URI** | `https://your-domain.com/app` |
| **Scopes Required** | `user-library-read`, `playlist-modify-public`, `playlist-modify-private` |
| **OAuth Flow** | Implicit Grant (response_type=token) |


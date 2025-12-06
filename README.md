# Spotify Playlist Maker

A modern web application to organize your Spotify music collection by genre, mood, decade, and more.

## 🚀 Tech Stack

- **[Astro](https://astro.build/)** - Modern web framework with SSR
- **[React 19](https://react.dev/)** - UI components
- **[Tailwind CSS v4](https://tailwindcss.com/)** - Styling
- **[shadcn/ui](https://ui.shadcn.com/)** - UI component library
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety
- **[SQLite](https://www.sqlite.org/)** - Database (better-sqlite3)
- **[SoundCharts API](https://soundcharts.com/)** - Audio features data

## 🏗️ Architecture

### Gallery Concept

This application works as a **public music gallery**:

- **Admin** (gallery owner) syncs their Spotify tracks → becomes the public catalog
- **Visitors** can browse the gallery without authentication
- Audio features (tempo, energy, danceability, etc.) are fetched from SoundCharts API

### User Roles

| Role        | Access   | Permissions                                        |
| ----------- | -------- | -------------------------------------------------- |
| **Admin**   | `/admin` | Sync tracks, manage catalog, view stats            |
| **Visitor** | `/`      | Browse gallery, filter tracks, view audio features |

> **Note**: Regular users don't need to log in. Only the admin authenticates via Spotify OAuth to sync tracks.

## 📦 Project Structure

```
/
├── src/
│   ├── components/     # React & Astro components
│   │   └── ui/        # shadcn/ui components
│   ├── config/        # Configuration files
│   ├── hooks/         # React hooks (useGalleryLoader, etc.)
│   ├── layouts/       # Page layouts
│   ├── lib/           # Utility functions
│   │   └── db/        # Database repositories
│   ├── pages/         # Astro pages
│   │   └── api/       # API endpoints
│   │       └── gallery/  # Public gallery API
│   ├── stores/        # Zustand stores
│   ├── styles/        # Global styles
│   └── types/         # TypeScript types
├── data/              # SQLite database
├── web-legacy/        # Original application (preserved)
└── public/            # Static assets
```

## 🛠️ Development

### Prerequisites

- Node.js 24.11.0 (LTS) or higher
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install

# Create .env file from example
cp .env.example .env

# Edit .env and add your credentials:
# - Spotify Client ID (required for admin sync)
# - SoundCharts API credentials (required for audio features)

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### Adding shadcn/ui Components

```bash
# Add a new component
pnpm dlx shadcn@latest add [component-name]

# Example: Add a dialog component
pnpm dlx shadcn@latest add dialog
```

## 🎨 Features

### ✅ Implemented

- **Public Gallery**: Browse tracks without authentication
- **Audio Features**: Tempo, energy, danceability, valence, and more
- **Genre Classification**: Automatic genre detection from SoundCharts
- **Track Filtering**: Filter by various audio attributes
- **Admin Dashboard**: Sync tracks and view statistics
- **Incremental Sync**: Only fetches new tracks from Spotify
- **Role-Based Access**: Admin-only endpoints protected

### 🔜 Planned

- Personal playlists for visitors (requires login)
- Favorites system
- Playlist sharing
- Export/import functionality

## 🔌 API Endpoints

### Public Endpoints (No Auth Required)

| Endpoint              | Method | Description                    |
| --------------------- | ------ | ------------------------------ |
| `/api/gallery/tracks` | GET    | Get gallery tracks (paginated) |
| `/api/gallery/stats`  | GET    | Get gallery statistics         |

### Admin Endpoints (Auth Required)

| Endpoint            | Method | Description                 |
| ------------------- | ------ | --------------------------- |
| `/api/sync`         | POST   | Sync admin's Spotify tracks |
| `/api/stats`        | GET    | Get detailed database stats |
| `/api/migrate-isrc` | POST   | Migrate ISRC codes          |
| `/api/clear-failed` | POST   | Clear failed requests       |

## 🗄️ Database

The application uses SQLite for persistent storage:

- **Location**: `data/spotify-cache.db`
- **Schema Version**: 4
- **Tables**: `users`, `tracks`, `user_tracks`, `failed_requests`, `sync_history`

### Key Tables

- **tracks**: Immutable track data (Spotify + SoundCharts)
- **users**: User information with role (`admin` or `regular`)
- **user_tracks**: User-track relationships (admin's library)
- **failed_requests**: Retry queue for failed SoundCharts requests

## 🔐 Authentication

### Admin Authentication Flow

1. Admin visits `/admin`
2. Clicks "Sync" → redirects to Spotify OAuth
3. After auth, first user becomes admin automatically
4. Subsequent logins verify admin role

### Protected Routes

All admin endpoints verify:

1. Valid Spotify access token
2. User has `admin` role in database

```typescript
// Example: Admin verification in API endpoint
const authResult = await verifyAdmin(request);
if (!authResult.success || !authResult.isAdmin) {
  return createAuthErrorResponse(authResult);
}
```

## 🔧 Environment Variables

```bash
# .env file
PUBLIC_SPOTIFY_CLIENT_ID=your_client_id_here
PUBLIC_SPOTIFY_REDIRECT_URI_LOCAL=http://localhost:4321/
PUBLIC_SPOTIFY_REDIRECT_URI_REMOTE=https://your-domain.com/

# SoundCharts API (required for audio features)
SOUNDCHARTS_APP_ID=your_app_id
SOUNDCHARTS_API_KEY=your_api_key
```

**Note**: In Astro, variables prefixed with `PUBLIC_` are exposed to client-side code.

## 📊 Current Status

| Metric                  | Value  |
| ----------------------- | ------ |
| Total Tracks            | 2,872  |
| Audio Features Coverage | 100%   |
| Database Size           | ~14 MB |
| Schema Version          | 4      |

## 📝 Migration Status

### ✅ Completed

- [x] Move legacy application to `web-legacy/`
- [x] Initialize Astro project with Tailwind CSS v4
- [x] Configure React 19 integration
- [x] Install and configure shadcn/ui
- [x] Implement Spotify OAuth (PKCE Flow)
- [x] Create SQLite database with repositories
- [x] Implement SoundCharts integration
- [x] Create admin dashboard
- [x] Implement role-based access control
- [x] Create public gallery endpoints
- [x] Build gallery viewer component

### 🚧 In Progress

- [ ] Improve gallery UI/UX
- [ ] Add more filtering options
- [ ] Implement track visualization plots

## 📄 License

This is a forked version. The original project had no license, so use at your own discretion.

## 🙏 Credits

Originally created by [@plamere](https://github.com/plamere).
Cherry-picked changes from [@kmturley](https://github.com/kmturley)'s fork.

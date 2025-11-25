# Spotify Playlist Maker

A modern web application to organize your Spotify music collection by genre, mood, decade, and more.

## 🚀 Tech Stack

- **[Astro](https://astro.build/)** - Modern web framework
- **[React 19](https://react.dev/)** - UI components
- **[Tailwind CSS v4](https://tailwindcss.com/)** - Styling
- **[shadcn/ui](https://ui.shadcn.com/)** - UI component library
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety

## 📦 Project Structure

```
/
├── src/
│   ├── components/     # React & Astro components
│   │   └── ui/        # shadcn/ui components
│   ├── config/        # Configuration files
│   ├── layouts/       # Page layouts
│   ├── lib/           # Utility functions
│   ├── pages/         # Astro pages
│   └── styles/        # Global styles
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

# Edit .env and add your Spotify Client ID
# Get your client ID from: https://developer.spotify.com/dashboard

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

- Organize music by genre, mood, decade, and more
- Create custom playlists based on track attributes
- Visualize your music collection with interactive plots
- Filter tracks by energy, danceability, tempo, and other audio features
- Save organized playlists directly to Spotify

## 📝 Migration Status

### Phase 1: ✅ Complete

- [x] Move legacy application to `web-legacy/`
- [x] Initialize Astro project with Tailwind CSS v4
- [x] Configure React integration
- [x] Install and configure shadcn/ui
- [x] Verify build process

### Phase 2: 🚧 Pending

- [ ] Migrate HTML structure to Astro
- [ ] Port JavaScript logic to TypeScript
- [ ] Implement Spotify API integration
- [ ] Maintain feature parity with legacy app

### Phase 3: 🚧 Pending

- [ ] Create modular React components
- [ ] Implement shadcn/ui components
- [ ] Apply modern Spotify-inspired design
- [ ] Add glassmorphism effects
- [ ] Optimize and refactor codebase

## 🔐 Spotify Configuration

The app uses the Spotify Web API. You'll need to:

1. **Create a Spotify Developer account** at [developer.spotify.com](https://developer.spotify.com/dashboard)
2. **Register your application** and get your Client ID
3. **Add redirect URIs** in your Spotify app settings:
   - For local development: `http://localhost:4321/`
   - For production: Your deployed URL
4. **Configure environment variables**:
   - Copy `.env.example` to `.env`
   - Add your `PUBLIC_SPOTIFY_CLIENT_ID`
   - Update redirect URIs if needed

### Environment Variables

```bash
# .env file
PUBLIC_SPOTIFY_CLIENT_ID=your_client_id_here
PUBLIC_SPOTIFY_REDIRECT_URI_LOCAL=http://localhost:4321/
PUBLIC_SPOTIFY_REDIRECT_URI_REMOTE=https://your-domain.com/
```

**Note**: In Astro, environment variables prefixed with `PUBLIC_` are exposed to the client-side code.

## 📄 License

This is a forked version. The original project had no license, so use at your own discretion.

## 🙏 Credits

Originally created by [@plamere](https://github.com/plamere).
Cherry-picked changes from [@kmturley](https://github.com/kmturley)'s fork.

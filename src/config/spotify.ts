export const SPOTIFY_CONFIG = {
  clientId: 'a7b44a3926144ba1ad1ea2b5207ab495',
  redirectUri: {
    remote: 'https://oym.c7.ee/',
    local: 'http://localhost:4321/',
  },
  scopes: [
    'user-library-read',
    'playlist-modify-public',
    'playlist-modify-private',
  ],
} as const;

export function getRedirectUri(): string {
  if (typeof window !== 'undefined') {
    return window.location.hostname === 'localhost'
      ? SPOTIFY_CONFIG.redirectUri.local
      : SPOTIFY_CONFIG.redirectUri.remote;
  }
  return SPOTIFY_CONFIG.redirectUri.remote;
}


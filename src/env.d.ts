/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SPOTIFY_CLIENT_ID: string;
  readonly PUBLIC_SPOTIFY_REDIRECT_URI_LOCAL: string;
  readonly PUBLIC_SPOTIFY_REDIRECT_URI_REMOTE: string;
  // Server-side only (not prefixed with PUBLIC_)
  readonly SOUNDCHARTS_APP_ID: string;
  readonly SOUNDCHARTS_API_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SPOTIFY_CLIENT_ID: string;
  readonly PUBLIC_SPOTIFY_REDIRECT_URI_LOCAL: string;
  readonly PUBLIC_SPOTIFY_REDIRECT_URI_REMOTE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}


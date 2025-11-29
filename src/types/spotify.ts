// Spotify API Types

export interface SpotifyUser {
  id: string;
  display_name?: string;
  email?: string;
  images?: Array<{ url: string }>;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres?: string[];
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  release_date: string;
  genres?: string[];
  images?: Array<{ url: string }>;
}

export interface SpotifyTrackDetails {
  id: string;
  name: string;
  uri: string;
  preview_url: string | null;
  duration_ms: number;
  explicit: boolean;
  popularity: number;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  external_ids?: {
    isrc?: string;
    ean?: string;
    upc?: string;
  };
}

export interface AudioFeatures {
  id: string;
  tempo: number;
  energy: number;
  danceability: number;
  loudness: number;
  liveness: number;
  valence: number;
  acousticness: number;
  speechiness: number;
  instrumentalness: number;
}

export interface TrackFeatures extends AudioFeatures {
  date_added: Date;
  age: number;
  explicit: boolean;
  duration_ms: number;
  popularity: number;
  source: string;
  count: number;
  year: number;
  genres: Set<string>;
  topGenre: string;
  // Computed features
  sadness: number;
  happiness: number;
  anger: number;
}

export interface Track {
  id: string;
  details: SpotifyTrackDetails;
  feats: Partial<TrackFeatures>;
}

export interface PlaylistNode {
  name: string;
  label: string;
  plottable: boolean;
  tracks: Track[];
  artists: Set<string>;
  filter: (track: Track) => boolean;
  getter: (track: Track) => any;
  sorter: (tracks: Track[]) => Track[];
}

export interface CategoryBin {
  name: string;
  nodes: PlaylistNode[];
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  uri: string;
  owner: { id: string };
  tracks: { total: number };
}

export interface SavedTrackItem {
  added_at: string;
  track: SpotifyTrackDetails;
  is_local?: boolean;
}

export interface PlaylistTrackItem {
  added_at: string;
  track: SpotifyTrackDetails;
  is_local?: boolean;
}

// API Response Types
export interface SpotifyPaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  next: string | null;
  previous: string | null;
}

export interface AudioFeaturesResponse {
  audio_features: (AudioFeatures | null)[];
}

export interface ArtistsResponse {
  artists: (SpotifyArtist | null)[];
}

export interface AlbumsResponse {
  albums: (SpotifyAlbum | null)[];
}

// Collection Types
export type CollectionType = "saved" | "added" | "follow" | "all" | "playlist";

export interface CollectionInfo {
  type: CollectionType;
  uri?: string;
}

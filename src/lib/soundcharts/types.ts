/**
 * TypeScript types for SoundCharts API responses
 */

export interface SoundChartsAudioFeatures {
  tempo?: number;
  energy?: number;
  danceability?: number;
  valence?: number;
  acousticness?: number;
  instrumentalness?: number;
  liveness?: number;
  loudness?: number;
  speechiness?: number;
  key?: number;
  mode?: number;
  timeSignature?: number;
}

export interface SoundChartsISRC {
  value: string;
}

export interface SoundChartsTrackObject {
  uuid: string;
  name: string;
  isrc?: SoundChartsISRC;
  audio?: SoundChartsAudioFeatures;
  spotifyId?: string;
  // Add more fields as needed
}

export interface SoundChartsTrackResponse {
  object: SoundChartsTrackObject;
  // Add more fields as needed
}

export interface SoundChartsError {
  message: string;
  statusCode: number;
  error?: string;
}

export interface SoundChartsHeaders {
  "x-quota-remaining"?: string;
  "x-ratelimit-limit"?: string;
  "x-ratelimit-remaining"?: string;
  "x-ratelimit-reset"?: string;
  "x-ratelimit-used"?: string;
  "x-request-id"?: string;
  "cache-control"?: string;
}


/**
 * SoundCharts API Client
 * Handles requests to SoundCharts API for audio features
 */

import type { SoundChartsTrackResponse, SoundChartsError } from "./types";

const BASE_URL = "https://customer.api.soundcharts.com/api/v2.25";

export class SoundChartsAPIError extends Error {
  constructor(message: string, public status: number, public response?: any) {
    super(message);
    this.name = "SoundChartsAPIError";
  }
}

export interface SoundChartsResponse<T> {
  data: T;
  headers: Headers;
}

export class SoundChartsClient {
  private appId: string;
  private token: string;

  constructor(appId: string, token: string) {
    this.appId = appId;
    this.token = token;
  }

  /**
   * Make a request to SoundCharts API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<SoundChartsResponse<T>> {
    const url = `${BASE_URL}${endpoint}`;

    const headers: HeadersInit = {
      "x-app-id": this.appId,
      "x-api-key": this.token,
      "Content-Type": "application/json",
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle successful responses
      if (response.ok) {
        const data = await response.json();
        return {
          data,
          headers: response.headers,
        };
      }

      // Handle quota exceeded (402)
      if (response.status === 402) {
        throw new SoundChartsAPIError(
          "⚠️ SoundCharts API quota exceeded. Please update your API key in .env file.",
          response.status
        );
      }

      // Handle rate limit (429)
      if (response.status === 429) {
        throw new SoundChartsAPIError(
          "⚠️ SoundCharts API rate limit exceeded. Please wait before making more requests.",
          response.status
        );
      }

      // Handle error responses
      const errorData = (await response
        .json()
        .catch(() => ({}))) as SoundChartsError;

      throw new SoundChartsAPIError(
        errorData.message || `Request failed with status ${response.status}`,
        response.status,
        errorData
      );
    } catch (error) {
      if (error instanceof SoundChartsAPIError) {
        throw error;
      }

      // Network or other errors
      throw new SoundChartsAPIError(
        error instanceof Error ? error.message : "Network error",
        0
      );
    }
  }

  /**
   * Get track information by Spotify ID
   * @param spotifyId The Spotify track ID
   * @returns Track data with audio features
   */
  async getTrackBySpotifyId(
    spotifyId: string
  ): Promise<SoundChartsResponse<SoundChartsTrackResponse>> {
    return this.request<SoundChartsTrackResponse>(
      `/song/by-platform/spotify/${spotifyId}`
    );
  }

  /**
   * Get track information by ISRC
   * @param isrc The ISRC code
   * @returns Track data with audio features
   */
  async getTrackByISRC(
    isrc: string
  ): Promise<SoundChartsResponse<SoundChartsTrackResponse>> {
    return this.request<SoundChartsTrackResponse>(`/song/by-isrc/${isrc}`);
  }

  /**
   * Get track information by SoundCharts UUID
   * @param uuid The SoundCharts UUID
   * @returns Track data with audio features
   */
  async getTrackByUUID(
    uuid: string
  ): Promise<SoundChartsResponse<SoundChartsTrackResponse>> {
    return this.request<SoundChartsTrackResponse>(`/song/${uuid}`);
  }

  /**
   * Log quota and rate limit info from response headers
   */
  static logQuotaInfo(headers: Headers): void {
    const quotaRemaining = headers.get("x-quota-remaining");
    const ratelimitRemaining = headers.get("x-ratelimit-remaining");
    const ratelimitLimit = headers.get("x-ratelimit-limit");

    if (quotaRemaining) {
      console.log(`📊 SoundCharts quota remaining: ${quotaRemaining}`);
    }
    if (ratelimitRemaining && ratelimitLimit) {
      console.log(`⏱️  Rate limit: ${ratelimitRemaining}/${ratelimitLimit}`);
    }
  }
}

/**
 * Create a SoundCharts client from environment variables
 * Note: These are server-side only variables (not prefixed with PUBLIC_)
 */
export function createSoundChartsClient(): SoundChartsClient {
  const appId = import.meta.env.SOUNDCHARTS_APP_ID;
  const token = import.meta.env.SOUNDCHARTS_API_TOKEN;

  if (!appId || !token) {
    throw new Error(
      "Missing SoundCharts credentials. " +
        "Please set SOUNDCHARTS_APP_ID and SOUNDCHARTS_API_TOKEN in .env file."
    );
  }

  return new SoundChartsClient(appId, token);
}

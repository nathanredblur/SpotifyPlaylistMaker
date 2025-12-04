/**
 * API Endpoint: /api/gallery/tracks
 * Returns the public gallery tracks (admin's tracks)
 *
 * PUBLIC: No authentication required - anyone can browse the gallery
 */

import type { APIRoute } from "astro";
import { initDatabase, getRepositories } from "@/lib/db";
import type { TrackRecord } from "@/lib/db/tracks-repository";

// Force this endpoint to be dynamic (not prerendered)
export const prerender = false;

/**
 * Supported sort fields
 */
type SortField = "name" | "created_at" | "popularity" | "tempo" | "energy" | "danceability";

/**
 * Supported sort orders
 */
type SortOrder = "asc" | "desc";

/**
 * Transform a database track record to API response format
 */
function transformTrack(track: TrackRecord) {
  let spotifyData: Record<string, unknown> = {};
  let artistsJson: Array<{ id: string; name: string }> = [];

  try {
    spotifyData = JSON.parse(track.spotify_data);
  } catch (e) {
    console.error("Error parsing spotify_data for track:", track.spotify_id, e);
  }

  try {
    artistsJson = track.artists_json ? JSON.parse(track.artists_json) : [];
  } catch (e) {
    console.error("Error parsing artists_json for track:", track.spotify_id, e);
  }

  return {
    id: track.spotify_id,
    name: track.name || "Unknown Track",
    duration_ms: track.duration_ms || 0,
    explicit: track.explicit === 1,
    popularity: track.popularity || 0,
    preview_url: track.preview_url || null,
    isrc: track.isrc || null,
    artists: artistsJson,
    album: (spotifyData.album as Record<string, unknown>) || {},
    // Audio features from SoundCharts (if available)
    audio_features:
      track.tempo !== null && track.tempo !== undefined
        ? {
            tempo: track.tempo,
            energy: track.energy,
            danceability: track.danceability,
            valence: track.valence,
            acousticness: track.acousticness,
            instrumentalness: track.instrumentalness,
            liveness: track.liveness,
            loudness: track.loudness,
            speechiness: track.speechiness,
            key: track.key,
            mode: track.mode,
            time_signature: track.time_signature,
          }
        : null,
    created_at: track.created_at,
  };
}

export const GET: APIRoute = async ({ url }) => {
  try {
    // Initialize database
    initDatabase();
    const repos = getRepositories();

    // Get query parameters
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 500);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);
    const sortField = (url.searchParams.get("sort") || "created_at") as SortField;
    const sortOrder = (url.searchParams.get("order") || "desc") as SortOrder;
    const search = url.searchParams.get("search")?.toLowerCase() || "";

    // Validate sort field
    const validSortFields: SortField[] = ["name", "created_at", "popularity", "tempo", "energy", "danceability"];
    const actualSortField = validSortFields.includes(sortField) ? sortField : "created_at";
    const actualSortOrder = sortOrder === "asc" ? "ASC" : "DESC";

    // Build query
    let query = "SELECT * FROM tracks";
    const params: (string | number)[] = [];

    // Add search filter if provided
    if (search) {
      query += " WHERE (LOWER(name) LIKE ? OR LOWER(artists_json) LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    // Add sorting
    query += ` ORDER BY ${actualSortField} ${actualSortOrder}`;

    // Add pagination
    query += " LIMIT ? OFFSET ?";
    params.push(limit, offset);

    // Execute query
    const db = repos.tracks["db"]; // Access the database directly
    const tracks = db.prepare(query).all(...params) as TrackRecord[];

    // Get total count (for pagination)
    let countQuery = "SELECT COUNT(*) as count FROM tracks";
    const countParams: string[] = [];

    if (search) {
      countQuery += " WHERE (LOWER(name) LIKE ? OR LOWER(artists_json) LIKE ?)";
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const totalResult = db.prepare(countQuery).get(...countParams) as { count: number };
    const total = totalResult.count;

    // Transform tracks for response
    const transformedTracks = tracks.map(transformTrack);

    // Get gallery stats
    const tracksWithAudio = repos.tracks.countWithSoundCharts();
    const totalTracks = repos.tracks.count();

    return new Response(
      JSON.stringify({
        tracks: transformedTracks,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + tracks.length < total,
        },
        gallery: {
          totalTracks,
          tracksWithAudioFeatures: tracksWithAudio,
          coveragePercentage: totalTracks > 0 
            ? ((tracksWithAudio / totalTracks) * 100).toFixed(1) 
            : "0",
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          // Allow CORS for public API
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching gallery tracks:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch gallery tracks",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};


/**
 * API Endpoint: /api/failed-tracks
 * Returns tracks that have failed to fetch audio features
 */

import type { APIRoute } from "astro";
import { getDatabase } from "@/lib/db/database";

// Force this endpoint to be dynamic (not prerendered)
export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    const db = getDatabase();
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    // Get failed requests with track information (most recent per track)
    const failedTracks = db
      .prepare(
        `
        SELECT 
          fr.spotify_id,
          fr.error_code,
          fr.error_message,
          fr.attempt_count,
          fr.max_attempts,
          fr.status,
          fr.updated_at,
          fr.created_at,
          t.name as track_name,
          t.artists_json,
          t.isrc,
          t.soundcharts_data IS NOT NULL as has_soundcharts
        FROM failed_requests fr
        INNER JOIN (
          SELECT spotify_id, MAX(id) as max_id
          FROM failed_requests
          WHERE status IN ('pending', 'failed')
          GROUP BY spotify_id
        ) latest ON fr.id = latest.max_id
        LEFT JOIN tracks t ON fr.spotify_id = t.spotify_id
        ORDER BY fr.updated_at DESC
        LIMIT ? OFFSET ?
      `
      )
      .all(limit, offset) as any[];

    // Get total count (unique tracks)
    const totalCount = db
      .prepare(
        `
        SELECT COUNT(DISTINCT spotify_id) as count 
        FROM failed_requests 
        WHERE status IN ('pending', 'failed')
      `
      )
      .get() as { count: number };

    // Parse artists JSON
    const tracksWithParsedData = failedTracks.map((track) => ({
      ...track,
      artists: track.artists_json ? JSON.parse(track.artists_json) : [],
      artists_json: undefined, // Remove the raw JSON
    }));

    return new Response(
      JSON.stringify({
        success: true,
        tracks: tracksWithParsedData,
        total: totalCount.count,
        limit,
        offset,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching failed tracks:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to fetch failed tracks",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * API Endpoint: /api/tracks
 * Returns tracks from the local SQLite database
 */

import type { APIRoute } from "astro";
import { TracksRepository } from "@/lib/db/tracks-repository";

// Force this endpoint to be dynamic (not prerendered)
export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  try {
    const tracksRepo = new TracksRepository();

    // Get query parameters
    const limit = parseInt(url.searchParams.get("limit") || "1000", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    // Get all tracks from database
    const allTracks = tracksRepo.getAll();

    // Apply pagination
    const paginatedTracks = allTracks.slice(offset, offset + limit);

    // Parse and return tracks
    const tracks = paginatedTracks.map((track) => {
      let spotifyData;
      let artistsJson;

      try {
        spotifyData = JSON.parse(track.spotify_data);
      } catch (e) {
        console.error(
          "Error parsing spotify_data for track:",
          track.spotify_id,
          e
        );
        spotifyData = {};
      }

      try {
        artistsJson = track.artists_json ? JSON.parse(track.artists_json) : [];
      } catch (e) {
        console.error(
          "Error parsing artists_json for track:",
          track.spotify_id,
          e
        );
        artistsJson = [];
      }

      return {
        id: track.spotify_id,
        name: track.name || "Unknown Track",
        duration_ms: track.duration_ms || 0,
        explicit: track.explicit === 1,
        popularity: track.popularity || 0,
        preview_url: track.preview_url || null,
        added_at: track.added_at || null,
        artists: artistsJson,
        album: spotifyData.album || {},
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
      };
    });

    return new Response(
      JSON.stringify({
        tracks,
        total: allTracks.length,
        limit,
        offset,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching tracks:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch tracks",
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

/**
 * API Endpoint: /api/admin/track
 * Create or update a track in the database
 * 
 * POST: Create or update track
 * GET: Fetch track info from Spotify
 */

import type { APIRoute } from "astro";
import { initDatabase, getRepositories } from "@/lib/db";
import { STORAGE_KEYS } from "@/config/constants";

// Force this endpoint to be dynamic
export const prerender = false;

/**
 * GET - Fetch track from Spotify API
 */
export const GET: APIRoute = async ({ url, request }) => {
  try {
    const spotifyId = url.searchParams.get("id");
    if (!spotifyId) {
      return new Response(JSON.stringify({ error: "Track ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get access token from Authorization header
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch track from Spotify
    const trackResponse = await fetch(
      `https://api.spotify.com/v1/tracks/${spotifyId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!trackResponse.ok) {
      const error = await trackResponse.text();
      return new Response(
        JSON.stringify({ error: "Failed to fetch track from Spotify", details: error }),
        { status: trackResponse.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const trackData = await trackResponse.json();

    // Fetch audio features
    const featuresResponse = await fetch(
      `https://api.spotify.com/v1/audio-features/${spotifyId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    let audioFeatures = null;
    if (featuresResponse.ok) {
      audioFeatures = await featuresResponse.json();
    }

    // Format response for the form
    const formData = {
      id: trackData.id,
      name: trackData.name,
      artists: trackData.artists.map((a: any) => ({ id: a.id, name: a.name })),
      album: {
        id: trackData.album.id,
        name: trackData.album.name,
        release_date: trackData.album.release_date,
        images: trackData.album.images,
      },
      duration_ms: trackData.duration_ms,
      popularity: trackData.popularity,
      explicit: trackData.explicit,
      isrc: trackData.external_ids?.isrc || "",
      preview_url: trackData.preview_url,
      // Audio features
      tempo: audioFeatures?.tempo || 120,
      energy: audioFeatures?.energy || 0.5,
      danceability: audioFeatures?.danceability || 0.5,
      valence: audioFeatures?.valence || 0.5,
      acousticness: audioFeatures?.acousticness || 0.5,
      instrumentalness: audioFeatures?.instrumentalness || 0,
      liveness: audioFeatures?.liveness || 0.2,
      speechiness: audioFeatures?.speechiness || 0.1,
      loudness: audioFeatures?.loudness || -10,
      key: audioFeatures?.key ?? 0,
      mode: audioFeatures?.mode ?? 1,
      time_signature: audioFeatures?.time_signature || 4,
      genres: "", // We'd need to fetch artist genres for this
    };

    return new Response(JSON.stringify(formData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching track from Spotify:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch track",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

/**
 * POST - Save or update track in database
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    initDatabase();
    const repos = getRepositories();

    const body = await request.json();
    const {
      id,
      name,
      artists,
      album,
      duration_ms,
      popularity,
      explicit,
      isrc,
      preview_url,
      tempo,
      energy,
      danceability,
      valence,
      acousticness,
      instrumentalness,
      liveness,
      speechiness,
      loudness,
      key,
      mode,
      time_signature,
      genres,
    } = body;

    if (!id || !name) {
      return new Response(
        JSON.stringify({ error: "Track ID and name are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Prepare spotify_data JSON
    const spotifyData = {
      id,
      name,
      artists,
      album,
      duration_ms,
      popularity,
      explicit,
      preview_url,
      external_ids: { isrc },
      is_playable: true,
    };

    // Check if track exists
    const db = repos.tracks["db"];
    const existingTrack = db
      .prepare("SELECT spotify_id FROM tracks WHERE spotify_id = ?")
      .get(id);

    if (existingTrack) {
      // Update existing track
      db.prepare(`
        UPDATE tracks SET
          name = ?,
          artists_json = ?,
          duration_ms = ?,
          popularity = ?,
          explicit = ?,
          isrc = ?,
          preview_url = ?,
          spotify_data = ?,
          tempo = ?,
          energy = ?,
          danceability = ?,
          valence = ?,
          acousticness = ?,
          instrumentalness = ?,
          liveness = ?,
          speechiness = ?,
          loudness = ?,
          key = ?,
          mode = ?,
          time_signature = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE spotify_id = ?
      `).run(
        name,
        JSON.stringify(artists),
        duration_ms,
        popularity,
        explicit ? 1 : 0,
        isrc || null,
        preview_url || null,
        JSON.stringify(spotifyData),
        tempo,
        energy,
        danceability,
        valence,
        acousticness,
        instrumentalness,
        liveness,
        speechiness,
        loudness,
        key,
        mode,
        time_signature,
        id
      );
    } else {
      // Insert new track
      db.prepare(`
        INSERT INTO tracks (
          spotify_id, name, artists_json, duration_ms, popularity, explicit,
          isrc, preview_url, spotify_data, tempo, energy, danceability, valence,
          acousticness, instrumentalness, liveness, speechiness, loudness,
          key, mode, time_signature
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        name,
        JSON.stringify(artists),
        duration_ms,
        popularity,
        explicit ? 1 : 0,
        isrc || null,
        preview_url || null,
        JSON.stringify(spotifyData),
        tempo,
        energy,
        danceability,
        valence,
        acousticness,
        instrumentalness,
        liveness,
        speechiness,
        loudness,
        key,
        mode,
        time_signature
      );
    }

    return new Response(
      JSON.stringify({ success: true, id, isNew: !existingTrack }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error saving track:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to save track",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};


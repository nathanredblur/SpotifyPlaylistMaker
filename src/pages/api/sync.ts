/**
 * API Endpoint: /api/sync
 * Synchronizes user's Spotify tracks with local database and fetches audio features from SoundCharts
 */

import type { APIRoute } from "astro";
import { SpotifyAPI } from "@/lib/spotify-api";
import { getRepositories, initDatabase } from "@/lib/db";
import { createSoundChartsClient, SoundChartsClient } from "@/lib/soundcharts";
import type { SavedTrackItem } from "@/types/spotify";

export const POST: APIRoute = async ({ request }) => {
  const startTime = Date.now();

  try {
    // Initialize database
    initDatabase();
    const repos = getRepositories();

    // Parse request body
    const body = await request.json();
    const { collectionType = "saved" } = body;

    // Get Spotify access token from Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const spotifyToken = authHeader.replace("Bearer ", "");
    const spotifyAPI = new SpotifyAPI(spotifyToken);

    // Create SoundCharts client
    let soundChartsClient: SoundChartsClient;
    try {
      soundChartsClient = createSoundChartsClient();
    } catch (error: any) {
      console.warn("⚠️ SoundCharts not configured:", error.message);
      console.warn("   Audio features will not be fetched.");
      // Continue without SoundCharts
      soundChartsClient = null as any;
    }

    // Create sync record
    const syncId = repos.sync.create({
      collection_type: collectionType,
      started_at: new Date().toISOString(),
    });

    console.log(
      `🔄 Starting sync #${syncId} for collection: ${collectionType}`
    );

    // Step 1: Fetch tracks from Spotify
    const { newTracks, allTrackIds } = await fetchSpotifyTracks(
      spotifyAPI,
      repos,
      collectionType
    );

    console.log(
      `📊 Spotify sync: ${allTrackIds.length} total, ${newTracks.length} new`
    );

    // Step 2: Save new tracks to database
    if (newTracks.length > 0) {
      await saveTracksToDatabase(newTracks, repos);
    }

    // Step 3: Fetch SoundCharts data for tracks without audio features
    let soundChartsFetched = 0;
    let soundChartsFailed = 0;

    if (soundChartsClient) {
      const tracksWithoutSoundCharts =
        repos.tracks.getTracksWithoutSoundCharts(100);

      console.log(
        `🎵 Fetching audio features for ${tracksWithoutSoundCharts.length} tracks`
      );

      for (const track of tracksWithoutSoundCharts) {
        try {
          // Check if this track has a permanent failure
          if (repos.failedRequests.isPermanentlyFailed(track.spotify_id)) {
            console.log(
              `⏭️  Skipping permanently failed track: ${track.spotify_id}`
            );
            continue;
          }

          // Fetch from SoundCharts
          const response = await soundChartsClient.getTrackBySpotifyId(
            track.spotify_id
          );

          // Log quota info
          SoundChartsClient.logQuotaInfo(response.headers);

          // Update track with SoundCharts data
          repos.tracks.updateWithSoundCharts(track.spotify_id, {
            soundcharts_uuid: response.data.object.uuid,
            soundcharts_data: JSON.stringify(response.data),
            soundcharts_fetched_at: new Date().toISOString(),
            isrc: response.data.object.isrc?.value,
            tempo: response.data.object.audio?.tempo,
            energy: response.data.object.audio?.energy,
            danceability: response.data.object.audio?.danceability,
            valence: response.data.object.audio?.valence,
            acousticness: response.data.object.audio?.acousticness,
            instrumentalness: response.data.object.audio?.instrumentalness,
            liveness: response.data.object.audio?.liveness,
            loudness: response.data.object.audio?.loudness,
            speechiness: response.data.object.audio?.speechiness,
            key: response.data.object.audio?.key,
            mode: response.data.object.audio?.mode,
            time_signature: response.data.object.audio?.timeSignature,
          });

          // Mark as resolved if it was previously failed
          repos.failedRequests.markResolved(track.spotify_id);

          soundChartsFetched++;
        } catch (error: any) {
          soundChartsFailed++;

          // Handle quota exceeded (402) - stop trying
          if (error.status === 402) {
            console.error("❌ SoundCharts quota exceeded!");
            console.error("   Please update your API credentials in .env file");
            break; // Stop fetching
          }

          // Handle rate limit (429) - stop trying
          if (error.status === 429) {
            console.error("❌ SoundCharts rate limit exceeded!");
            console.error("   Please wait before making more requests");
            break; // Stop fetching
          }

          // Record the failure
          const maxAttempts = error.status === 404 ? 1 : 3; // Don't retry 404s

          repos.failedRequests.create({
            spotify_id: track.spotify_id,
            error_code: error.status || 0,
            error_message: error.message,
            error_response: JSON.stringify(error.response || {}),
            max_attempts: maxAttempts,
          });

          console.warn(
            `⚠️ Failed to fetch audio features for ${track.spotify_id}: ${error.message}`
          );
        }
      }
    } else {
      console.log("⏭️  Skipping SoundCharts fetch (not configured)");
    }

    // Step 4: Get all tracks with complete data
    const allTracks = repos.tracks.getBySpotifyIds(allTrackIds);

    // Step 5: Mark sync as completed
    const mostRecentTrack = repos.tracks.getMostRecentlyAdded();
    repos.sync.markCompleted(syncId, {
      total_tracks: allTracks.length,
      new_tracks: newTracks.length,
      soundcharts_fetched: soundChartsFetched,
      failed_tracks: soundChartsFailed,
      last_added_at: mostRecentTrack?.added_at || undefined,
    });

    const duration = Date.now() - startTime;
    console.log(`✅ Sync #${syncId} completed in ${duration}ms`);

    // Return response
    return new Response(
      JSON.stringify({
        success: true,
        tracks: allTracks.map((track) => ({
          ...JSON.parse(track.spotify_data),
          audioFeatures: track.soundcharts_data
            ? JSON.parse(track.soundcharts_data).object.audio
            : null,
          soundchartsUuid: track.soundcharts_uuid,
        })),
        stats: {
          total: allTracks.length,
          cached: allTracks.length - newTracks.length,
          newFromSpotify: newTracks.length,
          fetchedFromSoundCharts: soundChartsFetched,
          failed: soundChartsFailed,
          duration,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ Sync failed:", error);

    return new Response(
      JSON.stringify({
        error: "Sync failed",
        message: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

/**
 * Fetch tracks from Spotify (incremental sync)
 */
async function fetchSpotifyTracks(
  spotifyAPI: SpotifyAPI,
  repos: ReturnType<typeof getRepositories>,
  collectionType: string
) {
  const newTracks: SavedTrackItem[] = [];
  const allTrackIds: string[] = [];

  // Get last sync info
  const lastSync = repos.sync.getLastCompleted(collectionType);
  const lastAddedAt = lastSync?.last_added_at;

  console.log(
    lastAddedAt
      ? `📅 Last sync: ${lastAddedAt}`
      : "📅 First sync (no previous data)"
  );

  // Fetch saved tracks incrementally
  let offset = 0;
  let foundExisting = false;

  while (!foundExisting) {
    const response = await spotifyAPI.getSavedTracks(50, offset);

    for (const item of response.items) {
      allTrackIds.push(item.track.id);

      // Check if track exists in DB
      const exists = repos.tracks.exists(item.track.id);

      if (exists && lastAddedAt && item.added_at <= lastAddedAt) {
        // Found a track that was in the last sync, stop here
        foundExisting = true;
        break;
      }

      if (!exists) {
        newTracks.push(item);
      }
    }

    if (!response.next || foundExisting) break;
    offset += 50;
  }

  return { newTracks, allTrackIds };
}

/**
 * Save tracks to database
 */
async function saveTracksToDatabase(
  tracks: SavedTrackItem[],
  repos: ReturnType<typeof getRepositories>
) {
  console.log(`💾 Saving ${tracks.length} tracks to database`);

  const trackInputs = tracks.map((item) => ({
    spotify_id: item.track.id,
    spotify_data: JSON.stringify(item.track),
    added_at: item.added_at,
    name: item.track.name,
    duration_ms: item.track.duration_ms,
    explicit: item.track.explicit,
    popularity: item.track.popularity,
    preview_url: item.track.preview_url || undefined,
    artists_json: JSON.stringify(item.track.artists),
  }));

  repos.tracks.createMany(trackInputs);
}

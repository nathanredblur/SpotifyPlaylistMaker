/**
 * API Endpoint: /api/sync
 * Synchronizes admin's Spotify tracks with local database and fetches audio features from SoundCharts
 *
 * ADMIN ONLY: This endpoint requires admin authentication
 */

import type { APIRoute } from "astro";
import { SpotifyAPI } from "@/lib/spotify-api";
import { getRepositories, initDatabase } from "@/lib/db";
import { createSoundChartsClient, SoundChartsClient } from "@/lib/soundcharts";
import { verifyAdmin, createAuthErrorResponse } from "@/lib/auth-helpers";
import type { SavedTrackItem } from "@/types/spotify";
import {
  SOUNDCHARTS_API,
  FAILED_REQUESTS,
  HTTP_STATUS,
} from "@/config/constants";

export const POST: APIRoute = async ({ request }) => {
  const startTime = Date.now();

  try {
    // Verify admin authentication
    const authResult = await verifyAdmin(request);
    if (!authResult.success || !authResult.isAdmin) {
      return createAuthErrorResponse(authResult);
    }

    const { user, spotifyUser } = authResult;
    console.log(`🔐 Admin sync requested by: ${spotifyUser?.display_name || user?.spotify_user_id}`);

    // Initialize database (already done by verifyAdmin, but safe to call again)
    initDatabase();
    const repos = getRepositories();

    // Parse request body
    const body = await request.json();
    const { collectionType = "saved" } = body;

    // Create SpotifyAPI with the verified token
    const spotifyToken = request.headers.get("Authorization")!.replace("Bearer ", "");
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
      const tracksWithoutSoundCharts = repos.tracks.getTracksWithoutSoundCharts(
        SOUNDCHARTS_API.MAX_TRACKS_PER_SYNC
      );

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
          // Strategy: Try ISRC first (more reliable), fallback to Spotify ID
          let response;

          // Normalize ISRC (handle empty strings and null)
          const isrc =
            track.isrc && track.isrc.trim() !== "" ? track.isrc.trim() : null;

          if (isrc) {
            try {
              response = await soundChartsClient.getTrackByISRC(isrc);
            } catch (isrcError: any) {
              // If ISRC fails with 404, try Spotify ID
              if (isrcError.status === 404) {
                response = await soundChartsClient.getTrackBySpotifyId(
                  track.spotify_id
                );
              } else {
                throw isrcError; // Re-throw non-404 errors
              }
            }
          } else {
            // No ISRC available, use Spotify ID
            response = await soundChartsClient.getTrackBySpotifyId(
              track.spotify_id
            );
          }

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
          if (error.status === HTTP_STATUS.PAYMENT_REQUIRED) {
            console.error("❌ SoundCharts quota exceeded!");
            console.error("   Please update your API credentials in .env file");
            break; // Stop fetching
          }

          // Handle rate limit (429) - stop trying
          if (error.status === HTTP_STATUS.TOO_MANY_REQUESTS) {
            console.error("❌ SoundCharts rate limit exceeded!");
            console.error("   Please wait before making more requests");
            break; // Stop fetching
          }

          // Record the failure
          const maxAttempts =
            error.status === HTTP_STATUS.NOT_FOUND
              ? FAILED_REQUESTS.MAX_ATTEMPTS_NOT_FOUND
              : FAILED_REQUESTS.MAX_ATTEMPTS;

          repos.failedRequests.create({
            spotify_id: track.spotify_id,
            error_code: error.status || 0,
            error_message: error.message,
            error_response: JSON.stringify(error.response || {}),
            max_attempts: maxAttempts,
          });

          // Only log non-404 errors (404s are expected - track not in SoundCharts database)
          if (error.status !== 404) {
            console.warn(
              `⚠️ Failed to fetch audio features for ${track.spotify_id}: ${error.message}`
            );
          }
        }
      }
    } else {
      console.log("⏭️  Skipping SoundCharts fetch (not configured)");
    }

    // Step 4: Get all tracks with complete data
    const allTracks = repos.tracks.getBySpotifyIds(allTrackIds);

    // Step 5: Mark sync as completed
    const mostRecentTrack = repos.tracks.getMostRecentlyCreated();
    repos.sync.markCompleted(syncId, {
      total_tracks: allTracks.length,
      new_tracks: newTracks.length,
      soundcharts_fetched: soundChartsFetched,
      failed_tracks: soundChartsFailed,
      last_added_at: mostRecentTrack?.created_at || undefined,
    });

    const duration = Date.now() - startTime;

    // Log summary
    const tracksWithAudioFeatures = repos.tracks.countWithSoundCharts();
    const totalTracks = allTracks.length;
    const coverage =
      totalTracks > 0
        ? ((tracksWithAudioFeatures / totalTracks) * 100).toFixed(1)
        : "0";

    console.log(`✅ Sync #${syncId} completed in ${duration}ms`);
    console.log(
      `📊 Audio Features Coverage: ${tracksWithAudioFeatures}/${totalTracks} tracks (${coverage}%)`
    );
    if (soundChartsFailed > 0) {
      const notFoundCount = soundChartsFailed; // Most are 404s
      console.log(
        `   ${notFoundCount} tracks not found in SoundCharts database (expected)`
      );
    }

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

  const trackInputs = tracks.map((item) => {
    // Extract ISRC from Spotify data
    const isrc = item.track.external_ids?.isrc;

    return {
      spotify_id: item.track.id,
      spotify_data: JSON.stringify(item.track),
      name: item.track.name,
      duration_ms: item.track.duration_ms,
      explicit: item.track.explicit,
      popularity: item.track.popularity,
      preview_url: item.track.preview_url || undefined,
      artists_json: JSON.stringify(item.track.artists),
      isrc: isrc || undefined, // Add ISRC if available
    };
  });

  repos.tracks.createMany(trackInputs);

  // Log how many tracks have ISRC
  const tracksWithIsrc = trackInputs.filter((t) => t.isrc).length;
  console.log(`   ${tracksWithIsrc}/${tracks.length} tracks have ISRC codes`);
}

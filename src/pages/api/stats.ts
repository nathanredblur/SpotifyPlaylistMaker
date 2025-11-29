/**
 * API Endpoint: /api/stats
 * Returns comprehensive database statistics
 */

import type { APIRoute } from "astro";
import { getDatabase } from "@/lib/db/database";

// Force this endpoint to be dynamic (not prerendered)
export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const db = getDatabase();

    // Tracks statistics
    const totalTracks = db
      .prepare("SELECT COUNT(*) as count FROM tracks")
      .get() as { count: number };

    const tracksWithSoundCharts = db
      .prepare(
        "SELECT COUNT(*) as count FROM tracks WHERE soundcharts_data IS NOT NULL"
      )
      .get() as { count: number };

    const tracksWithISRC = db
      .prepare(
        "SELECT COUNT(*) as count FROM tracks WHERE isrc IS NOT NULL AND isrc != ''"
      )
      .get() as { count: number };

    const tracksWithoutISRC = db
      .prepare(
        "SELECT COUNT(*) as count FROM tracks WHERE isrc IS NULL OR isrc = ''"
      )
      .get() as { count: number };

    const tracksWithoutSoundCharts = db
      .prepare(
        "SELECT COUNT(*) as count FROM tracks WHERE soundcharts_data IS NULL"
      )
      .get() as { count: number };

    // Failed requests statistics
    const failedRequests = db
      .prepare(
        "SELECT COUNT(*) as count FROM failed_requests WHERE status = 'pending'"
      )
      .get() as { count: number };

    const permanentlyFailed = db
      .prepare(
        "SELECT COUNT(*) as count FROM failed_requests WHERE status = 'failed' OR (error_code = 404 AND max_attempts = 1)"
      )
      .get() as { count: number };

    const resolvedFailed = db
      .prepare(
        "SELECT COUNT(*) as count FROM failed_requests WHERE status = 'resolved'"
      )
      .get() as { count: number };

    // Sync history statistics
    const totalSyncs = db
      .prepare("SELECT COUNT(*) as count FROM sync_history")
      .get() as { count: number };

    const lastSync = db
      .prepare(
        "SELECT * FROM sync_history WHERE status = 'completed' ORDER BY completed_at DESC LIMIT 1"
      )
      .get() as any;

    const avgSyncDuration = db
      .prepare(
        "SELECT AVG(duration_ms) as avg FROM sync_history WHERE status = 'completed' AND duration_ms IS NOT NULL"
      )
      .get() as { avg: number };

    // Recent syncs (last 10)
    const recentSyncs = db
      .prepare("SELECT * FROM sync_history ORDER BY started_at DESC LIMIT 10")
      .all() as any[];

    // Audio features coverage by attribute
    const audioFeaturesCoverage = {
      tempo: db
        .prepare("SELECT COUNT(*) as count FROM tracks WHERE tempo IS NOT NULL")
        .get() as { count: number },
      energy: db
        .prepare(
          "SELECT COUNT(*) as count FROM tracks WHERE energy IS NOT NULL"
        )
        .get() as { count: number },
      danceability: db
        .prepare(
          "SELECT COUNT(*) as count FROM tracks WHERE danceability IS NOT NULL"
        )
        .get() as { count: number },
      valence: db
        .prepare(
          "SELECT COUNT(*) as count FROM tracks WHERE valence IS NOT NULL"
        )
        .get() as { count: number },
      acousticness: db
        .prepare(
          "SELECT COUNT(*) as count FROM tracks WHERE acousticness IS NOT NULL"
        )
        .get() as { count: number },
      instrumentalness: db
        .prepare(
          "SELECT COUNT(*) as count FROM tracks WHERE instrumentalness IS NOT NULL"
        )
        .get() as { count: number },
      liveness: db
        .prepare(
          "SELECT COUNT(*) as count FROM tracks WHERE liveness IS NOT NULL"
        )
        .get() as { count: number },
      loudness: db
        .prepare(
          "SELECT COUNT(*) as count FROM tracks WHERE loudness IS NOT NULL"
        )
        .get() as { count: number },
      speechiness: db
        .prepare(
          "SELECT COUNT(*) as count FROM tracks WHERE speechiness IS NOT NULL"
        )
        .get() as { count: number },
    };

    // Database size
    const dbSize = db
      .prepare(
        "SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()"
      )
      .get() as { size: number };

    // Most recent tracks
    const recentTracks = db
      .prepare(
        "SELECT spotify_id, name, added_at, isrc, soundcharts_data IS NOT NULL as has_soundcharts FROM tracks ORDER BY created_at DESC LIMIT 5"
      )
      .all() as any[];

    // Failed requests by error code
    const failedByErrorCode = db
      .prepare(
        `
        SELECT error_code, COUNT(*) as count 
        FROM failed_requests 
        WHERE status = 'pending' OR status = 'failed'
        GROUP BY error_code 
        ORDER BY count DESC
      `
      )
      .all() as any[];

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        tracks: {
          total: totalTracks.count,
          withSoundCharts: tracksWithSoundCharts.count,
          withoutSoundCharts: tracksWithoutSoundCharts.count,
          withISRC: tracksWithISRC.count,
          withoutISRC: tracksWithoutISRC.count,
          coveragePercentage:
            totalTracks.count > 0
              ? (
                  (tracksWithSoundCharts.count / totalTracks.count) *
                  100
                ).toFixed(1)
              : "0",
          isrcPercentage:
            totalTracks.count > 0
              ? ((tracksWithISRC.count / totalTracks.count) * 100).toFixed(1)
              : "0",
        },
        audioFeatures: {
          coverage: audioFeaturesCoverage,
          averageCoverage:
            (Object.values(audioFeaturesCoverage).reduce(
              (sum, { count }) => sum + count,
              0
            ) /
              (Object.keys(audioFeaturesCoverage).length * totalTracks.count)) *
            100,
        },
        failedRequests: {
          pending: failedRequests.count,
          permanentlyFailed: permanentlyFailed.count,
          resolved: resolvedFailed.count,
          byErrorCode: failedByErrorCode,
        },
        syncs: {
          total: totalSyncs.count,
          lastSync: lastSync
            ? {
                id: lastSync.id,
                startedAt: lastSync.started_at,
                completedAt: lastSync.completed_at,
                duration: lastSync.duration_ms,
                totalTracks: lastSync.total_tracks,
                newTracks: lastSync.new_tracks,
                soundchartsFetched: lastSync.soundcharts_fetched,
                failedTracks: lastSync.failed_tracks,
              }
            : null,
          avgDuration: avgSyncDuration.avg
            ? Math.round(avgSyncDuration.avg)
            : 0,
          recent: recentSyncs.map((sync) => ({
            id: sync.id,
            startedAt: sync.started_at,
            completedAt: sync.completed_at,
            status: sync.status,
            duration: sync.duration_ms,
            totalTracks: sync.total_tracks,
            newTracks: sync.new_tracks,
            soundchartsFetched: sync.soundcharts_fetched,
            failedTracks: sync.failed_tracks,
          })),
        },
        database: {
          sizeBytes: dbSize.size,
          sizeMB: (dbSize.size / (1024 * 1024)).toFixed(2),
        },
        recentTracks,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching stats:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to fetch stats",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

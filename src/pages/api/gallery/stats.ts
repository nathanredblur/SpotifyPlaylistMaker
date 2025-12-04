/**
 * API Endpoint: /api/gallery/stats
 * Returns public statistics about the gallery
 *
 * PUBLIC: No authentication required
 */

import type { APIRoute } from "astro";
import { initDatabase, getRepositories } from "@/lib/db";

// Force this endpoint to be dynamic (not prerendered)
export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    // Initialize database
    initDatabase();
    const repos = getRepositories();

    // Get track statistics
    const totalTracks = repos.tracks.count();
    const tracksWithAudio = repos.tracks.countWithSoundCharts();

    // Get admin info (public info only)
    const admin = repos.users.getAdmin();

    return new Response(
      JSON.stringify({
        gallery: {
          totalTracks,
          tracksWithAudioFeatures: tracksWithAudio,
          coveragePercentage: totalTracks > 0 
            ? ((tracksWithAudio / totalTracks) * 100).toFixed(1) 
            : "0",
        },
        owner: admin ? {
          displayName: admin.display_name || "Gallery Owner",
          // Don't expose email or other private info
        } : null,
        lastUpdated: admin?.last_sync_at || null,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching gallery stats:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch gallery stats",
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


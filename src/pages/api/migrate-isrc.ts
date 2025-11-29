/**
 * API Endpoint: /api/migrate-isrc
 * Migrates ISRC codes from spotify_data JSON to isrc column
 */

import type { APIRoute } from "astro";
import { TracksRepository } from "@/lib/db/tracks-repository";

// Force this endpoint to be dynamic (not prerendered)
export const prerender = false;

export const POST: APIRoute = async () => {
  try {
    console.log("🔄 Starting ISRC migration...");
    const tracksRepo = new TracksRepository();

    // Get all tracks
    const allTracks = tracksRepo.getAll();
    console.log(`📊 Found ${allTracks.length} tracks to process`);

    let updated = 0;
    let alreadyHad = 0;
    let notFound = 0;

    for (const track of allTracks) {
      // Skip if already has ISRC
      if (track.isrc) {
        alreadyHad++;
        continue;
      }

      try {
        // Parse spotify_data to extract ISRC
        const spotifyData = JSON.parse(track.spotify_data);
        const isrc = spotifyData.external_ids?.isrc;

        if (isrc) {
          // Update track with ISRC
          tracksRepo.updateIsrc(track.spotify_id, isrc);
          updated++;

          if (updated % 10 === 0) {
            console.log(`   Processed ${updated} tracks...`);
          }
        } else {
          notFound++;
        }
      } catch (error) {
        console.error(`Error processing track ${track.spotify_id}:`, error);
      }
    }

    console.log(`✅ Migration complete!`);
    console.log(`   ${updated} tracks updated with ISRC`);
    console.log(`   ${alreadyHad} tracks already had ISRC`);
    console.log(`   ${notFound} tracks don't have ISRC in Spotify data`);

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          total: allTracks.length,
          updated,
          alreadyHad,
          notFound,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Migration failed:", error);

    return new Response(
      JSON.stringify({
        error: "Migration failed",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

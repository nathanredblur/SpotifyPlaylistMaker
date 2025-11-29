/**
 * API Endpoint: /api/clear-failed
 * Clears all failed requests to allow retry with new ISRC strategy
 */

import type { APIRoute } from "astro";
import { getDatabase } from "@/lib/db/database";

// Force this endpoint to be dynamic (not prerendered)
export const prerender = false;

export const POST: APIRoute = async () => {
  try {
    console.log("🧹 Clearing failed requests...");
    const db = getDatabase();

    // Count before deletion
    const beforeCount = db
      .prepare("SELECT COUNT(*) as count FROM failed_requests")
      .get() as { count: number };

    // Delete all failed requests
    const result = db.prepare("DELETE FROM failed_requests").run();

    console.log(`✅ Cleared ${result.changes} failed requests`);
    console.log(`   (Total before: ${beforeCount.count})`);

    return new Response(
      JSON.stringify({
        success: true,
        cleared: result.changes,
        message:
          "All failed requests cleared. Tracks will be retried with ISRC strategy.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Clear failed:", error);

    return new Response(
      JSON.stringify({
        error: "Clear failed",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

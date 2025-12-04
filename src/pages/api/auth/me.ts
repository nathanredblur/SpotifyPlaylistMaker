/**
 * API Endpoint: /api/auth/me
 * Returns the current user's information including their role
 *
 * This endpoint requires authentication via Spotify token
 */

import type { APIRoute } from "astro";
import { verifyAuth, createAuthErrorResponse } from "@/lib/auth-helpers";

// Force this endpoint to be dynamic (not prerendered)
export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.success) {
      return createAuthErrorResponse(authResult);
    }

    const { user, spotifyUser } = authResult;

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user!.spotify_user_id,
          displayName:
            user!.display_name || spotifyUser?.display_name || "User",
          email: user!.email,
          profileImage:
            user!.profile_image_url || spotifyUser?.images?.[0]?.url,
          role: user!.role,
          isAdmin: user!.role === "admin",
          lastSyncAt: user!.last_sync_at,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching user:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch user",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

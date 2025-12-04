/**
 * Authentication and Authorization Helpers
 *
 * Provides utilities for verifying user authentication and admin status
 * from Spotify access tokens.
 */

import { SpotifyAPI } from "./spotify-api";
import { getRepositories, initDatabase } from "./db";
import type { UserRecord, CreateUserInput } from "./db/users-repository";
import type { SpotifyUser } from "@/types/spotify";

/**
 * Result of authentication verification
 */
export interface AuthResult {
  success: boolean;
  user?: UserRecord;
  spotifyUser?: SpotifyUser;
  error?: string;
  status?: number;
}

/**
 * Result of admin verification
 */
export interface AdminAuthResult extends AuthResult {
  isAdmin: boolean;
}

/**
 * Extract Spotify token from Authorization header
 */
export function extractSpotifyToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.replace("Bearer ", "");
}

/**
 * Verify the Spotify token and get/create the user record
 *
 * This function:
 * 1. Validates the Spotify token by fetching the user profile
 * 2. Creates or updates the user record in our database
 * 3. If no admin exists, promotes this user to admin (first user becomes admin)
 */
export async function verifyAuth(request: Request): Promise<AuthResult> {
  const token = extractSpotifyToken(request);

  if (!token) {
    return {
      success: false,
      error: "Missing or invalid Authorization header",
      status: 401,
    };
  }

  try {
    // Initialize database
    initDatabase();
    const repos = getRepositories();

    // Verify token by fetching Spotify user profile
    const spotifyAPI = new SpotifyAPI(token);
    const spotifyUser = await spotifyAPI.getCurrentUser();

    // Get or create user record
    let user = repos.users.getBySpotifyId(spotifyUser.id);

    if (!user) {
      // Create new user
      const userInput: CreateUserInput = {
        spotify_user_id: spotifyUser.id,
        display_name: spotifyUser.display_name,
        email: spotifyUser.email,
        profile_image_url: spotifyUser.images?.[0]?.url,
        spotify_user_data: JSON.stringify(spotifyUser),
        // First user becomes admin automatically
        role: repos.users.hasAdmin() ? "regular" : "admin",
      };

      repos.users.upsert(userInput);
      user = repos.users.getBySpotifyId(spotifyUser.id);

      if (userInput.role === "admin") {
        console.log(
          `👑 First user promoted to admin: ${
            spotifyUser.display_name || spotifyUser.id
          }`
        );
      }
    } else {
      // Update existing user's profile data (but not role)
      repos.users.upsert({
        spotify_user_id: spotifyUser.id,
        display_name: spotifyUser.display_name,
        email: spotifyUser.email,
        profile_image_url: spotifyUser.images?.[0]?.url,
        spotify_user_data: JSON.stringify(spotifyUser),
      });
      // Re-fetch to get updated data
      user = repos.users.getBySpotifyId(spotifyUser.id);
    }

    return {
      success: true,
      user: user!,
      spotifyUser,
    };
  } catch (error: unknown) {
    // Handle Spotify API errors (e.g., invalid/expired token)
    if (error instanceof Error && "status" in error) {
      const apiError = error as Error & { status: number };
      if (apiError.status === 401) {
        return {
          success: false,
          error: "Invalid or expired Spotify token",
          status: 401,
        };
      }
    }

    console.error("Auth verification failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Authentication failed",
      status: 500,
    };
  }
}

/**
 * Verify the Spotify token and check if the user is an admin
 *
 * This is a convenience function that combines verifyAuth with admin check.
 */
export async function verifyAdmin(request: Request): Promise<AdminAuthResult> {
  const authResult = await verifyAuth(request);

  if (!authResult.success) {
    return {
      ...authResult,
      isAdmin: false,
    };
  }

  const isAdmin = authResult.user?.role === "admin";

  if (!isAdmin) {
    return {
      ...authResult,
      isAdmin: false,
      error: "Admin access required",
      status: 403,
    };
  }

  return {
    ...authResult,
    isAdmin: true,
  };
}

/**
 * Create an error response for auth failures
 */
export function createAuthErrorResponse(result: AuthResult): Response {
  return new Response(
    JSON.stringify({
      error: result.error || "Authentication failed",
      success: false,
    }),
    {
      status: result.status || 401,
      headers: { "Content-Type": "application/json" },
    }
  );
}

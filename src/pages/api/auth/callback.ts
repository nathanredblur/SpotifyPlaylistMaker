/**
 * API Endpoint: /api/auth/callback
 * Handles the OAuth callback and exchanges the authorization code for an access token
 *
 * This endpoint also creates/updates the user record in the database.
 * The first user to log in becomes the admin automatically.
 *
 * IMPORTANT: This must be a dynamic route (not prerendered)
 */

import type { APIRoute } from "astro";
import { SpotifyAPI } from "@/lib/spotify-api";
import { initDatabase, getRepositories } from "@/lib/db";
import type { CreateUserInput } from "@/lib/db/users-repository";

// Force this endpoint to be dynamic (not prerendered)
export const prerender = false;

export const GET: APIRoute = async (context) => {
  const { url, redirect } = context;

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");

  // Parse state: format is "codeVerifier|returnPath"
  const [codeVerifier, returnPath = "/"] = (state || "").split("|");

  // Handle authorization errors
  if (error) {
    console.error("Spotify authorization error:", error);
    return redirect(`${returnPath}?error=${encodeURIComponent(error)}`);
  }

  // Validate we have a code
  if (!code) {
    console.error("No authorization code received");
    return redirect(`${returnPath}?error=no_code`);
  }

  if (!codeVerifier) {
    console.error("No code verifier found");
    return redirect(`${returnPath}?error=no_verifier`);
  }

  try {
    // Exchange code for token
    const tokenResponse = await fetch(
      "https://accounts.spotify.com/api/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: import.meta.env.PUBLIC_SPOTIFY_CLIENT_ID,
          grant_type: "authorization_code",
          code: code,
          redirect_uri: `${url.origin}/api/auth/callback`,
          code_verifier: codeVerifier,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error("Token exchange failed:", errorData);
      return redirect(
        `${returnPath}?error=${encodeURIComponent(
          errorData.error_description || "token_exchange_failed"
        )}`
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in || 3600;

    // Create/update user record in database
    try {
      initDatabase();
      const repos = getRepositories();
      const spotifyAPI = new SpotifyAPI(accessToken);
      const spotifyUser = await spotifyAPI.getCurrentUser();

      // Check if user already exists
      const existingUser = repos.users.getBySpotifyId(spotifyUser.id);

      // Determine role: first user becomes admin
      const role =
        existingUser?.role || (repos.users.hasAdmin() ? "regular" : "admin");

      const userInput: CreateUserInput = {
        spotify_user_id: spotifyUser.id,
        role: existingUser ? undefined : role, // Only set role for new users
        display_name: spotifyUser.display_name,
        email: spotifyUser.email,
        profile_image_url: spotifyUser.images?.[0]?.url,
        spotify_user_data: JSON.stringify(spotifyUser),
      };

      repos.users.upsert(userInput);

      if (!existingUser && role === "admin") {
        console.log(
          `👑 First user promoted to admin: ${
            spotifyUser.display_name || spotifyUser.id
          }`
        );
      } else {
        console.log(
          `✅ User logged in: ${
            spotifyUser.display_name || spotifyUser.id
          } (${role})`
        );
      }
    } catch (userError) {
      // Log but don't fail the auth flow - user creation is secondary
      console.error("Failed to create/update user record:", userError);
    }

    // Redirect back to the original page with token in hash (for client-side storage)
    // We use hash instead of query params for security (not sent to server on subsequent requests)
    console.log(`✅ Auth successful, redirecting to: ${returnPath}`);
    return redirect(
      `${returnPath}#access_token=${accessToken}&expires_in=${expiresIn}`
    );
  } catch (error) {
    console.error("Error during token exchange:", error);
    return redirect(
      `${returnPath}?error=${encodeURIComponent(
        error instanceof Error ? error.message : "unknown_error"
      )}`
    );
  }
};

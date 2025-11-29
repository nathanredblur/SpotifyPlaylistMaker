/**
 * API Endpoint: /api/auth/callback
 * Handles the OAuth callback and exchanges the authorization code for an access token
 *
 * IMPORTANT: This must be a dynamic route (not prerendered)
 */

import type { APIRoute } from "astro";

// Force this endpoint to be dynamic (not prerendered)
export const prerender = false;

export const GET: APIRoute = async (context) => {
  const { url, redirect } = context;

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const state = url.searchParams.get("state");

  // Handle authorization errors
  if (error) {
    console.error("Spotify authorization error:", error);
    return redirect(`/?error=${encodeURIComponent(error)}`);
  }

  // Validate we have a code
  if (!code) {
    console.error("No authorization code received");
    return redirect("/?error=no_code");
  }

  // Get code verifier from state (we passed it through the state parameter)
  const codeVerifier = state;

  if (!codeVerifier) {
    console.error("No code verifier found");
    return redirect("/?error=no_verifier");
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
        `/?error=${encodeURIComponent(
          errorData.error_description || "token_exchange_failed"
        )}`
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in || 3600;

    // Redirect back to home with token in hash (for client-side storage)
    // We use hash instead of query params for security (not sent to server on subsequent requests)
    return redirect(`/#access_token=${accessToken}&expires_in=${expiresIn}`);
  } catch (error) {
    console.error("Error during token exchange:", error);
    return redirect(
      `/?error=${encodeURIComponent(
        error instanceof Error ? error.message : "unknown_error"
      )}`
    );
  }
};

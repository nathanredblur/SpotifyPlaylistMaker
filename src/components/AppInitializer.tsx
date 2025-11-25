import { useEffect, useState } from "react";
import { MusicOrganizer } from "@/components/MusicOrganizer";
import { parseAuthHash, clearAuthHash } from "@/lib/spotify-api";
import { setAccessToken, getAccessToken } from "@/lib/spotify-auth";

/**
 * Component that handles OAuth callback and initializes the main app
 * This is mounted client-side only in app.astro
 */
export function AppInitializer() {
  const [token, setToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Parse auth hash from URL (Spotify redirects with #access_token=...)
      const { accessToken, error: authError } = parseAuthHash();

      if (authError) {
        console.error("Spotify authorization error:", authError);
        setError(`Authorization failed: ${authError}`);
        setTimeout(() => {
          window.location.href = "/";
        }, 3000);
        return;
      }

      // If we got a fresh token from Spotify, store it
      if (accessToken) {
        console.log("✅ Received access token from Spotify");
        setAccessToken(accessToken);
        clearAuthHash(); // Clean up the URL
      }

      // Check if we have a valid token (either from URL or localStorage)
      const validToken = getAccessToken();

      if (!validToken) {
        console.warn("⚠️ No valid access token found, redirecting to home");
        setError("No valid access token found");
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
        return;
      }

      console.log("✅ Valid token found, initializing app");
      setToken(validToken);
      setIsInitializing(false);
    } catch (err) {
      console.error("Failed to initialize app:", err);
      setError(
        "An error occurred while initializing the app. Please try refreshing the page."
      );
    }
  }, []);

  // Show loading state
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto mb-4" />
          <p className="text-lg">Initializing...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-white text-center max-w-md px-4">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2">Initialization Error</h2>
          <p className="text-slate-300 mb-4">{error}</p>
          <p className="text-sm text-slate-400">Redirecting to home page...</p>
        </div>
      </div>
    );
  }

  // Render the main app
  if (!token) {
    return null;
  }

  return <MusicOrganizer accessToken={token} />;
}


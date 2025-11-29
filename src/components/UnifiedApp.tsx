/**
 * Unified App Component
 * Shows landing page if not authenticated, or main app if authenticated
 */

import { useState, useEffect } from "react";
import { LandingPage } from "./LandingPage";
import { MusicOrganizer } from "./MusicOrganizer";
import { CollectionSelector } from "./CollectionSelector";
import { getAccessToken, setAccessToken } from "@/lib/spotify-auth";
import { parseAuthCallback, clearAuthHash } from "@/lib/spotify-api";
import type { CollectionInfo } from "@/types/spotify";

export function UnifiedApp() {
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [collectionInfo, setCollectionInfo] = useState<CollectionInfo | null>(
    null
  );
  const [showCollectionSelector, setShowCollectionSelector] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Check for OAuth callback in URL (token returned by backend in hash)
      const {
        accessToken: newToken,
        expiresIn,
        error: authError,
      } = parseAuthCallback();

      if (authError) {
        console.error("Spotify authorization error:", authError);
        setError(`Authorization failed: ${authError}`);
        setIsInitializing(false);
        return;
      }

      // If we got a fresh token from backend, store it
      if (newToken) {
        console.log("✅ Received access token from backend");
        setAccessToken(newToken, expiresIn);
        clearAuthHash(); // Clean up the URL
        setAccessTokenState(newToken);
        setIsInitializing(false);
        setShowCollectionSelector(true); // Show selector after login
        return;
      }

      // Check if we have a valid stored token
      const validToken = getAccessToken();

      if (validToken) {
        console.log("✅ Valid token found in storage");
        setAccessTokenState(validToken);

        // Check if we have a stored collection selection
        const storedInfo = localStorage.getItem("collection_info");
        if (storedInfo) {
          const info: CollectionInfo = JSON.parse(storedInfo);
          setCollectionInfo(info);
        } else {
          setShowCollectionSelector(true);
        }
      }

      setIsInitializing(false);
    } catch (err) {
      console.error("Failed to initialize auth:", err);
      setError(
        "An error occurred while initializing. Please refresh the page."
      );
      setIsInitializing(false);
    }
  };

  const handleCollectionSelect = (info: CollectionInfo) => {
    localStorage.setItem("collection_info", JSON.stringify(info));
    setCollectionInfo(info);
    setShowCollectionSelector(false);
  };

  const handleChangeCollection = () => {
    setShowCollectionSelector(true);
    setCollectionInfo(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("spotify_access_token");
    localStorage.removeItem("collection_info");
    setAccessTokenState(null);
    setCollectionInfo(null);
    setShowCollectionSelector(false);
    window.location.href = "/";
  };

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
          <h2 className="text-2xl font-bold mb-2">Error</h2>
          <p className="text-slate-300 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Not authenticated - show landing page
  if (!accessToken) {
    return <LandingPage />;
  }

  // Authenticated but no collection selected - show selector
  if (showCollectionSelector || !collectionInfo) {
    return (
      <CollectionSelector
        onSelect={handleCollectionSelect}
        onLogout={handleLogout}
      />
    );
  }

  // Authenticated with collection selected - show main app
  return (
    <MusicOrganizer
      accessToken={accessToken}
      collectionInfo={collectionInfo}
      onChangeCollection={handleChangeCollection}
      onLogout={handleLogout}
    />
  );
}

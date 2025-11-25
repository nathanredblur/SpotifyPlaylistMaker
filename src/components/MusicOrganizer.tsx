import { useState, useEffect } from "react";
import { SpotifyAPI } from "@/lib/spotify-api";
import { useMusicLoader } from "@/hooks/useMusicLoader";
import type { CollectionInfo } from "@/types/spotify";
import { LoadingScreen } from "./LoadingScreen";
import { MainApp } from "./MainApp";

interface MusicOrganizerProps {
  accessToken: string;
}

export function MusicOrganizer({ accessToken }: MusicOrganizerProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [collectionInfo, setCollectionInfo] = useState<CollectionInfo | null>(
    null
  );
  const [initError, setInitError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const musicLoader = useMusicLoader();

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      const api = new SpotifyAPI(accessToken);

      // Get user profile
      const user = await api.getCurrentUser();
      setUserId(user.id);

      // Get collection info from localStorage
      const storedInfo = localStorage.getItem("collection_info");
      if (!storedInfo) {
        throw new Error(
          "No collection information found. Please go back and select what to organize."
        );
      }

      const info: CollectionInfo = JSON.parse(storedInfo);
      setCollectionInfo(info);

      setIsInitializing(false);

      // Start loading music
      await musicLoader.loadMusic(api, info, user.id);
    } catch (err) {
      console.error("Error initializing app:", err);
      setInitError(
        err instanceof Error ? err.message : "Failed to initialize app"
      );
      setIsInitializing(false);
    }
  };

  // Show initialization error
  if (initError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-400 mb-2">Error</h2>
          <p className="text-slate-300">{initError}</p>
          <button
            onClick={() => (window.location.href = "/")}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Show music loading error
  if (musicLoader.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-400 mb-2">Loading Error</h2>
          <p className="text-slate-300">{musicLoader.error}</p>
          <p className="text-slate-400 text-sm mt-2">
            Loaded {musicLoader.tracks.size} tracks before error occurred.
          </p>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              Retry
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading screen
  if (isInitializing || musicLoader.isLoading) {
    const message = isInitializing
      ? "Initializing..."
      : `Loading ${musicLoader.stats.currentPlaylist}...`;

    return (
      <LoadingScreen
        progress={musicLoader.progress}
        message={message}
        collectionType={collectionInfo?.type || "saved"}
        onStop={musicLoader.stopLoading}
        stats={musicLoader.stats}
      />
    );
  }

  // Show main app
  return (
    <MainApp
      accessToken={accessToken}
      userId={userId!}
      collectionInfo={collectionInfo!}
      bins={musicLoader.bins}
      tracks={musicLoader.tracks}
    />
  );
}

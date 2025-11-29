import { useState, useEffect } from "react";
import { SpotifyAPI } from "@/lib/spotify-api";
import { useMusicLoaderV2 as useMusicLoader } from "@/hooks/useMusicLoaderV2";
import type { CollectionInfo } from "@/types/spotify";
import { LoadingScreen } from "./LoadingScreen";
import { MainApp } from "./MainApp";

interface MusicOrganizerProps {
  accessToken: string;
  collectionInfo: CollectionInfo;
  onChangeCollection: () => void;
  onLogout: () => void;
}

export function MusicOrganizer({
  accessToken,
  collectionInfo,
  onChangeCollection,
  onLogout,
}: MusicOrganizerProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const musicLoader = useMusicLoader();

  useEffect(() => {
    initializeApp();
  }, [collectionInfo]);

  const initializeApp = async () => {
    try {
      const api = new SpotifyAPI(accessToken);

      // Get user profile
      const user = await api.getCurrentUser();
      setUserId(user.id);

      setIsInitializing(false);

      // Start loading music
      await musicLoader.loadMusic(collectionInfo);
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
      <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
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
      <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
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
    return (
      <LoadingScreen
        progress={musicLoader.progress}
        message={musicLoader.message}
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
      collectionInfo={collectionInfo}
      bins={musicLoader.bins}
      tracks={musicLoader.tracks}
      onChangeCollection={onChangeCollection}
      onLogout={onLogout}
    />
  );
}

/**
 * Gallery Viewer Component
 * Displays the public music gallery (no authentication required)
 */

import { useState, useEffect } from "react";
import { useGalleryLoader } from "@/hooks/useGalleryLoader";
import { LoadingScreen } from "./LoadingScreen";
import { MainApp } from "./MainApp";

export function GalleryViewer() {
  const [isInitializing, setIsInitializing] = useState(true);
  const galleryLoader = useGalleryLoader();

  useEffect(() => {
    initializeGallery();
  }, []);

  const initializeGallery = async () => {
    setIsInitializing(false);
    await galleryLoader.loadGallery();
  };

  // Show loading error
  if (galleryLoader.error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">
            Gallery Unavailable
          </h2>
          <p className="text-slate-300 mb-4">{galleryLoader.error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show loading screen
  if (isInitializing || galleryLoader.isLoading) {
    return (
      <LoadingScreen
        progress={galleryLoader.progress}
        message={galleryLoader.message}
        collectionType="saved"
        stats={galleryLoader.stats}
        onStop={galleryLoader.stopLoading}
      />
    );
  }

  // Empty gallery
  if (galleryLoader.tracks.size === 0) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🎵</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Gallery is Empty
          </h2>
          <p className="text-slate-400 mb-6">
            The music gallery hasn't been set up yet. The admin needs to sync
            tracks from the{" "}
            <a
              href="/admin"
              className="text-purple-400 hover:text-purple-300 underline"
            >
              admin panel
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  // Show main app with gallery data
  return (
    <MainApp
      bins={galleryLoader.bins}
      tracks={galleryLoader.tracks}
      galleryStats={galleryLoader.galleryStats}
    />
  );
}

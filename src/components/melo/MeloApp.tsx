/**
 * MELO App Component
 * Main entry point for the MELO music gallery
 */

import { useState, useEffect } from "react";
import { useGalleryLoader } from "@/hooks/useGalleryLoader";
import { MeloLayout } from "./MeloLayout";
import { MeloLogo } from "./MeloLogo";
import { Loader2 } from "lucide-react";

export function MeloApp() {
  const [isInitializing, setIsInitializing] = useState(true);
  const galleryLoader = useGalleryLoader();

  useEffect(() => {
    initializeGallery();
  }, []);

  const initializeGallery = async () => {
    setIsInitializing(false);
    await galleryLoader.loadGallery();
  };

  // Loading State
  if (isInitializing || galleryLoader.isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background">
        <MeloLogo size="lg" className="mb-8" />

        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              {galleryLoader.message || "Loading gallery..."}
            </p>

            {/* Progress Bar */}
            <div className="w-64 h-1 bg-background-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${galleryLoader.progress}%` }}
              />
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              {galleryLoader.progress}%
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (galleryLoader.error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background p-4">
        <MeloLogo size="lg" className="mb-8" />

        <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-bold text-destructive mb-2">
            Gallery Unavailable
          </h2>
          <p className="text-muted-foreground mb-4">{galleryLoader.error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-accent-foreground rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty Gallery State
  if (galleryLoader.tracks.size === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background p-4">
        <MeloLogo size="lg" className="mb-8" />

        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🎵</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Gallery is Empty
          </h2>
          <p className="text-muted-foreground mb-6">
            The music gallery hasn't been set up yet. The admin needs to sync
            tracks from the{" "}
            <a href="/admin" className="text-accent hover:underline">
              admin panel
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  // Get admin info from gallery stats
  const adminName = galleryLoader.galleryStats?.ownerName || "Gallery Owner";

  // Main Gallery View
  return (
    <MeloLayout
      tracks={galleryLoader.tracks}
      bins={galleryLoader.bins}
      adminName={adminName}
    />
  );
}

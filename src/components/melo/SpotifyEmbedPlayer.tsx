/**
 * Spotify Embed Player Component
 * Mini player using Spotify's iFrame Embed API
 * Used as fallback for non-Premium users
 */

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useSpotifyEmbed } from "@/hooks/useSpotifyEmbed";
import { X, Loader2 } from "lucide-react";

interface SpotifyEmbedPlayerProps {
  trackId: string | null;
  isVisible: boolean;
  onClose?: () => void;
  className?: string;
}

export function SpotifyEmbedPlayer({
  trackId,
  isVisible,
  onClose,
  className,
}: SpotifyEmbedPlayerProps) {
  const embed = useSpotifyEmbed();
  const lastTrackIdRef = useRef<string | null>(null);

  // Load track when trackId changes
  useEffect(() => {
    if (trackId && trackId !== lastTrackIdRef.current) {
      lastTrackIdRef.current = trackId;
      embed.loadTrack(trackId);
    }
  }, [trackId, embed.loadTrack]);

  // Always render the container to keep the embed alive,
  // but hide it when not visible
  return (
    <div
      className={cn(
        "fixed bottom-20 left-1/2 -translate-x-1/2 z-50",
        "w-full max-w-md px-4",
        "transition-all duration-300",
        isVisible && trackId
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none",
        className
      )}
    >
      <div className="relative bg-card border border-border rounded-lg shadow-2xl overflow-hidden">
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-2 right-2 z-10 p-1 rounded-full bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
            title="Close player"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Loading state */}
        {embed.isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-card">
            <Loader2 className="w-6 h-6 text-accent animate-spin" />
          </div>
        )}

        {/* Error state */}
        {embed.error && (
          <div className="p-4 text-center">
            <p className="text-sm text-destructive">{embed.error}</p>
          </div>
        )}

        {/* Embed container - always mounted to preserve controller */}
        <div
          ref={embed.embedRef}
          className={cn("w-full", embed.isLoading && "opacity-0")}
          style={{ minHeight: 80 }}
        />
      </div>
    </div>
  );
}

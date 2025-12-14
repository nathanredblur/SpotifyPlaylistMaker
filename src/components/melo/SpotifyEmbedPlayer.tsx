/**
 * Spotify Embed Player Component
 * Mini player using Spotify's iFrame Embed API
 * Used as fallback for non-Premium users
 */

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useSpotifyEmbed } from "@/hooks/useSpotifyEmbed";
import { Loader2 } from "lucide-react";

interface SpotifyEmbedPlayerProps {
  trackId: string | null;
  className?: string;
  onTrackEnd?: () => void;
}

export function SpotifyEmbedPlayer({
  trackId,
  className,
  onTrackEnd,
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

  // Auto-advance when track ends
  useEffect(() => {
    if (embed.trackEnded && onTrackEnd) {
      embed.resetTrackEnded();
      onTrackEnd();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embed.trackEnded]);

  return (
    <div className={cn("relative w-full", className)}>
      {/* Loading state */}
      {embed.isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background-secondary rounded-lg">
          <Loader2 className="w-5 h-5 text-accent animate-spin" />
        </div>
      )}

      {/* Error state */}
      {embed.error && (
        <div className="p-2 text-center">
          <p className="text-xs text-destructive">{embed.error}</p>
        </div>
      )}

      {/* Embed container */}
      <div
        ref={embed.embedRef}
        className={cn(
          "w-full rounded-lg overflow-hidden",
          embed.isLoading && "opacity-0"
        )}
        style={{ minHeight: 80 }}
      />
    </div>
  );
}

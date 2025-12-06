/**
 * Track List Component
 * Main track list with header and rows
 */

import { useMemo } from "react";
import { Clock, Music } from "lucide-react";
import { TrackRow } from "./TrackRow";
import { cn } from "@/lib/utils";
import type { Track } from "@/types/spotify";

interface TrackListProps {
  tracks: Track[];
  currentTrackId: string | null;
  isPlaying: boolean;
  selectedTrackIds: Set<string>;
  onPlayTrack: (track: Track) => void;
  onSelectTrack: (trackId: string) => void;
  onOpenInSpotify: (track: Track) => void;
  className?: string;
}

export function TrackList({
  tracks,
  currentTrackId,
  isPlaying,
  selectedTrackIds,
  onPlayTrack,
  onSelectTrack,
  onOpenInSpotify,
  className,
}: TrackListProps) {
  // Calculate total duration
  const totalDuration = useMemo(() => {
    const totalMs = tracks.reduce(
      (sum, track) => sum + (track.details.duration_ms || 0),
      0
    );
    const hours = Math.floor(totalMs / (1000 * 60 * 60));
    const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  }, [tracks]);

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Music className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No tracks found
        </h3>
        <p className="text-sm text-muted-foreground">
          Try adjusting your filters or search query
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
        <div className="w-8 text-center">#</div>
        <div className="w-5" /> {/* Checkbox space */}
        <div className="w-10" /> {/* Album art space */}
        <div className="flex-1">Title</div>
        <div className="w-40 hidden 2xl:block">Album</div>
        <div className="w-12 text-right flex items-center justify-end gap-1">
          <Clock className="w-3 h-3" />
        </div>
      </div>

      {/* Track Count & Duration */}
      <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border">
        {tracks.length} track{tracks.length !== 1 ? "s" : ""} • {totalDuration}
        {selectedTrackIds.size > 0 && (
          <span className="ml-2 text-accent">
            • {selectedTrackIds.size} selected
          </span>
        )}
      </div>

      {/* Track Rows */}
      <div className="flex-1 overflow-y-auto">
        <div className="py-2">
          {tracks.map((track, index) => (
            <TrackRow
              key={track.id}
              track={track}
              index={index}
              isPlaying={currentTrackId === track.id && isPlaying}
              isSelected={selectedTrackIds.has(track.id)}
              onPlay={() => onPlayTrack(track)}
              onSelect={() => onSelectTrack(track.id)}
              onDoubleClick={() => onOpenInSpotify(track)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}


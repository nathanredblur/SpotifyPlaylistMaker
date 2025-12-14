/**
 * Track List Component
 * Main track list with header and rows
 *
 * PERFORMANCE: Uses virtualization to only render visible rows
 * @see https://tanstack.com/virtual/latest
 */

import { useRef, useMemo, useCallback, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Clock, Music } from "lucide-react";
import { TrackRow } from "./TrackRow";
import { cn } from "@/lib/utils";
import type { Track } from "@/types/spotify";

// ============================================================================
// Constants
// ============================================================================

const ROW_HEIGHT = 56; // Height of each track row in pixels
const OVERSCAN = 5; // Number of extra rows to render above/below viewport

// ============================================================================
// Types
// ============================================================================

interface TrackListProps {
  tracks: Track[];
  currentTrackId: string | null;
  isPlaying: boolean;
  selectedTrackIds: Set<string>;
  onPlayTrack: (trackId: string) => void;
  onSelectTrack: (trackId: string) => void;
  onOpenInSpotify: (trackId: string) => void;
  className?: string;
  /** Optional controls to render in the header (sort, filter) */
  controls?: ReactNode;
}

// ============================================================================
// Helper Functions (outside component)
// ============================================================================

function formatTotalDuration(totalMs: number): string {
  const hours = Math.floor(totalMs / (1000 * 60 * 60));
  const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  return `${minutes} min`;
}

// ============================================================================
// Component
// ============================================================================

export function TrackList({
  tracks,
  currentTrackId,
  isPlaying,
  selectedTrackIds,
  onPlayTrack,
  onSelectTrack,
  onOpenInSpotify,
  className,
  controls,
}: TrackListProps) {
  // Ref for the scrollable container
  const parentRef = useRef<HTMLDivElement>(null);

  // Calculate total duration - memoized
  const totalDuration = useMemo(() => {
    const totalMs = tracks.reduce(
      (sum, track) => sum + (track.details.duration_ms || 0),
      0
    );
    return formatTotalDuration(totalMs);
  }, [tracks]);

  // Create virtualizer for efficient list rendering
  const virtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  // Stable callback handlers - these won't change between renders
  const handlePlay = useCallback(
    (trackId: string) => {
      onPlayTrack(trackId);
    },
    [onPlayTrack]
  );

  const handleSelect = useCallback(
    (trackId: string) => {
      onSelectTrack(trackId);
    },
    [onSelectTrack]
  );

  const handleDoubleClick = useCallback(
    (trackId: string) => {
      onOpenInSpotify(trackId);
    },
    [onOpenInSpotify]
  );

  // Empty state
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

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Controls Bar (Sort & Filter) */}
      {controls && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background-secondary/50">
          {controls}
        </div>
      )}

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

      {/* Virtualized Track Rows */}
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto"
        style={{ contain: "strict" }} // CSS containment for better performance
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualItems.map((virtualRow) => {
            const track = tracks[virtualRow.index];
            const isRowPlaying = currentTrackId === track.id && isPlaying;
            const isRowSelected = selectedTrackIds.has(track.id);

            return (
              <div
                key={track.id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <TrackRow
                  track={track}
                  index={virtualRow.index}
                  isPlaying={isRowPlaying}
                  isSelected={isRowSelected}
                  onPlay={handlePlay}
                  onSelect={handleSelect}
                  onDoubleClick={handleDoubleClick}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

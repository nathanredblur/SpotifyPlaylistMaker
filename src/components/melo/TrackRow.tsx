/**
 * Track Row Component
 * Individual track row in the track list
 *
 * PERFORMANCE: This component is memoized and should only re-render when:
 * - track data changes
 * - isPlaying state changes
 * - isSelected state changes
 */

import { memo } from "react";
import { Play, Pause, Check, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Track } from "@/types/spotify";

// ============================================================================
// Types
// ============================================================================

interface TrackRowProps {
  track: Track;
  index: number;
  isPlaying: boolean;
  isSelected: boolean;
  onPlay: (trackId: string) => void;
  onSelect: (trackId: string) => void;
  onDoubleClick: (trackId: string) => void;
}

// ============================================================================
// Helper Functions (outside component to avoid recreation)
// ============================================================================

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// ============================================================================
// Component
// ============================================================================

function TrackRowComponent({
  track,
  index,
  isPlaying,
  isSelected,
  onPlay,
  onSelect,
  onDoubleClick,
}: TrackRowProps) {
  const { details } = track;
  const albumArt =
    details.album?.images?.[2]?.url ||
    details.album?.images?.[1]?.url ||
    details.album?.images?.[0]?.url;

  // Check if track is playable (default to true if undefined)
  const isPlayable = details.is_playable !== false;

  return (
    <div
      className={cn(
        "group flex items-center gap-4 px-4 py-2 rounded-md",
        "transition-colors duration-150 cursor-pointer",
        "hover:bg-accent-muted",
        isPlaying && "bg-accent-muted",
        isSelected && "bg-accent/10",
        !isPlayable && "opacity-50"
      )}
      onDoubleClick={() => onDoubleClick(track.id)}
      title={
        !isPlayable ? "This track is not available for playback" : undefined
      }
    >
      {/* Index / Play Button */}
      <div className="w-8 flex items-center justify-center">
        {!isPlayable ? (
          <div className="w-8 h-8 flex items-center justify-center text-muted-foreground">
            <Ban className="w-4 h-4" />
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay(track.id);
            }}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-full",
              "transition-all duration-150",
              isPlaying
                ? "text-accent"
                : "text-muted-foreground group-hover:text-foreground"
            )}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <>
                <span className="group-hover:hidden text-sm">{index + 1}</span>
                <Play className="w-4 h-4 hidden group-hover:block" />
              </>
            )}
          </button>
        )}
      </div>

      {/* Selection Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelect(track.id);
        }}
        className={cn(
          "w-5 h-5 rounded border flex items-center justify-center",
          "transition-colors duration-150",
          isSelected
            ? "bg-accent border-accent text-accent-foreground"
            : "border-border hover:border-accent"
        )}
      >
        {isSelected && <Check className="w-3 h-3" />}
      </button>

      {/* Album Art */}
      <div className="w-10 h-10 rounded overflow-hidden shrink-0">
        {albumArt ? (
          <img
            src={albumArt}
            alt={details.album?.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-background-tertiary" />
        )}
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium truncate",
            isPlaying ? "text-accent" : "text-foreground"
          )}
        >
          {details.name}
          {details.explicit && (
            <span className="ml-2 px-1 py-0.5 text-[10px] bg-muted text-muted-foreground rounded">
              E
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {details.artists?.map((a) => a.name).join(", ")}
        </p>
      </div>

      {/* Album - only show on very wide screens */}
      <div className="w-40 hidden 2xl:block">
        <p className="text-sm text-muted-foreground truncate">
          {details.album?.name}
        </p>
      </div>

      {/* Duration */}
      <div className="w-12 text-right">
        <span className="text-sm text-muted-foreground">
          {formatDuration(details.duration_ms || 0)}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Memoized Export
// ============================================================================

/**
 * Custom comparison function for React.memo
 * Only re-render if these specific props change
 */
function arePropsEqual(prev: TrackRowProps, next: TrackRowProps): boolean {
  return (
    prev.track.id === next.track.id &&
    prev.index === next.index &&
    prev.isPlaying === next.isPlaying &&
    prev.isSelected === next.isSelected &&
    // Callbacks are stable (useCallback in parent), so we don't compare them
    prev.onPlay === next.onPlay &&
    prev.onSelect === next.onSelect &&
    prev.onDoubleClick === next.onDoubleClick
  );
}

export const TrackRow = memo(TrackRowComponent, arePropsEqual);

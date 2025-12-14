/**
 * Admin Track Row Component
 * Track row with admin-specific columns and status indicators
 */

import { memo } from "react";
import { Check, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Track } from "@/types/spotify";
import type { AdminVisibleColumns } from "./AdminColumnSelector";

// ============================================================================
// Types
// ============================================================================

interface AdminTrackRowProps {
  track: Track;
  index: number;
  isSelected: boolean;
  isActive: boolean;
  visibleColumns: AdminVisibleColumns;
  hasFeatures?: boolean;
  hasSoundcharts?: boolean;
  isFailed?: boolean;
  onSelect: (trackId: string) => void;
  onClick: (trackId: string) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatPercent(value: number | undefined): string {
  if (value === undefined) return "-";
  return `${Math.round(value * 100)}%`;
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return "-";
  return dateString.substring(0, 10);
}

// ============================================================================
// Component
// ============================================================================

function AdminTrackRowComponent({
  track,
  index,
  isSelected,
  isActive,
  visibleColumns,
  hasFeatures = true,
  hasSoundcharts = true,
  isFailed = false,
  onSelect,
  onClick,
}: AdminTrackRowProps) {
  const { details, feats } = track;
  const albumArt =
    details.album?.images?.[2]?.url ||
    details.album?.images?.[1]?.url ||
    details.album?.images?.[0]?.url;

  const isrc = details.external_ids?.isrc;

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-3 py-2 text-sm",
        "transition-colors duration-150 cursor-pointer border-b border-border",
        "hover:bg-accent/5",
        isActive && "bg-accent/10 border-l-2 border-l-accent",
        isSelected && "bg-accent/5",
        isFailed && "bg-destructive/5"
      )}
      onClick={() => onClick(track.id)}
    >
      {/* Index */}
      <div className="w-8 text-center text-muted-foreground text-xs">
        {index + 1}
      </div>

      {/* Selection Checkbox */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelect(track.id);
        }}
        className={cn(
          "w-5 h-5 rounded border flex items-center justify-center shrink-0",
          "transition-colors duration-150",
          isSelected
            ? "bg-accent border-accent text-accent-foreground"
            : "border-border hover:border-accent"
        )}
      >
        {isSelected && <Check className="w-3 h-3" />}
      </button>

      {/* Status Indicator */}
      <div className="w-5 flex items-center justify-center shrink-0">
        {isFailed ? (
          <XCircle className="w-4 h-4 text-destructive" title="Failed to fetch features" />
        ) : !hasFeatures ? (
          <AlertTriangle className="w-4 h-4 text-orange-400" title="Missing features" />
        ) : (
          <CheckCircle className="w-4 h-4 text-green-500 opacity-50" title="Complete" />
        )}
      </div>

      {/* Album Art */}
      <div className="w-8 h-8 rounded overflow-hidden shrink-0">
        {albumArt ? (
          <img
            src={albumArt}
            alt={details.album?.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-secondary" />
        )}
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0 max-w-[200px]">
        <p className={cn("font-medium truncate text-xs", isActive && "text-accent")}>
          {details.name}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {details.artists?.map((a) => a.name).join(", ")}
        </p>
      </div>

      {/* Admin Columns */}
      {visibleColumns.has("spotifyId") && (
        <div className="w-28 hidden lg:block">
          <code className="text-[10px] text-muted-foreground truncate block">
            {track.id}
          </code>
        </div>
      )}

      {visibleColumns.has("isrc") && (
        <div className="w-28 hidden lg:block">
          <code className="text-[10px] text-muted-foreground truncate block">
            {isrc || "-"}
          </code>
        </div>
      )}

      {visibleColumns.has("hasFeatures") && (
        <div className="w-16 hidden md:flex justify-center">
          {hasFeatures ? (
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>
      )}

      {visibleColumns.has("hasSoundcharts") && (
        <div className="w-16 hidden md:flex justify-center">
          {hasSoundcharts ? (
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>
      )}

      {/* Standard Columns */}
      {visibleColumns.has("album") && (
        <div className="w-40 hidden xl:block">
          <p className="text-xs text-muted-foreground truncate">
            {details.album?.name}
          </p>
        </div>
      )}

      {visibleColumns.has("popularity") && (
        <div className="w-12 hidden md:block text-center">
          <span className="text-xs text-muted-foreground">
            {details.popularity ?? "-"}
          </span>
        </div>
      )}

      {visibleColumns.has("decade") && (
        <div className="w-16 hidden md:block text-center">
          <span className="text-xs text-muted-foreground">
            {details.album?.release_date
              ? `${Math.floor(parseInt(details.album.release_date.substring(0, 4)) / 10) * 10}s`
              : "-"}
          </span>
        </div>
      )}

      {visibleColumns.has("releaseDate") && (
        <div className="w-24 hidden lg:block text-center">
          <span className="text-xs text-muted-foreground">
            {formatDate(details.album?.release_date)}
          </span>
        </div>
      )}

      {visibleColumns.has("explicit") && (
        <div className="w-14 hidden md:block text-center">
          {details.explicit ? (
            <span className="px-1.5 py-0.5 text-[10px] bg-muted rounded">E</span>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </div>
      )}

      {/* Audio Features */}
      {visibleColumns.has("tempo") && (
        <div className="w-14 hidden md:block text-center">
          <span className="text-xs text-muted-foreground">
            {feats?.tempo ? Math.round(feats.tempo) : "-"}
          </span>
        </div>
      )}

      {visibleColumns.has("energy") && (
        <div className="w-14 hidden md:block text-center">
          <span className="text-xs text-muted-foreground">
            {formatPercent(feats?.energy)}
          </span>
        </div>
      )}

      {visibleColumns.has("danceability") && (
        <div className="w-14 hidden md:block text-center">
          <span className="text-xs text-muted-foreground">
            {formatPercent(feats?.danceability)}
          </span>
        </div>
      )}

      {visibleColumns.has("valence") && (
        <div className="w-14 hidden md:block text-center">
          <span className="text-xs text-muted-foreground">
            {formatPercent(feats?.valence)}
          </span>
        </div>
      )}

      {visibleColumns.has("acousticness") && (
        <div className="w-14 hidden md:block text-center">
          <span className="text-xs text-muted-foreground">
            {formatPercent(feats?.acousticness)}
          </span>
        </div>
      )}

      {visibleColumns.has("instrumentalness") && (
        <div className="w-14 hidden md:block text-center">
          <span className="text-xs text-muted-foreground">
            {formatPercent(feats?.instrumentalness)}
          </span>
        </div>
      )}

      {visibleColumns.has("liveness") && (
        <div className="w-14 hidden md:block text-center">
          <span className="text-xs text-muted-foreground">
            {formatPercent(feats?.liveness)}
          </span>
        </div>
      )}

      {visibleColumns.has("speechiness") && (
        <div className="w-14 hidden md:block text-center">
          <span className="text-xs text-muted-foreground">
            {formatPercent(feats?.speechiness)}
          </span>
        </div>
      )}

      {visibleColumns.has("loudness") && (
        <div className="w-14 hidden md:block text-center">
          <span className="text-xs text-muted-foreground">
            {feats?.loudness ? `${feats.loudness.toFixed(0)}` : "-"}
          </span>
        </div>
      )}

      {/* Duration - Always visible */}
      <div className="w-12 text-right">
        <span className="text-xs text-muted-foreground">
          {formatDuration(details.duration_ms || 0)}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Memoized Export
// ============================================================================

function arePropsEqual(prev: AdminTrackRowProps, next: AdminTrackRowProps): boolean {
  return (
    prev.track.id === next.track.id &&
    prev.index === next.index &&
    prev.isSelected === next.isSelected &&
    prev.isActive === next.isActive &&
    prev.visibleColumns === next.visibleColumns &&
    prev.hasFeatures === next.hasFeatures &&
    prev.hasSoundcharts === next.hasSoundcharts &&
    prev.isFailed === next.isFailed &&
    prev.onSelect === next.onSelect &&
    prev.onClick === next.onClick
  );
}

export const AdminTrackRow = memo(AdminTrackRowComponent, arePropsEqual);


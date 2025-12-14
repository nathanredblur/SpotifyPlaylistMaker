/**
 * Admin Track List Component
 * Track list with admin columns, quick filters, and virtualization
 */

import { useRef, useMemo, useCallback, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Clock, Music, CheckSquare, Square, AlertTriangle, XCircle, Filter, CheckCircle2, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminTrackRow } from "./AdminTrackRow";
import { ADMIN_COLUMNS, type AdminVisibleColumns } from "./AdminColumnSelector";
import { cn } from "@/lib/utils";
import type { Track } from "@/types/spotify";

// ============================================================================
// Constants
// ============================================================================

const ROW_HEIGHT = 48;
const OVERSCAN = 10;

// ============================================================================
// Types
// ============================================================================

export type QuickFilter = "all" | "selected" | "incomplete" | "failed" | "noFeatures" | "noIsrc";

interface TrackMeta {
  hasFeatures: boolean;
  hasSoundcharts: boolean;
  isFailed: boolean;
}

interface AdminTrackListProps {
  tracks: Track[];
  tracksMeta: Map<string, TrackMeta>;
  activeTrackId: string | null;
  selectedTrackIds: Set<string>;
  visibleColumns: AdminVisibleColumns;
  quickFilter: QuickFilter;
  onQuickFilterChange: (filter: QuickFilter) => void;
  onTrackClick: (trackId: string) => void;
  onSelectTrack: (trackId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onInvertSelection: () => void;
  className?: string;
  controls?: ReactNode;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatTotalDuration(totalMs: number): string {
  const hours = Math.floor(totalMs / (1000 * 60 * 60));
  const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// ============================================================================
// Quick Filter Buttons
// ============================================================================

interface QuickFilterButtonProps {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
  variant?: "default" | "warning" | "danger";
  icon?: React.ElementType;
}

function QuickFilterButton({
  label,
  count,
  isActive,
  onClick,
  variant = "default",
  icon: Icon,
}: QuickFilterButtonProps) {
  const variants = {
    default: isActive ? "bg-accent text-accent-foreground" : "bg-secondary hover:bg-secondary/80",
    warning: isActive ? "bg-orange-500 text-white" : "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30",
    danger: isActive ? "bg-destructive text-destructive-foreground" : "bg-destructive/20 text-destructive hover:bg-destructive/30",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
        variants[variant]
      )}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {label}
      <span className={cn(
        "px-1.5 py-0.5 rounded-full text-[10px]",
        isActive ? "bg-white/20" : "bg-black/10"
      )}>
        {count}
      </span>
    </button>
  );
}

// ============================================================================
// Component
// ============================================================================

export function AdminTrackList({
  tracks,
  tracksMeta,
  activeTrackId,
  selectedTrackIds,
  visibleColumns,
  quickFilter,
  onQuickFilterChange,
  onTrackClick,
  onSelectTrack,
  onSelectAll,
  onDeselectAll,
  onInvertSelection,
  className,
  controls,
}: AdminTrackListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Calculate stats for quick filters
  const filterStats = useMemo(() => {
    let incomplete = 0;
    let failed = 0;
    let noFeatures = 0;
    let noIsrc = 0;

    for (const track of tracks) {
      const meta = tracksMeta.get(track.id);
      const isrc = track.details.external_ids?.isrc;
      
      if (meta?.isFailed) failed++;
      if (!meta?.hasFeatures) noFeatures++;
      if (!isrc) noIsrc++;
      if (!meta?.hasFeatures || !isrc) incomplete++;
    }

    return { 
      all: tracks.length, 
      selected: selectedTrackIds.size,
      incomplete, 
      failed, 
      noFeatures, 
      noIsrc 
    };
  }, [tracks, tracksMeta, selectedTrackIds.size]);

  // Apply quick filter
  const filteredTracks = useMemo(() => {
    if (quickFilter === "all") return tracks;

    return tracks.filter((track) => {
      const meta = tracksMeta.get(track.id);
      const isrc = track.details.external_ids?.isrc;

      switch (quickFilter) {
        case "selected":
          return selectedTrackIds.has(track.id);
        case "incomplete":
          return !meta?.hasFeatures || !isrc;
        case "failed":
          return meta?.isFailed;
        case "noFeatures":
          return !meta?.hasFeatures;
        case "noIsrc":
          return !isrc;
        default:
          return true;
      }
    });
  }, [tracks, tracksMeta, quickFilter, selectedTrackIds]);

  const totalDuration = useMemo(() => {
    const totalMs = filteredTracks.reduce(
      (sum, track) => sum + (track.details.duration_ms || 0),
      0
    );
    return formatTotalDuration(totalMs);
  }, [filteredTracks]);

  const virtualizer = useVirtualizer({
    count: filteredTracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  const handleSelect = useCallback(
    (trackId: string) => onSelectTrack(trackId),
    [onSelectTrack]
  );

  const handleClick = useCallback(
    (trackId: string) => onTrackClick(trackId),
    [onTrackClick]
  );

  const virtualItems = virtualizer.getVirtualItems();
  const isEmpty = filteredTracks.length === 0;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Controls Bar */}
      {controls && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-secondary/30 shrink-0">
          {controls}
        </div>
      )}

      {/* Quick Filters */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-secondary/20 shrink-0 overflow-x-auto">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        <QuickFilterButton
          label="All"
          count={filterStats.all}
          isActive={quickFilter === "all"}
          onClick={() => onQuickFilterChange("all")}
        />
        {filterStats.selected > 0 && (
          <QuickFilterButton
            label="Selected"
            count={filterStats.selected}
            isActive={quickFilter === "selected"}
            onClick={() => onQuickFilterChange("selected")}
            icon={CheckCircle2}
          />
        )}
        <QuickFilterButton
          label="Incomplete"
          count={filterStats.incomplete}
          isActive={quickFilter === "incomplete"}
          onClick={() => onQuickFilterChange("incomplete")}
          variant="warning"
          icon={AlertTriangle}
        />
        <QuickFilterButton
          label="Failed"
          count={filterStats.failed}
          isActive={quickFilter === "failed"}
          onClick={() => onQuickFilterChange("failed")}
          variant="danger"
          icon={XCircle}
        />
        <QuickFilterButton
          label="No Features"
          count={filterStats.noFeatures}
          isActive={quickFilter === "noFeatures"}
          onClick={() => onQuickFilterChange("noFeatures")}
          variant="warning"
        />
        <QuickFilterButton
          label="No ISRC"
          count={filterStats.noIsrc}
          isActive={quickFilter === "noIsrc"}
          onClick={() => onQuickFilterChange("noIsrc")}
          variant="warning"
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Selection Actions */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onInvertSelection}
          className="h-7 px-2 text-xs gap-1"
          title="Invert selection"
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Invert</span>
        </Button>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
          <Music className="w-12 h-12 text-muted-foreground mb-4 opacity-30" />
          <h3 className="text-sm font-semibold text-foreground mb-1">No tracks found</h3>
          <p className="text-xs text-muted-foreground">
            {quickFilter !== "all"
              ? "No tracks match this filter"
              : "Try adjusting your search or filters"}
          </p>
        </div>
      )}

      {/* Header & Content */}
      {!isEmpty && (
        <>
          {/* Header */}
          <div className="flex items-center gap-3 px-3 py-2 border-b border-border text-[10px] text-muted-foreground uppercase tracking-wider bg-secondary/10 shrink-0">
            <div className="w-8 text-center">#</div>
            <div className="w-5" />
            <div className="w-5" />
            <div className="w-8" />
            <div className="flex-1 max-w-[200px]">Title</div>

            {/* Dynamic Columns */}
            {ADMIN_COLUMNS.map((col) =>
              visibleColumns.has(col.id) ? (
                <div
                  key={col.id}
                  className={cn(
                    col.width,
                    "hidden",
                    col.id === "spotifyId" || col.id === "isrc" || col.id === "releaseDate"
                      ? "lg:block"
                      : col.id === "album"
                      ? "xl:block"
                      : "md:block",
                    !["album", "spotifyId", "isrc"].includes(col.id) && "text-center"
                  )}
                >
                  {col.label}
                </div>
              ) : null
            )}

            <div className="w-12 text-right flex items-center justify-end gap-1">
              <Clock className="w-3 h-3" />
            </div>
          </div>

          {/* Stats & Selection */}
          <div className="flex items-center justify-between px-3 py-1.5 text-xs text-muted-foreground border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <span>
                {filteredTracks.length} track{filteredTracks.length !== 1 ? "s" : ""} • {totalDuration}
              </span>
              {selectedTrackIds.size > 0 && (
                <span className="text-accent">• {selectedTrackIds.size} selected</span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {selectedTrackIds.size < filteredTracks.length && (
                <Button variant="ghost" size="sm" onClick={onSelectAll} className="h-6 px-2 text-xs">
                  <CheckSquare className="w-3 h-3 mr-1" />
                  Select all
                </Button>
              )}
              {selectedTrackIds.size > 0 && (
                <Button variant="ghost" size="sm" onClick={onDeselectAll} className="h-6 px-2 text-xs">
                  <Square className="w-3 h-3 mr-1" />
                  Deselect
                </Button>
              )}
            </div>
          </div>

          {/* Virtualized Rows */}
          <div
            ref={parentRef}
            className="flex-1 overflow-y-auto"
            style={{ contain: "strict" }}
          >
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {virtualItems.map((virtualRow) => {
                const track = filteredTracks[virtualRow.index];
                const meta = tracksMeta.get(track.id) || {
                  hasFeatures: true,
                  hasSoundcharts: true,
                  isFailed: false,
                };

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
                    <AdminTrackRow
                      track={track}
                      index={virtualRow.index}
                      isSelected={selectedTrackIds.has(track.id)}
                      isActive={activeTrackId === track.id}
                      visibleColumns={visibleColumns}
                      hasFeatures={meta.hasFeatures}
                      hasSoundcharts={meta.hasSoundcharts}
                      isFailed={meta.isFailed}
                      onSelect={handleSelect}
                      onClick={handleClick}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}


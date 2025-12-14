/**
 * Admin Footer Component
 * Playback controls + admin-specific actions for tracks
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ExternalLink,
  Trash2,
  RefreshCw,
  Download,
  MoreHorizontal,
  Music,
  AlertCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { Track } from "@/types/spotify";

// ============================================================================
// Types
// ============================================================================

interface AdminFooterProps {
  track: Track | null;
  isPlaying: boolean;
  selectedCount: number;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onDelete?: (trackId: string) => Promise<void>;
  onRefetchSpotify?: (trackId: string) => Promise<void>;
  onRefetchFeatures?: (trackId: string) => Promise<void>;
  onBulkDelete?: (trackIds: string[]) => Promise<void>;
  onBulkRefetch?: (trackIds: string[]) => Promise<void>;
  onExportSelected?: () => void;
  selectedTrackIds?: Set<string>;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDuration(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// ============================================================================
// Component
// ============================================================================

export function AdminFooter({
  track,
  isPlaying,
  selectedCount,
  onPlayPause,
  onPrevious,
  onNext,
  onDelete,
  onRefetchSpotify,
  onRefetchFeatures,
  onBulkDelete,
  onBulkRefetch,
  onExportSelected,
  selectedTrackIds,
}: AdminFooterProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  const handleDelete = async () => {
    if (!track || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(track.id);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleRefetchSpotify = async () => {
    if (!track || !onRefetchSpotify) return;
    setIsRefetching(true);
    try {
      await onRefetchSpotify(track.id);
    } finally {
      setIsRefetching(false);
    }
  };

  const handleRefetchFeatures = async () => {
    if (!track || !onRefetchFeatures) return;
    setIsRefetching(true);
    try {
      await onRefetchFeatures(track.id);
    } finally {
      setIsRefetching(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedTrackIds || selectedTrackIds.size === 0 || !onBulkDelete) return;
    setIsDeleting(true);
    try {
      await onBulkDelete(Array.from(selectedTrackIds));
    } finally {
      setIsDeleting(false);
      setShowBulkDeleteDialog(false);
    }
  };

  const handleBulkRefetch = async () => {
    if (!selectedTrackIds || selectedTrackIds.size === 0 || !onBulkRefetch) return;
    setIsRefetching(true);
    try {
      await onBulkRefetch(Array.from(selectedTrackIds));
    } finally {
      setIsRefetching(false);
    }
  };

  const albumArt =
    track?.details.album?.images?.[2]?.url ||
    track?.details.album?.images?.[1]?.url;

  return (
    <>
      <footer className="h-16 border-t border-border bg-card flex items-center px-4 gap-4 shrink-0">
        {/* Track Info */}
        <div className="flex items-center gap-3 min-w-0 w-64">
          {track ? (
            <>
              {albumArt ? (
                <img
                  src={albumArt}
                  alt={track.details.album?.name}
                  className="w-10 h-10 rounded"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-secondary flex items-center justify-center">
                  <Music className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{track.details.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {track.details.artists?.map((a) => a.name).join(", ")}
                </p>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Music className="w-4 h-4" />
              <span className="text-sm">No track selected</span>
            </div>
          )}
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onPrevious}
            disabled={!track}
            className="h-8 w-8 p-0"
          >
            <SkipBack className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onPlayPause}
            disabled={!track}
            className="h-9 w-9 p-0 rounded-full"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onNext}
            disabled={!track}
            className="h-8 w-8 p-0"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        {/* Track Actions */}
        <div className="flex items-center gap-1 border-l border-border pl-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => track && window.open(`https://open.spotify.com/track/${track.id}`, "_blank")}
            disabled={!track}
            className="h-8 px-2 text-xs gap-1"
            title="Open in Spotify"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefetchSpotify}
            disabled={!track || isRefetching}
            className="h-8 px-2 text-xs gap-1"
            title="Refetch Spotify data"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefetching && "animate-spin")} />
            <span className="hidden lg:inline">Spotify</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefetchFeatures}
            disabled={!track || isRefetching}
            className="h-8 px-2 text-xs gap-1"
            title="Refetch audio features"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRefetching && "animate-spin")} />
            <span className="hidden lg:inline">Features</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            disabled={!track || isDeleting}
            className="h-8 px-2 text-xs gap-1 text-destructive hover:text-destructive"
            title="Delete track"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bulk Actions */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 border-l border-border pl-4">
            <span className="text-xs text-muted-foreground">
              {selectedCount} selected
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2 text-xs gap-1">
                  <MoreHorizontal className="w-4 h-4" />
                  Bulk Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onExportSelected && (
                  <DropdownMenuItem onClick={onExportSelected}>
                    <Download className="w-4 h-4 mr-2" />
                    Export Selected
                  </DropdownMenuItem>
                )}
                {onBulkRefetch && (
                  <DropdownMenuItem onClick={handleBulkRefetch} disabled={isRefetching}>
                    <RefreshCw className={cn("w-4 h-4 mr-2", isRefetching && "animate-spin")} />
                    Refetch Features
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onBulkDelete && (
                  <DropdownMenuItem
                    onClick={() => setShowBulkDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Selected
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </footer>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Delete Track
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{track?.details.name}" from the database?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Delete {selectedCount} Tracks
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedCount} selected tracks from the database?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : `Delete ${selectedCount} tracks`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


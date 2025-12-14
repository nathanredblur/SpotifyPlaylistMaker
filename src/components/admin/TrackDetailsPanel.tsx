/**
 * Track Details Panel Component
 * Collapsible side panel showing full track information with admin actions
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  X,
  ExternalLink,
  RefreshCw,
  Edit2,
  ChevronDown,
  ChevronRight,
  Music,
  Disc,
  User,
  Calendar,
  Clock,
  Zap,
  Activity,
  Smile,
  Volume2,
  Mic2,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Track } from "@/types/spotify";

// ============================================================================
// Types
// ============================================================================

interface TrackDetailsPanelProps {
  track: Track | null;
  onClose: () => void;
  onRefetchSpotify?: (trackId: string) => Promise<void>;
  onRefetchFeatures?: (trackId: string) => Promise<void>;
  onEdit?: (track: Track) => void;
  className?: string;
}

interface DetailSectionProps {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
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
  return new Date(dateString).toLocaleDateString();
}

// ============================================================================
// Sub-components
// ============================================================================

function DetailSection({ title, icon: Icon, defaultOpen = true, children }: DetailSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 py-3 px-4 hover:bg-secondary/50 transition-colors"
      >
        <Icon className="w-4 h-4 text-accent" />
        <span className="font-medium flex-1 text-left">{title}</span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && <div className="px-4 pb-4 space-y-2">{children}</div>}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}

function FeatureBar({ label, value, color = "bg-accent" }: { label: string; value: number | undefined; color?: string }) {
  const percent = value !== undefined ? value * 100 : 0;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground">{formatPercent(value)}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function TrackDetailsPanel({
  track,
  onClose,
  onRefetchSpotify,
  onRefetchFeatures,
  onEdit,
  className,
}: TrackDetailsPanelProps) {
  const [isRefetchingSpotify, setIsRefetchingSpotify] = useState(false);
  const [isRefetchingFeatures, setIsRefetchingFeatures] = useState(false);

  if (!track) {
    return (
      <div className={cn("w-80 bg-card border-l border-border flex flex-col", className)}>
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div className="text-muted-foreground">
            <Music className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select a track to view details</p>
          </div>
        </div>
      </div>
    );
  }

  const { details, feats } = track;
  const albumArt = details.album?.images?.[0]?.url;

  const handleRefetchSpotify = async () => {
    if (!onRefetchSpotify) return;
    setIsRefetchingSpotify(true);
    try {
      await onRefetchSpotify(track.id);
    } finally {
      setIsRefetchingSpotify(false);
    }
  };

  const handleRefetchFeatures = async () => {
    if (!onRefetchFeatures) return;
    setIsRefetchingFeatures(true);
    try {
      await onRefetchFeatures(track.id);
    } finally {
      setIsRefetchingFeatures(false);
    }
  };

  return (
    <div className={cn("w-80 bg-card border-l border-border flex flex-col", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold text-sm">Track Details</h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Track Info */}
      <div className="p-4 border-b border-border">
        <div className="flex gap-3">
          {albumArt ? (
            <img src={albumArt} alt={details.album?.name} className="w-16 h-16 rounded" />
          ) : (
            <div className="w-16 h-16 rounded bg-secondary flex items-center justify-center">
              <Music className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{details.name}</p>
            <p className="text-sm text-muted-foreground truncate">
              {details.artists?.map((a) => a.name).join(", ")}
            </p>
            <p className="text-xs text-muted-foreground truncate">{details.album?.name}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => window.open(`https://open.spotify.com/track/${track.id}`, "_blank")}
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Spotify
          </Button>
          {onEdit && (
            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => onEdit(track)}>
              <Edit2 className="w-3 h-3 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Basic Info */}
        <DetailSection title="Basic Info" icon={Disc}>
          <DetailRow label="Spotify ID" value={<code className="text-xs">{track.id}</code>} />
          <DetailRow label="Duration" value={formatDuration(details.duration_ms || 0)} />
          <DetailRow label="Popularity" value={details.popularity ?? "-"} />
          <DetailRow label="Explicit" value={details.explicit ? "Yes" : "No"} />
          <DetailRow label="ISRC" value={<code className="text-xs">{details.external_ids?.isrc || "-"}</code>} />
        </DetailSection>

        {/* Album Info */}
        <DetailSection title="Album" icon={Disc} defaultOpen={false}>
          <DetailRow label="Name" value={details.album?.name || "-"} />
          <DetailRow label="Release Date" value={formatDate(details.album?.release_date)} />
          <DetailRow label="Type" value={details.album?.album_type || "-"} />
          <DetailRow label="Total Tracks" value={details.album?.total_tracks ?? "-"} />
        </DetailSection>

        {/* Artists */}
        <DetailSection title="Artists" icon={User} defaultOpen={false}>
          {details.artists?.map((artist, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span>{artist.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => window.open(`https://open.spotify.com/artist/${artist.id}`, "_blank")}
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          )) || <p className="text-sm text-muted-foreground">No artist info</p>}
        </DetailSection>

        {/* Audio Features */}
        <DetailSection title="Audio Features" icon={Activity}>
          <FeatureBar label="Energy" value={feats?.energy} color="bg-orange-500" />
          <FeatureBar label="Danceability" value={feats?.danceability} color="bg-pink-500" />
          <FeatureBar label="Valence" value={feats?.valence} color="bg-yellow-500" />
          <FeatureBar label="Acousticness" value={feats?.acousticness} color="bg-green-500" />
          <FeatureBar label="Instrumentalness" value={feats?.instrumentalness} color="bg-blue-500" />
          <FeatureBar label="Liveness" value={feats?.liveness} color="bg-purple-500" />
          <FeatureBar label="Speechiness" value={feats?.speechiness} color="bg-cyan-500" />
        </DetailSection>

        {/* Technical */}
        <DetailSection title="Technical" icon={Zap} defaultOpen={false}>
          <DetailRow label="Tempo" value={feats?.tempo ? `${Math.round(feats.tempo)} BPM` : "-"} />
          <DetailRow label="Key" value={feats?.key ?? "-"} />
          <DetailRow label="Mode" value={feats?.mode === 1 ? "Major" : feats?.mode === 0 ? "Minor" : "-"} />
          <DetailRow label="Time Signature" value={feats?.time_signature ? `${feats.time_signature}/4` : "-"} />
          <DetailRow label="Loudness" value={feats?.loudness ? `${feats.loudness.toFixed(1)} dB` : "-"} />
        </DetailSection>

        {/* Computed Moods */}
        <DetailSection title="Computed Moods" icon={Smile} defaultOpen={false}>
          <FeatureBar label="Happiness" value={feats?.happiness} color="bg-yellow-400" />
          <FeatureBar label="Sadness" value={feats?.sadness} color="bg-blue-400" />
          <FeatureBar label="Anger" value={feats?.anger} color="bg-red-400" />
        </DetailSection>

        {/* Genres */}
        {feats?.genres && (
          <DetailSection title="Genres" icon={Radio} defaultOpen={false}>
            <div className="flex flex-wrap gap-1">
              {Array.from(feats.genres).map((genre) => (
                <span key={genre} className="px-2 py-0.5 bg-secondary text-xs rounded-full">
                  {genre}
                </span>
              ))}
            </div>
          </DetailSection>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border space-y-2">
        {onRefetchSpotify && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={handleRefetchSpotify}
            disabled={isRefetchingSpotify}
          >
            <RefreshCw className={cn("w-3 h-3 mr-2", isRefetchingSpotify && "animate-spin")} />
            {isRefetchingSpotify ? "Refetching..." : "Refetch Spotify Data"}
          </Button>
        )}
        {onRefetchFeatures && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={handleRefetchFeatures}
            disabled={isRefetchingFeatures}
          >
            <RefreshCw className={cn("w-3 h-3 mr-2", isRefetchingFeatures && "animate-spin")} />
            {isRefetchingFeatures ? "Refetching..." : "Refetch Audio Features"}
          </Button>
        )}
      </div>
    </div>
  );
}


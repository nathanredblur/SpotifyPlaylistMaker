/**
 * MELO Footer Component
 * Audio player controls and export functionality
 */

import { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Volume2,
  VolumeX,
  ExternalLink,
  Download,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Track } from "@/types/spotify";

interface FooterProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  isShuffled: boolean;
  selectedCount: number;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSeek: (progress: number) => void;
  onVolumeChange: (volume: number) => void;
  onShuffle: () => void;
  onExport: () => void;
  onOpenInSpotify: () => void;
  className?: string;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function Footer({
  currentTrack,
  isPlaying,
  progress,
  duration,
  volume,
  isShuffled,
  selectedCount,
  onPlayPause,
  onPrevious,
  onNext,
  onSeek,
  onVolumeChange,
  onShuffle,
  onExport,
  onOpenInSpotify,
  className,
}: FooterProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume);
  const progressRef = useRef<HTMLDivElement>(null);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(1, percent)) * duration);
  };

  const handleMuteToggle = () => {
    if (isMuted) {
      onVolumeChange(prevVolume);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      onVolumeChange(0);
      setIsMuted(true);
    }
  };

  const albumArt =
    currentTrack?.details.album?.images?.[0]?.url ||
    currentTrack?.details.album?.images?.[1]?.url;

  return (
    <footer
      className={cn(
        "h-footer flex items-center px-4 gap-4",
        "bg-background-secondary border-t border-border",
        "sticky bottom-0 z-40",
        className
      )}
    >
      {/* Track Info */}
      <div className="flex items-center gap-3 w-64 min-w-0">
        {albumArt ? (
          <img
            src={albumArt}
            alt={currentTrack?.details.name}
            className="w-14 h-14 rounded-md object-cover"
          />
        ) : (
          <div className="w-14 h-14 rounded-md bg-background-tertiary flex items-center justify-center">
            <Heart className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
        {currentTrack && (
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {currentTrack.details.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {currentTrack.details.artists?.map((a) => a.name).join(", ")}
            </p>
          </div>
        )}
      </div>

      {/* Player Controls */}
      <div className="flex-1 flex flex-col items-center gap-1 max-w-2xl">
        {/* Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={onShuffle}
            className={cn(
              "p-2 rounded-full transition-colors",
              isShuffled
                ? "text-accent hover:text-accent-hover"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Shuffle"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={onPrevious}
            className="p-2 rounded-full text-foreground hover:text-accent transition-colors"
            title="Previous"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={onPlayPause}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              "bg-foreground text-background hover:scale-105 transition-transform"
            )}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>

          <button
            onClick={onNext}
            className="p-2 rounded-full text-foreground hover:text-accent transition-colors"
            title="Next"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenInSpotify}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
            title="Open in Spotify"
            disabled={!currentTrack}
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-10 text-right">
            {formatTime(progress)}
          </span>
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="flex-1 h-1 bg-background-tertiary rounded-full cursor-pointer group"
          >
            <div
              className="h-full bg-foreground rounded-full relative group-hover:bg-accent transition-colors"
              style={{
                width: `${duration > 0 ? (progress / duration) * 100 : 0}%`,
              }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <span className="text-xs text-muted-foreground w-10">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 w-64 justify-end">
        {/* Export Button */}
        <button
          onClick={onExport}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm",
            "transition-colors",
            selectedCount > 0
              ? "bg-accent text-accent-foreground hover:bg-accent-hover"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          )}
          title={
            selectedCount > 0
              ? `Export ${selectedCount} tracks`
              : "Select tracks to export"
          }
        >
          <Download className="w-4 h-4" />
          {selectedCount > 0 && <span>{selectedCount}</span>}
        </button>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleMuteToggle}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              const newVolume = parseFloat(e.target.value);
              onVolumeChange(newVolume);
              if (newVolume > 0) setIsMuted(false);
            }}
            className="w-20 h-1 bg-background-tertiary rounded-full appearance-none cursor-pointer accent-accent"
          />
        </div>
      </div>
    </footer>
  );
}

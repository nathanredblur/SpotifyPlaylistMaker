/**
 * Stats Card Widget
 * Displays basic statistics about the gallery
 */

import { Music, Users, Disc3, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  totalTracks: number;
  totalArtists: number;
  totalAlbums: number;
  totalDurationMs: number;
  className?: string;
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function StatsCard({
  totalTracks,
  totalArtists,
  totalAlbums,
  totalDurationMs,
  className,
}: StatsCardProps) {
  const stats = [
    { icon: Music, label: "Tracks", value: totalTracks.toLocaleString() },
    { icon: Users, label: "Artists", value: totalArtists.toLocaleString() },
    { icon: Disc3, label: "Albums", value: totalAlbums.toLocaleString() },
    { icon: Clock, label: "Duration", value: formatDuration(totalDurationMs) },
  ];

  return (
    <div className={cn("widget-card", className)}>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Statistics
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="flex items-center gap-2 p-2 rounded-md bg-background-tertiary"
          >
            <Icon className="w-4 h-4 text-accent" />
            <div>
              <p className="text-sm font-semibold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

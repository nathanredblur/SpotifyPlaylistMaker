/**
 * Top Artists Widget
 * Shows artists with the most tracks in the gallery
 */

import { cn } from "@/lib/utils";

interface ArtistItem {
  name: string;
  count: number;
}

interface TopArtistsWidgetProps {
  artists: ArtistItem[];
  maxItems?: number;
  className?: string;
}

export function TopArtistsWidget({
  artists,
  maxItems = 5,
  className,
}: TopArtistsWidgetProps) {
  const topArtists = artists.slice(0, maxItems);

  return (
    <div className={cn("widget-card", className)}>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Top Artists
      </h3>
      <div className="space-y-2">
        {topArtists.map((artist, index) => (
          <div
            key={artist.name}
            className="flex items-center gap-3 p-2 rounded-md hover:bg-background-tertiary transition-colors"
          >
            {/* Rank */}
            <span
              className={cn(
                "w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold",
                index === 0
                  ? "bg-accent text-accent-foreground"
                  : "bg-background-tertiary text-muted-foreground"
              )}
            >
              {index + 1}
            </span>

            {/* Artist Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {artist.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {artist.count} track{artist.count !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


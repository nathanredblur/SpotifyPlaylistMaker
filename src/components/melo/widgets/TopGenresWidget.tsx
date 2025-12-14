/**
 * Top Genres Widget
 * Shows the distribution of genres in the gallery
 */

import { cn } from "@/lib/utils";

interface GenreItem {
  name: string;
  count: number;
}

interface TopGenresWidgetProps {
  genres: GenreItem[];
  maxItems?: number;
  className?: string;
}

export function TopGenresWidget({
  genres,
  maxItems = 5,
  className,
}: TopGenresWidgetProps) {
  const topGenres = genres.slice(0, maxItems);
  const maxCount = topGenres[0]?.count || 1;

  return (
    <div className={cn("widget-card", className)}>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Top Genres
      </h3>
      <div className="space-y-2">
        {topGenres.map((genre, index) => (
          <div key={genre.name} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground truncate">{genre.name}</span>
              <span className="text-muted-foreground text-xs ml-2">
                {genre.count}
              </span>
            </div>
            <div className="h-1.5 bg-background-tertiary rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(genre.count / maxCount) * 100}%`,
                  backgroundColor:
                    index === 0
                      ? "var(--accent)"
                      : `rgba(249, 115, 22, ${1 - index * 0.15})`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

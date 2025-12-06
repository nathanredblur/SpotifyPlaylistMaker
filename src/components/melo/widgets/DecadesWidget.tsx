/**
 * Decades Widget
 * Shows the distribution of tracks by decade
 */

import { cn } from "@/lib/utils";

interface DecadeItem {
  decade: string;
  count: number;
}

interface DecadesWidgetProps {
  decades: DecadeItem[];
  className?: string;
}

export function DecadesWidget({ decades, className }: DecadesWidgetProps) {
  // Sort decades by name (most recent first)
  const sortedDecades = [...decades].sort((a, b) =>
    b.decade.localeCompare(a.decade)
  );

  const maxCount = Math.max(...sortedDecades.map((d) => d.count), 1);

  return (
    <div className={cn("widget-card", className)}>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        By Decade
      </h3>
      <div className="space-y-2">
        {sortedDecades.slice(0, 6).map((item) => (
          <div key={item.decade} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-12 flex-shrink-0">
              {item.decade}
            </span>
            <div className="flex-1 h-2 bg-background-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500"
                style={{
                  width: `${(item.count / maxCount) * 100}%`,
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-8 text-right">
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}


/**
 * Global Search Component
 * Search input with icon for filtering tracks
 */

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface GlobalSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function GlobalSearch({
  value,
  onChange,
  placeholder = "Search by artists, songs or albums",
  className,
}: GlobalSearchProps) {
  return (
    <div className={cn("relative flex-1 max-w-xl", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full h-10 pl-10 pr-4 rounded-full",
          "bg-background-secondary border border-border",
          "text-sm text-foreground placeholder:text-muted-foreground",
          "focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent",
          "transition-all duration-200"
        )}
      />
    </div>
  );
}


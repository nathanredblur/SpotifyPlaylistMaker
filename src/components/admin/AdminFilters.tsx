/**
 * Admin Filters Component
 * Extended filters for admin including genre selection
 */

import { useState, useMemo, useCallback } from "react";
import { Tag, X, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

// ============================================================================
// Types
// ============================================================================

interface AdminFiltersProps {
  availableGenres: string[];
  selectedGenres: Set<string>;
  onGenresChange: (genres: Set<string>) => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function AdminFilters({
  availableGenres,
  selectedGenres,
  onGenresChange,
  className,
}: AdminFiltersProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGenres = useMemo(() => {
    if (!searchQuery.trim()) return availableGenres;
    const query = searchQuery.toLowerCase();
    return availableGenres.filter((genre) =>
      genre.toLowerCase().includes(query)
    );
  }, [availableGenres, searchQuery]);

  const handleToggleGenre = useCallback(
    (genre: string) => {
      const newGenres = new Set(selectedGenres);
      if (newGenres.has(genre)) {
        newGenres.delete(genre);
      } else {
        newGenres.add(genre);
      }
      onGenresChange(newGenres);
    },
    [selectedGenres, onGenresChange]
  );

  const handleClearAll = useCallback(() => {
    onGenresChange(new Set());
  }, [onGenresChange]);

  const handleSelectAll = useCallback(() => {
    onGenresChange(new Set(filteredGenres));
  }, [filteredGenres, onGenresChange]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 text-xs gap-1.5",
              selectedGenres.size > 0
                ? "text-accent"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Genres</span>
            {selectedGenres.size > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground text-[10px] font-medium">
                {selectedGenres.size}
              </span>
            )}
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-64 p-0">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search genres..."
                className="h-7 pl-7 text-xs"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-border bg-secondary/30">
            <span className="text-[10px] text-muted-foreground">
              {filteredGenres.length} genres
            </span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="h-5 px-2 text-[10px]"
              >
                All
              </Button>
              {selectedGenres.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-5 px-2 text-[10px]"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Genre List */}
          <ScrollArea className="h-64">
            <div className="p-2 space-y-1">
              {filteredGenres.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No genres found
                </p>
              ) : (
                filteredGenres.map((genre) => (
                  <div
                    key={genre}
                    className="flex items-center gap-2 px-2 py-1 rounded hover:bg-secondary/50 cursor-pointer"
                    onClick={() => handleToggleGenre(genre)}
                  >
                    <Checkbox
                      checked={selectedGenres.has(genre)}
                      onCheckedChange={() => handleToggleGenre(genre)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="text-xs truncate flex-1">{genre}</span>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Selected Genre Pills */}
      {selectedGenres.size > 0 && selectedGenres.size <= 5 && (
        <div className="flex items-center gap-1 flex-wrap">
          {Array.from(selectedGenres).map((genre) => (
            <div
              key={genre}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs"
            >
              <span className="truncate max-w-24">{genre}</span>
              <button
                onClick={() => handleToggleGenre(genre)}
                className="p-0.5 rounded-full hover:bg-accent/20 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


/**
 * Sort Controls Component
 * Dropdown with basic and advanced sorting options for tracks
 */

import { useState } from "react";
import {
  ArrowUpDown,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

// ============================================================================
// Types
// ============================================================================

export type SortField =
  // Basic
  | "default"
  | "name"
  | "artist"
  | "album"
  | "popularity"
  | "duration"
  // Advanced - Audio Features
  | "tempo"
  | "energy"
  | "danceability"
  | "valence"
  | "acousticness"
  | "instrumentalness"
  | "liveness"
  | "loudness"
  | "speechiness"
  // Computed
  | "happiness"
  | "sadness"
  | "anger";

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

interface SortOption {
  field: SortField;
  label: string;
  defaultDirection: SortDirection;
}

// ============================================================================
// Constants
// ============================================================================

const BASIC_SORT_OPTIONS: SortOption[] = [
  { field: "default", label: "Default", defaultDirection: "asc" },
  { field: "name", label: "Name", defaultDirection: "asc" },
  { field: "artist", label: "Artist", defaultDirection: "asc" },
  { field: "album", label: "Album", defaultDirection: "asc" },
  { field: "popularity", label: "Popularity", defaultDirection: "desc" },
  { field: "duration", label: "Duration", defaultDirection: "desc" },
];

const ADVANCED_SORT_OPTIONS: SortOption[] = [
  { field: "tempo", label: "Tempo (BPM)", defaultDirection: "desc" },
  { field: "energy", label: "Energy", defaultDirection: "desc" },
  { field: "danceability", label: "Danceability", defaultDirection: "desc" },
  { field: "valence", label: "Valence (Positivity)", defaultDirection: "desc" },
  { field: "acousticness", label: "Acousticness", defaultDirection: "desc" },
  {
    field: "instrumentalness",
    label: "Instrumentalness",
    defaultDirection: "desc",
  },
  { field: "liveness", label: "Liveness", defaultDirection: "desc" },
  { field: "loudness", label: "Loudness", defaultDirection: "desc" },
  { field: "speechiness", label: "Speechiness", defaultDirection: "desc" },
  { field: "happiness", label: "Happiness", defaultDirection: "desc" },
  { field: "sadness", label: "Sadness", defaultDirection: "desc" },
  { field: "anger", label: "Anger", defaultDirection: "desc" },
];

const SORT_LABELS: Record<SortField, string> = {
  default: "Default",
  name: "Name",
  artist: "Artist",
  album: "Album",
  popularity: "Popularity",
  duration: "Duration",
  tempo: "Tempo",
  energy: "Energy",
  danceability: "Danceability",
  valence: "Valence",
  acousticness: "Acousticness",
  instrumentalness: "Instrumentalness",
  liveness: "Liveness",
  loudness: "Loudness",
  speechiness: "Speechiness",
  happiness: "Happiness",
  sadness: "Sadness",
  anger: "Anger",
};

// ============================================================================
// Component
// ============================================================================

interface SortControlsProps {
  sort: SortConfig;
  onSortChange: (sort: SortConfig) => void;
  className?: string;
}

export function SortControls({
  sort,
  onSortChange,
  className,
}: SortControlsProps) {
  const [open, setOpen] = useState(false);

  const handleSortSelect = (option: SortOption) => {
    if (sort.field === option.field) {
      // Toggle direction if same field
      onSortChange({
        field: option.field,
        direction: sort.direction === "asc" ? "desc" : "asc",
      });
    } else {
      // Use default direction for new field
      onSortChange({
        field: option.field,
        direction: option.defaultDirection,
      });
    }
    setOpen(false);
  };

  const toggleDirection = () => {
    onSortChange({
      field: sort.field,
      direction: sort.direction === "asc" ? "desc" : "asc",
    });
  };

  const isAdvanced = ADVANCED_SORT_OPTIONS.some((o) => o.field === sort.field);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{SORT_LABELS[sort.field]}</span>
            {isAdvanced && <Sparkles className="w-3 h-3 text-accent" />}
            <ChevronDown className="w-3 h-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-48">
          {/* Basic Options */}
          {BASIC_SORT_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.field}
              onClick={() => handleSortSelect(option)}
              className={cn(
                "text-xs",
                sort.field === option.field && "bg-accent/10 text-accent"
              )}
            >
              {option.label}
              {sort.field === option.field && (
                <span className="ml-auto">
                  {sort.direction === "asc" ? (
                    <ArrowUp className="w-3 h-3" />
                  ) : (
                    <ArrowDown className="w-3 h-3" />
                  )}
                </span>
              )}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          {/* Advanced Options */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="text-xs">
              <Sparkles className="w-3.5 h-3.5 mr-2 text-accent" />
              Advanced
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-44">
              {ADVANCED_SORT_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.field}
                  onClick={() => handleSortSelect(option)}
                  className={cn(
                    "text-xs",
                    sort.field === option.field && "bg-accent/10 text-accent"
                  )}
                >
                  {option.label}
                  {sort.field === option.field && (
                    <span className="ml-auto">
                      {sort.direction === "asc" ? (
                        <ArrowUp className="w-3 h-3" />
                      ) : (
                        <ArrowDown className="w-3 h-3" />
                      )}
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Direction Toggle Button */}
      {sort.field !== "default" && (
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleDirection}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          title={sort.direction === "asc" ? "Ascending" : "Descending"}
        >
          {sort.direction === "asc" ? (
            <ArrowUp className="w-3.5 h-3.5" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5" />
          )}
        </Button>
      )}
    </div>
  );
}

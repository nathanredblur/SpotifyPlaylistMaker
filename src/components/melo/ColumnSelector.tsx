/**
 * Column Selector Component
 * Dropdown to show/hide columns in the track list
 */

import { useState, useEffect, useCallback } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Columns3, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export type ColumnId =
  | "album"
  | "popularity"
  | "genres"
  | "decade"
  | "energy"
  | "danceability"
  | "tempo"
  | "valence"
  | "acousticness";

export interface ColumnConfig {
  id: ColumnId;
  label: string;
  width: string; // Tailwind width class
  defaultVisible: boolean;
}

export type VisibleColumns = Set<ColumnId>;

// ============================================================================
// Constants
// ============================================================================

export const AVAILABLE_COLUMNS: ColumnConfig[] = [
  { id: "album", label: "Album", width: "w-40", defaultVisible: true },
  {
    id: "popularity",
    label: "Popularity",
    width: "w-20",
    defaultVisible: false,
  },
  { id: "genres", label: "Genres", width: "w-32", defaultVisible: false },
  { id: "decade", label: "Decade", width: "w-16", defaultVisible: false },
  { id: "energy", label: "Energy", width: "w-16", defaultVisible: false },
  { id: "danceability", label: "Dance", width: "w-16", defaultVisible: false },
  { id: "tempo", label: "BPM", width: "w-16", defaultVisible: false },
  { id: "valence", label: "Mood", width: "w-16", defaultVisible: false },
  {
    id: "acousticness",
    label: "Acoustic",
    width: "w-16",
    defaultVisible: false,
  },
];

const STORAGE_KEY = "melo_visible_columns";

// ============================================================================
// Helper Functions
// ============================================================================

function getDefaultColumns(): VisibleColumns {
  return new Set(
    AVAILABLE_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id)
  );
}

function loadColumnsFromStorage(): VisibleColumns {
  if (typeof localStorage === "undefined") return getDefaultColumns();

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return getDefaultColumns();

    const parsed = JSON.parse(stored) as ColumnId[];
    return new Set(parsed);
  } catch {
    return getDefaultColumns();
  }
}

function saveColumnsToStorage(columns: VisibleColumns): void {
  if (typeof localStorage === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(columns)));
  } catch {
    // Storage full or disabled, ignore
  }
}

// ============================================================================
// Hook
// ============================================================================

export function useColumnVisibility() {
  const [visibleColumns, setVisibleColumns] =
    useState<VisibleColumns>(getDefaultColumns);

  // Load from localStorage on mount
  useEffect(() => {
    setVisibleColumns(loadColumnsFromStorage());
  }, []);

  const toggleColumn = useCallback((columnId: ColumnId) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      saveColumnsToStorage(next);
      return next;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    const defaults = getDefaultColumns();
    setVisibleColumns(defaults);
    saveColumnsToStorage(defaults);
  }, []);

  return { visibleColumns, toggleColumn, resetToDefaults };
}

// ============================================================================
// Component
// ============================================================================

interface ColumnSelectorProps {
  visibleColumns: VisibleColumns;
  onToggleColumn: (columnId: ColumnId) => void;
  onReset: () => void;
}

export function ColumnSelector({
  visibleColumns,
  onToggleColumn,
  onReset,
}: ColumnSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Columns3 className="w-4 h-4" />
          <span className="hidden sm:inline">Columns</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="end">
        <div className="space-y-1">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Show Columns
          </div>

          {AVAILABLE_COLUMNS.map((column) => {
            const isVisible = visibleColumns.has(column.id);
            return (
              <button
                key={column.id}
                onClick={() => onToggleColumn(column.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded",
                  "hover:bg-accent/10 transition-colors",
                  isVisible ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center",
                    isVisible
                      ? "bg-accent border-accent text-accent-foreground"
                      : "border-border"
                  )}
                >
                  {isVisible && <Check className="w-3 h-3" />}
                </div>
                {column.label}
              </button>
            );
          })}

          <div className="border-t border-border mt-2 pt-2">
            <button
              onClick={onReset}
              className="w-full px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded hover:bg-accent/10 transition-colors text-left"
            >
              Reset to defaults
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

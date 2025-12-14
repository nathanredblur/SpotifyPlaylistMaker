/**
 * Admin Column Selector Component
 * Admin-specific columns for track management
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

export type AdminColumnId =
  // Standard columns
  | "album"
  | "popularity"
  | "genres"
  | "decade"
  | "energy"
  | "danceability"
  | "tempo"
  | "valence"
  | "acousticness"
  // Admin-specific columns
  | "spotifyId"
  | "isrc"
  | "hasFeatures"
  | "hasSoundcharts"
  | "explicit"
  | "releaseDate"
  | "addedAt"
  | "loudness"
  | "instrumentalness"
  | "liveness"
  | "speechiness";

export interface AdminColumnConfig {
  id: AdminColumnId;
  label: string;
  width: string;
  defaultVisible: boolean;
  adminOnly?: boolean;
}

export type AdminVisibleColumns = Set<AdminColumnId>;

// ============================================================================
// Constants
// ============================================================================

export const ADMIN_COLUMNS: AdminColumnConfig[] = [
  // Admin-specific columns (shown first)
  { id: "spotifyId", label: "Spotify ID", width: "w-28", defaultVisible: true, adminOnly: true },
  { id: "isrc", label: "ISRC", width: "w-28", defaultVisible: true, adminOnly: true },
  { id: "hasFeatures", label: "Features", width: "w-16", defaultVisible: true, adminOnly: true },
  { id: "hasSoundcharts", label: "SC Data", width: "w-16", defaultVisible: false, adminOnly: true },
  
  // Standard columns
  { id: "album", label: "Album", width: "w-40", defaultVisible: false },
  { id: "popularity", label: "Pop", width: "w-12", defaultVisible: true },
  { id: "decade", label: "Decade", width: "w-16", defaultVisible: false },
  { id: "releaseDate", label: "Released", width: "w-24", defaultVisible: false },
  { id: "explicit", label: "Explicit", width: "w-14", defaultVisible: false },
  
  // Audio features
  { id: "energy", label: "Energy", width: "w-14", defaultVisible: false },
  { id: "danceability", label: "Dance", width: "w-14", defaultVisible: false },
  { id: "tempo", label: "BPM", width: "w-14", defaultVisible: true },
  { id: "valence", label: "Mood", width: "w-14", defaultVisible: false },
  { id: "acousticness", label: "Acoustic", width: "w-14", defaultVisible: false },
  { id: "instrumentalness", label: "Instr.", width: "w-14", defaultVisible: false },
  { id: "liveness", label: "Live", width: "w-14", defaultVisible: false },
  { id: "speechiness", label: "Speech", width: "w-14", defaultVisible: false },
  { id: "loudness", label: "Loud", width: "w-14", defaultVisible: false },
];

const STORAGE_KEY = "admin_visible_columns";

// ============================================================================
// Helper Functions
// ============================================================================

function getDefaultColumns(): AdminVisibleColumns {
  return new Set(
    ADMIN_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id)
  );
}

function loadColumnsFromStorage(): AdminVisibleColumns {
  if (typeof localStorage === "undefined") return getDefaultColumns();

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return getDefaultColumns();

    const parsed = JSON.parse(stored) as AdminColumnId[];
    return new Set(parsed);
  } catch {
    return getDefaultColumns();
  }
}

function saveColumnsToStorage(columns: AdminVisibleColumns): void {
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

export function useAdminColumnVisibility() {
  const [visibleColumns, setVisibleColumns] = useState<AdminVisibleColumns>(
    getDefaultColumns
  );

  useEffect(() => {
    setVisibleColumns(loadColumnsFromStorage());
  }, []);

  const toggleColumn = useCallback((columnId: AdminColumnId) => {
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

interface AdminColumnSelectorProps {
  visibleColumns: AdminVisibleColumns;
  onToggleColumn: (columnId: AdminColumnId) => void;
  onReset: () => void;
}

export function AdminColumnSelector({
  visibleColumns,
  onToggleColumn,
  onReset,
}: AdminColumnSelectorProps) {
  const [open, setOpen] = useState(false);

  const adminColumns = ADMIN_COLUMNS.filter((c) => c.adminOnly);
  const standardColumns = ADMIN_COLUMNS.filter((c) => !c.adminOnly);

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
      <PopoverContent className="w-56 p-2" align="end">
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {/* Admin Columns */}
          <div className="px-2 py-1.5 text-xs font-semibold text-accent uppercase tracking-wider">
            Admin Columns
          </div>
          {adminColumns.map((column) => {
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

          {/* Standard Columns */}
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-2">
            Standard Columns
          </div>
          {standardColumns.map((column) => {
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


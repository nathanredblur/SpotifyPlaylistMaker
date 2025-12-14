/**
 * URL State Hook
 * Syncs filter, sort, and category state with URL search params
 * Enables shareable links to specific views
 *
 * URL Format (compact and readable):
 * - ?cat=genres&sub=Rock - Category filter
 * - ?sort=tempo&dir=desc - Sorting
 * - ?q=love - Search query
 * - ?energy=0.5-1&tempo=120-140 - Advanced filters (key=min-max)
 */

import { useCallback, useMemo } from "react";
import type { SortConfig, SortField, SortDirection } from "@/components/melo/SortControls";
import type { AdvancedFiltersConfig } from "@/components/melo/AdvancedFilters";

// ============================================================================
// Types
// ============================================================================

type FilterType = "all" | "genres" | "moods" | "decades" | "popularity" | "duration";

interface Filter {
  type: FilterType;
  value?: string;
}

interface UrlState {
  filter: Filter;
  sort: SortConfig;
  advancedFilters: AdvancedFiltersConfig;
  search: string;
}

interface UseUrlStateResult {
  /** Current state parsed from URL */
  urlState: UrlState;
  /** Update URL with new state */
  updateUrl: (state: Partial<UrlState>) => void;
}

// ============================================================================
// URL Parameter Names
// ============================================================================

const PARAM_FILTER_TYPE = "cat";
const PARAM_FILTER_VALUE = "sub";
const PARAM_SORT_FIELD = "sort";
const PARAM_SORT_DIR = "dir";
const PARAM_SEARCH = "q";

// List of known advanced filter keys (used to identify filter params in URL)
const ADVANCED_FILTER_KEYS = new Set([
  "energy",
  "danceability",
  "valence",
  "acousticness",
  "instrumentalness",
  "liveness",
  "speechiness",
  "tempo",
  "loudness",
  "popularity",
  "duration",
  "happiness",
  "sadness",
  "anger",
]);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse a range string like "0.5-1" into {min, max}
 */
function parseRangeString(value: string): { min: number; max: number } | null {
  const parts = value.split("-");
  if (parts.length !== 2) return null;

  const min = parseFloat(parts[0]);
  const max = parseFloat(parts[1]);

  if (isNaN(min) || isNaN(max)) return null;
  return { min, max };
}

/**
 * Format a range object into a compact string "min-max"
 */
function formatRange(range: { min: number; max: number }): string {
  // Round to 2 decimal places to keep URL clean
  const minStr = Number.isInteger(range.min) ? range.min.toString() : range.min.toFixed(2).replace(/\.?0+$/, "");
  const maxStr = Number.isInteger(range.max) ? range.max.toString() : range.max.toFixed(2).replace(/\.?0+$/, "");
  return `${minStr}-${maxStr}`;
}

function parseUrlState(): UrlState {
  if (typeof window === "undefined") {
    return getDefaultState();
  }

  const params = new URLSearchParams(window.location.search);

  // Parse filter
  const filterType = (params.get(PARAM_FILTER_TYPE) || "all") as FilterType;
  const filterValue = params.get(PARAM_FILTER_VALUE) || undefined;

  // Parse sort
  const sortField = (params.get(PARAM_SORT_FIELD) || "default") as SortField;
  const sortDirection = (params.get(PARAM_SORT_DIR) || "asc") as SortDirection;

  // Parse search
  const search = params.get(PARAM_SEARCH) || "";

  // Parse advanced filters (each is its own param like energy=0.5-1)
  const advancedFilters: AdvancedFiltersConfig = {};
  for (const key of ADVANCED_FILTER_KEYS) {
    const value = params.get(key);
    if (value) {
      const range = parseRangeString(value);
      if (range) {
        advancedFilters[key] = range;
      }
    }
  }

  return {
    filter: { type: filterType, value: filterValue },
    sort: { field: sortField, direction: sortDirection },
    advancedFilters,
    search,
  };
}

function getDefaultState(): UrlState {
  return {
    filter: { type: "all" },
    sort: { field: "default", direction: "asc" },
    advancedFilters: {},
    search: "",
  };
}

function buildSearchParams(state: UrlState): URLSearchParams {
  const params = new URLSearchParams();

  // Filter
  if (state.filter.type !== "all") {
    params.set(PARAM_FILTER_TYPE, state.filter.type);
    if (state.filter.value) {
      params.set(PARAM_FILTER_VALUE, state.filter.value);
    }
  }

  // Sort
  if (state.sort.field !== "default") {
    params.set(PARAM_SORT_FIELD, state.sort.field);
    if (state.sort.direction !== "asc") {
      params.set(PARAM_SORT_DIR, state.sort.direction);
    }
  }

  // Search
  if (state.search.trim()) {
    params.set(PARAM_SEARCH, state.search.trim());
  }

  // Advanced filters (each as separate param: energy=0.5-1)
  for (const [key, range] of Object.entries(state.advancedFilters)) {
    if (range) {
      params.set(key, formatRange(range));
    }
  }

  return params;
}

// ============================================================================
// Hook
// ============================================================================

export function useUrlState(): UseUrlStateResult {
  // Parse initial state from URL
  const urlState = useMemo(() => parseUrlState(), []);

  // Update URL when state changes
  const updateUrl = useCallback((newState: Partial<UrlState>) => {
    if (typeof window === "undefined") return;

    // Get current state from URL
    const currentState = parseUrlState();

    // Merge with new state
    const mergedState: UrlState = {
      ...currentState,
      ...newState,
    };

    // Build new URL
    const params = buildSearchParams(mergedState);
    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    // Update URL without reload
    window.history.replaceState(null, "", newUrl);
  }, []);

  return { urlState, updateUrl };
}

// ============================================================================
// Export Types
// ============================================================================

export type { UrlState, Filter, FilterType };


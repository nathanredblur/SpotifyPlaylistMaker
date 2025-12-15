/**
 * Advanced Filters Component
 * Panel with range sliders for filtering tracks by audio features
 */

import { useState, useCallback, useEffect } from "react";
import { SlidersHorizontal, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ============================================================================
// Types
// ============================================================================

export interface FilterRange {
  min: number;
  max: number;
}

export interface AdvancedFiltersConfig {
  // Audio Features (0-1 scale)
  energy?: FilterRange;
  danceability?: FilterRange;
  valence?: FilterRange;
  acousticness?: FilterRange;
  instrumentalness?: FilterRange;
  liveness?: FilterRange;
  speechiness?: FilterRange;
  // Special ranges
  tempo?: FilterRange; // BPM: 0-250
  loudness?: FilterRange; // dB: -60 to 0
  popularity?: FilterRange; // 0-100
  duration?: FilterRange; // ms: 0 to 600000 (10 min)
  // Discrete filters
  mode?: FilterRange; // 0 = minor, 1 = major (use min=max for exact match)
  key?: FilterRange; // 0-11 pitch class (use min=max for exact match)
}

interface FilterDefinition {
  key: keyof AdvancedFiltersConfig;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  isDiscrete?: boolean; // For filters like mode (major/minor) or key
  discreteOptions?: { value: number; label: string }[]; // Options for discrete filters with many choices
}

// ============================================================================
// Constants
// ============================================================================

// Musical keys for display (must be defined before FILTER_DEFINITIONS)
const MUSICAL_KEYS_SHORT = [
  "C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"
] as const;

const FILTER_DEFINITIONS: FilterDefinition[] = [
  {
    key: "energy",
    label: "Energy",
    min: 0,
    max: 1,
    step: 0.01,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: "danceability",
    label: "Danceability",
    min: 0,
    max: 1,
    step: 0.01,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: "valence",
    label: "Valence (Mood)",
    min: 0,
    max: 1,
    step: 0.01,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: "acousticness",
    label: "Acousticness",
    min: 0,
    max: 1,
    step: 0.01,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: "instrumentalness",
    label: "Instrumentalness",
    min: 0,
    max: 1,
    step: 0.01,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: "liveness",
    label: "Liveness",
    min: 0,
    max: 1,
    step: 0.01,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: "speechiness",
    label: "Speechiness",
    min: 0,
    max: 1,
    step: 0.01,
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: "tempo",
    label: "Tempo (BPM)",
    min: 0,
    max: 250,
    step: 1,
    format: (v) => `${Math.round(v)}`,
  },
  {
    key: "loudness",
    label: "Loudness",
    min: -60,
    max: 0,
    step: 1,
    format: (v) => `${Math.round(v)} dB`,
  },
  {
    key: "popularity",
    label: "Popularity",
    min: 0,
    max: 100,
    step: 1,
    format: (v) => `${Math.round(v)}`,
  },
  {
    key: "duration",
    label: "Duration",
    min: 0,
    max: 600000,
    step: 1000,
    format: (v) => {
      const minutes = Math.floor(v / 60000);
      const seconds = Math.floor((v % 60000) / 1000);
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    },
  },
  {
    key: "mode",
    label: "Mode",
    min: 0,
    max: 1,
    step: 1,
    format: (v) => (v === 1 ? "Major" : "Minor"),
    isDiscrete: true,
  },
  {
    key: "key",
    label: "Key",
    min: 0,
    max: 11,
    step: 1,
    format: (v) => MUSICAL_KEYS_SHORT[v] || "-",
    isDiscrete: true,
    discreteOptions: MUSICAL_KEYS_SHORT.map((name, i) => ({ value: i, label: name })),
  },
];

const DEFAULT_FILTERS: AdvancedFiltersConfig = {};

// ============================================================================
// Component
// ============================================================================

interface AdvancedFiltersProps {
  filters: AdvancedFiltersConfig;
  onFiltersChange: (filters: AdvancedFiltersConfig) => void;
  className?: string;
}

export function AdvancedFilters({
  filters,
  onFiltersChange,
  className,
}: AdvancedFiltersProps) {
  const [open, setOpen] = useState(false);

  const activeFilterCount = Object.keys(filters).length;

  const handleRangeChange = useCallback(
    (key: keyof AdvancedFiltersConfig, values: number[]) => {
      const def = FILTER_DEFINITIONS.find((d) => d.key === key)!;
      const [min, max] = values;

      // If range covers the entire spectrum, remove the filter
      if (min <= def.min && max >= def.max) {
        const newFilters = { ...filters };
        delete newFilters[key];
        onFiltersChange(newFilters);
      } else {
        onFiltersChange({
          ...filters,
          [key]: { min, max },
        });
      }
    },
    [filters, onFiltersChange]
  );

  const handleRemoveFilter = useCallback(
    (key: keyof AdvancedFiltersConfig) => {
      const newFilters = { ...filters };
      delete newFilters[key];
      onFiltersChange(newFilters);
    },
    [filters, onFiltersChange]
  );

  const handleResetAll = useCallback(() => {
    onFiltersChange(DEFAULT_FILTERS);
  }, [onFiltersChange]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 text-xs gap-1.5",
              activeFilterCount > 0
                ? "text-accent"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground text-[10px] font-medium">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-80 p-0">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-sm font-medium">Advanced Filters</span>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetAll}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            )}
          </div>

          {/* Filter Sliders */}
          <div className="max-h-80 overflow-y-auto p-3 space-y-4">
            {FILTER_DEFINITIONS.map((def) => {
              const currentValue = filters[def.key];
              const isActive = currentValue !== undefined;

              return (
                <FilterSlider
                  key={def.key}
                  definition={def}
                  value={currentValue}
                  isActive={isActive}
                  onChange={(values) => handleRangeChange(def.key, values)}
                  onRemove={() => handleRemoveFilter(def.key)}
                />
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filter Pills */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {Object.entries(filters).map(([key, range]) => {
            const def = FILTER_DEFINITIONS.find((d) => d.key === key)!;
            if (!range) return null;

            return (
              <FilterPill
                key={key}
                label={def.label}
                value={`${def.format(range.min)} - ${def.format(range.max)}`}
                onRemove={() =>
                  handleRemoveFilter(key as keyof AdvancedFiltersConfig)
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface FilterSliderProps {
  definition: FilterDefinition;
  value?: FilterRange;
  isActive: boolean;
  onChange: (values: number[]) => void;
  onRemove: () => void;
}

function FilterSlider({
  definition,
  value,
  isActive,
  onChange,
}: FilterSliderProps) {
  const currentMin = value?.min ?? definition.min;
  const currentMax = value?.max ?? definition.max;

  // Local state for text inputs
  const [minInput, setMinInput] = useState(definition.format(currentMin));
  const [maxInput, setMaxInput] = useState(definition.format(currentMax));

  // Update text inputs when value changes
  useEffect(() => {
    setMinInput(definition.format(currentMin));
    setMaxInput(definition.format(currentMax));
  }, [currentMin, currentMax, definition]);

  const parseInputValue = (input: string): number => {
    // Handle percentage format
    if (definition.max === 1 && input.endsWith("%")) {
      return parseFloat(input) / 100;
    }
    // Handle duration format (mm:ss)
    if (definition.key === "duration" && input.includes(":")) {
      const parts = input.split(":");
      if (parts.length === 2) {
        const mins = parseInt(parts[0]) || 0;
        const secs = parseInt(parts[1]) || 0;
        return mins * 60000 + secs * 1000;
      }
    }
    // Handle dB format
    if (input.endsWith(" dB")) {
      return parseFloat(input);
    }
    return parseFloat(input);
  };

  const handleMinInputBlur = () => {
    const parsed = parseInputValue(minInput);
    if (!isNaN(parsed)) {
      const clamped = Math.max(definition.min, Math.min(currentMax, parsed));
      onChange([clamped, currentMax]);
    } else {
      setMinInput(definition.format(currentMin));
    }
  };

  const handleMaxInputBlur = () => {
    const parsed = parseInputValue(maxInput);
    if (!isNaN(parsed)) {
      const clamped = Math.max(currentMin, Math.min(definition.max, parsed));
      onChange([currentMin, clamped]);
    } else {
      setMaxInput(definition.format(currentMax));
    }
  };

  // Discrete filter with many options (like key with 12 values)
  if (definition.isDiscrete && definition.discreteOptions) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "text-xs font-medium",
              isActive ? "text-accent" : "text-muted-foreground"
            )}
          >
            {definition.label}
          </span>
          {isActive && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1 text-xs"
              onClick={() => onChange([definition.min, definition.max])}
            >
              Clear
            </Button>
          )}
        </div>
        <div className="grid grid-cols-6 gap-1">
          {definition.discreteOptions.map((opt) => (
            <Button
              key={opt.value}
              variant={currentMin === opt.value && currentMax === opt.value ? "default" : "outline"}
              size="sm"
              className="h-6 text-[10px] px-1"
              onClick={() => onChange([opt.value, opt.value])}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  // Simple discrete filter (like mode: major/minor)
  if (definition.isDiscrete) {
    return (
      <div className="space-y-2">
        <span
          className={cn(
            "text-xs font-medium",
            isActive ? "text-accent" : "text-muted-foreground"
          )}
        >
          {definition.label}
        </span>
        <div className="flex gap-2">
          <Button
            variant={currentMin === 0 && currentMax === 0 ? "default" : "outline"}
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={() => onChange([0, 0])}
          >
            Minor
          </Button>
          <Button
            variant={currentMin === 1 && currentMax === 1 ? "default" : "outline"}
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={() => onChange([1, 1])}
          >
            Major
          </Button>
          {isActive && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onChange([definition.min, definition.max])}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-xs font-medium shrink-0",
            isActive ? "text-accent" : "text-muted-foreground"
          )}
        >
          {definition.label}
        </span>
        <div className="flex items-center gap-1">
          <Input
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
            onBlur={handleMinInputBlur}
            onKeyDown={(e) => e.key === "Enter" && handleMinInputBlur()}
            className="w-16 h-6 text-[10px] text-center px-1"
          />
          <span className="text-xs text-muted-foreground">-</span>
          <Input
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            onBlur={handleMaxInputBlur}
            onKeyDown={(e) => e.key === "Enter" && handleMaxInputBlur()}
            className="w-16 h-6 text-[10px] text-center px-1"
          />
        </div>
      </div>

      <Slider
        value={[currentMin, currentMax]}
        min={definition.min}
        max={definition.max}
        step={definition.step}
        onValueChange={onChange}
        className={cn(isActive && "**:[[role=slider]]:bg-accent")}
      />
    </div>
  );
}

interface FilterPillProps {
  label: string;
  value: string;
  onRemove: () => void;
}

function FilterPill({ label, value, onRemove }: FilterPillProps) {
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-xs">
      <span className="font-medium">{label}:</span>
      <span className="text-muted-foreground">{value}</span>
      <button
        onClick={onRemove}
        className="ml-0.5 p-0.5 rounded-full hover:bg-accent/20 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

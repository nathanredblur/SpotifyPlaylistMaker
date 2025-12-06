/**
 * Left Sidebar Component
 * Navigation sidebar with categories and filters
 */

import {
  LayoutGrid,
  ListMusic,
  Music2,
  Smile,
  Calendar,
  Star,
  Clock,
  CalendarPlus,
} from "lucide-react";
import { NavItem } from "./NavItem";
import { NavAccordion } from "./NavAccordion";
import { cn } from "@/lib/utils";
import type { CategoryBin } from "@/types/spotify";

interface LeftSidebarProps {
  bins: CategoryBin[];
  totalTracks: number;
  activeFilter: {
    type: "all" | "genre" | "mood" | "decade" | "popularity" | "duration" | "added";
    value?: string;
  };
  onFilterChange: (filter: { type: string; value?: string }) => void;
  className?: string;
}

// Map bin names to icons (case-insensitive matching)
const binIcons: Record<string, typeof LayoutGrid> = {
  genres: Music2,
  moods: Smile,
  decades: Calendar,
  popularity: Star,
  duration: Clock,
  added: CalendarPlus,
};

export function LeftSidebar({
  bins,
  totalTracks,
  activeFilter,
  onFilterChange,
  className,
}: LeftSidebarProps) {
  // Convert bins to accordion items (case-insensitive matching)
  const getAccordionItems = (binName: string) => {
    const bin = bins.find((b) => b.name.toLowerCase() === binName.toLowerCase());
    if (!bin) return [];

    return bin.nodes.map((node) => ({
      id: `${binName.toLowerCase()}:${node.name}`,
      label: node.name,
      count: node.tracks.length, // tracks is an array, not a Set
    }));
  };

  const handleAccordionItemClick = (itemId: string) => {
    const [type, value] = itemId.split(":");
    onFilterChange({ type, value });
  };

  return (
    <aside
      className={cn(
        "w-60 min-w-60 h-full flex flex-col",
        "bg-background border-r border-border",
        "overflow-y-auto",
        className
      )}
    >
      {/* Main Navigation */}
      <div className="p-4 space-y-1">
        <NavItem
          icon={LayoutGrid}
          label="All Tracks"
          count={totalTracks}
          isActive={activeFilter.type === "all"}
          onClick={() => onFilterChange({ type: "all" })}
        />
        <NavItem
          icon={ListMusic}
          label="Playlists"
          isActive={false}
          onClick={() => {}}
        />
      </div>

      {/* Divider */}
      <div className="px-4">
        <div className="border-t border-border" />
      </div>

      {/* Categories */}
      <div className="p-4 space-y-1 flex-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
          Categories
        </p>

        <NavAccordion
          icon={Music2}
          label="Genres"
          items={getAccordionItems("Genres")}
          activeItemId={
            activeFilter.type === "genres"
              ? `genres:${activeFilter.value}`
              : null
          }
          onItemClick={handleAccordionItemClick}
          defaultOpen={activeFilter.type === "genres"}
        />

        <NavAccordion
          icon={Smile}
          label="Moods"
          items={getAccordionItems("Moods")}
          activeItemId={
            activeFilter.type === "moods"
              ? `moods:${activeFilter.value}`
              : null
          }
          onItemClick={handleAccordionItemClick}
          defaultOpen={activeFilter.type === "moods"}
        />

        <NavAccordion
          icon={Calendar}
          label="Decades"
          items={getAccordionItems("Decades")}
          activeItemId={
            activeFilter.type === "decades"
              ? `decades:${activeFilter.value}`
              : null
          }
          onItemClick={handleAccordionItemClick}
          defaultOpen={activeFilter.type === "decades"}
        />

        <NavAccordion
          icon={Star}
          label="Popularity"
          items={getAccordionItems("Popularity")}
          activeItemId={
            activeFilter.type === "popularity"
              ? `popularity:${activeFilter.value}`
              : null
          }
          onItemClick={handleAccordionItemClick}
        />

        <NavAccordion
          icon={Clock}
          label="Duration"
          items={getAccordionItems("Duration")}
          activeItemId={
            activeFilter.type === "duration"
              ? `duration:${activeFilter.value}`
              : null
          }
          onItemClick={handleAccordionItemClick}
        />

        <NavAccordion
          icon={CalendarPlus}
          label="Recently Added"
          items={getAccordionItems("Added")}
          activeItemId={
            activeFilter.type === "added"
              ? `added:${activeFilter.value}`
              : null
          }
          onItemClick={handleAccordionItemClick}
        />
      </div>
    </aside>
  );
}


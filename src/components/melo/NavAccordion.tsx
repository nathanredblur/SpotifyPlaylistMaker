/**
 * Navigation Accordion Component
 * Expandable category with child items
 */

import { useState } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavAccordionItem {
  id: string;
  label: string;
  count: number;
}

interface NavAccordionProps {
  icon: LucideIcon;
  label: string;
  items: NavAccordionItem[];
  activeItemId?: string | null;
  onItemClick?: (itemId: string) => void;
  defaultOpen?: boolean;
  className?: string;
}

export function NavAccordion({
  icon: Icon,
  label,
  items,
  activeItemId,
  onItemClick,
  defaultOpen = false,
  className,
}: NavAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const hasActiveChild = items.some((item) => item.id === activeItemId);

  return (
    <div className={cn("", className)}>
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-md",
          "text-sm font-medium transition-colors duration-150",
          "hover:bg-accent-muted hover:text-accent",
          hasActiveChild ? "text-accent" : "text-muted-foreground"
        )}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Items */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
          {items.slice(0, 10).map((item) => (
            <button
              key={item.id}
              onClick={() => onItemClick?.(item.id)}
              className={cn(
                "w-full flex items-center justify-between px-2 py-1.5 rounded-md",
                "text-xs transition-colors duration-150",
                "hover:bg-accent-muted hover:text-accent",
                activeItemId === item.id
                  ? "bg-accent-muted text-accent"
                  : "text-muted-foreground"
              )}
            >
              <span className="truncate">{item.label}</span>
              <span
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0",
                  activeItemId === item.id
                    ? "bg-accent/20 text-accent"
                    : "bg-secondary"
                )}
              >
                {item.count}
              </span>
            </button>
          ))}
          {items.length > 10 && (
            <div className="px-2 py-1 text-xs text-muted-foreground">
              +{items.length - 10} more
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Navigation Item Component
 * Single navigation item with icon and optional badge
 */

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  count?: number;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export function NavItem({
  icon: Icon,
  label,
  count,
  isActive = false,
  onClick,
  className,
}: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-md",
        "text-sm font-medium transition-colors duration-150",
        "hover:bg-accent-muted hover:text-accent",
        isActive
          ? "bg-accent-muted text-accent"
          : "text-muted-foreground",
        className
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 text-left truncate">{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            "text-xs px-2 py-0.5 rounded-full",
            isActive
              ? "bg-accent/20 text-accent"
              : "bg-secondary text-muted-foreground"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}


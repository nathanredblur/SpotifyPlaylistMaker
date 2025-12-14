/**
 * MELO Header Component
 * Top navigation bar with logo, search, and user avatar
 */

import { HelpCircle } from "lucide-react";
import { MeloLogo } from "./MeloLogo";
import { GlobalSearch } from "./GlobalSearch";
import { UserAvatar } from "./UserAvatar";
import { cn } from "@/lib/utils";

interface HeaderProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  galleryOwnerName?: string;
  isPremium?: boolean | null;
  onHelpClick?: () => void;
  className?: string;
}

export function Header({
  searchValue,
  onSearchChange,
  galleryOwnerName,
  isPremium,
  onHelpClick,
  className,
}: HeaderProps) {
  return (
    <header
      className={cn(
        "h-header flex items-center justify-between px-6",
        "bg-background border-b border-border",
        "sticky top-0 z-40",
        className
      )}
    >
      {/* Left: Logo */}
      <div className="flex items-center gap-4">
        <MeloLogo size="md" />
      </div>

      {/* Center: Search */}
      <GlobalSearch
        value={searchValue}
        onChange={onSearchChange}
        className="mx-8"
      />

      {/* Right: Help and User Avatar */}
      <div className="flex items-center gap-2">
        {onHelpClick && (
          <button
            onClick={onHelpClick}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
            title="Help & Introduction"
            aria-label="Help"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        )}
        <UserAvatar isPremium={isPremium} galleryOwnerName={galleryOwnerName} />
      </div>
    </header>
  );
}

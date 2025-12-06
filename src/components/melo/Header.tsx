/**
 * MELO Header Component
 * Top navigation bar with logo, search, and admin avatar
 */

import { MeloLogo } from "./MeloLogo";
import { GlobalSearch } from "./GlobalSearch";
import { AdminAvatar } from "./AdminAvatar";
import { cn } from "@/lib/utils";

interface HeaderProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  adminImageUrl?: string | null;
  adminName?: string;
  adminBio?: string;
  className?: string;
}

export function Header({
  searchValue,
  onSearchChange,
  adminImageUrl,
  adminName,
  adminBio,
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

      {/* Right: Admin Avatar */}
      <div className="flex items-center gap-4">
        <AdminAvatar
          imageUrl={adminImageUrl}
          name={adminName}
          bio={adminBio}
        />
      </div>
    </header>
  );
}


/**
 * User Avatar Component
 * Shows login button or user dropdown with options
 */

import { useState, useRef, useEffect } from "react";
import {
  User,
  LogIn,
  LogOut,
  Settings,
  Crown,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { authorizeSpotify } from "@/lib/spotify-auth";

interface UserAvatarProps {
  /** Whether the user has Spotify Premium (for playback) */
  isPremium?: boolean | null;
  /** Gallery owner name (shown when user is not logged in) */
  galleryOwnerName?: string;
  className?: string;
}

export function UserAvatar({
  isPremium,
  galleryOwnerName = "Gallery Owner",
  className,
}: UserAvatarProps) {
  const { user, isLoading, isAuthenticated, logout } = useCurrentUser();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await authorizeSpotify("/");
    } catch (err) {
      console.error("Login failed:", err);
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };

  // Show loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          "w-10 h-10 rounded-full bg-background-secondary animate-pulse",
          className
        )}
      />
    );
  }

  // Not authenticated - show login button
  if (!isAuthenticated) {
    return (
      <button
        onClick={handleLogin}
        disabled={isLoggingIn}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full",
          "bg-accent text-accent-foreground",
          "hover:bg-accent/90 transition-colors",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
      >
        <LogIn className="w-4 h-4" />
        <span className="text-sm font-medium">
          {isLoggingIn ? "Connecting..." : "Login"}
        </span>
      </button>
    );
  }

  // Authenticated - show avatar with dropdown
  return (
    <div className={cn("relative", className)} ref={popupRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-10 h-10 rounded-full overflow-hidden",
          "border-2 border-transparent hover:border-accent",
          "transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-accent/50",
          isOpen && "border-accent"
        )}
      >
        {user?.profileImage ? (
          <img
            src={user.profileImage}
            alt={user.displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-background-secondary flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            "absolute right-0 top-full mt-2 w-72",
            "bg-card border border-border rounded-lg shadow-xl",
            "z-50",
            "animate-in fade-in-0 zoom-in-95 duration-200"
          )}
        >
          {/* User Info Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                {user?.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-background-secondary flex items-center justify-center">
                    <User className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {user?.displayName}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email || "Spotify User"}
                </p>
                {user?.isAdmin && (
                  <div className="flex items-center gap-1 mt-1">
                    <Crown className="w-3 h-3 text-accent" />
                    <span className="text-xs text-accent font-medium">
                      Admin
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Premium Warning */}
          {isPremium === false && (
            <div className="px-4 py-3 bg-orange-500/10 border-b border-border">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-orange-400">
                    Spotify Premium Required
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Full playback requires Premium. You'll hear 30-second
                    previews.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Menu Options */}
          <div className="p-2">
            {/* Admin Dashboard - only for admins */}
            {user?.isAdmin && (
              <a
                href="/admin"
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2 rounded-md",
                  "text-sm text-foreground",
                  "hover:bg-accent-muted transition-colors"
                )}
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
                <span>Admin Dashboard</span>
              </a>
            )}

            {/* Logout */}
            <button
              onClick={handleLogout}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2 rounded-md",
                "text-sm text-foreground",
                "hover:bg-destructive/10 hover:text-destructive transition-colors"
              )}
            >
              <LogOut className="w-4 h-4 text-muted-foreground" />
              <span>Logout</span>
            </button>
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Browsing {galleryOwnerName}'s gallery
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

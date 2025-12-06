/**
 * Admin Avatar Component
 * Clickable avatar with popup showing admin info
 */

import { useState, useRef, useEffect } from "react";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminAvatarProps {
  imageUrl?: string | null;
  name?: string;
  bio?: string;
  className?: string;
}

export function AdminAvatar({
  imageUrl,
  name = "Gallery Owner",
  bio = "Welcome to my music gallery! Explore my collection and discover new music.",
  className,
}: AdminAvatarProps) {
  const [isOpen, setIsOpen] = useState(false);
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
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-background-secondary flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
      </button>

      {/* Popup */}
      {isOpen && (
        <div
          className={cn(
            "absolute right-0 top-full mt-2 w-72",
            "bg-card border border-border rounded-lg shadow-xl",
            "p-4 z-50",
            "animate-in fade-in-0 zoom-in-95 duration-200"
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-background-secondary flex items-center justify-center">
                  <User className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{name}</h3>
              <p className="text-xs text-muted-foreground">Gallery Owner</p>
            </div>
          </div>

          {/* Bio */}
          <p className="text-sm text-muted-foreground leading-relaxed">{bio}</p>

          {/* Divider */}
          <div className="border-t border-border my-3" />

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Powered by MELO</span>
            <a
              href="/admin"
              className="text-accent hover:underline"
              onClick={() => setIsOpen(false)}
            >
              Admin Panel
            </a>
          </div>
        </div>
      )}
    </div>
  );
}


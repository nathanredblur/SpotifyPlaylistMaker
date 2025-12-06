/**
 * MELO Logo Component
 * Pixelated logo with optional animation
 */

import { cn } from "@/lib/utils";

interface MeloLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

const sizeClasses = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl",
};

export function MeloLogo({
  className,
  size = "md",
  animated = true,
}: MeloLogoProps) {
  return (
    <div
      className={cn(
        "font-pixel text-accent select-none tracking-wider",
        sizeClasses[size],
        animated && "transition-all duration-300 hover:text-accent-hover hover:scale-105",
        className
      )}
    >
      MELO
    </div>
  );
}


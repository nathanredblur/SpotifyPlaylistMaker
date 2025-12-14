/**
 * Spotify Player Context
 * Provides Spotify Web Playback SDK state and controls throughout the app
 */

import { createContext, useContext, type ReactNode } from "react";
import {
  useSpotifyPlayer,
  type UseSpotifyPlayerResult,
} from "@/hooks/useSpotifyPlayer";

// ============================================================================
// Context
// ============================================================================

const SpotifyPlayerContext = createContext<UseSpotifyPlayerResult | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface SpotifyPlayerProviderProps {
  children: ReactNode;
}

export function SpotifyPlayerProvider({
  children,
}: SpotifyPlayerProviderProps) {
  const player = useSpotifyPlayer();

  return (
    <SpotifyPlayerContext.Provider value={player}>
      {children}
    </SpotifyPlayerContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useSpotifyPlayerContext(): UseSpotifyPlayerResult {
  const context = useContext(SpotifyPlayerContext);

  if (!context) {
    throw new Error(
      "useSpotifyPlayerContext must be used within a SpotifyPlayerProvider"
    );
  }

  return context;
}

// ============================================================================
// Optional hook (doesn't throw if not in provider)
// ============================================================================

export function useOptionalSpotifyPlayer(): UseSpotifyPlayerResult | null {
  return useContext(SpotifyPlayerContext);
}

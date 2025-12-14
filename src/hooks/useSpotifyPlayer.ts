/**
 * Spotify Web Playback SDK Hook
 * Provides full playback control using Spotify's Web Playback SDK
 *
 * @see https://developer.spotify.com/documentation/web-playback-sdk/reference
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { STORAGE_KEYS } from "@/config/constants";

// ============================================================================
// Types
// ============================================================================

interface WebPlaybackPlayer {
  device_id: string;
}

interface WebPlaybackTrack {
  uri: string;
  id: string | null;
  type: "track" | "episode" | "ad";
  media_type: "audio" | "video";
  name: string;
  is_playable: boolean;
  album: {
    uri: string;
    name: string;
    images: Array<{ url: string }>;
  };
  artists: Array<{ uri: string; name: string }>;
}

interface WebPlaybackState {
  context: {
    uri: string | null;
    metadata: Record<string, unknown> | null;
  };
  disallows: {
    pausing?: boolean;
    peeking_next?: boolean;
    peeking_prev?: boolean;
    resuming?: boolean;
    seeking?: boolean;
    skipping_next?: boolean;
    skipping_prev?: boolean;
  };
  paused: boolean;
  position: number;
  repeat_mode: 0 | 1 | 2;
  shuffle: boolean;
  track_window: {
    current_track: WebPlaybackTrack;
    previous_tracks: WebPlaybackTrack[];
    next_tracks: WebPlaybackTrack[];
  };
  duration?: number;
}

interface WebPlaybackError {
  message: string;
}

interface SpotifyPlayer {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (event: string, callback: (data: unknown) => void) => boolean;
  removeListener: (
    event: string,
    callback?: (data: unknown) => void
  ) => boolean;
  getCurrentState: () => Promise<WebPlaybackState | null>;
  setName: (name: string) => Promise<void>;
  getVolume: () => Promise<number>;
  setVolume: (volume: number) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlay: () => Promise<void>;
  seek: (position_ms: number) => Promise<void>;
  previousTrack: () => Promise<void>;
  nextTrack: () => Promise<void>;
  activateElement: () => Promise<void>;
}

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: {
      Player: new (config: {
        name: string;
        getOAuthToken: (callback: (token: string) => void) => void;
        volume?: number;
        enableMediaSession?: boolean;
      }) => SpotifyPlayer;
    };
  }
}

// ============================================================================
// Hook State Types
// ============================================================================

export interface SpotifyPlayerState {
  isReady: boolean;
  isActive: boolean;
  isPaused: boolean;
  isLoading: boolean;
  currentTrack: WebPlaybackTrack | null;
  position: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeatMode: 0 | 1 | 2;
  deviceId: string | null;
  error: string | null;
  isPremium: boolean | null;
}

export interface SpotifyPlayerActions {
  play: (uri?: string, contextUri?: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  togglePlay: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  previousTrack: () => Promise<void>;
  nextTrack: () => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  transferPlayback: () => Promise<void>;
  disconnect: () => void;
}

export interface UseSpotifyPlayerResult
  extends SpotifyPlayerState,
    SpotifyPlayerActions {}

// ============================================================================
// Constants
// ============================================================================

const SDK_URL = "https://sdk.scdn.co/spotify-player.js";
const PLAYER_NAME = "MELO Web Player";
const POSITION_UPDATE_INTERVAL = 1000;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the access token from localStorage or from OAuth callback hash
 * Also processes the OAuth callback if present
 */
function getAccessToken(): string | null {
  try {
    // First, check if there's an OAuth callback in the URL hash
    if (typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      const expiresIn = params.get("expires_in");

      if (accessToken) {
        // Store the token
        const tokenData = {
          token: accessToken,
          expiresAt: Date.now() + parseInt(expiresIn || "3600", 10) * 1000,
          createdAt: Date.now(),
        };
        localStorage.setItem(
          STORAGE_KEYS.ACCESS_TOKEN,
          JSON.stringify(tokenData)
        );

        // Clean up URL (remove hash)
        window.history.replaceState(null, "", window.location.pathname);

        return accessToken;
      }
    }

    // Check localStorage
    const tokenData = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!tokenData) return null;

    const { token, expiresAt } = JSON.parse(tokenData);
    if (!token || (expiresAt && Date.now() > expiresAt)) {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      return null;
    }

    return token;
  } catch {
    return null;
  }
}

function loadSpotifySDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.Spotify) {
      resolve();
      return;
    }

    // Check if script is already in DOM
    const existingScript = document.querySelector(`script[src="${SDK_URL}"]`);
    if (existingScript) {
      // Wait for SDK to be ready
      if (window.Spotify) {
        resolve();
      } else {
        const originalCallback = window.onSpotifyWebPlaybackSDKReady;
        window.onSpotifyWebPlaybackSDKReady = () => {
          originalCallback?.();
          resolve();
        };
      }
      return;
    }

    // Set up callback before loading script
    window.onSpotifyWebPlaybackSDKReady = () => {
      resolve();
    };

    // Load script
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load Spotify SDK"));
    document.body.appendChild(script);
  });
}

// ============================================================================
// Main Hook
// ============================================================================

export function useSpotifyPlayer(): UseSpotifyPlayerResult {
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const positionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // State
  const [state, setState] = useState<SpotifyPlayerState>({
    isReady: false,
    isActive: false,
    isPaused: true,
    isLoading: true,
    currentTrack: null,
    position: 0,
    duration: 0,
    volume: 0.5,
    shuffle: false,
    repeatMode: 0,
    deviceId: null,
    error: null,
    isPremium: null,
  });

  // Update state helper
  const updateState = useCallback((updates: Partial<SpotifyPlayerState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Start position tracking
  const startPositionTracking = useCallback(() => {
    if (positionIntervalRef.current) {
      clearInterval(positionIntervalRef.current);
    }

    positionIntervalRef.current = setInterval(async () => {
      if (!playerRef.current) return;

      const state = await playerRef.current.getCurrentState();
      if (state && !state.paused) {
        updateState({ position: state.position });
      }
    }, POSITION_UPDATE_INTERVAL);
  }, [updateState]);

  // Stop position tracking
  const stopPositionTracking = useCallback(() => {
    if (positionIntervalRef.current) {
      clearInterval(positionIntervalRef.current);
      positionIntervalRef.current = null;
    }
  }, []);

  // Initialize player
  useEffect(() => {
    let mounted = true;

    const initPlayer = async () => {
      const token = getAccessToken();

      if (!token) {
        updateState({
          isLoading: false,
          error: "No access token. Please log in with Spotify.",
        });
        return;
      }

      try {
        await loadSpotifySDK();

        if (!mounted) return;

        const player = new window.Spotify.Player({
          name: PLAYER_NAME,
          getOAuthToken: (cb) => {
            const currentToken = getAccessToken();
            if (currentToken) {
              cb(currentToken);
            }
          },
          volume: 0.5,
          enableMediaSession: true,
        });

        // Error handlers
        player.addListener("initialization_error", (data) => {
          const { message } = data as WebPlaybackError;
          console.error("Initialization error:", message);
          updateState({
            error: `Initialization failed: ${message}`,
            isLoading: false,
          });
        });

        player.addListener("authentication_error", (data) => {
          const { message } = data as WebPlaybackError;
          console.error("Authentication error:", message);
          updateState({
            error: `Authentication failed: ${message}`,
            isLoading: false,
          });
        });

        player.addListener("account_error", (data) => {
          const { message } = data as WebPlaybackError;
          console.error("Account error:", message);
          updateState({
            error: "Spotify Premium required for playback",
            isPremium: false,
            isLoading: false,
          });
        });

        player.addListener("playback_error", (data) => {
          const { message } = data as WebPlaybackError;
          console.error("Playback error:", message);
          updateState({ error: `Playback error: ${message}` });
        });

        // Ready handler
        player.addListener("ready", (data) => {
          const { device_id } = data as WebPlaybackPlayer;
          console.log("✅ Spotify Player ready with Device ID:", device_id);
          updateState({
            isReady: true,
            isLoading: false,
            deviceId: device_id,
            isPremium: true,
            error: null,
          });
        });

        // Not ready handler
        player.addListener("not_ready", (data) => {
          const { device_id } = data as WebPlaybackPlayer;
          console.log("Device ID has gone offline:", device_id);
          updateState({ isReady: false, isActive: false });
        });

        // State changed handler
        player.addListener("player_state_changed", (data) => {
          const playbackState = data as WebPlaybackState | null;
          if (!playbackState) {
            updateState({ isActive: false, currentTrack: null });
            stopPositionTracking();
            return;
          }

          const { current_track } = playbackState.track_window;

          updateState({
            isActive: true,
            isPaused: playbackState.paused,
            currentTrack: current_track,
            position: playbackState.position,
            duration: playbackState.duration || 0,
            shuffle: playbackState.shuffle,
            repeatMode: playbackState.repeat_mode,
          });

          if (playbackState.paused) {
            stopPositionTracking();
          } else {
            startPositionTracking();
          }
        });

        // Autoplay failed handler
        player.addListener("autoplay_failed", () => {
          console.log("Autoplay is not allowed by the browser");
        });

        // Connect player
        const connected = await player.connect();

        if (!connected) {
          updateState({
            error: "Failed to connect to Spotify",
            isLoading: false,
          });
          return;
        }

        playerRef.current = player;
      } catch (err) {
        console.error("Error initializing Spotify player:", err);
        updateState({
          error: err instanceof Error ? err.message : "Unknown error",
          isLoading: false,
        });
      }
    };

    initPlayer();

    return () => {
      mounted = false;
      stopPositionTracking();
      playerRef.current?.disconnect();
    };
  }, [updateState, startPositionTracking, stopPositionTracking]);

  // ============================================================================
  // Actions
  // ============================================================================

  const play = useCallback(
    async (uri?: string, contextUri?: string) => {
      const token = getAccessToken();
      if (!token || !state.deviceId) {
        console.error("Cannot play: no token or device ID");
        return;
      }

      try {
        const body: Record<string, unknown> = {};

        if (contextUri) {
          body.context_uri = contextUri;
          if (uri) {
            body.offset = { uri };
          }
        } else if (uri) {
          body.uris = [uri];
        }

        const response = await fetch(
          `https://api.spotify.com/v1/me/player/play?device_id=${state.deviceId}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          }
        );

        if (!response.ok && response.status !== 204) {
          const error = await response.json();
          throw new Error(error.error?.message || "Failed to start playback");
        }
      } catch (err) {
        console.error("Error starting playback:", err);
        updateState({
          error: err instanceof Error ? err.message : "Failed to play",
        });
      }
    },
    [state.deviceId, updateState]
  );

  const pause = useCallback(async () => {
    try {
      await playerRef.current?.pause();
    } catch (err) {
      console.error("Error pausing:", err);
    }
  }, []);

  const resume = useCallback(async () => {
    try {
      await playerRef.current?.resume();
    } catch (err) {
      console.error("Error resuming:", err);
    }
  }, []);

  const togglePlay = useCallback(async () => {
    try {
      await playerRef.current?.togglePlay();
    } catch (err) {
      console.error("Error toggling play:", err);
    }
  }, []);

  const seek = useCallback(
    async (positionMs: number) => {
      try {
        await playerRef.current?.seek(positionMs);
        updateState({ position: positionMs });
      } catch (err) {
        console.error("Error seeking:", err);
      }
    },
    [updateState]
  );

  const previousTrack = useCallback(async () => {
    try {
      await playerRef.current?.previousTrack();
    } catch (err) {
      console.error("Error going to previous track:", err);
    }
  }, []);

  const nextTrack = useCallback(async () => {
    try {
      await playerRef.current?.nextTrack();
    } catch (err) {
      console.error("Error going to next track:", err);
    }
  }, []);

  const setVolume = useCallback(
    async (volume: number) => {
      try {
        await playerRef.current?.setVolume(volume);
        updateState({ volume });
      } catch (err) {
        console.error("Error setting volume:", err);
      }
    },
    [updateState]
  );

  const transferPlayback = useCallback(async () => {
    const token = getAccessToken();
    if (!token || !state.deviceId) return;

    try {
      const response = await fetch("https://api.spotify.com/v1/me/player", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device_ids: [state.deviceId],
          play: false,
        }),
      });

      if (!response.ok && response.status !== 204) {
        throw new Error("Failed to transfer playback");
      }
    } catch (err) {
      console.error("Error transferring playback:", err);
    }
  }, [state.deviceId]);

  const disconnect = useCallback(() => {
    stopPositionTracking();
    playerRef.current?.disconnect();
    playerRef.current = null;
    updateState({
      isReady: false,
      isActive: false,
      currentTrack: null,
      deviceId: null,
    });
  }, [stopPositionTracking, updateState]);

  return {
    ...state,
    play,
    pause,
    resume,
    togglePlay,
    seek,
    previousTrack,
    nextTrack,
    setVolume,
    transferPlayback,
    disconnect,
  };
}

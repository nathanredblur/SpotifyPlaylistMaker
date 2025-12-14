/**
 * Spotify Embed iFrame API Hook
 * Provides playback control using Spotify's Embed iFrame API
 * Used as fallback when Web Playback SDK is not available (non-Premium users)
 *
 * @see https://developer.spotify.com/documentation/embeds/references/iframe-api
 */

import { useState, useEffect, useCallback, useRef } from "react";

// ============================================================================
// Types
// ============================================================================

interface EmbedController {
  loadUri: (uri: string, options?: { startAt?: number }) => void;
  play: () => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  restart: () => void;
  seek: (seconds: number) => void;
  destroy: () => void;
  addListener: (
    event: string,
    callback: (e: PlaybackUpdateEvent) => void
  ) => void;
  removeListener: (
    event: string,
    callback?: (e: PlaybackUpdateEvent) => void
  ) => void;
}

interface IFrameAPI {
  createController: (
    element: HTMLElement,
    options: EmbedOptions,
    callback: (controller: EmbedController) => void
  ) => void;
}

interface EmbedOptions {
  uri?: string;
  width?: number | string;
  height?: number | string;
}

interface PlaybackUpdateEvent {
  data: {
    playingURI: string;
    isPaused: boolean;
    isBuffering: boolean;
    duration: number;
    position: number;
  };
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: IFrameAPI) => void;
    SpotifyIframeApi?: IFrameAPI;
  }
}

// ============================================================================
// Hook State Types
// ============================================================================

export interface SpotifyEmbedState {
  isReady: boolean;
  isLoading: boolean;
  isPaused: boolean;
  isBuffering: boolean;
  currentUri: string | null;
  position: number;
  duration: number;
  error: string | null;
}

export interface SpotifyEmbedActions {
  loadTrack: (trackId: string) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
}

export interface UseSpotifyEmbedResult
  extends SpotifyEmbedState,
    SpotifyEmbedActions {
  embedRef: React.RefObject<HTMLDivElement | null>;
}

// ============================================================================
// Constants
// ============================================================================

const EMBED_SCRIPT_URL = "https://open.spotify.com/embed/iframe-api/v1";
const EMBED_HEIGHT = 80;

// ============================================================================
// Helper Functions
// ============================================================================

function loadEmbedScript(): Promise<IFrameAPI> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.SpotifyIframeApi) {
      resolve(window.SpotifyIframeApi);
      return;
    }

    // Check if script is already in DOM
    const existingScript = document.querySelector(
      `script[src="${EMBED_SCRIPT_URL}"]`
    );

    if (existingScript) {
      // Wait for API to be ready
      const checkInterval = setInterval(() => {
        if (window.SpotifyIframeApi) {
          clearInterval(checkInterval);
          resolve(window.SpotifyIframeApi);
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error("Timeout waiting for Spotify Embed API"));
      }, 10000);

      return;
    }

    // Set up callback before loading script
    window.onSpotifyIframeApiReady = (api: IFrameAPI) => {
      window.SpotifyIframeApi = api;
      resolve(api);
    };

    // Load script
    const script = document.createElement("script");
    script.src = EMBED_SCRIPT_URL;
    script.async = true;
    script.onerror = () =>
      reject(new Error("Failed to load Spotify Embed API"));
    document.body.appendChild(script);
  });
}

// ============================================================================
// Main Hook
// ============================================================================

export function useSpotifyEmbed(): UseSpotifyEmbedResult {
  const embedRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<EmbedController | null>(null);
  const apiRef = useRef<IFrameAPI | null>(null);

  const [state, setState] = useState<SpotifyEmbedState>({
    isReady: false,
    isLoading: true,
    isPaused: true,
    isBuffering: false,
    currentUri: null,
    position: 0,
    duration: 0,
    error: null,
  });

  // Update state helper
  const updateState = useCallback((updates: Partial<SpotifyEmbedState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Initialize embed API
  useEffect(() => {
    let mounted = true;

    const initEmbed = async () => {
      try {
        const api = await loadEmbedScript();

        if (!mounted) return;

        apiRef.current = api;
        updateState({ isLoading: false, error: null });

        console.log("✅ Spotify Embed API loaded");
      } catch (err) {
        console.error("Error loading Spotify Embed API:", err);
        if (mounted) {
          updateState({
            isLoading: false,
            error: err instanceof Error ? err.message : "Failed to load embed",
          });
        }
      }
    };

    initEmbed();

    return () => {
      mounted = false;
      controllerRef.current?.destroy();
    };
  }, [updateState]);

  // Create controller when element is available and we have a URI to load
  const createController = useCallback(
    (uri: string) => {
      if (!apiRef.current || !embedRef.current) {
        console.warn("Cannot create controller: API or element not ready");
        return;
      }

      // Create a fresh div element to ensure clean state
      const container = embedRef.current;
      const newElement = document.createElement("div");
      newElement.style.width = "100%";
      container.innerHTML = "";
      container.appendChild(newElement);

      // Create new controller in the fresh element
      apiRef.current.createController(
        newElement,
        {
          uri,
          width: "100%",
          height: EMBED_HEIGHT,
        },
        (controller) => {
          controllerRef.current = controller;

          // Track if we've attempted to auto-play
          let hasAttemptedAutoPlay = false;

          // Add event listeners
          controller.addListener("ready", () => {
            updateState({ isReady: true });

            // Auto-play immediately on ready
            if (!hasAttemptedAutoPlay) {
              hasAttemptedAutoPlay = true;
              setTimeout(() => {
                controller.play();
              }, 200);
            }
          });

          controller.addListener(
            "playback_update",
            (e: PlaybackUpdateEvent) => {
              updateState({
                isPaused: e.data.isPaused,
                isBuffering: e.data.isBuffering,
                position: e.data.position,
                duration: e.data.duration,
                currentUri: e.data.playingURI,
              });

              // Backup auto-play: if track loaded but still paused
              if (
                !hasAttemptedAutoPlay &&
                e.data.isPaused &&
                e.data.duration > 0
              ) {
                hasAttemptedAutoPlay = true;
                setTimeout(() => {
                  controller.play();
                }, 100);
              }
            }
          );
        }
      );
    },
    [updateState]
  );

  // ============================================================================
  // Actions
  // ============================================================================

  const loadTrack = useCallback(
    (trackId: string) => {
      const uri = `spotify:track:${trackId}`;

      if (state.currentUri === uri && controllerRef.current) {
        // Same track, just toggle play
        controllerRef.current.togglePlay();
        return;
      }

      updateState({ currentUri: uri, isReady: false });

      // Destroy existing controller first
      if (controllerRef.current) {
        try {
          controllerRef.current.destroy();
        } catch (e) {
          // Ignore errors during destroy
        }
        controllerRef.current = null;
      }

      // Function to create controller with retry
      const tryCreateController = (retries = 10) => {
        if (!apiRef.current) {
          // API not ready yet, retry after a delay
          if (retries > 0) {
            setTimeout(() => tryCreateController(retries - 1), 200);
          }
          return;
        }
        createController(uri);
      };

      // Wait for DOM to settle before creating new controller
      setTimeout(() => {
        tryCreateController();
      }, 100);
    },
    [state.currentUri, createController, updateState]
  );

  const play = useCallback(() => {
    controllerRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    controllerRef.current?.pause();
  }, []);

  const togglePlay = useCallback(() => {
    controllerRef.current?.togglePlay();
  }, []);

  const seek = useCallback((seconds: number) => {
    controllerRef.current?.seek(seconds);
  }, []);

  return {
    ...state,
    embedRef,
    loadTrack,
    play,
    pause,
    togglePlay,
    seek,
  };
}

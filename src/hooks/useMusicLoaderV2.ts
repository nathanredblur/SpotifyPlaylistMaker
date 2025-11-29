/**
 * Music Loader Hook V2 - Server-Driven Sync
 * Uses the new /api/sync endpoint for server-side data fetching
 */

import { useState, useCallback, useRef } from "react";
import { getAccessToken } from "@/lib/spotify-auth";
import {
  processTrackItem,
  enrichTrackWithAudioFeatures,
  enrichTrackWithArtistGenres,
  enrichTrackWithAlbumData,
} from "@/lib/track-processor";
import {
  initializeCategoryBins,
  categorizeTrack,
  sortNodesByTrackCount,
} from "@/lib/categorizer";
import type {
  Track,
  CategoryBin,
  CollectionInfo,
  SpotifyTrack,
  SpotifyArtist,
  SpotifyAlbum,
} from "@/types/spotify";

export interface LoadingStats {
  totalTracks: number;
  processedTracks: number;
  cached: number;
  newFromSpotify: number;
  fetchedFromSoundCharts: number;
  failed: number;
  topArtist: string;
  topTrack: string;
  topGenre: string;
}

export interface UseMusicLoaderResult {
  isLoading: boolean;
  progress: number;
  message: string;
  stats: LoadingStats;
  bins: CategoryBin[];
  tracks: Map<string, Track>;
  error: string | null;
  loadMusic: (collectionInfo: CollectionInfo) => Promise<void>;
  stopLoading: () => void;
}

interface SyncResponse {
  success: boolean;
  tracks: Array<SpotifyTrack & { audioFeatures?: any; soundchartsUuid?: string }>;
  stats: {
    total: number;
    cached: number;
    newFromSpotify: number;
    fetchedFromSoundCharts: number;
    failed: number;
    duration: number;
  };
}

export function useMusicLoaderV2(): UseMusicLoaderResult {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Initializing...");
  const [stats, setStats] = useState<LoadingStats>({
    totalTracks: 0,
    processedTracks: 0,
    cached: 0,
    newFromSpotify: 0,
    fetchedFromSoundCharts: 0,
    failed: 0,
    topArtist: "",
    topTrack: "",
    topGenre: "",
  });
  const [bins, setBins] = useState<CategoryBin[]>([]);
  const [tracks, setTracks] = useState<Map<string, Track>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const stopLoading = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setMessage("Stopping...");
      console.log("Loading stopped by user.");
    }
  }, []);

  const loadMusic = useCallback(async (collectionInfo: CollectionInfo) => {
    setIsLoading(true);
    setProgress(0);
    setMessage("Synchronizing with server...");
    setError(null);
    setTracks(new Map());
    setBins([]);
    setStats({
      totalTracks: 0,
      processedTracks: 0,
      cached: 0,
      newFromSpotify: 0,
      fetchedFromSoundCharts: 0,
      failed: 0,
      topArtist: "",
      topTrack: "",
      topGenre: "",
    });

    abortControllerRef.current = new AbortController();

    try {
      // Get Spotify access token
      const spotifyToken = getAccessToken();
      if (!spotifyToken) {
        throw new Error("No Spotify access token found");
      }

      setProgress(10);
      setMessage("Fetching tracks from server...");

      // Call server sync endpoint
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${spotifyToken}`,
        },
        body: JSON.stringify({
          collectionType: collectionInfo.type,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to sync tracks");
      }

      const syncData: SyncResponse = await response.json();

      setProgress(50);
      setMessage(`Processing ${syncData.tracks.length} tracks...`);

      // Process tracks and categorize
      const categoryBins = initializeCategoryBins();
      const trackMap = new Map<string, Track>();
      const artistMap = new Map<string, SpotifyArtist>();
      const albumMap = new Map<string, SpotifyAlbum>();

      let processedCount = 0;

      for (const spotifyTrack of syncData.tracks) {
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error("Loading cancelled");
        }

        // Convert Spotify track to our Track format
        const track = processTrackFromSync(spotifyTrack, collectionInfo);

        if (track) {
          // Enrich with audio features if available
          if (spotifyTrack.audioFeatures) {
            enrichTrackWithAudioFeatures(track, spotifyTrack.audioFeatures);
          }

          // Store artists and albums for enrichment
          spotifyTrack.artists?.forEach((artist: SpotifyArtist) => {
            if (!artistMap.has(artist.id)) {
              artistMap.set(artist.id, artist);
            }
          });

          if (spotifyTrack.album && !albumMap.has(spotifyTrack.album.id)) {
            albumMap.set(spotifyTrack.album.id, spotifyTrack.album as SpotifyAlbum);
          }

          // Enrich track with artist genres and album data
          enrichTrackWithArtistGenres(track, artistMap);
          enrichTrackWithAlbumData(track, albumMap);

          // Categorize track
          categorizeTrack(track, categoryBins);

          trackMap.set(track.id, track);
        }

        processedCount++;
        const progress = 50 + (processedCount / syncData.tracks.length) * 50;
        setProgress(progress);

        // Update stats periodically
        if (processedCount % 50 === 0) {
          setStats((prev) => ({
            ...prev,
            processedTracks: processedCount,
            totalTracks: syncData.tracks.length,
          }));
        }
      }

      // Sort bins by track count
      sortNodesByTrackCount(categoryBins);

      // Update final stats
      setStats({
        totalTracks: syncData.stats.total,
        processedTracks: syncData.tracks.length,
        cached: syncData.stats.cached,
        newFromSpotify: syncData.stats.newFromSpotify,
        fetchedFromSoundCharts: syncData.stats.fetchedFromSoundCharts,
        failed: syncData.stats.failed,
        topArtist: findTopArtist(trackMap),
        topTrack: findTopTrack(trackMap),
        topGenre: findTopGenre(categoryBins),
      });

      setBins(categoryBins);
      setTracks(trackMap);
      setProgress(100);
      setMessage(`✅ Loaded ${trackMap.size} tracks successfully`);

      console.log(
        `✅ Sync completed: ${syncData.stats.total} tracks (${syncData.stats.cached} cached, ${syncData.stats.newFromSpotify} new)`
      );
    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) {
        setMessage("Loading cancelled.");
      } else {
        console.error("Error loading music:", err);
        setError(err instanceof Error ? err.message : "Failed to load music");
        setMessage("❌ Failed to load music");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    progress,
    message,
    stats,
    bins,
    tracks,
    error,
    loadMusic,
    stopLoading,
  };
}

/**
 * Convert Spotify track from sync response to our Track format
 */
function processTrackFromSync(
  spotifyTrack: SpotifyTrack & { audioFeatures?: any },
  collectionInfo: CollectionInfo
): Track | null {
  try {
    // Create a SavedTrackItem-like object for processTrackItem
    const item = {
      track: spotifyTrack,
      added_at: new Date().toISOString(),
    };

    return processTrackItem(item, collectionInfo.name || "Your Music");
  } catch (error) {
    console.error("Failed to process track:", error);
    return null;
  }
}

/**
 * Find the most common artist
 */
function findTopArtist(trackMap: Map<string, Track>): string {
  const artistCounts = new Map<string, number>();

  trackMap.forEach((track) => {
    track.details.artists.forEach((artist) => {
      artistCounts.set(artist.name, (artistCounts.get(artist.name) || 0) + 1);
    });
  });

  let topArtist = "";
  let maxCount = 0;

  artistCounts.forEach((count, artist) => {
    if (count > maxCount) {
      maxCount = count;
      topArtist = artist;
    }
  });

  return topArtist;
}

/**
 * Find the most common track (by name)
 */
function findTopTrack(trackMap: Map<string, Track>): string {
  const trackCounts = new Map<string, number>();

  trackMap.forEach((track) => {
    trackCounts.set(track.details.name, (trackCounts.get(track.details.name) || 0) + 1);
  });

  let topTrack = "";
  let maxCount = 0;

  trackCounts.forEach((count, track) => {
    if (count > maxCount) {
      maxCount = count;
      topTrack = track;
    }
  });

  return topTrack;
}

/**
 * Find the most common genre from bins
 */
function findTopGenre(bins: CategoryBin[]): string {
  const genreBin = bins.find((bin) => bin.name === "Genre");
  if (!genreBin || genreBin.nodes.length === 0) {
    return "";
  }

  // Nodes are already sorted by track count
  return genreBin.nodes[0]?.name || "";
}


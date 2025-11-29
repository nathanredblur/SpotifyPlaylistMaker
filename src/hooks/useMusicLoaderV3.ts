/**
 * Music Loader Hook V3 - Database-Driven
 * Reads tracks from local SQLite database via /api/tracks endpoint
 * Triggers sync via /api/sync if needed
 */

import { useState, useCallback } from "react";
import { getAccessToken } from "@/lib/spotify-auth";
import {
  initializeCategoryBins,
  categorizeTrack,
  sortNodesByTrackCount,
} from "@/lib/categorizer";
import type { Track, CategoryBin, CollectionInfo } from "@/types/spotify";

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

const initialStats: LoadingStats = {
  totalTracks: 0,
  processedTracks: 0,
  cached: 0,
  newFromSpotify: 0,
  fetchedFromSoundCharts: 0,
  failed: 0,
  topArtist: "",
  topTrack: "",
  topGenre: "",
};

export function useMusicLoaderV3(): UseMusicLoaderResult {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState<LoadingStats>(initialStats);
  const [bins, setBins] = useState<CategoryBin[]>([]);
  const [tracks, setTracks] = useState<Map<string, Track>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
    setProgress(0);
    setMessage("");
  }, []);

  const loadMusic = useCallback(async (collectionInfo: CollectionInfo) => {
    setIsLoading(true);
    setProgress(0);
    setMessage("Initializing...");
    setError(null);
    setStats(initialStats);

    try {
      const accessToken = getAccessToken();
      if (!accessToken) {
        throw new Error("No access token found. Please log in again.");
      }

      // Step 1: Trigger sync to ensure database is up to date
      setMessage("Syncing with Spotify...");
      setProgress(10);

      const syncResponse = await fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          collectionType: collectionInfo.type,
          playlistUri: collectionInfo.uri,
        }),
      });

      if (!syncResponse.ok) {
        const errorData = await syncResponse.json();
        throw new Error(errorData.error || "Sync failed");
      }

      const syncResult = await syncResponse.json();
      console.log("Sync result:", syncResult);

      setProgress(50);
      setMessage("Loading tracks from database...");

      // Step 2: Load tracks from database
      const tracksResponse = await fetch("/api/tracks?limit=10000");

      if (!tracksResponse.ok) {
        throw new Error("Failed to load tracks from database");
      }

      const tracksData = await tracksResponse.json();
      const dbTracks = tracksData.tracks;

      if (!dbTracks || dbTracks.length === 0) {
        throw new Error("No tracks found in database");
      }

      setProgress(60);
      setMessage(`Processing ${dbTracks.length} tracks...`);

      // Step 3: Convert database tracks to Track format
      const tracksMap = new Map<string, Track>();
      const categoryBins = initializeCategoryBins();

      for (let i = 0; i < dbTracks.length; i++) {
        const dbTrack = dbTracks[i];

        // Safely extract audio features
        const audioFeatures = dbTrack.audio_features || {};

        // Convert to Track format (matching the Track interface)
        const track: Track = {
          id: dbTrack.id,
          details: {
            id: dbTrack.id,
            name: dbTrack.name || "Unknown Track",
            artists: dbTrack.artists || [],
            album: dbTrack.album || {},
            duration_ms: dbTrack.duration_ms || 0,
            explicit: dbTrack.explicit || false,
            popularity: dbTrack.popularity || 0,
            preview_url: dbTrack.preview_url || null,
            uri: `spotify:track:${dbTrack.id}`,
          },
          feats: {
            // Audio features from SoundCharts
            id: dbTrack.id,
            tempo: audioFeatures.tempo,
            energy: audioFeatures.energy,
            danceability: audioFeatures.danceability,
            valence: audioFeatures.valence,
            acousticness: audioFeatures.acousticness,
            instrumentalness: audioFeatures.instrumentalness,
            liveness: audioFeatures.liveness,
            loudness: audioFeatures.loudness,
            speechiness: audioFeatures.speechiness,
            // Additional metadata
            date_added: dbTrack.added_at
              ? new Date(dbTrack.added_at)
              : new Date(),
            explicit: dbTrack.explicit || false,
            duration_ms: dbTrack.duration_ms || 0,
            popularity: dbTrack.popularity || 0,
            year: dbTrack.album?.release_date
              ? new Date(dbTrack.album.release_date).getFullYear()
              : 0,
            genres: new Set<string>(),
            topGenre: "",
            source: "saved",
            count: 1,
            age: 0,
            sadness: 0,
            happiness: 0,
            anger: 0,
          },
        };

        tracksMap.set(track.id, track);

        // Categorize track
        categorizeTrack(track, categoryBins);

        // Update progress
        if (i % 10 === 0) {
          setProgress(60 + (i / dbTracks.length) * 30);
          setMessage(`Processing tracks... ${i + 1}/${dbTracks.length}`);
        }
      }

      setProgress(90);
      setMessage("Finalizing...");

      // Step 4: Sort bins (sortNodesByTrackCount modifies in-place)
      sortNodesByTrackCount(categoryBins);

      // Step 5: Calculate stats
      const topArtists = new Map<string, number>();
      let topTrackName = "";
      let maxPopularity = 0;

      tracksMap.forEach((track) => {
        // Top track by popularity
        const popularity = track.details.popularity || 0;
        if (popularity > maxPopularity) {
          maxPopularity = popularity;
          topTrackName = track.details.name;
        }

        // Top artists
        if (track.details.artists) {
          track.details.artists.forEach((artist: any) => {
            const count = topArtists.get(artist.name) || 0;
            topArtists.set(artist.name, count + 1);
          });
        }
      });

      // Find most common genre from bins
      const genreBin = categoryBins.find((bin) => bin.name === "genre");
      const topGenre = genreBin?.nodes[0]?.name || "Unknown";

      // Find most common artist
      let topArtist = "";
      let maxCount = 0;
      topArtists.forEach((count, artist) => {
        if (count > maxCount) {
          maxCount = count;
          topArtist = artist;
        }
      });

      setStats({
        totalTracks: dbTracks.length,
        processedTracks: dbTracks.length,
        cached: syncResult.cachedTracks || dbTracks.length,
        newFromSpotify: syncResult.newTracks || 0,
        fetchedFromSoundCharts: syncResult.soundchartsFetched || 0,
        failed: syncResult.failedTracks || 0,
        topArtist,
        topTrack: topTrackName,
        topGenre,
      });

      setTracks(tracksMap);
      setBins(categoryBins);
      setProgress(100);
      setMessage("Complete!");
      setIsLoading(false);
    } catch (err) {
      console.error("Error loading music:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
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

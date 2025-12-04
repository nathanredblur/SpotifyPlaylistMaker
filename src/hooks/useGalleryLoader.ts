/**
 * Gallery Loader Hook
 * Loads tracks from the public gallery API (no authentication required)
 */

import { useState, useCallback } from "react";
import {
  initializeCategoryBins,
  categorizeTrack,
  sortNodesByTrackCount,
} from "@/lib/categorizer";
import type { Track, CategoryBin } from "@/types/spotify";

export interface GalleryStats {
  totalTracks: number;
  tracksWithAudioFeatures: number;
  coveragePercentage: string;
  ownerName: string | null;
  lastUpdated: string | null;
}

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

export interface UseGalleryLoaderResult {
  isLoading: boolean;
  progress: number;
  message: string;
  stats: LoadingStats;
  galleryStats: GalleryStats | null;
  bins: CategoryBin[];
  tracks: Map<string, Track>;
  error: string | null;
  loadGallery: () => Promise<void>;
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

export function useGalleryLoader(): UseGalleryLoaderResult {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState<LoadingStats>(initialStats);
  const [galleryStats, setGalleryStats] = useState<GalleryStats | null>(null);
  const [bins, setBins] = useState<CategoryBin[]>([]);
  const [tracks, setTracks] = useState<Map<string, Track>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
    setProgress(0);
    setMessage("");
  }, []);

  const loadGallery = useCallback(async () => {
    setIsLoading(true);
    setProgress(0);
    setMessage("Loading gallery...");
    setError(null);
    setStats(initialStats);

    try {
      // Step 1: Fetch gallery stats first
      setMessage("Fetching gallery info...");
      setProgress(10);

      const statsResponse = await fetch("/api/gallery/stats");
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setGalleryStats({
          totalTracks: statsData.gallery.totalTracks,
          tracksWithAudioFeatures: statsData.gallery.tracksWithAudioFeatures,
          coveragePercentage: statsData.gallery.coveragePercentage,
          ownerName: statsData.owner?.displayName || null,
          lastUpdated: statsData.lastUpdated,
        });
      }

      // Step 2: Load all tracks from gallery
      setProgress(20);
      setMessage("Loading tracks...");

      // Fetch all tracks (paginated)
      let allTracks: Array<Record<string, unknown>> = [];
      let offset = 0;
      const limit = 500;
      let hasMore = true;

      while (hasMore) {
        const tracksResponse = await fetch(
          `/api/gallery/tracks?limit=${limit}&offset=${offset}`
        );

        if (!tracksResponse.ok) {
          throw new Error("Failed to load gallery tracks");
        }

        const tracksData = await tracksResponse.json();
        allTracks = allTracks.concat(tracksData.tracks);

        hasMore = tracksData.pagination.hasMore;
        offset += limit;

        // Update progress based on how many tracks we've loaded
        const loadProgress = Math.min(
          20 + (allTracks.length / (tracksData.pagination.total || 1)) * 30,
          50
        );
        setProgress(loadProgress);
        setMessage(`Loading tracks... ${allTracks.length}/${tracksData.pagination.total}`);
      }

      if (allTracks.length === 0) {
        setMessage("Gallery is empty");
        setIsLoading(false);
        return;
      }

      setProgress(50);
      setMessage(`Processing ${allTracks.length} tracks...`);

      // Step 3: Convert gallery tracks to Track format
      const tracksMap = new Map<string, Track>();
      const categoryBins = initializeCategoryBins();

      for (let i = 0; i < allTracks.length; i++) {
        const galleryTrack = allTracks[i] as {
          id: string;
          name: string;
          artists?: Array<{ id: string; name: string }>;
          album?: Record<string, unknown>;
          duration_ms?: number;
          explicit?: boolean;
          popularity?: number;
          preview_url?: string | null;
          audio_features?: {
            tempo?: number;
            energy?: number;
            danceability?: number;
            valence?: number;
            acousticness?: number;
            instrumentalness?: number;
            liveness?: number;
            loudness?: number;
            speechiness?: number;
          } | null;
          created_at?: string;
        };

        // Safely extract audio features
        const audioFeatures = galleryTrack.audio_features || {};

        // Convert to Track format
        const track: Track = {
          id: galleryTrack.id,
          details: {
            id: galleryTrack.id,
            name: galleryTrack.name || "Unknown Track",
            artists: galleryTrack.artists || [],
            album: (galleryTrack.album || {}) as unknown as Track["details"]["album"],
            duration_ms: galleryTrack.duration_ms || 0,
            explicit: galleryTrack.explicit || false,
            popularity: galleryTrack.popularity || 0,
            preview_url: galleryTrack.preview_url || null,
            uri: `spotify:track:${galleryTrack.id}`,
          },
          feats: {
            id: galleryTrack.id,
            tempo: audioFeatures.tempo,
            energy: audioFeatures.energy,
            danceability: audioFeatures.danceability,
            valence: audioFeatures.valence,
            acousticness: audioFeatures.acousticness,
            instrumentalness: audioFeatures.instrumentalness,
            liveness: audioFeatures.liveness,
            loudness: audioFeatures.loudness,
            speechiness: audioFeatures.speechiness,
            date_added: galleryTrack.created_at
              ? new Date(galleryTrack.created_at)
              : new Date(),
            explicit: galleryTrack.explicit || false,
            duration_ms: galleryTrack.duration_ms || 0,
            popularity: galleryTrack.popularity || 0,
            year:
              galleryTrack.album && typeof galleryTrack.album === "object" && "release_date" in galleryTrack.album
                ? new Date(galleryTrack.album.release_date as string).getFullYear()
                : 0,
            genres: new Set<string>(),
            topGenre: "",
            source: "gallery",
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
        if (i % 50 === 0) {
          setProgress(50 + (i / allTracks.length) * 40);
          setMessage(`Processing tracks... ${i + 1}/${allTracks.length}`);
        }
      }

      setProgress(90);
      setMessage("Finalizing...");

      // Step 4: Sort bins
      sortNodesByTrackCount(categoryBins);

      // Step 5: Calculate stats
      const topArtists = new Map<string, number>();
      let topTrackName = "";
      let maxPopularity = 0;

      tracksMap.forEach((track) => {
        const popularity = track.details.popularity || 0;
        if (popularity > maxPopularity) {
          maxPopularity = popularity;
          topTrackName = track.details.name;
        }

        if (track.details.artists) {
          track.details.artists.forEach((artist) => {
            const count = topArtists.get(artist.name) || 0;
            topArtists.set(artist.name, count + 1);
          });
        }
      });

      const genreBin = categoryBins.find((bin) => bin.name === "genre");
      const topGenre = genreBin?.nodes[0]?.name || "Unknown";

      let topArtist = "";
      let maxCount = 0;
      topArtists.forEach((count, artist) => {
        if (count > maxCount) {
          maxCount = count;
          topArtist = artist;
        }
      });

      setStats({
        totalTracks: allTracks.length,
        processedTracks: allTracks.length,
        cached: allTracks.length,
        newFromSpotify: 0,
        fetchedFromSoundCharts: 0,
        failed: 0,
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
      console.error("Error loading gallery:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    progress,
    message,
    stats,
    galleryStats,
    bins,
    tracks,
    error,
    loadGallery,
    stopLoading,
  };
}


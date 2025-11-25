import { useState, useCallback } from "react";
import { SpotifyAPI } from "@/lib/spotify-api";
import {
  processTrackItem,
  enrichTrackWithAudioFeatures,
  enrichTrackWithArtistGenres,
  enrichTrackWithAlbumData,
  chunkArray,
  uniqueBy,
} from "@/lib/track-processor";
import {
  initializeCategoryBins,
  addGenreNode,
  addSourceNode,
  categorizeTrack,
  sortNodesByTrackCount,
} from "@/lib/categorizer";
import type {
  Track,
  CategoryBin,
  CollectionInfo,
  SpotifyArtist,
  SpotifyAlbum,
} from "@/types/spotify";

export interface LoadingStats {
  totalTracks: number;
  processedTracks: number;
  totalPlaylists: number;
  processedPlaylists: number;
  currentPlaylist: string;
  topArtist: string;
  topTrack: string;
  topGenre: string;
}

export interface UseMusicLoaderResult {
  isLoading: boolean;
  progress: number;
  stats: LoadingStats;
  bins: CategoryBin[];
  tracks: Map<string, Track>;
  error: string | null;
  loadMusic: (
    api: SpotifyAPI,
    collectionInfo: CollectionInfo,
    userId: string
  ) => Promise<void>;
  stopLoading: () => void;
}

export function useMusicLoader(): UseMusicLoaderResult {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<LoadingStats>({
    totalTracks: 0,
    processedTracks: 0,
    totalPlaylists: 0,
    processedPlaylists: 0,
    currentPlaylist: "",
    topArtist: "",
    topTrack: "",
    topGenre: "",
  });
  const [bins, setBins] = useState<CategoryBin[]>([]);
  const [tracks, setTracks] = useState<Map<string, Track>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [shouldStop, setShouldStop] = useState(false);

  const stopLoading = useCallback(() => {
    setShouldStop(true);
  }, []);

  const loadMusic = useCallback(
    async (api: SpotifyAPI, collectionInfo: CollectionInfo, userId: string) => {
      setIsLoading(true);
      setError(null);
      setShouldStop(false);
      setProgress(0);

      const categoryBins = initializeCategoryBins();
      const trackMap = new Map<string, Track>();
      const artistMap = new Map<string, SpotifyArtist>();
      const albumMap = new Map<string, SpotifyAlbum>();

      try {
        // Load based on collection type
        switch (collectionInfo.type) {
          case "saved":
            await loadSavedTracks(
              api,
              categoryBins,
              trackMap,
              artistMap,
              albumMap
            );
            break;

          case "playlist":
            if (collectionInfo.uri) {
              await loadPlaylistTracks(
                api,
                collectionInfo.uri,
                categoryBins,
                trackMap,
                artistMap,
                albumMap
              );
            }
            break;

          case "added":
            await loadUserPlaylistTracks(
              api,
              userId,
              false,
              categoryBins,
              trackMap,
              artistMap,
              albumMap
            );
            break;

          case "follow":
            await loadUserPlaylistTracks(
              api,
              userId,
              true,
              categoryBins,
              trackMap,
              artistMap,
              albumMap
            );
            break;

          case "all":
            await loadSavedTracks(
              api,
              categoryBins,
              trackMap,
              artistMap,
              albumMap
            );
            if (!shouldStop) {
              await loadUserPlaylistTracks(
                api,
                userId,
                true,
                categoryBins,
                trackMap,
                artistMap,
                albumMap
              );
            }
            break;
        }

        // Sort bins by track count
        sortNodesByTrackCount(categoryBins);

        setBins(categoryBins);
        setTracks(trackMap);
        setProgress(100);
      } catch (err) {
        console.error("Error loading music:", err);
        setError(err instanceof Error ? err.message : "Failed to load music");
      } finally {
        setIsLoading(false);
      }
    },
    [shouldStop]
  );

  // Helper: Load saved tracks
  async function loadSavedTracks(
    api: SpotifyAPI,
    categoryBins: CategoryBin[],
    trackMap: Map<string, Track>,
    artistMap: Map<string, SpotifyArtist>,
    albumMap: Map<string, SpotifyAlbum>
  ): Promise<void> {
    setStats((prev) => ({ ...prev, currentPlaylist: "Your Saved Tracks" }));

    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore && !shouldStop) {
      const response = await api.getSavedTracks(limit, offset);

      // Process tracks
      const newTracks = response.items
        .map((item) => processTrackItem(item, "Your Saved Tracks"))
        .filter((t): t is Track => t !== null);

      await enrichTracks(
        newTracks,
        api,
        categoryBins,
        trackMap,
        artistMap,
        albumMap
      );

      offset += response.items.length;
      hasMore = response.next !== null;

      setProgress((offset / response.total) * 100);
      setStats((prev) => ({
        ...prev,
        totalTracks: response.total,
        processedTracks: offset,
      }));
    }
  }

  // Helper: Load specific playlist
  async function loadPlaylistTracks(
    api: SpotifyAPI,
    playlistUri: string,
    categoryBins: CategoryBin[],
    trackMap: Map<string, Track>,
    artistMap: Map<string, SpotifyArtist>,
    albumMap: Map<string, SpotifyAlbum>
  ): Promise<void> {
    const playlistId = extractPlaylistId(playlistUri);
    if (!playlistId) {
      throw new Error("Invalid playlist URI");
    }

    setStats((prev) => ({ ...prev, currentPlaylist: "Your Playlist" }));

    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore && !shouldStop) {
      const response = await api.getPlaylistTracks(playlistId, limit, offset);

      const newTracks = response.items
        .map((item) => processTrackItem(item, "Your Playlist"))
        .filter((t): t is Track => t !== null);

      await enrichTracks(
        newTracks,
        api,
        categoryBins,
        trackMap,
        artistMap,
        albumMap
      );

      offset += response.items.length;
      hasMore = response.next !== null;

      setProgress((offset / response.total) * 100);
      setStats((prev) => ({
        ...prev,
        totalTracks: response.total,
        processedTracks: offset,
      }));
    }
  }

  // Helper: Load user playlists
  async function loadUserPlaylistTracks(
    api: SpotifyAPI,
    userId: string,
    includeFollowed: boolean,
    categoryBins: CategoryBin[],
    trackMap: Map<string, Track>,
    artistMap: Map<string, SpotifyArtist>,
    albumMap: Map<string, SpotifyAlbum>
  ): Promise<void> {
    // Get all playlists
    const playlists = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore && !shouldStop) {
      const response = await api.getUserPlaylists(50, offset);
      playlists.push(...response.items);
      offset += response.items.length;
      hasMore = response.next !== null;
    }

    // Filter playlists
    const filteredPlaylists = playlists.filter((playlist) => {
      if (includeFollowed) {
        return playlist.tracks.total > 0;
      }
      return playlist.owner.id === userId && playlist.tracks.total > 0;
    });

    setStats((prev) => ({
      ...prev,
      totalPlaylists: filteredPlaylists.length,
    }));

    // Load tracks from each playlist
    for (const playlist of filteredPlaylists) {
      if (shouldStop) break;

      setStats((prev) => ({
        ...prev,
        currentPlaylist: playlist.name,
        processedPlaylists: prev.processedPlaylists + 1,
      }));

      let playlistOffset = 0;
      let playlistHasMore = true;

      while (playlistHasMore && !shouldStop) {
        const response = await api.getPlaylistTracks(
          playlist.id,
          50,
          playlistOffset
        );

        const newTracks = response.items
          .map((item) => processTrackItem(item, playlist.name))
          .filter((t): t is Track => t !== null);

        await enrichTracks(
          newTracks,
          api,
          categoryBins,
          trackMap,
          artistMap,
          albumMap
        );

        playlistOffset += response.items.length;
        playlistHasMore = response.next !== null;

        const overallProgress =
          (stats.processedPlaylists / stats.totalPlaylists) * 100;
        setProgress(overallProgress);
      }
    }
  }

  // Helper: Enrich tracks with audio features, artists, and albums
  async function enrichTracks(
    newTracks: Track[],
    api: SpotifyAPI,
    categoryBins: CategoryBin[],
    trackMap: Map<string, Track>,
    artistMap: Map<string, SpotifyArtist>,
    albumMap: Map<string, SpotifyAlbum>
  ): Promise<void> {
    if (newTracks.length === 0) return;

    // Get audio features in batches
    const trackIds = newTracks.map((t) => t.id);
    const audioFeaturesChunks = chunkArray(trackIds, 100);

    for (const chunk of audioFeaturesChunks) {
      try {
        const response = await api.getAudioFeatures(chunk);
        response.audio_features.forEach((feature, index) => {
          const track = newTracks.find((t) => t.id === chunk[index]);
          if (track) {
            enrichTrackWithAudioFeatures(track, feature);
          }
        });
      } catch (error) {
        console.error("Error fetching audio features:", error);
        console.warn(
          `Skipping audio features for ${chunk.length} tracks. ` +
            `This usually happens if your Spotify app is in Development mode. ` +
            `Tracks will still be loaded but without audio analysis data.`
        );
        // Continue without audio features - tracks will still work
      }
    }

    // Get unique artist IDs
    const artistIds = uniqueBy(
      newTracks.flatMap((t) => t.details.artists),
      (a) => a.id
    )
      .map((a) => a.id)
      .filter((id) => !artistMap.has(id));

    // Fetch artists in batches
    const artistChunks = chunkArray(artistIds, 50);
    for (const chunk of artistChunks) {
      const response = await api.getArtists(chunk);
      response.artists.forEach((artist) => {
        if (artist) {
          artistMap.set(artist.id, artist);
        }
      });
    }

    // Get unique album IDs
    const albumIds = uniqueBy(newTracks, (t) => t.details.album.id)
      .map((t) => t.details.album.id)
      .filter((id) => !albumMap.has(id));

    // Fetch albums in batches
    const albumChunks = chunkArray(albumIds, 20);
    for (const chunk of albumChunks) {
      const response = await api.getAlbums(chunk);
      response.albums.forEach((album) => {
        if (album) {
          albumMap.set(album.id, album);
        }
      });
    }

    // Enrich tracks with artist and album data
    newTracks.forEach((track) => {
      enrichTrackWithArtistGenres(track, artistMap);
      enrichTrackWithAlbumData(track, albumMap);

      // Add genre and source nodes dynamically
      track.feats.genres?.forEach((genre) => {
        addGenreNode(categoryBins, genre);
      });
      if (track.feats.source) {
        addSourceNode(categoryBins, track.feats.source);
      }

      // Categorize track
      categorizeTrack(track, categoryBins);

      // Add to track map (or update count if duplicate)
      const existing = trackMap.get(track.id);
      if (existing) {
        existing.feats.count = (existing.feats.count || 0) + 1;
      } else {
        trackMap.set(track.id, track);
      }
    });

    // Update stats with top items
    updateTopStats(trackMap, categoryBins);
  }

  // Helper: Update top stats
  function updateTopStats(
    trackMap: Map<string, Track>,
    categoryBins: CategoryBin[]
  ): void {
    // Find top artist (most tracks)
    const artistCounts = new Map<string, { name: string; count: number }>();
    trackMap.forEach((track) => {
      if (track.details.artists.length > 0) {
        const artist = track.details.artists[0];
        const current = artistCounts.get(artist.id) || {
          name: artist.name,
          count: 0,
        };
        artistCounts.set(artist.id, { ...current, count: current.count + 1 });
      }
    });

    let topArtist = "";
    let maxArtistCount = 0;
    artistCounts.forEach((data) => {
      if (data.count > maxArtistCount) {
        maxArtistCount = data.count;
        topArtist = data.name;
      }
    });

    // Find top track (highest count)
    let topTrack = "";
    let maxTrackCount = 0;
    trackMap.forEach((track) => {
      const count = track.feats.count || 0;
      if (count > maxTrackCount) {
        maxTrackCount = count;
        topTrack = track.details.name;
      }
    });

    // Find top genre
    const genreBin = categoryBins.find((bin) => bin.name === "Genres");
    const topGenre =
      genreBin && genreBin.nodes.length > 0 ? genreBin.nodes[0].name : "";

    setStats((prev) => ({
      ...prev,
      topArtist,
      topTrack,
      topGenre,
    }));
  }

  // Helper: Extract playlist ID from URI
  function extractPlaylistId(uri: string): string | null {
    const parts = uri.split(":");
    if (parts.length === 3) {
      return parts[2];
    } else if (parts.length === 5) {
      return parts[4];
    }
    return null;
  }

  return {
    isLoading,
    progress,
    stats,
    bins,
    tracks,
    error,
    loadMusic,
    stopLoading,
  };
}

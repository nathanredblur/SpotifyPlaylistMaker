/**
 * MELO Layout Component
 * Main layout wrapper with three-column structure
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { Header } from "./Header";
import { LeftSidebar } from "./LeftSidebar";
import { RightSidebar } from "./RightSidebar";
import { Footer } from "./Footer";
import { TrackList } from "./TrackList";
import { SpotifyEmbedPlayer } from "./SpotifyEmbedPlayer";
import { useOptionalSpotifyPlayer } from "@/contexts/SpotifyPlayerContext";
import type { Track, CategoryBin } from "@/types/spotify";

interface MeloLayoutProps {
  tracks: Map<string, Track>;
  bins: CategoryBin[];
  adminName?: string;
}

type FilterType =
  | "all"
  | "genres"
  | "moods"
  | "decades"
  | "popularity"
  | "duration";

interface Filter {
  type: FilterType;
  value?: string;
}

export function MeloLayout({ tracks, bins, adminName }: MeloLayoutProps) {
  // Spotify Player (optional - only works with Premium)
  const spotifyPlayer = useOptionalSpotifyPlayer();
  const useSpotifyPlayback = spotifyPlayer?.isReady && spotifyPlayer?.isPremium;

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<Filter>({ type: "all" });
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [isShuffled, setIsShuffled] = useState(false);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(
    new Set()
  );
  const [showEmbedPlayer, setShowEmbedPlayer] = useState(false);

  // Filter tracks based on search and category
  const filteredTracks = useMemo(() => {
    let result = Array.from(tracks.values());

    // Apply category filter (case-insensitive bin matching)
    if (activeFilter.type !== "all" && activeFilter.value) {
      const bin = bins.find(
        (b) => b.name.toLowerCase() === activeFilter.type.toLowerCase()
      );
      const node = bin?.nodes.find((n) => n.name === activeFilter.value);
      if (node) {
        // node.tracks is an array of Track objects
        const trackIdsInCategory = new Set(node.tracks.map((t) => t.id));
        result = result.filter((track) => trackIdsInCategory.has(track.id));
      }
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((track) => {
        const name = track.details.name?.toLowerCase() || "";
        const artists =
          track.details.artists?.map((a) => a.name.toLowerCase()).join(" ") ||
          "";
        const album = track.details.album?.name?.toLowerCase() || "";
        return (
          name.includes(query) ||
          artists.includes(query) ||
          album.includes(query)
        );
      });
    }

    return result;
  }, [tracks, bins, activeFilter, searchQuery]);

  const handlePlayTrack = useCallback(
    async (track: Track) => {
      // Use Spotify Web Playback SDK if available
      if (useSpotifyPlayback && spotifyPlayer) {
        const spotifyUri = `spotify:track:${track.id}`;

        if (spotifyPlayer.currentTrack?.id === track.id) {
          // Toggle play/pause for current track
          await spotifyPlayer.togglePlay();
        } else {
          // Play new track
          setCurrentTrack(track);
          await spotifyPlayer.play(spotifyUri);
        }
        return;
      }

      // Fallback: Use Spotify Embed Player (shows 30-second preview)
      setCurrentTrack(track);
      setShowEmbedPlayer(true);
      setIsPlaying(true);
    },
    [useSpotifyPlayback, spotifyPlayer]
  );

  const handlePlayPause = useCallback(async () => {
    if (useSpotifyPlayback && spotifyPlayer) {
      if (spotifyPlayer.isActive) {
        await spotifyPlayer.togglePlay();
      } else if (filteredTracks.length > 0) {
        handlePlayTrack(filteredTracks[0]);
      }
      return;
    }

    // Fallback: Use Spotify Embed
    if (currentTrack) {
      // Embed controls playback itself, just toggle visibility
      setShowEmbedPlayer(true);
    } else if (filteredTracks.length > 0) {
      handlePlayTrack(filteredTracks[0]);
    }
  }, [
    currentTrack,
    isPlaying,
    filteredTracks,
    handlePlayTrack,
    useSpotifyPlayback,
    spotifyPlayer,
  ]);

  const handlePrevious = useCallback(async () => {
    if (useSpotifyPlayback && spotifyPlayer) {
      await spotifyPlayer.previousTrack();
      return;
    }

    // Fallback: manual previous in filtered list
    if (!currentTrack) return;
    const currentIndex = filteredTracks.findIndex(
      (t) => t.id === currentTrack.id
    );
    const prevIndex =
      currentIndex > 0 ? currentIndex - 1 : filteredTracks.length - 1;
    handlePlayTrack(filteredTracks[prevIndex]);
  }, [
    currentTrack,
    filteredTracks,
    handlePlayTrack,
    useSpotifyPlayback,
    spotifyPlayer,
  ]);

  const handleNext = useCallback(async () => {
    if (useSpotifyPlayback && spotifyPlayer) {
      await spotifyPlayer.nextTrack();
      return;
    }

    // Fallback: manual next in filtered list
    if (!currentTrack) return;
    const currentIndex = filteredTracks.findIndex(
      (t) => t.id === currentTrack.id
    );

    let nextIndex: number;
    if (isShuffled) {
      nextIndex = Math.floor(Math.random() * filteredTracks.length);
    } else {
      nextIndex =
        currentIndex < filteredTracks.length - 1 ? currentIndex + 1 : 0;
    }

    handlePlayTrack(filteredTracks[nextIndex]);
  }, [
    currentTrack,
    filteredTracks,
    isShuffled,
    handlePlayTrack,
    useSpotifyPlayback,
    spotifyPlayer,
  ]);

  const handleSeek = useCallback(
    async (time: number) => {
      if (useSpotifyPlayback && spotifyPlayer) {
        // Spotify SDK expects milliseconds
        await spotifyPlayer.seek(time * 1000);
        return;
      }
      // Embed player handles its own seeking via its built-in controls
      setProgress(time);
    },
    [useSpotifyPlayback, spotifyPlayer]
  );

  const handleVolumeChange = useCallback(
    async (newVolume: number) => {
      if (useSpotifyPlayback && spotifyPlayer) {
        await spotifyPlayer.setVolume(newVolume);
      }
      setVolume(newVolume);
    },
    [useSpotifyPlayback, spotifyPlayer]
  );

  const handleSelectTrack = useCallback((trackId: string) => {
    setSelectedTrackIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(trackId)) {
        newSet.delete(trackId);
      } else {
        newSet.add(trackId);
      }
      return newSet;
    });
  }, []);

  const handleOpenInSpotify = useCallback((track: Track) => {
    const spotifyUrl = `https://open.spotify.com/track/${track.id}`;
    window.open(spotifyUrl, "_blank");
  }, []);

  const handleExport = useCallback(() => {
    const selectedTracks = filteredTracks.filter((t) =>
      selectedTrackIds.has(t.id)
    );

    if (selectedTracks.length === 0) {
      alert("Please select tracks to export");
      return;
    }

    const exportData = selectedTracks.map((track) => ({
      name: track.details.name,
      artists: track.details.artists?.map((a) => a.name).join(", "),
      album: track.details.album?.name,
      duration_ms: track.details.duration_ms,
      spotify_url: `https://open.spotify.com/track/${track.id}`,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `melo-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredTracks, selectedTrackIds]);

  const handleOpenCurrentInSpotify = useCallback(() => {
    if (currentTrack) {
      handleOpenInSpotify(currentTrack);
    }
  }, [currentTrack, handleOpenInSpotify]);

  // Sync Spotify player state to local state
  useEffect(() => {
    if (!useSpotifyPlayback || !spotifyPlayer) return;

    // Update local state from Spotify player
    setIsPlaying(!spotifyPlayer.isPaused);
    setVolume(spotifyPlayer.volume);

    // Sync current track from Spotify
    if (spotifyPlayer.currentTrack) {
      const spotifyTrackId = spotifyPlayer.currentTrack.id;
      if (spotifyTrackId && currentTrack?.id !== spotifyTrackId) {
        const trackFromMap = tracks.get(spotifyTrackId);
        if (trackFromMap) {
          setCurrentTrack(trackFromMap);
        }
      }
    }
  }, [
    useSpotifyPlayback,
    spotifyPlayer?.isPaused,
    spotifyPlayer?.volume,
    spotifyPlayer?.currentTrack,
    tracks,
  ]);

  // Compute current playback state
  const displayIsPlaying = useSpotifyPlayback
    ? !spotifyPlayer?.isPaused
    : isPlaying;
  const displayProgress = useSpotifyPlayback
    ? (spotifyPlayer?.position || 0) / 1000
    : progress;
  const displayDuration = useSpotifyPlayback
    ? (spotifyPlayer?.duration || 0) / 1000
    : duration;
  const displayVolume = useSpotifyPlayback
    ? spotifyPlayer?.volume || 0.5
    : volume;
  const noPreviewAvailable =
    !useSpotifyPlayback && currentTrack && !currentTrack.details.preview_url;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <Header
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        galleryOwnerName={adminName}
        isPremium={spotifyPlayer?.isPremium}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <LeftSidebar
          bins={bins}
          totalTracks={tracks.size}
          activeFilter={activeFilter}
          onFilterChange={(filter) => setActiveFilter(filter as Filter)}
        />

        {/* Main Track List */}
        <main className="flex-1 min-w-0 overflow-hidden bg-background">
          <TrackList
            tracks={filteredTracks}
            currentTrackId={currentTrack?.id || null}
            isPlaying={isPlaying}
            selectedTrackIds={selectedTrackIds}
            onPlayTrack={handlePlayTrack}
            onSelectTrack={handleSelectTrack}
            onOpenInSpotify={handleOpenInSpotify}
          />
        </main>

        {/* Right Sidebar - visible on xl screens (1280px+) */}
        <div className="hidden lg:block">
          <RightSidebar tracks={tracks} bins={bins} />
        </div>
      </div>

      {/* Footer Player */}
      <Footer
        currentTrack={currentTrack}
        isPlaying={displayIsPlaying}
        progress={displayProgress}
        duration={displayDuration}
        volume={displayVolume}
        isShuffled={isShuffled}
        selectedCount={selectedTrackIds.size}
        onPlayPause={handlePlayPause}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onShuffle={() => setIsShuffled(!isShuffled)}
        onExport={handleExport}
        onOpenInSpotify={handleOpenCurrentInSpotify}
        isSpotifyConnected={useSpotifyPlayback || false}
        spotifyError={spotifyPlayer?.error}
        noPreviewAvailable={!useSpotifyPlayback}
      />

      {/* Spotify Embed Player (fallback for non-Premium users) */}
      {!useSpotifyPlayback && (
        <SpotifyEmbedPlayer
          trackId={currentTrack?.id || null}
          isVisible={showEmbedPlayer && currentTrack !== null}
          onClose={() => setShowEmbedPlayer(false)}
        />
      )}
    </div>
  );
}

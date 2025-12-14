/**
 * MELO Layout Component
 * Main layout wrapper with three-column structure
 */

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Header } from "./Header";
import { LeftSidebar } from "./LeftSidebar";
import { RightSidebar } from "./RightSidebar";
import { Footer } from "./Footer";
import { TrackList } from "./TrackList";
import { SpotifyEmbedPlayer } from "./SpotifyEmbedPlayer";
import { SortControls, type SortConfig } from "./SortControls";
import { AdvancedFilters, type AdvancedFiltersConfig } from "./AdvancedFilters";
import { ColumnSelector, useColumnVisibility } from "./ColumnSelector";
import { WelcomeDialog } from "./WelcomeDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useOptionalSpotifyPlayer } from "@/contexts/SpotifyPlayerContext";
import { useUrlState, type Filter, type FilterType } from "@/hooks/useUrlState";
import type { Track, CategoryBin } from "@/types/spotify";

interface MeloLayoutProps {
  tracks: Map<string, Track>;
  bins: CategoryBin[];
  adminName?: string;
}

export function MeloLayout({ tracks, bins, adminName }: MeloLayoutProps) {
  // Spotify Player (optional - only works with Premium)
  const spotifyPlayer = useOptionalSpotifyPlayer();
  const useSpotifyPlayback = spotifyPlayer?.isReady && spotifyPlayer?.isPremium;

  // URL State - initialize from URL params
  const { urlState, updateUrl } = useUrlState();
  const initializedRef = useRef(false);

  // Column visibility
  const { visibleColumns, toggleColumn, resetToDefaults } =
    useColumnVisibility();

  // State - initialized from URL
  const [searchQuery, setSearchQuery] = useState(urlState.search);
  const [activeFilter, setActiveFilter] = useState<Filter>(urlState.filter);
  const [sortConfig, setSortConfig] = useState<SortConfig>(urlState.sort);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFiltersConfig>(
    urlState.advancedFilters
  );
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [isShuffled, setIsShuffled] = useState(false);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(
    new Set()
  );

  // Dialog states
  const [showWelcome, setShowWelcome] = useState(false);
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({ open: false, title: "", message: "" });

  // Filter and sort tracks
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

    // Apply advanced filters
    if (Object.keys(advancedFilters).length > 0) {
      result = result.filter((track) => {
        const feats = track.feats;
        const details = track.details;

        for (const [key, range] of Object.entries(advancedFilters)) {
          if (!range) continue;

          let value: number | undefined;

          // Get the value based on key
          switch (key) {
            case "energy":
            case "danceability":
            case "valence":
            case "acousticness":
            case "instrumentalness":
            case "liveness":
            case "speechiness":
            case "tempo":
            case "loudness":
            case "happiness":
            case "sadness":
            case "anger":
              value = feats?.[key as keyof typeof feats] as number | undefined;
              break;
            case "popularity":
              value = details.popularity;
              break;
            case "duration":
              value = details.duration_ms;
              break;
          }

          if (value === undefined) continue;
          if (value < range.min || value > range.max) return false;
        }

        return true;
      });
    }

    // Apply sorting
    if (sortConfig.field !== "default") {
      result = [...result].sort((a, b) => {
        let aVal: string | number = 0;
        let bVal: string | number = 0;

        switch (sortConfig.field) {
          case "name":
            aVal = a.details.name || "";
            bVal = b.details.name || "";
            break;
          case "artist":
            aVal = a.details.artists?.[0]?.name || "";
            bVal = b.details.artists?.[0]?.name || "";
            break;
          case "album":
            aVal = a.details.album?.name || "";
            bVal = b.details.album?.name || "";
            break;
          case "decade": {
            // Extract year from release date and get decade
            const aYear = a.details.album?.release_date
              ? parseInt(a.details.album.release_date.substring(0, 4), 10)
              : 0;
            const bYear = b.details.album?.release_date
              ? parseInt(b.details.album.release_date.substring(0, 4), 10)
              : 0;
            aVal = aYear;
            bVal = bYear;
            break;
          }
          case "popularity":
            aVal = a.details.popularity || 0;
            bVal = b.details.popularity || 0;
            break;
          case "duration":
            aVal = a.details.duration_ms || 0;
            bVal = b.details.duration_ms || 0;
            break;
          // Audio features
          case "tempo":
          case "energy":
          case "danceability":
          case "valence":
          case "acousticness":
          case "instrumentalness":
          case "liveness":
          case "loudness":
          case "speechiness":
          case "happiness":
          case "sadness":
          case "anger":
            aVal =
              (a.feats?.[sortConfig.field as keyof typeof a.feats] as number) ||
              0;
            bVal =
              (b.feats?.[sortConfig.field as keyof typeof b.feats] as number) ||
              0;
            break;
        }

        // Compare
        if (typeof aVal === "string" && typeof bVal === "string") {
          // Handle empty strings - push to end for ascending, start for descending
          if (aVal === "" && bVal !== "")
            return sortConfig.direction === "asc" ? 1 : -1;
          if (aVal !== "" && bVal === "")
            return sortConfig.direction === "asc" ? -1 : 1;

          // Use localeCompare with numeric option for natural sorting
          const comparison = aVal.localeCompare(bVal, undefined, {
            numeric: true,
            sensitivity: "base",
          });
          return sortConfig.direction === "asc" ? comparison : -comparison;
        }

        const comparison = (aVal as number) - (bVal as number);
        return sortConfig.direction === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [tracks, bins, activeFilter, searchQuery, advancedFilters, sortConfig]);

  // Create a Map for O(1) track lookup by ID
  const tracksById = useMemo(() => {
    const map = new Map<string, Track>();
    for (const track of filteredTracks) {
      map.set(track.id, track);
    }
    return map;
  }, [filteredTracks]);

  const handlePlayTrackById = useCallback(
    async (trackId: string) => {
      const track = tracksById.get(trackId);
      if (!track) return;

      // Check if track is playable
      if (track.details.is_playable === false) {
        // Skip to next playable track
        const currentIndex = filteredTracks.findIndex((t) => t.id === trackId);
        if (currentIndex !== -1) {
          for (let i = 1; i < filteredTracks.length; i++) {
            const nextIndex = (currentIndex + i) % filteredTracks.length;
            const nextTrack = filteredTracks[nextIndex];
            if (nextTrack.details.is_playable !== false) {
              handlePlayTrackById(nextTrack.id);
              return;
            }
          }
        }
        return;
      }

      // Use Spotify Web Playback SDK if available
      if (useSpotifyPlayback && spotifyPlayer) {
        const spotifyUri = `spotify:track:${trackId}`;

        if (spotifyPlayer.currentTrack?.id === trackId) {
          await spotifyPlayer.togglePlay();
        } else {
          setCurrentTrack(track);
          await spotifyPlayer.play(spotifyUri);
        }
        return;
      }

      // Fallback: Use Spotify Embed Player
      setCurrentTrack(track);
      setIsPlaying(true);
    },
    [useSpotifyPlayback, spotifyPlayer, filteredTracks, tracksById]
  );

  const handlePlayPause = useCallback(async () => {
    if (useSpotifyPlayback && spotifyPlayer) {
      if (spotifyPlayer.isActive) {
        await spotifyPlayer.togglePlay();
      } else if (filteredTracks.length > 0) {
        handlePlayTrackById(filteredTracks[0].id);
      }
      return;
    }

    // Fallback: Use Spotify Embed
    if (!currentTrack && filteredTracks.length > 0) {
      handlePlayTrackById(filteredTracks[0].id);
    }
  }, [
    currentTrack,
    filteredTracks,
    handlePlayTrackById,
    useSpotifyPlayback,
    spotifyPlayer,
  ]);

  const handlePrevious = useCallback(async () => {
    if (!currentTrack || filteredTracks.length === 0) return;

    const currentIndex = filteredTracks.findIndex(
      (t) => t.id === currentTrack.id
    );
    const prevIndex =
      currentIndex > 0 ? currentIndex - 1 : filteredTracks.length - 1;
    handlePlayTrackById(filteredTracks[prevIndex].id);
  }, [currentTrack, filteredTracks, handlePlayTrackById]);

  const handleNext = useCallback(async () => {
    if (!currentTrack || filteredTracks.length === 0) return;

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

    handlePlayTrackById(filteredTracks[nextIndex].id);
  }, [currentTrack, filteredTracks, isShuffled, handlePlayTrackById]);

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

  const handleSelectAll = useCallback(() => {
    setSelectedTrackIds(new Set(filteredTracks.map((t) => t.id)));
  }, [filteredTracks]);

  const handleDeselectAll = useCallback(() => {
    setSelectedTrackIds(new Set());
  }, []);

  const handleOpenInSpotify = useCallback((trackId: string) => {
    window.open(`https://open.spotify.com/track/${trackId}`, "_blank");
  }, []);

  const handleExport = useCallback(() => {
    const selectedTracks = filteredTracks.filter((t) =>
      selectedTrackIds.has(t.id)
    );

    if (selectedTracks.length === 0) {
      setErrorDialog({
        open: true,
        title: "No tracks selected",
        message:
          "Please select at least one track before exporting. Click the checkbox next to tracks or use 'Select All' to select the entire list.",
      });
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
      handleOpenInSpotify(currentTrack.id);
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

  // Auto-advance to next track when current track ends (Premium mode)
  useEffect(() => {
    if (useSpotifyPlayback && spotifyPlayer?.trackEnded && currentTrack) {
      spotifyPlayer.resetTrackEnded();
      handleNext();
    }
  }, [useSpotifyPlayback, spotifyPlayer?.trackEnded, currentTrack, handleNext]);

  // Sync state to URL (debounced to avoid too many history updates)
  useEffect(() => {
    // Skip the first render to avoid overwriting URL on mount
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }

    const timeoutId = setTimeout(() => {
      updateUrl({
        filter: activeFilter,
        sort: sortConfig,
        advancedFilters,
        search: searchQuery,
      });
    }, 300); // Debounce 300ms

    return () => clearTimeout(timeoutId);
  }, [activeFilter, sortConfig, advancedFilters, searchQuery, updateUrl]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <Header
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        galleryOwnerName={adminName}
        isPremium={spotifyPlayer?.isPremium}
        onHelpClick={() => setShowWelcome(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <LeftSidebar
          bins={bins}
          totalTracks={tracks.size}
          activeFilter={activeFilter}
          onFilterChange={(filter) =>
            setActiveFilter(filter as { type: FilterType; value?: string })
          }
        />

        {/* Main Track List */}
        <main className="flex-1 min-w-0 overflow-hidden bg-background">
          <TrackList
            tracks={filteredTracks}
            currentTrackId={currentTrack?.id || null}
            isPlaying={isPlaying}
            selectedTrackIds={selectedTrackIds}
            visibleColumns={visibleColumns}
            onPlayTrack={handlePlayTrackById}
            onSelectTrack={handleSelectTrack}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onOpenInSpotify={handleOpenInSpotify}
            controls={
              <>
                <SortControls sort={sortConfig} onSortChange={setSortConfig} />
                <AdvancedFilters
                  filters={advancedFilters}
                  onFiltersChange={setAdvancedFilters}
                />
                <ColumnSelector
                  visibleColumns={visibleColumns}
                  onToggleColumn={toggleColumn}
                  onReset={resetToDefaults}
                />
              </>
            }
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
        embedPlayer={
          !useSpotifyPlayback && currentTrack ? (
            <SpotifyEmbedPlayer
              trackId={currentTrack.id}
              onTrackEnd={handleNext}
            />
          ) : undefined
        }
      />

      {/* Welcome Dialog */}
      <WelcomeDialog
        forceOpen={showWelcome}
        onClose={() => setShowWelcome(false)}
      />

      {/* Error Dialog */}
      <AlertDialog
        open={errorDialog.open}
        onOpenChange={(open) => setErrorDialog((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{errorDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {errorDialog.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

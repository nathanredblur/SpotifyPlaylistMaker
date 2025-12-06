/**
 * MELO Layout Component
 * Main layout wrapper with three-column structure
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Header } from "./Header";
import { LeftSidebar } from "./LeftSidebar";
import { RightSidebar } from "./RightSidebar";
import { Footer } from "./Footer";
import { TrackList } from "./TrackList";
import { cn } from "@/lib/utils";
import type { Track, CategoryBin } from "@/types/spotify";

interface MeloLayoutProps {
  tracks: Map<string, Track>;
  bins: CategoryBin[];
  adminImageUrl?: string | null;
  adminName?: string;
  adminBio?: string;
}

type FilterType = "all" | "genre" | "mood" | "decade" | "popularity" | "duration" | "added";

interface Filter {
  type: FilterType;
  value?: string;
}

export function MeloLayout({
  tracks,
  bins,
  adminImageUrl,
  adminName,
  adminBio,
}: MeloLayoutProps) {
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<Filter>({ type: "all" });
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [isShuffled, setIsShuffled] = useState(false);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());

  // Audio ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Filter tracks based on search and category
  const filteredTracks = useMemo(() => {
    let result = Array.from(tracks.values());

    // Apply category filter (case-insensitive bin matching)
    if (activeFilter.type !== "all" && activeFilter.value) {
      const bin = bins.find((b) => b.name.toLowerCase() === activeFilter.type.toLowerCase());
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

  // Audio player handlers
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;

      audioRef.current.addEventListener("timeupdate", () => {
        setProgress(audioRef.current?.currentTime || 0);
      });

      audioRef.current.addEventListener("loadedmetadata", () => {
        setDuration(audioRef.current?.duration || 0);
      });

      audioRef.current.addEventListener("ended", () => {
        handleNext();
      });
    }

    return () => {
      audioRef.current?.pause();
    };
  }, []);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const handlePlayTrack = useCallback(
    (track: Track) => {
      if (currentTrack?.id === track.id) {
        // Toggle play/pause
        if (isPlaying) {
          audioRef.current?.pause();
          setIsPlaying(false);
        } else {
          audioRef.current?.play();
          setIsPlaying(true);
        }
      } else {
        // Play new track
        setCurrentTrack(track);
        setProgress(0);

        if (track.details.preview_url && audioRef.current) {
          audioRef.current.src = track.details.preview_url;
          audioRef.current.play();
          setIsPlaying(true);
        } else {
          setIsPlaying(false);
        }
      }
    },
    [currentTrack, isPlaying]
  );

  const handlePlayPause = useCallback(() => {
    if (currentTrack) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
      }
    } else if (filteredTracks.length > 0) {
      handlePlayTrack(filteredTracks[0]);
    }
  }, [currentTrack, isPlaying, filteredTracks, handlePlayTrack]);

  const handlePrevious = useCallback(() => {
    if (!currentTrack) return;
    const currentIndex = filteredTracks.findIndex(
      (t) => t.id === currentTrack.id
    );
    const prevIndex =
      currentIndex > 0 ? currentIndex - 1 : filteredTracks.length - 1;
    handlePlayTrack(filteredTracks[prevIndex]);
  }, [currentTrack, filteredTracks, handlePlayTrack]);

  const handleNext = useCallback(() => {
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
  }, [currentTrack, filteredTracks, isShuffled, handlePlayTrack]);

  const handleSeek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  }, []);

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

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <Header
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        adminImageUrl={adminImageUrl}
        adminName={adminName}
        adminBio={adminBio}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <LeftSidebar
          bins={bins}
          totalTracks={tracks.size}
          activeFilter={activeFilter}
          onFilterChange={(filter) =>
            setActiveFilter(filter as Filter)
          }
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

        {/* Right Sidebar - hidden on smaller screens */}
        <RightSidebar tracks={tracks} bins={bins} className="hidden 2xl:flex" />
      </div>

      {/* Footer Player */}
      <Footer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        progress={progress}
        duration={duration}
        volume={volume}
        isShuffled={isShuffled}
        selectedCount={selectedTrackIds.size}
        onPlayPause={handlePlayPause}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onSeek={handleSeek}
        onVolumeChange={setVolume}
        onShuffle={() => setIsShuffled(!isShuffled)}
        onExport={handleExport}
        onOpenInSpotify={handleOpenCurrentInSpotify}
      />
    </div>
  );
}


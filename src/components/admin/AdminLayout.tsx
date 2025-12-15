/**
 * Admin Layout Component
 * Main admin dashboard with track management, details panel, and admin footer
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  RefreshCw,
  Music,
  AlertCircle,
  CheckCircle,
  HardDrive,
  LogIn,
  LogOut,
  Home,
  Database,
  PanelRightClose,
  PanelRightOpen,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/melo/GlobalSearch";
import { SortControls, type SortConfig } from "@/components/melo/SortControls";
import {
  AdvancedFilters,
  type AdvancedFiltersConfig,
} from "@/components/melo/AdvancedFilters";
import { MaintenanceDialog } from "./MaintenanceDialog";
import { TrackDetailsPanel } from "./TrackDetailsPanel";
import { AdminTrackList, type QuickFilter } from "./AdminTrackList";
import {
  AdminColumnSelector,
  useAdminColumnVisibility,
} from "./AdminColumnSelector";
import { AdminFooter } from "./AdminFooter";
import { AdminFilters } from "./AdminFilters";
import { TrackEditDialog, type TrackFormData } from "./TrackEditDialog";
import { ADMIN_DASHBOARD, STORAGE_KEYS } from "@/config/constants";
import { authorizeSpotify } from "@/lib/spotify-auth";
import { useSpotifyPlayerContext } from "@/contexts/SpotifyPlayerContext";
import type { Track } from "@/types/spotify";

// ============================================================================
// Types
// ============================================================================

interface DatabaseStats {
  tracks: {
    total: number;
    withSoundCharts: number;
    withoutSoundCharts: number;
    coveragePercentage: string;
  };
  failedRequests: {
    pending: number;
  };
  database: {
    sizeMB: string;
  };
}

interface TrackMeta {
  hasFeatures: boolean;
  hasSoundcharts: boolean;
  isFailed: boolean;
}

// ============================================================================
// Sub-components
// ============================================================================

function StatBadge({
  label,
  value,
  icon: Icon,
  variant = "default",
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  variant?: "default" | "success" | "warning";
}) {
  const variants = {
    default: "bg-secondary text-foreground",
    success: "bg-green-500/20 text-green-400",
    warning: "bg-orange-500/20 text-orange-400",
  };

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${variants[variant]}`}
    >
      <Icon className="w-4 h-4" />
      <span className="text-xs font-medium">{label}:</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function AdminLayout() {
  // Auth state
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Data state
  const [tracks, setTracks] = useState<Map<string, Track>>(new Map());
  const [tracksMeta, setTracksMeta] = useState<Map<string, TrackMeta>>(
    new Map()
  );
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: "default",
    direction: "asc",
  });
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFiltersConfig>(
    {}
  );
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(
    new Set()
  );
  const [showDetailsPanel, setShowDetailsPanel] = useState(true);
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [trackToEdit, setTrackToEdit] = useState<Track | null>(null);

  // Spotify Player from context
  const spotifyPlayer = useSpotifyPlayerContext();
  const isPlaying = !spotifyPlayer.isPaused && !!spotifyPlayer.currentTrack;

  // Column visibility (admin-specific)
  const { visibleColumns, toggleColumn, resetToDefaults } =
    useAdminColumnVisibility();

  // ============================================================================
  // Auth Logic
  // ============================================================================

  useEffect(() => {
    handleAuthAndCheckAccess();
  }, []);

  const handleAuthAndCheckAccess = async () => {
    setAuthChecking(true);
    try {
      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get("access_token");
        const expiresIn = params.get("expires_in");
        const authError = params.get("error");

        if (authError) {
          setIsAdmin(false);
          setAuthChecking(false);
          return;
        }

        if (accessToken) {
          const tokenData = {
            token: accessToken,
            expiresAt: Date.now() + parseInt(expiresIn || "3600") * 1000,
          };
          localStorage.setItem(
            STORAGE_KEYS.ACCESS_TOKEN,
            JSON.stringify(tokenData)
          );
          window.history.replaceState(null, "", window.location.pathname);
          await verifyAdminStatus(accessToken);
          return;
        }
      }

      const tokenData = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!tokenData) {
        setIsAdmin(false);
        setAuthChecking(false);
        return;
      }

      const { token, expiresAt } = JSON.parse(tokenData);
      if (!token || (expiresAt && Date.now() > expiresAt)) {
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        setIsAdmin(false);
        setAuthChecking(false);
        return;
      }

      await verifyAdminStatus(token);
    } catch (err) {
      console.error("Error checking admin access:", err);
      setIsAdmin(false);
      setAuthChecking(false);
    }
  };

  const verifyAdminStatus = async (token: string) => {
    try {
      const response = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.user?.isAdmin === true);
      } else {
        setIsAdmin(false);
      }
    } catch (err) {
      console.error("Error verifying admin status:", err);
      setIsAdmin(false);
    }
    setAuthChecking(false);
  };

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [statsRes, tracksRes, failedRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/gallery/tracks?limit=10000"), // Fetch all tracks for admin
        fetch(
          `/api/failed-tracks?limit=${ADMIN_DASHBOARD.FAILED_TRACKS_PAGE_SIZE}`
        ),
      ]);

      if (!statsRes.ok || !tracksRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const [statsData, tracksData, failedData] = await Promise.all([
        statsRes.json(),
        tracksRes.json(),
        failedRes.ok ? failedRes.json() : { tracks: [] },
      ]);

      setStats(statsData);

      // Build failed tracks set
      const failedTrackIds = new Set(
        failedData.tracks?.map((t: { spotify_id: string }) => t.spotify_id) ||
          []
      );

      // Convert tracks to Map and build metadata
      const tracksMap = new Map<string, Track>();
      const metaMap = new Map<string, TrackMeta>();

      for (const track of tracksData.tracks) {
        const hasFeatures = !!(
          track.audio_features && Object.keys(track.audio_features).length > 0
        );
        const hasSoundcharts = hasFeatures; // Simplified - in reality check soundcharts_data
        const isFailed = failedTrackIds.has(track.id);

        // Compute moods from energy and valence
        const energy = track.audio_features?.energy ?? 0.5;
        const valence = track.audio_features?.valence ?? 0.5;
        const computedHappiness = Math.min(1, (valence + energy) / 2);
        const computedSadness = Math.min(1, (1 - valence + (1 - energy)) / 2);
        const computedAnger = Math.min(1, energy * (1 - valence));

        tracksMap.set(track.id, {
          id: track.id,
          details: {
            id: track.id,
            uri: `spotify:track:${track.id}`,
            name: track.name,
            artists: track.artists,
            album: track.album,
            duration_ms: track.duration_ms,
            popularity: track.popularity,
            explicit: track.explicit,
            external_ids: { isrc: track.isrc },
            is_playable: track.is_playable,
            preview_url: track.preview_url || null,
          },
          feats: {
            ...track.audio_features,
            // Add computed moods
            happiness: computedHappiness,
            sadness: computedSadness,
            anger: computedAnger,
            // Add genres to feats for consistency
            genres: track.genres ? new Set(track.genres) : undefined,
          },
          genres: track.genres ? new Set(track.genres) : undefined,
        } as Track);

        metaMap.set(track.id, { hasFeatures, hasSoundcharts, isFailed });
      }

      setTracks(tracksMap);
      setTracksMeta(metaMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin !== true) return;
    fetchData();

    const interval = setInterval(fetchData, ADMIN_DASHBOARD.REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [isAdmin, fetchData]);

  // ============================================================================
  // Track Operations
  // ============================================================================

  // Collect all available genres from tracks
  const availableGenres = useMemo(() => {
    const genreSet = new Set<string>();
    for (const track of tracks.values()) {
      if (track.genres) {
        for (const genre of track.genres) {
          genreSet.add(genre);
        }
      }
    }
    return Array.from(genreSet).sort();
  }, [tracks]);

  const filteredTracks = useMemo(() => {
    let result = Array.from(tracks.values());

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((track) => {
        const name = track.details.name?.toLowerCase() || "";
        const artists =
          track.details.artists?.map((a) => a.name.toLowerCase()).join(" ") ||
          "";
        const album = track.details.album?.name?.toLowerCase() || "";
        const id = track.id.toLowerCase();
        const isrc = track.details.external_ids?.isrc?.toLowerCase() || "";
        return (
          name.includes(query) ||
          artists.includes(query) ||
          album.includes(query) ||
          id.includes(query) ||
          isrc.includes(query)
        );
      });
    }

    // Apply genre filter
    if (selectedGenres.size > 0) {
      result = result.filter((track) => {
        if (!track.genres) return false;
        // Track matches if it has ANY of the selected genres
        for (const genre of selectedGenres) {
          if (track.genres.has(genre)) return true;
        }
        return false;
      });
    }

    // Apply advanced filters
    if (Object.keys(advancedFilters).length > 0) {
      result = result.filter((track) => {
        const feats = track.feats;
        for (const [key, range] of Object.entries(advancedFilters)) {
          if (!range) continue;
          const value = feats?.[key as keyof typeof feats] as
            | number
            | undefined;
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
          case "popularity":
            aVal = a.details.popularity || 0;
            bVal = b.details.popularity || 0;
            break;
          case "decade": {
            const aYear = a.details.album?.release_date
              ? parseInt(a.details.album.release_date.substring(0, 4))
              : 0;
            const bYear = b.details.album?.release_date
              ? parseInt(b.details.album.release_date.substring(0, 4))
              : 0;
            aVal = aYear;
            bVal = bYear;
            break;
          }
          default:
            aVal =
              (a.feats?.[sortConfig.field as keyof typeof a.feats] as number) ||
              0;
            bVal =
              (b.feats?.[sortConfig.field as keyof typeof b.feats] as number) ||
              0;
        }

        if (typeof aVal === "string" && typeof bVal === "string") {
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
  }, [tracks, searchQuery, selectedGenres, advancedFilters, sortConfig]);

  const handleTrackClick = useCallback(
    async (trackId: string) => {
      const track = tracks.get(trackId);
      if (track) {
        setSelectedTrack(track);
        setShowDetailsPanel(true);
        // Auto-play the track when clicked
        if (spotifyPlayer.isPremium) {
          await spotifyPlayer.play(`spotify:track:${track.id}`);
        }
      }
    },
    [tracks, spotifyPlayer]
  );

  const handleSelectTrack = useCallback((trackId: string) => {
    setSelectedTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedTrackIds(new Set(filteredTracks.map((t) => t.id)));
  }, [filteredTracks]);

  const handleDeselectAll = useCallback(() => {
    setSelectedTrackIds(new Set());
  }, []);

  const handleInvertSelection = useCallback(() => {
    setSelectedTrackIds((prev) => {
      const inverted = new Set<string>();
      for (const track of filteredTracks) {
        if (!prev.has(track.id)) {
          inverted.add(track.id);
        }
      }
      return inverted;
    });
  }, [filteredTracks]);

  // Playback controls using Spotify SDK
  const handlePlayPause = useCallback(async () => {
    if (!selectedTrack) return;

    // If no track is currently playing, start playing the selected track
    if (
      !spotifyPlayer.currentTrack ||
      spotifyPlayer.currentTrack.id !== selectedTrack.id
    ) {
      await spotifyPlayer.play(`spotify:track:${selectedTrack.id}`);
    } else {
      // Toggle play/pause for current track
      await spotifyPlayer.togglePlay();
    }
  }, [selectedTrack, spotifyPlayer]);

  const handlePrevious = useCallback(async () => {
    if (!selectedTrack || filteredTracks.length === 0) return;
    const currentIndex = filteredTracks.findIndex(
      (t) => t.id === selectedTrack.id
    );
    const prevIndex =
      currentIndex > 0 ? currentIndex - 1 : filteredTracks.length - 1;
    const prevTrack = filteredTracks[prevIndex];
    setSelectedTrack(prevTrack);
    // Auto-play the previous track
    await spotifyPlayer.play(`spotify:track:${prevTrack.id}`);
  }, [selectedTrack, filteredTracks, spotifyPlayer]);

  const handleNext = useCallback(async () => {
    if (!selectedTrack || filteredTracks.length === 0) return;
    const currentIndex = filteredTracks.findIndex(
      (t) => t.id === selectedTrack.id
    );
    const nextIndex =
      currentIndex < filteredTracks.length - 1 ? currentIndex + 1 : 0;
    const nextTrack = filteredTracks[nextIndex];
    setSelectedTrack(nextTrack);
    // Auto-play the next track
    await spotifyPlayer.play(`spotify:track:${nextTrack.id}`);
  }, [selectedTrack, filteredTracks, spotifyPlayer]);

  // Auto-advance to next track when current track ends
  useEffect(() => {
    if (spotifyPlayer.trackEnded && selectedTrack) {
      spotifyPlayer.resetTrackEnded();
      handleNext();
    }
  }, [spotifyPlayer.trackEnded, selectedTrack, spotifyPlayer, handleNext]);

  // Admin actions
  const handleRefetchSpotify = useCallback(async (trackId: string) => {
    console.log("Refetch Spotify data for:", trackId);
    // TODO: Implement API endpoint
  }, []);

  const handleRefetchFeatures = useCallback(async (trackId: string) => {
    console.log("Refetch features for:", trackId);
    // TODO: Implement API endpoint
  }, []);

  const handleDelete = useCallback(async (trackId: string) => {
    console.log("Delete track:", trackId);
    // TODO: Implement API endpoint
  }, []);

  const handleExportSelected = useCallback(() => {
    const selectedTracks = filteredTracks.filter((t) =>
      selectedTrackIds.has(t.id)
    );
    const exportData = selectedTracks.map((track) => ({
      id: track.id,
      name: track.details.name,
      artists: track.details.artists?.map((a) => a.name),
      album: track.details.album?.name,
      isrc: track.details.external_ids?.isrc,
      duration_ms: track.details.duration_ms,
      popularity: track.details.popularity,
      features: track.feats,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredTracks, selectedTrackIds]);

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    window.location.reload();
  };

  // Track Edit Handlers
  const handleEditTrack = useCallback((track: Track) => {
    setTrackToEdit(track);
    setEditDialogOpen(true);
  }, []);

  const handleAddTrack = useCallback(() => {
    setTrackToEdit(null);
    setEditDialogOpen(true);
  }, []);

  const handleSaveTrack = useCallback(
    async (formData: TrackFormData) => {
      const response = await fetch("/api/admin/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save track");
      }

      setEditDialogOpen(false);
      await fetchData();
    },
    [fetchData]
  );

  const handleFetchFromSpotify = useCallback(
    async (spotifyId: string): Promise<Partial<TrackFormData> | null> => {
      // Get access token
      const tokenData = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!tokenData) {
        throw new Error("Not authenticated");
      }
      const { token } = JSON.parse(tokenData);

      const response = await fetch(`/api/admin/track?id=${spotifyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch track from Spotify");
      }

      return response.json();
    },
    []
  );

  // ============================================================================
  // Render States
  // ============================================================================

  if (authChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4" />
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    const tokenData = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const isLoggedIn = tokenData !== null;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          {isLoggedIn ? (
            <>
              <AlertCircle
                size={48}
                className="text-destructive mx-auto mb-4"
              />
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <p className="text-muted-foreground mb-4">
                Your account doesn't have admin privileges.
              </p>
              <Button
                onClick={() => (window.location.href = "/")}
                variant="outline"
              >
                <Home className="w-4 h-4 mr-2" />
                Go to Gallery
              </Button>
            </>
          ) : (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent flex items-center justify-center">
                <Music size={40} className="text-accent-foreground" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Admin Login</h1>
              <p className="text-muted-foreground mb-8">
                Log in with your Spotify account to access the admin dashboard.
              </p>
              <Button
                onClick={() => authorizeSpotify()}
                className="bg-accent hover:bg-accent/90"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Login with Spotify
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (loading && tracks.size === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading tracks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle size={48} className="text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Error Loading Data</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchData} className="bg-accent hover:bg-accent/90">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Main Layout
  // ============================================================================

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="h-12 border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-bold flex items-center gap-2">
            <Database className="w-4 h-4 text-accent" />
            Admin
          </h1>

          {stats && (
            <div className="hidden lg:flex items-center gap-2">
              <StatBadge
                label="Tracks"
                value={stats.tracks.total.toLocaleString()}
                icon={Music}
              />
              <StatBadge
                label="Coverage"
                value={`${stats.tracks.coveragePercentage}%`}
                icon={CheckCircle}
                variant="success"
              />
              {stats.failedRequests.pending > 0 && (
                <StatBadge
                  label="Failed"
                  value={stats.failedRequests.pending}
                  icon={AlertCircle}
                  variant="warning"
                />
              )}
              <StatBadge
                label="Size"
                value={`${stats.database.sizeMB} MB`}
                icon={HardDrive}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <GlobalSearch
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-48 lg:w-64"
            placeholder="Search tracks, IDs, ISRCs..."
          />

          <Button
            onClick={fetchData}
            variant="ghost"
            size="sm"
            disabled={loading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>

          <MaintenanceDialog onActionComplete={fetchData} />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetailsPanel(!showDetailsPanel)}
            className="h-8 w-8 p-0"
            title={showDetailsPanel ? "Hide details" : "Show details"}
          >
            {showDetailsPanel ? (
              <PanelRightClose className="w-4 h-4" />
            ) : (
              <PanelRightOpen className="w-4 h-4" />
            )}
          </Button>

          <a
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Gallery
          </a>

          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track List */}
        <main className="flex-1 min-w-0 overflow-hidden">
          <AdminTrackList
            tracks={filteredTracks}
            tracksMeta={tracksMeta}
            activeTrackId={selectedTrack?.id || null}
            selectedTrackIds={selectedTrackIds}
            visibleColumns={visibleColumns}
            quickFilter={quickFilter}
            onQuickFilterChange={setQuickFilter}
            onTrackClick={handleTrackClick}
            onSelectTrack={handleSelectTrack}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onInvertSelection={handleInvertSelection}
            controls={
              <>
                <SortControls sort={sortConfig} onSortChange={setSortConfig} />
                <AdvancedFilters
                  filters={advancedFilters}
                  onFiltersChange={setAdvancedFilters}
                />
                <AdminFilters
                  availableGenres={availableGenres}
                  selectedGenres={selectedGenres}
                  onGenresChange={setSelectedGenres}
                />
                <AdminColumnSelector
                  visibleColumns={visibleColumns}
                  onToggleColumn={toggleColumn}
                  onReset={resetToDefaults}
                />
                <div className="flex-1" />
                <Button
                  onClick={handleAddTrack}
                  size="sm"
                  className="h-7 px-2 text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Track
                </Button>
              </>
            }
          />
        </main>

        {/* Details Panel */}
        {showDetailsPanel && (
          <TrackDetailsPanel
            track={selectedTrack}
            onClose={() => setSelectedTrack(null)}
            onRefetchSpotify={handleRefetchSpotify}
            onRefetchFeatures={handleRefetchFeatures}
            onEdit={handleEditTrack}
          />
        )}
      </div>

      {/* Admin Footer */}
      <AdminFooter
        track={selectedTrack}
        isPlaying={isPlaying}
        selectedCount={selectedTrackIds.size}
        onPlayPause={handlePlayPause}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onDelete={handleDelete}
        onRefetchSpotify={handleRefetchSpotify}
        onRefetchFeatures={handleRefetchFeatures}
        onExportSelected={handleExportSelected}
        selectedTrackIds={selectedTrackIds}
      />

      {/* Track Edit Dialog */}
      <TrackEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        track={trackToEdit}
        onSave={handleSaveTrack}
        onFetchFromSpotify={handleFetchFromSpotify}
      />
    </div>
  );
}

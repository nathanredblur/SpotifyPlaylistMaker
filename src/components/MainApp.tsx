import { useState, useRef } from "react";
import {
  User,
  Play,
  Pause,
  ExternalLink,
  Copy,
  Check,
  Info,
  X,
} from "lucide-react";
import type { CategoryBin, Track } from "@/types/spotify";
import type { GalleryStats } from "@/hooks/useGalleryLoader";

interface MainAppProps {
  bins: CategoryBin[];
  tracks: Map<string, Track>;
  galleryStats?: GalleryStats | null;
}

export function MainApp({ bins, tracks, galleryStats }: MainAppProps) {
  const [activeTab, setActiveTab] = useState<"tracks" | "plots" | "staging">(
    "tracks"
  );
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Toggle track selection
  const toggleTrackSelection = (trackId: string) => {
    setSelectedTracks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(trackId)) {
        newSet.delete(trackId);
      } else {
        newSet.add(trackId);
      }
      return newSet;
    });
  };

  // Play/pause preview
  const togglePreview = (track: Track) => {
    const previewUrl = track.details.preview_url;
    if (!previewUrl) return;

    if (playingTrackId === track.id) {
      // Stop playing
      audioRef.current?.pause();
      setPlayingTrackId(null);
    } else {
      // Start playing new track
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(previewUrl);
      audio.volume = 0.5;
      audio.play();
      audio.onended = () => setPlayingTrackId(null);
      audioRef.current = audio;
      setPlayingTrackId(track.id);
    }
  };

  // Open track in Spotify
  const openInSpotify = (trackId: string) => {
    window.open(`https://open.spotify.com/track/${trackId}`, "_blank");
  };

  // Generate export text for Spotlistr
  const generateExportText = () => {
    const selectedTracksList = Array.from(selectedTracks)
      .map((id) => tracks.get(id))
      .filter((t): t is Track => t !== undefined);

    return selectedTracksList
      .map((track) => {
        const artists = track.details.artists.map((a) => a.name).join(", ");
        return `${artists} - ${track.details.name}`;
      })
      .join("\n");
  };

  // Copy to clipboard
  const copyToClipboard = async () => {
    const text = generateExportText();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get all tracks as array
  const allTracks = Array.from(tracks.values());

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Hidden audio element for previews */}
      <audio ref={audioRef} className="hidden" />

      {/* Export Modal */}
      {showExportModal && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-50"
            onClick={() => setShowExportModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">
                Export {selectedTracks.size} Tracks
              </h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Disclaimer */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <Info size={20} className="text-amber-400 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-200">
                  <p className="font-semibold mb-1">
                    Why can't we create playlists directly?
                  </p>
                  <p className="text-amber-200/80">
                    Spotify's API restrictions require apps to have 250,000+
                    monthly users to allow public authentication. As a personal
                    project, we can't meet this requirement. Use{" "}
                    <a
                      href="https://www.spotlistr.com/search/textbox"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:text-amber-300 underline"
                    >
                      Spotlistr
                    </a>{" "}
                    to create playlists from the text below.
                  </p>
                </div>
              </div>
            </div>

            {/* Export Text */}
            <div className="bg-slate-800/50 rounded-lg p-4 mb-4 max-h-64 overflow-y-auto">
              <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
                {generateExportText()}
              </pre>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <a
                href="https://www.spotlistr.com/search/textbox"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors"
              >
                <ExternalLink size={18} />
                Open Spotlistr
              </a>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors"
              >
                {copied ? (
                  <>
                    <Check size={18} className="text-green-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    Copy to Clipboard
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-18 bg-slate-900/80 backdrop-blur-md border-b border-white/10 z-40">
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white">Music Gallery</h1>
            {galleryStats?.ownerName && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700">
                <User size={16} className="text-purple-400" />
                <span className="text-sm text-slate-300">
                  {galleryStats.ownerName}'s Collection
                </span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span>{tracks.size} tracks</span>
            {selectedTracks.size > 0 && (
              <span className="text-green-400">
                {selectedTracks.size} selected
              </span>
            )}
          </div>
        </div>
      </nav>

      {/* Main Layout */}
      <div className="pt-18 flex h-screen">
        {/* Sidebar */}
        <aside className="w-60 bg-slate-900/50 backdrop-blur-sm border-r border-white/10 overflow-y-auto">
          <div className="p-4 space-y-4">
            {bins.map((bin) => (
              <div key={bin.name} className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {bin.name}
                </h3>
                <ul className="space-y-1">
                  {bin.nodes
                    .filter((node) => node.tracks.length >= 3)
                    .slice(0, 10)
                    .map((node) => (
                      <li
                        key={node.name}
                        className="text-sm text-slate-300 hover:text-white cursor-pointer hover:bg-white/5 px-2 py-1 rounded transition-colors"
                      >
                        <span className="capitalize">{node.name}</span>
                        <span className="text-xs text-slate-500 ml-2">
                          ({node.tracks.length})
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            ))}

            {bins.length === 0 && (
              <div className="text-slate-400 text-sm text-center py-8">
                No categories yet
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-white/10">
              <button
                onClick={() => setActiveTab("tracks")}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === "tracks"
                    ? "text-white border-b-2 border-green-500"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                The Track List
              </button>
              <button
                onClick={() => setActiveTab("plots")}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === "plots"
                    ? "text-white border-b-2 border-green-500"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                The Plots
              </button>
              <button
                onClick={() => setActiveTab("staging")}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === "staging"
                    ? "text-white border-b-2 border-green-500"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Staging Playlist ({selectedTracks.size})
              </button>
            </div>

            {/* Tab Content */}
            <div className="bg-slate-900/30 backdrop-blur-sm rounded-lg border border-white/10 p-6">
              {activeTab === "tracks" && (
                <div className="text-white">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">Track List</h2>
                    <span className="text-sm text-slate-400">
                      Click a track to select it for export
                    </span>
                  </div>

                  {/* Track List */}
                  <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                    {allTracks.slice(0, 100).map((track) => (
                      <div
                        key={track.id}
                        className={`flex items-center gap-4 p-3 rounded-lg transition-colors cursor-pointer ${
                          selectedTracks.has(track.id)
                            ? "bg-green-500/20 border border-green-500/50"
                            : "bg-slate-800/30 hover:bg-slate-800/50 border border-transparent"
                        }`}
                        onClick={() => toggleTrackSelection(track.id)}
                      >
                        {/* Album Art */}
                        <div className="relative w-12 h-12 shrink-0">
                          {track.details.album?.images?.[0]?.url ? (
                            <img
                              src={track.details.album.images[0].url}
                              alt={track.details.album.name}
                              className="w-full h-full rounded object-cover"
                            />
                          ) : (
                            <div className="w-full h-full rounded bg-slate-700 flex items-center justify-center">
                              <span className="text-slate-500 text-xs">🎵</span>
                            </div>
                          )}

                          {/* Preview Button Overlay */}
                          {track.details.preview_url && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePreview(track);
                              }}
                              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded"
                            >
                              {playingTrackId === track.id ? (
                                <Pause size={20} className="text-white" />
                              ) : (
                                <Play size={20} className="text-white" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* Track Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">
                            {track.details.name}
                          </p>
                          <p className="text-sm text-slate-400 truncate">
                            {track.details.artists
                              .map((a) => a.name)
                              .join(", ")}
                          </p>
                        </div>

                        {/* Playing Indicator */}
                        {playingTrackId === track.id && (
                          <div className="flex items-center gap-1 text-green-400">
                            <div className="w-1 h-3 bg-green-400 rounded animate-pulse" />
                            <div className="w-1 h-4 bg-green-400 rounded animate-pulse delay-75" />
                            <div className="w-1 h-2 bg-green-400 rounded animate-pulse delay-150" />
                          </div>
                        )}

                        {/* Open in Spotify */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openInSpotify(track.id);
                          }}
                          className="p-2 text-slate-400 hover:text-green-400 transition-colors"
                          title="Open in Spotify"
                        >
                          <ExternalLink size={18} />
                        </button>

                        {/* Selection Indicator */}
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            selectedTracks.has(track.id)
                              ? "bg-green-500 border-green-500"
                              : "border-slate-500"
                          }`}
                        >
                          {selectedTracks.has(track.id) && (
                            <Check size={14} className="text-white" />
                          )}
                        </div>
                      </div>
                    ))}

                    {allTracks.length > 100 && (
                      <p className="text-center text-slate-500 text-sm py-4">
                        Showing first 100 tracks. Use sidebar filters to narrow
                        down.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "plots" && (
                <div className="text-white">
                  <h2 className="text-2xl font-bold mb-4">Plots</h2>
                  <p className="text-slate-300">
                    Interactive plots will go here
                  </p>
                </div>
              )}

              {activeTab === "staging" && (
                <div className="text-white">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">
                      Staging Playlist ({selectedTracks.size} tracks)
                    </h2>
                    {selectedTracks.size > 0 && (
                      <button
                        onClick={() => setShowExportModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors"
                      >
                        <ExternalLink size={18} />
                        Export for Spotlistr
                      </button>
                    )}
                  </div>

                  {selectedTracks.size === 0 ? (
                    <div className="text-center text-slate-300 py-12">
                      <p className="text-lg mb-4">
                        The Staging Playlist is empty
                      </p>
                      <p className="text-sm">
                        To add tracks to this staging playlist, head back to{" "}
                        <strong>The Track List</strong> and click on tracks to
                        select them.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                      {Array.from(selectedTracks).map((trackId) => {
                        const track = tracks.get(trackId);
                        if (!track) return null;

                        return (
                          <div
                            key={track.id}
                            className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/30 border border-slate-700"
                          >
                            {/* Album Art */}
                            <div className="relative w-12 h-12 shrink-0">
                              {track.details.album?.images?.[0]?.url ? (
                                <img
                                  src={track.details.album.images[0].url}
                                  alt={track.details.album.name}
                                  className="w-full h-full rounded object-cover"
                                />
                              ) : (
                                <div className="w-full h-full rounded bg-slate-700 flex items-center justify-center">
                                  <span className="text-slate-500 text-xs">
                                    🎵
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Track Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white truncate">
                                {track.details.name}
                              </p>
                              <p className="text-sm text-slate-400 truncate">
                                {track.details.artists
                                  .map((a) => a.name)
                                  .join(", ")}
                              </p>
                            </div>

                            {/* Remove Button */}
                            <button
                              onClick={() => toggleTrackSelection(track.id)}
                              className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                              title="Remove from selection"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 py-2 text-center text-slate-400 text-xs bg-slate-900/80 backdrop-blur-md border-t border-white/10">
        <p>
          Powered by the{" "}
          <a
            href="https://spotify.com"
            className="text-green-400 hover:text-green-300"
          >
            Spotify API
          </a>
        </p>
      </footer>
    </div>
  );
}

import { useState } from "react";
import { LogOut, ChevronDown, User, Settings, LogIn } from "lucide-react";
import type { CategoryBin, Track } from "@/types/spotify";
import type { GalleryStats } from "@/hooks/useGalleryLoader";
import type { UserInfo } from "./GalleryViewer";

interface MainAppProps {
  bins: CategoryBin[];
  tracks: Map<string, Track>;
  // Gallery stats
  galleryStats?: GalleryStats | null;
  // User info (if logged in)
  userInfo?: UserInfo | null;
  // Callbacks
  onLogin?: () => void;
  onLogout?: () => void;
  onGoToAdmin?: () => void;
}

export function MainApp({
  bins,
  tracks,
  galleryStats,
  userInfo,
  onLogin,
  onLogout,
  onGoToAdmin,
}: MainAppProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<"tracks" | "plots" | "staging">(
    "tracks"
  );
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-18 bg-slate-900/80 backdrop-blur-md border-b border-white/10 z-50">
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

          {/* User Menu - for authenticated users */}
          {userInfo && (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-700 transition-colors"
              >
                {userInfo.profileImage ? (
                  <img
                    src={userInfo.profileImage}
                    alt={userInfo.displayName}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-linear-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                    {userInfo.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-slate-300">
                  {userInfo.displayName}
                </span>
                <ChevronDown size={16} className="text-slate-400" />
              </button>

              {showUserMenu && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />

                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                    {/* Admin option - only for admin users */}
                    {userInfo.isAdmin && onGoToAdmin && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          onGoToAdmin();
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-purple-400 hover:bg-slate-800 hover:text-purple-300 transition-colors flex items-center gap-3"
                      >
                        <Settings size={18} />
                        Admin
                      </button>
                    )}
                    {onLogout && (
                      <>
                        {userInfo.isAdmin && onGoToAdmin && (
                          <div className="border-t border-slate-800" />
                        )}
                        <button
                          onClick={() => {
                            setShowUserMenu(false);
                            onLogout();
                          }}
                          className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors flex items-center gap-3"
                        >
                          <LogOut size={18} />
                          Logout
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Login button - for non-authenticated users */}
          {!userInfo && onLogin && (
            <button
              onClick={onLogin}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-colors"
            >
              <LogIn size={18} />
              Login
            </button>
          )}
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
                  <h2 className="text-2xl font-bold mb-4">Track List</h2>
                  <div className="bg-slate-800/30 rounded-lg p-6 text-center">
                    <p className="text-lg text-slate-300 mb-2">
                      {tracks.size} tracks loaded
                    </p>
                    <p className="text-sm text-slate-400">
                      Select a category from the sidebar to view tracks
                    </p>
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
                  <h2 className="text-2xl font-bold mb-4">
                    Staging Playlist ({selectedTracks.size} tracks)
                  </h2>
                  {selectedTracks.size === 0 ? (
                    <div className="text-center text-slate-300 py-12">
                      <p className="text-lg mb-4">
                        The Staging Playlist is empty
                      </p>
                      <p className="text-sm">
                        To add tracks to this staging playlist, head back to{" "}
                        <strong>The Track List</strong> or{" "}
                        <strong>The Plots</strong> and select some tracks.
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-300">
                      Selected tracks will go here
                    </p>
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

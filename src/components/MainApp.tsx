import { useState } from "react";
import type { CollectionInfo } from "@/types/spotify";

interface MainAppProps {
  accessToken: string;
  userId: string;
  collectionInfo: CollectionInfo;
}

export function MainApp({ accessToken, userId, collectionInfo }: MainAppProps) {
  const [activeTab, setActiveTab] = useState<"tracks" | "plots" | "staging">(
    "tracks"
  );
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-18 bg-slate-900/80 backdrop-blur-md border-b border-white/10 z-50">
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Organize Your Music</h1>
          <div className="text-slate-300 text-sm">
            <span className="text-slate-400">User:</span> {userId}
          </div>
        </div>
      </nav>

      {/* Main Layout */}
      <div className="pt-18 flex h-screen">
        {/* Sidebar */}
        <aside className="w-60 bg-slate-900/50 backdrop-blur-sm border-r border-white/10 overflow-y-auto">
          <div className="p-4 space-y-4">
            <div className="text-white">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Categories
              </h3>
              <p className="text-sm text-slate-300">
                Sidebar content will go here
              </p>
            </div>
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
                  <p className="text-slate-300">Track table will go here</p>
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

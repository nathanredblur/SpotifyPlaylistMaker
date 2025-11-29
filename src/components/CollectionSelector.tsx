/**
 * Collection Selector Component
 * Allows user to choose what music collection to organize
 */

import { useState } from "react";
import { Music, List, Heart, Users, LogOut } from "lucide-react";
import type { CollectionInfo } from "@/types/spotify";

interface CollectionSelectorProps {
  onSelect: (info: CollectionInfo) => void;
  onLogout: () => void;
}

const collections = [
  {
    type: "saved" as const,
    name: "Your Saved Tracks",
    description: "Organize all the tracks you've saved to your library",
    icon: Heart,
    color: "from-green-500 to-emerald-600",
  },
  {
    type: "added" as const,
    name: "Playlists You Created",
    description: "Organize tracks from playlists you've created",
    icon: List,
    color: "from-blue-500 to-cyan-600",
  },
  {
    type: "follow" as const,
    name: "Playlists You Follow",
    description: "Organize tracks from all playlists you follow",
    icon: Users,
    color: "from-purple-500 to-pink-600",
  },
  {
    type: "all" as const,
    name: "Everything",
    description: "Organize all your saved tracks and playlists",
    icon: Music,
    color: "from-orange-500 to-red-600",
  },
];

export function CollectionSelector({ onSelect, onLogout }: CollectionSelectorProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const handleSelect = (type: CollectionInfo["type"], name: string) => {
    setSelectedType(type);
    onSelect({ type, name });
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              What do you want to organize?
            </h1>
            <p className="text-slate-400">
              Choose a collection to start organizing your music
            </p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      {/* Collection Cards */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {collections.map((collection) => {
          const Icon = collection.icon;
          const isSelected = selectedType === collection.type;

          return (
            <button
              key={collection.type}
              onClick={() => handleSelect(collection.type, collection.name)}
              disabled={isSelected}
              className={`
                group relative overflow-hidden rounded-2xl p-8 text-left transition-all duration-300
                ${
                  isSelected
                    ? "scale-95 opacity-50 cursor-not-allowed"
                    : "hover:scale-105 hover:shadow-2xl cursor-pointer"
                }
                bg-slate-900/50 backdrop-blur-sm border border-slate-800 hover:border-slate-700
              `}
            >
              {/* Gradient Background */}
              <div
                className={`
                  absolute inset-0 bg-linear-to-br ${collection.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300
                `}
              />

              {/* Content */}
              <div className="relative z-10">
                <div
                  className={`
                    inline-flex items-center justify-center w-16 h-16 rounded-xl mb-4
                    bg-linear-to-br ${collection.color} shadow-lg
                  `}
                >
                  <Icon size={32} className="text-white" />
                </div>

                <h3 className="text-2xl font-bold text-white mb-2">
                  {collection.name}
                </h3>

                <p className="text-slate-400 text-sm leading-relaxed">
                  {collection.description}
                </p>

                {isSelected && (
                  <div className="mt-4 flex items-center gap-2 text-green-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500" />
                    <span className="text-sm font-medium">Loading...</span>
                  </div>
                )}
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 rounded-2xl ring-2 ring-transparent group-hover:ring-white/10 transition-all duration-300" />
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto mt-12 text-center">
        <p className="text-slate-500 text-sm">
          Your music data is processed securely and never stored on our servers
        </p>
      </div>
    </div>
  );
}


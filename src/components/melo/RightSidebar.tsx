/**
 * Right Sidebar Component
 * Statistics and insights sidebar
 */

import { StatsCard } from "./widgets/StatsCard";
import { TopGenresWidget } from "./widgets/TopGenresWidget";
import { TopArtistsWidget } from "./widgets/TopArtistsWidget";
import { DecadesWidget } from "./widgets/DecadesWidget";
import { MoodWidget } from "./widgets/MoodWidget";
import { cn } from "@/lib/utils";
import type { Track, CategoryBin } from "@/types/spotify";

interface RightSidebarProps {
  tracks: Map<string, Track>;
  bins: CategoryBin[];
  className?: string;
}

interface ArtistCount {
  name: string;
  count: number;
}

interface GenreCount {
  name: string;
  count: number;
}

interface DecadeCount {
  decade: string;
  count: number;
}

export function RightSidebar({ tracks, bins, className }: RightSidebarProps) {
  // Calculate statistics
  const tracksArray = Array.from(tracks.values());

  // Basic stats
  const totalTracks = tracksArray.length;

  // Count unique artists
  const artistCounts = new Map<string, number>();
  tracksArray.forEach((track) => {
    track.details.artists?.forEach((artist) => {
      const count = artistCounts.get(artist.name) || 0;
      artistCounts.set(artist.name, count + 1);
    });
  });
  const totalArtists = artistCounts.size;

  // Top artists
  const topArtists: ArtistCount[] = Array.from(artistCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Count unique albums
  const albumSet = new Set<string>();
  tracksArray.forEach((track) => {
    if (track.details.album?.id) {
      albumSet.add(track.details.album.id);
    }
  });
  const totalAlbums = albumSet.size;

  // Total duration
  const totalDurationMs = tracksArray.reduce(
    (sum, track) => sum + (track.details.duration_ms || 0),
    0
  );

  // Get genres from bins
  const genreBin = bins.find((b) => b.name === "genre");
  const topGenres: GenreCount[] =
    genreBin?.nodes.map((node) => ({
      name: node.name,
      count: node.tracks.length,
    })) || [];

  // Get decades from bins
  const decadeBin = bins.find((b) => b.name === "decade");
  const decades: DecadeCount[] =
    decadeBin?.nodes.map((node) => ({
      decade: node.name,
      count: node.tracks.length,
    })) || [];

  // Calculate audio profile averages
  let totalEnergy = 0;
  let totalDanceability = 0;
  let totalValence = 0;
  let totalAcousticness = 0;
  let totalInstrumentalness = 0;
  let countWithFeatures = 0;

  tracksArray.forEach((track) => {
    if (track.feats.energy !== undefined) {
      totalEnergy += track.feats.energy;
      totalDanceability += track.feats.danceability || 0;
      totalValence += track.feats.valence || 0;
      totalAcousticness += track.feats.acousticness || 0;
      totalInstrumentalness += track.feats.instrumentalness || 0;
      countWithFeatures++;
    }
  });

  const audioProfile = {
    avgEnergy: countWithFeatures > 0 ? totalEnergy / countWithFeatures : 0,
    avgDanceability:
      countWithFeatures > 0 ? totalDanceability / countWithFeatures : 0,
    avgValence: countWithFeatures > 0 ? totalValence / countWithFeatures : 0,
    avgAcousticness:
      countWithFeatures > 0 ? totalAcousticness / countWithFeatures : 0,
    avgInstrumentalness:
      countWithFeatures > 0 ? totalInstrumentalness / countWithFeatures : 0,
  };

  return (
    <aside
      className={cn(
        "w-80 min-w-80 h-full flex flex-col",
        "bg-background border-l border-border",
        "overflow-y-auto",
        className
      )}
    >
      <div className="p-4 space-y-4">
        {/* Stats Card */}
        <StatsCard
          totalTracks={totalTracks}
          totalArtists={totalArtists}
          totalAlbums={totalAlbums}
          totalDurationMs={totalDurationMs}
        />

        {/* Mood Widget */}
        <MoodWidget audioProfile={audioProfile} />

        {/* Top Genres */}
        {topGenres.length > 0 && <TopGenresWidget genres={topGenres} />}

        {/* Decades */}
        {decades.length > 0 && <DecadesWidget decades={decades} />}

        {/* Top Artists */}
        {topArtists.length > 0 && <TopArtistsWidget artists={topArtists} />}
      </div>
    </aside>
  );
}


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { CollectionType } from "@/types/spotify";
import type { LoadingStats } from "@/hooks/useMusicLoader";
import { useCacheStats } from "@/stores/useSpotifyCache";

interface LoadingScreenProps {
  progress: number;
  message: string;
  collectionType: CollectionType;
  onStop?: () => void;
  stats?: LoadingStats;
}

const collectionTypeNames: Record<CollectionType, string> = {
  saved: "Your Saved Music",
  added: "Music you've added to playlists",
  follow: "Music in playlists you follow",
  all: "All of your music",
  playlist: "Your Playlist",
};

export function LoadingScreen({
  progress,
  message,
  collectionType,
  onStop,
  stats,
}: LoadingScreenProps) {
  const cacheStats = useCacheStats();

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl backdrop-blur-lg bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-3xl text-white text-center">
            {collectionTypeNames[collectionType]}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h4 className="text-lg text-slate-200 text-center">{message}</h4>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800/50 rounded-full h-4 overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-green-600 to-green-400 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>

            <p className="text-center text-slate-400 text-sm">
              {Math.round(progress)}% Complete
            </p>
          </div>

          <div className="text-center text-slate-300 text-sm space-y-2">
            <p>
              We are loading up all of your music. This may take a while
              depending upon how big your music collection is.
            </p>
            {onStop && progress < 100 && (
              <div className="pt-4">
                <Button
                  onClick={onStop}
                  variant="outline"
                  size="sm"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  Stop Loading
                </Button>
                <p className="text-xs text-slate-400 mt-2">
                  If you are impatient, you can stop the loading at anytime to
                  work with a subset of your music.
                </p>
              </div>
            )}
          </div>

          {/* Fun Facts Section */}
          {stats && (stats.topArtist || stats.topGenre || stats.topTrack) && (
            <div className="text-center text-slate-300 text-sm space-y-2 bg-slate-800/30 rounded-lg p-4">
              <p className="text-slate-400 font-semibold mb-2">
                Your Music Stats
              </p>
              {stats.topGenre && (
                <p>
                  Looks like you really enjoy{" "}
                  <span className="text-purple-400 font-semibold capitalize">
                    {stats.topGenre}
                  </span>
                </p>
              )}
              {stats.topArtist && (
                <p>
                  One of your favorite artists is{" "}
                  <span className="text-green-400 font-semibold">
                    {stats.topArtist}
                  </span>
                </p>
              )}
              {stats.topTrack && (
                <p>
                  You seem to love{" "}
                  <span className="text-blue-400 font-semibold">
                    {stats.topTrack}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Cache Stats Section */}
          {cacheStats.totalRequests > 0 && (
            <div className="text-center text-slate-300 text-xs space-y-1 bg-slate-800/20 rounded-lg p-3 border border-slate-700/30">
              <p className="text-slate-400 font-semibold mb-1">
                Cache Performance
              </p>
              <div className="grid grid-cols-2 gap-2 text-slate-400">
                <div>
                  <span className="text-green-400 font-semibold">
                    {cacheStats.hitRate}%
                  </span>{" "}
                  hit rate
                </div>
                <div>
                  <span className="text-blue-400 font-semibold">
                    {cacheStats.audioFeaturesHits +
                      cacheStats.artistsHits +
                      cacheStats.albumsHits}
                  </span>{" "}
                  cached
                </div>
              </div>
              <p className="text-slate-500 text-[0.65rem] pt-1">
                Using IndexedDB to speed up loading
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

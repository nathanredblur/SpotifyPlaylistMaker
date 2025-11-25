import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { CollectionType } from '@/types/spotify';

interface LoadingScreenProps {
  progress: number;
  message: string;
  collectionType: CollectionType;
  onStop?: () => void;
}

const collectionTypeNames: Record<CollectionType, string> = {
  saved: 'Your Saved Music',
  added: 'Music you\'ve added to playlists',
  follow: 'Music in playlists you follow',
  all: 'All of your music',
  playlist: 'Your Playlist',
};

export function LoadingScreen({ progress, message, collectionType, onStop }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
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
                className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-300 ease-out"
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
              We are loading up all of your music. This may take a while depending
              upon how big your music collection is.
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
                  If you are impatient, you can stop the loading at anytime to work
                  with a subset of your music.
                </p>
              </div>
            )}
          </div>

          {/* Fun Facts Section - will be populated dynamically */}
          <div id="loading-facts" className="text-center text-slate-300 text-sm space-y-2 min-h-[60px]">
            {/* This will be populated with favorite genres, artists, etc. */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


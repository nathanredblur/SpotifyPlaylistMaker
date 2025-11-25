import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { authorizeSpotify } from '@/lib/spotify-auth';
import type { CollectionType } from '@/types/spotify';

export function LandingPage() {
  const [collectionType, setCollectionType] = useState<CollectionType>('saved');
  const [playlistUri, setPlaylistUri] = useState('');
  const [error, setError] = useState('');

  const handleStart = () => {
    setError('');

    if (collectionType === 'playlist') {
      if (!playlistUri.trim()) {
        setError("Please enter a playlist URI");
        return;
      }
      
      const normalizedUri = normalizeUri(playlistUri);
      if (!isValidPlaylistUri(normalizedUri)) {
        setError("That's not a valid playlist URI");
        return;
      }

      // Save playlist URI to localStorage
      localStorage.setItem('collection_info', JSON.stringify({
        type: collectionType,
        uri: normalizedUri,
      }));
    } else {
      localStorage.setItem('collection_info', JSON.stringify({
        type: collectionType,
      }));
    }

    // Redirect to Spotify authorization
    authorizeSpotify();
  };

  const normalizeUri = (uri: string): string => {
    return uri
      .replace('https://open.spotify.com', 'spotify')
      .replace('https://play.spotify.com', 'spotify')
      .replace(/\//g, ':');
  };

  const isValidPlaylistUri = (uri: string): boolean => {
    const fields = uri.split(':');
    if (fields.length === 3) {
      return fields[0] === 'spotify' && fields[1] === 'playlist';
    } else if (fields.length === 5) {
      return fields[0] === 'spotify' && fields[3] === 'playlist';
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-18 bg-slate-900/80 backdrop-blur-md border-b border-white/10 z-50">
        <div className="container mx-auto px-4 h-full flex items-center">
          <h1 className="text-2xl font-bold text-white">Organize Your Music</h1>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="backdrop-blur-lg bg-white/5 border-white/10 shadow-2xl">
            <CardHeader className="text-center space-y-4">
              <CardTitle className="text-5xl font-bold text-white">
                Organize Your Music
              </CardTitle>
              <CardDescription className="text-xl text-slate-300">
                Organize your Spotify music collection by any of a wide range of musical
                attributes including genre, mood, decade of release and more.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label htmlFor="collection-type" className="text-lg text-slate-200">
                  What do you want to organize:
                </Label>
                <Select value={collectionType} onValueChange={(value) => setCollectionType(value as CollectionType)}>
                  <SelectTrigger id="collection-type" className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="saved">Songs you've saved to Your Music</SelectItem>
                    <SelectItem value="added">Songs you've added to a playlist</SelectItem>
                    <SelectItem value="follow">Songs in playlists you follow</SelectItem>
                    <SelectItem value="all">All of your music</SelectItem>
                    <SelectItem value="playlist">A specific playlist</SelectItem>
                  </SelectContent>
                </Select>

                {collectionType === 'playlist' && (
                  <div className="space-y-2 pt-4">
                    <Label htmlFor="uri-text" className="text-slate-200">
                      Enter the URI for your playlist:
                    </Label>
                    <Input
                      id="uri-text"
                      type="text"
                      placeholder="spotify:user:spotify:playlist:5FJXhjdILmRA2z5bvz4nzf"
                      value={playlistUri}
                      onChange={(e) => setPlaylistUri(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                    />
                  </div>
                )}

                {error && (
                  <p className="text-red-400 text-sm text-center">{error}</p>
                )}

                <div className="flex justify-center pt-4">
                  <Button
                    onClick={handleStart}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold px-12 py-6 text-lg"
                  >
                    Organize your music
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features Section */}
          <div className="mt-16 space-y-8">
            <Card className="backdrop-blur-lg bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-3xl text-white text-center">
                  Get your music collection in order
                </CardTitle>
              </CardHeader>
              <CardContent className="text-slate-300 space-y-4">
                <p>
                  With <strong className="text-white">Organize Your Music</strong> you can easily organize
                  your saved music. Just follow these steps:
                </p>
                <ol className="list-decimal list-inside space-y-2 pl-4">
                  <li>
                    <strong className="text-white">Select</strong> what music you'd like to organize: Your Saved Music;
                    Music you've added to playlists; Music in playlists you follow; or all of it.
                  </li>
                  <li>
                    <strong className="text-white">Click</strong> on <em>Organize your Music</em>. If this is your
                    first visit, you will be asked to...
                  </li>
                  <li>
                    <strong className="text-white">Login</strong> with your Spotify credentials.{' '}
                    <strong className="text-white">Organize Your Music</strong> will place all of your tracks into
                    a number of bins. There are Genres, Moods, Decades, Popularity and more.
                  </li>
                  <li>
                    <strong className="text-white">Pick</strong> one of the bins. You can view all the properties of
                    the tracks in that bin. You can plot the tracks. You can listen to previews of the songs in the bin.
                  </li>
                  <li>
                    <strong className="text-white">Select</strong> tracks that you want to add to a playlist. Selected
                    tracks will be added to your <strong className="text-white">Staging Playlist</strong>. When you are
                    happy with the staging playlist you can
                  </li>
                  <li>
                    <strong className="text-white">Save</strong> the staging playlist to Spotify.
                  </li>
                </ol>
                <p className="text-sm text-slate-400 pt-4">
                  Don't worry. <strong className="text-white">Organize Your Music</strong> will never modify any of
                  the songs in your saved music or playlists. It will only save new playlists for you, and only when
                  you explicitly click on the <strong className="text-white">save</strong> button.
                </p>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-lg bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-3xl text-white">The Track Properties</CardTitle>
              </CardHeader>
              <CardContent className="text-slate-300">
                <p className="mb-4">
                  Organize Your Music can help you slice and dice your music collection by a wide range of properties:
                </p>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <li><strong className="text-white">Genre</strong> - the genre of the track</li>
                  <li><strong className="text-white">Year</strong> - the release year of the recording</li>
                  <li><strong className="text-white">Added</strong> - the earliest date you added the track</li>
                  <li><strong className="text-white">BPM</strong> - The tempo of the song</li>
                  <li><strong className="text-white">Energy</strong> - The higher the value, the more energetic</li>
                  <li><strong className="text-white">Danceability</strong> - The higher, the easier to dance to</li>
                  <li><strong className="text-white">Loudness (dB)</strong> - The higher the value, the louder</li>
                  <li><strong className="text-white">Liveness</strong> - Likelihood of being a live recording</li>
                  <li><strong className="text-white">Valence</strong> - The higher, the more positive mood</li>
                  <li><strong className="text-white">Acousticness</strong> - How acoustic the song is</li>
                  <li><strong className="text-white">Speechiness</strong> - Amount of spoken word</li>
                  <li><strong className="text-white">Popularity</strong> - How popular the song is</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 text-center text-slate-400 text-sm border-t border-white/10">
        <div className="container mx-auto px-4">
          <p>
            Powered by the <a href="https://spotify.com" className="text-green-400 hover:text-green-300">Spotify API</a>.
            {' '}Originally created by <a href="https://twitter.com/plamere" className="text-green-400 hover:text-green-300">@plamere</a>
          </p>
        </div>
      </footer>
    </div>
  );
}


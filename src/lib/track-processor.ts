import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import type {
  Track,
  SavedTrackItem,
  PlaylistTrackItem,
  SpotifyArtist,
  SpotifyAlbum,
  AudioFeatures,
} from "@/types/spotify";

// Extend dayjs with duration plugin
dayjs.extend(duration);

/**
 * Process raw Spotify track items into our Track format
 */
export function processTrackItem(
  item: SavedTrackItem | PlaylistTrackItem,
  source: string
): Track | null {
  // Skip local files and tracks without ID
  if (item.is_local || !item.track || !("id" in item.track)) {
    return null;
  }

  const now = dayjs();
  const dateAdded = dayjs(item.added_at);
  const age = now.diff(dateAdded, "day", true); // true for floating point

  return {
    id: item.track.id,
    details: {
      id: item.track.id,
      name: item.track.name,
      uri: item.track.uri,
      preview_url: item.track.preview_url,
      duration_ms: item.track.duration_ms,
      explicit: item.track.explicit,
      popularity: item.track.popularity,
      artists: item.track.artists.map((a) => ({
        id: a.id,
        name: a.name,
      })),
      album: {
        id: item.track.album.id,
        name: item.track.album.name,
        release_date: item.track.album.release_date || "",
        images: item.track.album.images,
      },
    },
    feats: {
      date_added: dateAdded.toDate(),
      age,
      explicit: item.track.explicit,
      duration_ms: item.track.duration_ms,
      popularity: item.track.popularity,
      source,
      count: 1,
      year: -1, // Will be set later
      genres: new Set(),
      topGenre: "",
    },
  };
}

/**
 * Enrich track with audio features from Spotify API
 */
export function enrichTrackWithAudioFeatures(
  track: Track,
  audioFeature: AudioFeatures | null
): void {
  if (!audioFeature) return;

  // Add all audio features
  track.feats.tempo = audioFeature.tempo;
  track.feats.energy = audioFeature.energy;
  track.feats.danceability = audioFeature.danceability;
  track.feats.loudness = audioFeature.loudness;
  track.feats.liveness = audioFeature.liveness;
  track.feats.valence = audioFeature.valence;
  track.feats.acousticness = audioFeature.acousticness;
  track.feats.speechiness = audioFeature.speechiness;
  track.feats.instrumentalness = audioFeature.instrumentalness;

  // Calculate derived emotional features
  track.feats.sadness = (1 - audioFeature.energy) * (1 - audioFeature.valence);
  track.feats.happiness = audioFeature.energy * audioFeature.valence;
  track.feats.anger = audioFeature.energy * (1 - audioFeature.valence);
}

/**
 * Enrich track with artist genres
 */
export function enrichTrackWithArtistGenres(
  track: Track,
  artists: Map<string, SpotifyArtist>
): void {
  const genres = new Set<string>();

  track.details.artists.forEach((artist) => {
    const detailedArtist = artists.get(artist.id);
    if (detailedArtist && detailedArtist.genres) {
      detailedArtist.genres.forEach((genre) => {
        if (isGoodGenre(genre)) {
          genres.add(genre);
        }
      });
    }
  });

  if (genres.size === 0) {
    genres.add("(unclassified genre)");
  }

  track.feats.genres = genres;
  track.feats.topGenre = Array.from(genres)[0] || "(unclassified genre)";
}

/**
 * Enrich track with album release year
 */
export function enrichTrackWithAlbumData(
  track: Track,
  albums: Map<string, SpotifyAlbum>
): void {
  const album = albums.get(track.details.album.id);
  if (!album || !album.release_date) {
    track.feats.year = -1;
    return;
  }

  const releaseDate = album.release_date;
  if (releaseDate.length >= 4) {
    const yearStr = releaseDate.substring(0, 4);
    track.feats.year = parseInt(yearStr, 10);
  } else {
    track.feats.year = -1;
  }
}

/**
 * Check if a genre should be included (filters out unwanted genres)
 */
function isGoodGenre(genre: string): boolean {
  const skipPhrases = ["christmas"];
  const lowerGenre = genre.toLowerCase();

  for (const phrase of skipPhrases) {
    if (lowerGenre.includes(phrase)) {
      return false;
    }
  }

  return true;
}

/**
 * Batch process: Split array into chunks
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Get unique items from array by key
 */
export function uniqueBy<T>(array: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return array.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

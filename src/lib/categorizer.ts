import type { Track, CategoryBin, PlaylistNode } from "@/types/spotify";

/**
 * Create a playlist node (category filter)
 */
function makeNode(
  name: string,
  label: string,
  filter: (track: Track) => boolean,
  getter: (track: Track) => any,
  sorter: (tracks: Track[]) => Track[],
  plottable: boolean
): PlaylistNode {
  return {
    name,
    label,
    plottable,
    tracks: [],
    artists: new Set(),
    filter,
    getter,
    sorter,
  };
}

/**
 * Filter functions
 */
const filters = {
  // Genre filter
  genre: (genre: string) => (track: Track) =>
    track.feats.genres?.has(genre) || false,

  // Source filter
  source: (source: string) => (track: Track) =>
    track.feats.source === source,

  // Numeric range filter
  range: (param: keyof Track["feats"], low: number, high: number) => (track: Track) => {
    const value = track.feats[param];
    return typeof value === "number" && value >= low && value <= high;
  },

  // Music filter (excludes spoken word)
  musicRange: (param: keyof Track["feats"], low: number, high: number) => (track: Track) => {
    const value = track.feats[param];
    const speechiness = track.feats.speechiness || 0;
    return (
      typeof value === "number" &&
      speechiness < 0.8 &&
      value >= low &&
      value <= high
    );
  },

  // Boolean filter
  boolean: (param: keyof Track["feats"], state: boolean) => (track: Track) =>
    track.feats[param] === state,

  // Missing feature filter
  missingFeature: (param: keyof Track["feats"]) => (track: Track) =>
    !(param in track.feats),
};

/**
 * Getter functions
 */
const getters = {
  simple: (param: keyof Track["feats"]) => (track: Track) => track.feats[param],

  int: (param: keyof Track["feats"]) => (track: Track) => {
    const value = track.feats[param];
    return typeof value === "number" ? Math.round(value) : 0;
  },

  percent: (param: keyof Track["feats"]) => (track: Track) => {
    const value = track.feats[param];
    return typeof value === "number" ? Math.round(value * 100) : 0;
  },

  boolean: (param: keyof Track["feats"], trueVal: string, falseVal: string) => (track: Track) =>
    track.feats[param] ? trueVal : falseVal,

  genre: () => (track: Track) => {
    const genres = track.feats.genres;
    return genres ? Array.from(genres).join(", ") : "";
  },
};

/**
 * Sorter functions
 */
const sorters = {
  byFeature: (param: keyof Track["feats"], reverse: boolean) => (tracks: Track[]) => {
    const sorted = [...tracks].sort((a, b) => {
      const aVal = a.feats[param];
      const bVal = b.feats[param];
      if (aVal === undefined || bVal === undefined) return 0;
      if (aVal > bVal) return 1;
      if (aVal < bVal) return -1;
      return 0;
    });
    return reverse ? sorted.reverse() : sorted;
  },
};

/**
 * Helper to convert minutes to milliseconds
 */
const mins = (min: number) => min * 60 * 1000;

/**
 * Initialize all category bins
 */
export function initializeCategoryBins(): CategoryBin[] {
  return [
    // Genres (will be populated dynamically)
    {
      name: "Genres",
      nodes: [],
    },

    // Moods
    {
      name: "Moods",
      nodes: [
        makeNode(
          "(unclassified mood)",
          "popularity",
          filters.missingFeature("energy"),
          getters.int("popularity"),
          sorters.byFeature("popularity", true),
          true
        ),
        makeNode(
          "chill",
          "energy",
          filters.musicRange("energy", 0, 0.2),
          getters.percent("energy"),
          sorters.byFeature("energy", false),
          true
        ),
        makeNode(
          "amped",
          "energy",
          filters.musicRange("energy", 0.8, 1.0),
          getters.percent("energy"),
          sorters.byFeature("energy", true),
          true
        ),
        makeNode(
          "sad",
          "sadness",
          filters.musicRange("sadness", 0.8, 1.0),
          getters.percent("sadness"),
          sorters.byFeature("sadness", true),
          true
        ),
        makeNode(
          "anger",
          "anger",
          filters.musicRange("anger", 0.8, 1.0),
          getters.percent("anger"),
          sorters.byFeature("anger", true),
          true
        ),
        makeNode(
          "happy",
          "happiness",
          filters.musicRange("happiness", 0.8, 1.0),
          getters.percent("happiness"),
          sorters.byFeature("happiness", true),
          true
        ),
        makeNode(
          "danceable",
          "danceability",
          filters.musicRange("danceability", 0.8, 1.0),
          getters.percent("danceability"),
          sorters.byFeature("danceability", true),
          true
        ),
      ],
    },

    // Styles
    {
      name: "Styles",
      nodes: [
        makeNode(
          "instrumental",
          "instrumentalness",
          filters.musicRange("instrumentalness", 0.8, 1.0),
          getters.percent("instrumentalness"),
          sorters.byFeature("instrumentalness", true),
          true
        ),
        makeNode(
          "acoustic",
          "acousticness",
          filters.musicRange("acousticness", 0.8, 1.0),
          getters.percent("acousticness"),
          sorters.byFeature("acousticness", true),
          true
        ),
        makeNode(
          "live",
          "liveness",
          filters.musicRange("liveness", 0.85, 1.0),
          getters.percent("liveness"),
          sorters.byFeature("liveness", true),
          true
        ),
        makeNode(
          "spoken word",
          "speechiness",
          filters.range("speechiness", 0.85, 1.0),
          getters.percent("speechiness"),
          sorters.byFeature("speechiness", true),
          true
        ),
        makeNode(
          "clean",
          "explicit",
          filters.boolean("explicit", false),
          getters.boolean("explicit", "explicit", "clean"),
          sorters.byFeature("explicit", true),
          false
        ),
        makeNode(
          "explicit",
          "explicit",
          filters.boolean("explicit", true),
          getters.boolean("explicit", "explicit", "clean"),
          sorters.byFeature("explicit", true),
          false
        ),
        makeNode(
          "loud",
          "loudness (dB)",
          filters.musicRange("loudness", -5, 0),
          getters.int("loudness"),
          sorters.byFeature("loudness", true),
          true
        ),
        makeNode(
          "quiet",
          "loudness (dB)",
          filters.musicRange("loudness", -60, -10),
          getters.int("loudness"),
          sorters.byFeature("loudness", false),
          true
        ),
      ],
    },

    // Decades
    {
      name: "Decades",
      nodes: [
        makeNode(
          "Oldies",
          "year",
          filters.range("year", 0, 1950),
          getters.simple("year"),
          sorters.byFeature("year", false),
          true
        ),
        makeNode(
          "1950s",
          "year",
          filters.range("year", 1950, 1959),
          getters.simple("year"),
          sorters.byFeature("year", false),
          true
        ),
        makeNode(
          "1960s",
          "year",
          filters.range("year", 1960, 1969),
          getters.simple("year"),
          sorters.byFeature("year", false),
          true
        ),
        makeNode(
          "1970s",
          "year",
          filters.range("year", 1970, 1979),
          getters.simple("year"),
          sorters.byFeature("year", false),
          true
        ),
        makeNode(
          "1980s",
          "year",
          filters.range("year", 1980, 1989),
          getters.simple("year"),
          sorters.byFeature("year", false),
          true
        ),
        makeNode(
          "1990s",
          "year",
          filters.range("year", 1990, 1999),
          getters.simple("year"),
          sorters.byFeature("year", false),
          true
        ),
        makeNode(
          "2000s",
          "year",
          filters.range("year", 2000, 2009),
          getters.simple("year"),
          sorters.byFeature("year", false),
          true
        ),
        makeNode(
          "2010s",
          "year",
          filters.range("year", 2010, 2019),
          getters.simple("year"),
          sorters.byFeature("year", false),
          true
        ),
        makeNode(
          "2020s",
          "year",
          filters.range("year", 2020, 2029),
          getters.simple("year"),
          sorters.byFeature("year", false),
          true
        ),
        makeNode(
          "(unclassified year)",
          "year",
          filters.range("year", -1, 0),
          getters.simple("year"),
          sorters.byFeature("year", false),
          false
        ),
      ],
    },

    // Added (recency)
    {
      name: "Added",
      nodes: [
        makeNode(
          "Today",
          "age (days)",
          filters.range("age", 0, 1),
          getters.int("age"),
          sorters.byFeature("age", false),
          true
        ),
        makeNode(
          "In the last week",
          "age (days)",
          filters.range("age", 0, 7),
          getters.int("age"),
          sorters.byFeature("age", false),
          true
        ),
        makeNode(
          "In the last month",
          "age (days)",
          filters.range("age", 0, 30),
          getters.int("age"),
          sorters.byFeature("age", false),
          true
        ),
        makeNode(
          "In the last year",
          "age (days)",
          filters.range("age", 0, 365),
          getters.int("age"),
          sorters.byFeature("age", false),
          true
        ),
        makeNode(
          "Over a year ago",
          "age (days)",
          filters.range("age", 365, 365 * 100),
          getters.int("age"),
          sorters.byFeature("age", false),
          true
        ),
        makeNode(
          "Over 2 years ago",
          "age (days)",
          filters.range("age", 365 * 2, 365 * 100),
          getters.int("age"),
          sorters.byFeature("age", false),
          true
        ),
        makeNode(
          "Over 5 years ago",
          "age (days)",
          filters.range("age", 365 * 5, 365 * 100),
          getters.int("age"),
          sorters.byFeature("age", false),
          true
        ),
      ],
    },

    // Popularity
    {
      name: "Popularity",
      nodes: [
        makeNode(
          "top popular",
          "Popularity",
          filters.range("popularity", 75, 100),
          getters.simple("popularity"),
          sorters.byFeature("popularity", true),
          true
        ),
        makeNode(
          "very popular",
          "Popularity",
          filters.range("popularity", 50, 75),
          getters.simple("popularity"),
          sorters.byFeature("popularity", true),
          true
        ),
        makeNode(
          "somewhat popular",
          "Popularity",
          filters.range("popularity", 20, 50),
          getters.simple("popularity"),
          sorters.byFeature("popularity", true),
          true
        ),
        makeNode(
          "deep",
          "Popularity",
          filters.range("popularity", 0, 20),
          getters.simple("popularity"),
          sorters.byFeature("popularity", true),
          true
        ),
      ],
    },

    // Duration
    {
      name: "Duration",
      nodes: [
        makeNode(
          "Very very short",
          "Duration",
          filters.range("duration_ms", mins(0), mins(0.5)),
          getters.simple("duration_ms"),
          sorters.byFeature("duration_ms", false),
          true
        ),
        makeNode(
          "Very short",
          "Duration",
          filters.range("duration_ms", mins(0), mins(1.5)),
          getters.simple("duration_ms"),
          sorters.byFeature("duration_ms", false),
          true
        ),
        makeNode(
          "Short",
          "Duration",
          filters.range("duration_ms", mins(0), mins(3)),
          getters.simple("duration_ms"),
          sorters.byFeature("duration_ms", false),
          true
        ),
        makeNode(
          "Medium",
          "Duration",
          filters.range("duration_ms", mins(3), mins(6)),
          getters.simple("duration_ms"),
          sorters.byFeature("duration_ms", false),
          true
        ),
        makeNode(
          "Long",
          "Duration",
          filters.range("duration_ms", mins(6), mins(1000)),
          getters.simple("duration_ms"),
          sorters.byFeature("duration_ms", false),
          true
        ),
        makeNode(
          "Very long",
          "Duration",
          filters.range("duration_ms", mins(12), mins(1000)),
          getters.simple("duration_ms"),
          sorters.byFeature("duration_ms", false),
          true
        ),
        makeNode(
          "Very very long",
          "Duration",
          filters.range("duration_ms", mins(30), mins(1000)),
          getters.simple("duration_ms"),
          sorters.byFeature("duration_ms", false),
          true
        ),
      ],
    },

    // Sources (will be populated dynamically)
    {
      name: "Sources",
      nodes: [],
    },
  ];
}

/**
 * Add a genre node dynamically
 */
export function addGenreNode(bins: CategoryBin[], genre: string): void {
  const genreBin = bins.find((bin) => bin.name === "Genres");
  if (!genreBin) return;

  // Check if genre already exists
  const exists = genreBin.nodes.some((node) => node.name === genre);
  if (exists) return;

  const node = makeNode(
    genre,
    "Genre",
    filters.genre(genre),
    getters.genre(),
    sorters.byFeature("popularity", true),
    false
  );

  genreBin.nodes.push(node);
}

/**
 * Add a source node dynamically
 */
export function addSourceNode(bins: CategoryBin[], source: string): void {
  const sourceBin = bins.find((bin) => bin.name === "Sources");
  if (!sourceBin) return;

  // Check if source already exists
  const exists = sourceBin.nodes.some((node) => node.name === source);
  if (exists) return;

  const node = makeNode(
    source,
    "Source",
    filters.source(source),
    getters.simple("source"),
    sorters.byFeature("popularity", true),
    false
  );

  sourceBin.nodes.push(node);
}

/**
 * Categorize a track into all matching bins
 */
export function categorizeTrack(track: Track, bins: CategoryBin[]): void {
  bins.forEach((bin) => {
    bin.nodes.forEach((node) => {
      if (node.filter(track)) {
        node.tracks.push(track);
        // Add first artist to the node's artist set
        if (track.details.artists.length > 0) {
          node.artists.add(track.details.artists[0].id);
        }
      }
    });
  });
}

/**
 * Sort nodes by track count (descending)
 */
export function sortNodesByTrackCount(bins: CategoryBin[]): void {
  bins.forEach((bin) => {
    bin.nodes.sort((a, b) => {
      // Keep unclassified at the end
      if (a.name.startsWith("(unclassified")) return 1;
      if (b.name.startsWith("(unclassified")) return -1;

      // Sort by track count
      return b.tracks.length - a.tracks.length;
    });
  });
}


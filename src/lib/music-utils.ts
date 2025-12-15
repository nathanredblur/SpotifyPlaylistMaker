/**
 * Music utility functions
 * Helpers for displaying musical notation
 */

/**
 * Musical keys mapped from Spotify's pitch class notation
 * @see https://developer.spotify.com/documentation/web-api/reference/get-audio-features
 * @see https://en.wikipedia.org/wiki/Pitch_class
 */
export const MUSICAL_KEYS = [
  "C",       // 0
  "C♯/D♭",   // 1
  "D",       // 2
  "D♯/E♭",   // 3
  "E",       // 4
  "F",       // 5
  "F♯/G♭",   // 6
  "G",       // 7
  "G♯/A♭",   // 8
  "A",       // 9
  "A♯/B♭",   // 10
  "B",       // 11
] as const;

/**
 * Short form keys for compact display
 */
export const MUSICAL_KEYS_SHORT = [
  "C",    // 0
  "C♯",   // 1
  "D",    // 2
  "D♯",   // 3
  "E",    // 4
  "F",    // 5
  "F♯",   // 6
  "G",    // 7
  "G♯",   // 8
  "A",    // 9
  "A♯",   // 10
  "B",    // 11
] as const;

/**
 * Convert pitch class number to musical key name
 * @param key - Pitch class (0-11) or -1 for no key
 * @param short - Use short form (e.g., "C♯" instead of "C♯/D♭")
 * @returns Musical key name or "-" if no key
 */
export function keyToNote(key: number | undefined | null, short = false): string {
  if (key === undefined || key === null || key === -1) return "-";
  if (key < 0 || key > 11) return "-";
  return short ? MUSICAL_KEYS_SHORT[key] : MUSICAL_KEYS[key];
}

/**
 * Format key with mode (e.g., "C Major", "A Minor")
 * @param key - Pitch class (0-11)
 * @param mode - 0 = Minor, 1 = Major
 * @param short - Use short form
 */
export function formatKeyWithMode(
  key: number | undefined | null,
  mode: number | undefined | null,
  short = false
): string {
  const keyName = keyToNote(key, short);
  if (keyName === "-") return "-";
  
  const modeName = mode === 1 ? (short ? "Maj" : "Major") : (short ? "min" : "Minor");
  return `${keyName} ${modeName}`;
}


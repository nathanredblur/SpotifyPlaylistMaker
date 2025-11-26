/**
 * Cache Configuration
 *
 * Centralized configuration for caching behavior across the application
 */

/**
 * Time-To-Live (TTL) for different cache types in milliseconds
 */
export const CACHE_TTL = {
  /**
   * Audio Features, Artists, and Albums cache
   * Default: 7 days
   */
  METADATA: 7 * 24 * 60 * 60 * 1000,

  /**
   * Saved tracks collection cache
   * Default: 30 minutes
   *
   * Adjust based on how frequently users add new tracks:
   * - Active users: 10-15 minutes
   * - Casual users: 30-60 minutes
   * - Demo/Testing: 5 minutes
   */
  SAVED_TRACKS: 30 * 60 * 1000,

  /**
   * User playlists cache (future)
   * Default: 15 minutes
   */
  PLAYLISTS: 15 * 60 * 1000,
} as const;

/**
 * Cache behavior settings
 */
export const CACHE_SETTINGS = {
  /**
   * Enable/disable cache persistence to IndexedDB
   */
  ENABLE_PERSISTENCE: true,

  /**
   * Persist saved tracks to IndexedDB
   * WARNING: Large collections (2000+ tracks) may cause performance issues
   * Set to false to keep saved tracks only in memory (lost on page reload)
   */
  PERSIST_SAVED_TRACKS: false,

  /**
   * Enable/disable cache statistics tracking
   */
  ENABLE_STATS: true,

  /**
   * Log cache hits/misses to console
   */
  ENABLE_LOGGING: true,

  /**
   * Cache failed 403 requests to avoid retrying
   * TTL: 24 hours
   */
  CACHE_FAILED_REQUESTS: true,
  FAILED_REQUEST_TTL: 24 * 60 * 60 * 1000,
} as const;

/**
 * Helper functions for cache TTL
 */
export const CacheHelpers = {
  /**
   * Convert minutes to milliseconds
   */
  minutesToMs: (minutes: number): number => minutes * 60 * 1000,

  /**
   * Convert hours to milliseconds
   */
  hoursToMs: (hours: number): number => hours * 60 * 60 * 1000,

  /**
   * Convert days to milliseconds
   */
  daysToMs: (days: number): number => days * 24 * 60 * 60 * 1000,
} as const;

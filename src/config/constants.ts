/**
 * Application Constants
 * Centralized configuration for rate limits, timeouts, and other app-wide settings
 */

// ============================================================================
// API Rate Limits & Retry Configuration
// ============================================================================

/**
 * Spotify API Configuration
 */
export const SPOTIFY_API = {
  /** Maximum number of retries for failed requests */
  MAX_RETRIES: 10,

  /** Base delay between retries (ms) */
  RETRY_DELAY: 500,

  /** Maximum items per request for batch endpoints */
  BATCH_SIZE: 50,

  /** Request timeout (ms) */
  TIMEOUT: 30000,
} as const;

/**
 * SoundCharts API Configuration
 */
export const SOUNDCHARTS_API = {
  /** Maximum number of tracks to fetch per sync */
  MAX_TRACKS_PER_SYNC: 1000,

  /** Delay between requests to avoid rate limiting (ms) */
  REQUEST_DELAY: 100,

  /** Maximum retries for failed requests */
  MAX_RETRIES: 3,

  /** Retry delay for rate limited requests (ms) */
  RATE_LIMIT_DELAY: 2000,

  /** API version */
  VERSION: "v2.25",
} as const;

/**
 * Failed Requests Configuration
 */
export const FAILED_REQUESTS = {
  /** Maximum retry attempts for general errors */
  MAX_ATTEMPTS: 3,

  /** Maximum retry attempts for 404 errors (track not found) */
  MAX_ATTEMPTS_NOT_FOUND: 1,

  /** Time to wait before retrying (ms) */
  RETRY_DELAY: 60000, // 1 minute

  /** Time to keep failed requests in database (ms) */
  RETENTION_PERIOD: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;

// ============================================================================
// Cache & Storage Configuration
// ============================================================================

/**
 * Cache TTL (Time To Live) Configuration
 *
 * Note: Some data is immutable and never expires:
 * - Audio features (tempo, energy, etc.) are permanent track properties
 * - Artist information rarely changes
 * - Album information is static
 * - Track metadata (name, duration, etc.) is permanent
 *
 * Only user-specific data (saved tracks list) needs periodic refresh
 */
export const CACHE_TTL = {
  /** User's saved tracks list refresh interval (ms) - check for new/removed tracks */
  USER_TRACKS_REFRESH: 24 * 60 * 60 * 1000, // 24 hours

  /** Failed requests retry interval (ms) */
  FAILED_REQUESTS_RETRY: 60 * 60 * 1000, // 1 hour

  /** User profile cache (ms) */
  USER_PROFILE: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;

/**
 * Data that NEVER expires (immutable)
 */
export const IMMUTABLE_DATA = {
  /** Audio features never change for a track */
  AUDIO_FEATURES: true,

  /** Artist information is permanent */
  ARTISTS: true,

  /** Album information is permanent */
  ALBUMS: true,

  /** Track metadata (name, duration, ISRC) is permanent */
  TRACK_METADATA: true,
} as const;

/**
 * Local Storage Keys
 */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: "spotify_access_token",
  CODE_VERIFIER: "spotify_code_verifier",
  COLLECTION_INFO: "collection_info",
} as const;

// ============================================================================
// Database Configuration
// ============================================================================

/**
 * Database Limits & Pagination
 */
export const DATABASE = {
  /** Default page size for queries */
  DEFAULT_PAGE_SIZE: 100,

  /** Maximum page size for queries */
  MAX_PAGE_SIZE: 1000,

  /** Batch insert size */
  BATCH_INSERT_SIZE: 100,

  /** Database file path */
  FILE_PATH: "./data/spotify-cache.db",
} as const;

// ============================================================================
// UI Configuration
// ============================================================================

/**
 * Admin Dashboard Configuration
 */
export const ADMIN_DASHBOARD = {
  /** Auto-refresh interval (ms) */
  REFRESH_INTERVAL: 30000, // 30 seconds

  /** Failed tracks table page size */
  FAILED_TRACKS_PAGE_SIZE: 100,

  /** Recent tracks display limit */
  RECENT_TRACKS_LIMIT: 5,

  /** Recent syncs display limit */
  RECENT_SYNCS_LIMIT: 10,
} as const;

/**
 * Loading & Progress Configuration
 */
export const LOADING = {
  /** Debounce delay for search inputs (ms) */
  SEARCH_DEBOUNCE: 300,

  /** Minimum loading time to prevent flashing (ms) */
  MIN_LOADING_TIME: 500,

  /** Progress update interval (ms) */
  PROGRESS_UPDATE_INTERVAL: 100,
} as const;

// ============================================================================
// Sync Configuration
// ============================================================================

/**
 * Sync Process Configuration
 */
export const SYNC = {
  /** Maximum tracks to process per sync */
  MAX_TRACKS_PER_SYNC: 10000,

  /** Batch size for processing tracks */
  BATCH_SIZE: 50,

  /** Delay between batches (ms) */
  BATCH_DELAY: 100,

  /** Maximum sync duration (ms) */
  MAX_DURATION: 5 * 60 * 1000, // 5 minutes

  /** Incremental sync: only fetch tracks newer than last sync */
  INCREMENTAL_SYNC_ENABLED: true,
} as const;

// ============================================================================
// Error Codes & Messages
// ============================================================================

/**
 * HTTP Status Codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402, // Quota exceeded
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  NO_ACCESS_TOKEN: "No access token found. Please log in again.",
  UNAUTHORIZED: "Unauthorized. Please log in again.",
  RATE_LIMITED: "Rate limit exceeded. Please wait before retrying.",
  QUOTA_EXCEEDED: "API quota exceeded. Please update your API credentials.",
  NOT_FOUND: "Resource not found.",
  NETWORK_ERROR: "Network error. Please check your connection.",
  UNKNOWN_ERROR: "An unknown error occurred.",
} as const;

// ============================================================================
// Feature Flags
// ============================================================================

/**
 * Feature Flags (for enabling/disabling features)
 */
export const FEATURES = {
  /** Enable SoundCharts integration */
  SOUNDCHARTS_ENABLED: true,

  /** Enable IndexedDB caching */
  INDEXEDDB_CACHE_ENABLED: false, // Disabled in favor of SQLite

  /** Enable debug logging */
  DEBUG_LOGGING: false,

  /** Enable performance monitoring */
  PERFORMANCE_MONITORING: false,

  /** Enable automatic sync on app load */
  AUTO_SYNC_ON_LOAD: false,
} as const;

// ============================================================================
// Audio Features Configuration
// ============================================================================

/**
 * Audio Features Thresholds & Ranges
 */
export const AUDIO_FEATURES = {
  /** Tempo ranges (BPM) */
  TEMPO: {
    MIN: 0,
    MAX: 250,
    SLOW: 90,
    MODERATE: 120,
    FAST: 150,
  },

  /** Energy ranges (0-1) */
  ENERGY: {
    MIN: 0,
    MAX: 1,
    LOW: 0.3,
    MODERATE: 0.6,
    HIGH: 0.8,
  },

  /** Danceability ranges (0-1) */
  DANCEABILITY: {
    MIN: 0,
    MAX: 1,
    LOW: 0.3,
    MODERATE: 0.6,
    HIGH: 0.8,
  },

  /** Valence (happiness) ranges (0-1) */
  VALENCE: {
    MIN: 0,
    MAX: 1,
    SAD: 0.3,
    NEUTRAL: 0.6,
    HAPPY: 0.8,
  },
} as const;

// ============================================================================
// Type Exports
// ============================================================================

/**
 * Type-safe access to constant values
 */
export type SpotifyApiConfig = typeof SPOTIFY_API;
export type SoundChartsApiConfig = typeof SOUNDCHARTS_API;
export type FailedRequestsConfig = typeof FAILED_REQUESTS;
export type CacheTTLConfig = typeof CACHE_TTL;
export type StorageKeysConfig = typeof STORAGE_KEYS;
export type DatabaseConfig = typeof DATABASE;
export type AdminDashboardConfig = typeof ADMIN_DASHBOARD;
export type LoadingConfig = typeof LOADING;
export type SyncConfig = typeof SYNC;
export type HttpStatusConfig = typeof HTTP_STATUS;
export type ErrorMessagesConfig = typeof ERROR_MESSAGES;
export type FeaturesConfig = typeof FEATURES;
export type AudioFeaturesConfig = typeof AUDIO_FEATURES;

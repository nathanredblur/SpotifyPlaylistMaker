/**
 * Database module exports
 * Central point for all database operations
 */

export * from "./database";
export * from "./schema";
export * from "./tracks-repository";
export * from "./sync-repository";
export * from "./failed-requests-repository";
export * from "./users-repository";

// Re-export repository instances for convenience
import { TracksRepository } from "./tracks-repository";
import { SyncRepository } from "./sync-repository";
import { FailedRequestsRepository } from "./failed-requests-repository";
import { UsersRepository } from "./users-repository";

/**
 * Get all repository instances
 */
export function getRepositories() {
  return {
    tracks: new TracksRepository(),
    sync: new SyncRepository(),
    failedRequests: new FailedRequestsRepository(),
    users: new UsersRepository(),
  };
}

/**
 * Admin App Component
 * Wraps AdminLayout with necessary providers (Spotify Player)
 */

import { SpotifyPlayerProvider } from "@/contexts/SpotifyPlayerContext";
import { AdminLayout } from "./AdminLayout";

export function AdminApp() {
  return (
    <SpotifyPlayerProvider>
      <AdminLayout />
    </SpotifyPlayerProvider>
  );
}


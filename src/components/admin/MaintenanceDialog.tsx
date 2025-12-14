/**
 * Maintenance Dialog Component
 * Contains database maintenance operations in a popup
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Settings, Download, Trash2, Play, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import { STORAGE_KEYS } from "@/config/constants";

// ============================================================================
// Types
// ============================================================================

interface MaintenanceDialogProps {
  onActionComplete?: () => void;
}

type MessageType = "success" | "error" | "info";

interface MaintenanceMessage {
  type: MessageType;
  text: string;
}

// ============================================================================
// Component
// ============================================================================

export function MaintenanceDialog({ onActionComplete }: MaintenanceDialogProps) {
  const [open, setOpen] = useState(false);
  const [isRunningMigration, setIsRunningMigration] = useState(false);
  const [isClearingFailed, setIsClearingFailed] = useState(false);
  const [isRunningSync, setIsRunningSync] = useState(false);
  const [message, setMessage] = useState<MaintenanceMessage | null>(null);

  const handleMigrateISRC = async () => {
    setIsRunningMigration(true);
    setMessage(null);

    try {
      const response = await fetch("/api/migrate-isrc", { method: "POST" });
      const data = await response.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: `Migration complete! Updated ${data.updatedCount} tracks.`,
        });
        onActionComplete?.();
      } else {
        setMessage({ type: "error", text: `Migration failed: ${data.error}` });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setIsRunningMigration(false);
    }
  };

  const handleClearFailed = async () => {
    if (!confirm("Are you sure you want to clear all failed requests?")) {
      return;
    }

    setIsClearingFailed(true);
    setMessage(null);

    try {
      const response = await fetch("/api/clear-failed", { method: "POST" });
      const data = await response.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: `Cleared ${data.clearedCount} failed requests.`,
        });
        onActionComplete?.();
      } else {
        setMessage({ type: "error", text: `Clear failed: ${data.error}` });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setIsClearingFailed(false);
    }
  };

  const handleRunSync = async () => {
    setIsRunningSync(true);
    setMessage({
      type: "info",
      text: "Syncing with Spotify and SoundCharts... This may take a while.",
    });

    try {
      const tokenData = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!tokenData) {
        throw new Error("No access token found. Please log in again.");
      }

      const { token, expiresAt } = JSON.parse(tokenData);

      if (Date.now() >= expiresAt) {
        setMessage({
          type: "error",
          text: "Your Spotify session has expired. Please log in again.",
        });
        return;
      }

      const response = await fetch("/api/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          collectionType: "saved",
          playlistUri: null,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        setMessage({
          type: "error",
          text: "Your Spotify session has expired. Please log in again.",
        });
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        return;
      }

      if (data.success) {
        setMessage({
          type: "success",
          text: `Sync complete! Fetched ${data.stats.fetchedFromSoundCharts} audio features in ${(data.stats.duration / 1000).toFixed(1)}s.`,
        });
        onActionComplete?.();
      } else {
        setMessage({ type: "error", text: `Sync failed: ${data.error}` });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setIsRunningSync(false);
    }
  };

  const messageStyles = {
    success: "bg-green-500/20 text-green-400 border-green-500/30",
    error: "bg-destructive/20 text-destructive border-destructive/30",
    info: "bg-accent/20 text-accent border-accent/30",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          Maintenance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Database Maintenance
          </DialogTitle>
        </DialogHeader>

        {message && (
          <div className={`p-3 rounded-lg border ${messageStyles[message.type]}`}>
            <div className="flex items-start gap-2">
              {message.type === "success" && <CheckCircle className="w-4 h-4 mt-0.5" />}
              {message.type === "error" && <AlertCircle className="w-4 h-4 mt-0.5" />}
              {message.type === "info" && <RefreshCw className="w-4 h-4 mt-0.5 animate-spin" />}
              <p className="text-sm">{message.text}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Migrate ISRCs */}
          <div className="p-4 rounded-lg bg-secondary">
            <h4 className="font-semibold mb-1">Migrate ISRCs</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Extract ISRC codes from spotify_data to improve SoundCharts lookups.
            </p>
            <Button
              onClick={handleMigrateISRC}
              disabled={isRunningMigration}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Download className={`w-4 h-4 mr-2 ${isRunningMigration ? "animate-pulse" : ""}`} />
              {isRunningMigration ? "Migrating..." : "Run Migration"}
            </Button>
          </div>

          {/* Clear Failed Requests */}
          <div className="p-4 rounded-lg bg-secondary">
            <h4 className="font-semibold mb-1">Clear Failed Requests</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Remove all failed request records to allow retry.
            </p>
            <Button
              onClick={handleClearFailed}
              disabled={isClearingFailed}
              size="sm"
              variant="destructive"
            >
              <Trash2 className={`w-4 h-4 mr-2 ${isClearingFailed ? "animate-pulse" : ""}`} />
              {isClearingFailed ? "Clearing..." : "Clear Failed"}
            </Button>
          </div>

          {/* Trigger Sync */}
          <div className="p-4 rounded-lg bg-secondary">
            <h4 className="font-semibold mb-1">Manual Sync</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Fetch new tracks from Spotify and update audio features.
            </p>
            <Button
              onClick={handleRunSync}
              disabled={isRunningSync}
              size="sm"
              className="bg-accent hover:bg-accent/90"
            >
              <Play className={`w-4 h-4 mr-2 ${isRunningSync ? "animate-pulse" : ""}`} />
              {isRunningSync ? "Syncing..." : "Start Sync"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


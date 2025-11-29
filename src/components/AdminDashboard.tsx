import { useState, useEffect } from "react";
import {
  RefreshCw,
  Database,
  Music,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  HardDrive,
  Play,
  Trash2,
  Download,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ADMIN_DASHBOARD, STORAGE_KEYS } from "@/config/constants";

interface DatabaseStats {
  tracks: {
    total: number;
    withSoundCharts: number;
    withoutSoundCharts: number;
    withISRC: number;
    withoutISRC: number;
    coveragePercentage: string;
    isrcPercentage: string;
  };
  audioFeatures: {
    coverage: Record<string, { count: number }>;
    averageCoverage: number;
  };
  failedRequests: {
    pending: number;
    permanentlyFailed: number;
    resolved: number;
    byErrorCode: Array<{ error_code: number; count: number }>;
  };
  syncs: {
    total: number;
    lastSync: {
      id: number;
      startedAt: string;
      completedAt: string;
      duration: number;
      totalTracks: number;
      newTracks: number;
      soundchartsFetched: number;
      failedTracks: number;
    } | null;
    avgDuration: number;
    recent: Array<{
      id: number;
      startedAt: string;
      completedAt: string;
      status: string;
      duration: number;
      totalTracks: number;
      newTracks: number;
      soundchartsFetched: number;
      failedTracks: number;
    }>;
  };
  database: {
    sizeBytes: number;
    sizeMB: string;
  };
  recentTracks: Array<{
    spotify_id: string;
    name: string;
    added_at: string;
    isrc: string | null;
    has_soundcharts: boolean;
  }>;
}

interface FailedTrack {
  spotify_id: string;
  error_code: number | null;
  error_message: string;
  attempt_count: number;
  max_attempts: number;
  status: string;
  updated_at: string;
  created_at: string;
  track_name: string | null;
  artists: Array<{ name: string }>;
  isrc: string | null;
  has_soundcharts: boolean;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  trend?: string;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const variantColors = {
    default: "from-blue-500/20 to-purple-500/20 border-blue-500/30",
    success: "from-green-500/20 to-emerald-500/20 border-green-500/30",
    warning: "from-yellow-500/20 to-orange-500/20 border-yellow-500/30",
    danger: "from-red-500/20 to-pink-500/20 border-red-500/30",
  };

  return (
    <div
      className={`bg-linear-to-br ${variantColors[variant]} backdrop-blur-lg border rounded-lg p-6 transition-all hover:scale-105`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-400 uppercase tracking-wide">
            {title}
          </p>
          <p className="text-3xl font-bold text-white mt-2">{value}</p>
          {subtitle && (
            <p className="text-sm text-slate-300 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2 text-xs text-green-400">
              <TrendingUp size={14} />
              <span>{trend}</span>
            </div>
          )}
        </div>
        <div className="bg-white/10 p-3 rounded-lg">
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );
}

function ProgressBar({
  value,
  max,
  label,
  color = "bg-blue-500",
}: {
  value: number;
  max: number;
  label: string;
  color?: string;
}) {
  const percentage = max > 0 ? (value / max) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-400">
          {value.toLocaleString()} / {max.toLocaleString()}
        </span>
      </div>
      <div className="w-full bg-slate-700/50 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="text-right text-xs text-slate-400">
        {percentage.toFixed(1)}%
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [failedTracks, setFailedTracks] = useState<FailedTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState("overview");

  // Maintenance action states
  const [isRunningMigration, setIsRunningMigration] = useState(false);
  const [isClearingFailed, setIsClearingFailed] = useState(false);
  const [isRunningSync, setIsRunningSync] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stats");
      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }

      const data = await response.json();
      setStats(data);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const fetchFailedTracks = async () => {
    try {
      const response = await fetch(
        `/api/failed-tracks?limit=${ADMIN_DASHBOARD.FAILED_TRACKS_PAGE_SIZE}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch failed tracks");
      }

      const data = await response.json();
      setFailedTracks(data.tracks);
    } catch (err) {
      console.error("Error fetching failed tracks:", err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchFailedTracks();

    // Auto-refresh based on configured interval
    const interval = setInterval(() => {
      fetchStats();
      fetchFailedTracks();
    }, ADMIN_DASHBOARD.REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Maintenance actions
  const handleMigrateISRC = async () => {
    setIsRunningMigration(true);
    setMaintenanceMessage(null);

    try {
      const response = await fetch("/api/migrate-isrc", { method: "POST" });
      const data = await response.json();

      if (data.success) {
        setMaintenanceMessage({
          type: "success",
          text: `Migration complete! Updated ${data.updatedCount} tracks.`,
        });
        fetchStats();
      } else {
        setMaintenanceMessage({
          type: "error",
          text: `Migration failed: ${data.error}`,
        });
      }
    } catch (error) {
      setMaintenanceMessage({
        type: "error",
        text: `Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
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
    setMaintenanceMessage(null);

    try {
      const response = await fetch("/api/clear-failed", { method: "POST" });
      const data = await response.json();

      if (data.success) {
        setMaintenanceMessage({
          type: "success",
          text: `Cleared ${data.clearedCount} failed requests.`,
        });
        fetchStats();
        fetchFailedTracks();
      } else {
        setMaintenanceMessage({
          type: "error",
          text: `Clear failed: ${data.error}`,
        });
      }
    } catch (error) {
      setMaintenanceMessage({
        type: "error",
        text: `Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    } finally {
      setIsClearingFailed(false);
    }
  };

  const handleRunSync = async () => {
    setIsRunningSync(true);
    setMaintenanceMessage({
      type: "info",
      text: "Syncing with Spotify and SoundCharts... This may take a while.",
    });

    try {
      // Get access token from localStorage
      const tokenData = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!tokenData) {
        throw new Error("No access token found. Please log in again.");
      }

      const { token } = JSON.parse(tokenData);

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

      if (data.success) {
        setMaintenanceMessage({
          type: "success",
          text: `Sync complete! Fetched ${
            data.stats.fetchedFromSoundCharts
          } audio features in ${(data.stats.duration / 1000).toFixed(1)}s.`,
        });
        fetchStats();
      } else {
        setMaintenanceMessage({
          type: "error",
          text: `Sync failed: ${data.error}`,
        });
      }
    } catch (error) {
      setMaintenanceMessage({
        type: "error",
        text: `Error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    } finally {
      setIsRunningSync(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto mb-4" />
          <p className="text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-white text-center max-w-md">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Error Loading Dashboard</h2>
          <p className="text-slate-300 mb-4">{error}</p>
          <Button onClick={fetchStats}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-950 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Admin Dashboard
            </h1>
            <p className="text-slate-400">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={fetchStats}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              <span className="ml-2">Refresh</span>
            </Button>
            <a
              href="/"
              className="text-blue-400 hover:text-blue-300 flex items-center"
            >
              ← Back to App
            </a>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Tracks"
            value={stats.tracks.total.toLocaleString()}
            subtitle="In database"
            icon={Music}
            variant="default"
          />

          <StatCard
            title="SoundCharts Coverage"
            value={`${stats.tracks.coveragePercentage}%`}
            subtitle={`${stats.tracks.withSoundCharts.toLocaleString()} tracks`}
            icon={CheckCircle}
            variant="success"
            trend={stats.tracks.withSoundCharts > 0 ? "Active" : undefined}
          />

          <StatCard
            title="Failed Requests"
            value={stats.failedRequests.pending}
            subtitle={`${stats.failedRequests.permanentlyFailed} permanent`}
            icon={AlertCircle}
            variant={stats.failedRequests.pending > 100 ? "warning" : "default"}
          />

          <StatCard
            title="Database Size"
            value={`${stats.database.sizeMB} MB`}
            subtitle={`${stats.tracks.total.toLocaleString()} records`}
            icon={HardDrive}
            variant="default"
          />
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="bg-white/10 border border-white/20 p-1">
            <TabsTrigger
              value="overview"
              className="text-slate-300 data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=active]:border-white/30"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="maintenance"
              className="text-slate-300 data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=active]:border-white/30"
            >
              Maintenance
            </TabsTrigger>
            <TabsTrigger
              value="failed-tracks"
              className="text-slate-300 data-[state=active]:bg-white/20 data-[state=active]:text-white data-[state=active]:border-white/30"
            >
              Failed Tracks ({failedTracks.length})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Track Coverage & Sync History */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Track Coverage */}
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Database size={24} />
                    Track Coverage
                  </h2>
                  <Button
                    onClick={handleRunSync}
                    disabled={isRunningSync}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Play
                      size={14}
                      className={isRunningSync ? "animate-pulse" : ""}
                    />
                    <span className="ml-1">Sync Now</span>
                  </Button>
                </div>

                <div className="space-y-6">
                  <ProgressBar
                    value={stats.tracks.withSoundCharts}
                    max={stats.tracks.total}
                    label="With Audio Features"
                    color="bg-green-500"
                  />

                  <ProgressBar
                    value={stats.tracks.withISRC}
                    max={stats.tracks.total}
                    label="With ISRC Codes"
                    color="bg-blue-500"
                  />

                  <div className="pt-4 border-t border-white/10">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-400">Missing Audio Features</p>
                        <p className="text-2xl font-bold text-orange-400">
                          {stats.tracks.withoutSoundCharts.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Missing ISRC</p>
                        <p className="text-2xl font-bold text-yellow-400">
                          {stats.tracks.withoutISRC.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sync History */}
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg p-6">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Clock size={24} />
                  Sync History
                </h2>

                {stats.syncs.lastSync ? (
                  <div className="space-y-4">
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-sm text-slate-400 mb-2">Last Sync</p>
                      <p className="text-lg font-semibold text-white">
                        {new Date(
                          stats.syncs.lastSync.completedAt
                        ).toLocaleString()}
                      </p>
                      <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                        <div>
                          <p className="text-slate-400">New Tracks</p>
                          <p className="text-xl font-bold text-green-400">
                            {stats.syncs.lastSync.newTracks}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">Duration</p>
                          <p className="text-xl font-bold text-blue-400">
                            {(stats.syncs.lastSync.duration / 1000).toFixed(1)}s
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">Fetched Features</p>
                          <p className="text-xl font-bold text-purple-400">
                            {stats.syncs.lastSync.soundchartsFetched}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">Failed</p>
                          <p className="text-xl font-bold text-red-400">
                            {stats.syncs.lastSync.failedTracks}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-slate-400">
                      <p>
                        Total Syncs:{" "}
                        <span className="text-white font-semibold">
                          {stats.syncs.total}
                        </span>
                      </p>
                      <p>
                        Avg Duration:{" "}
                        <span className="text-white font-semibold">
                          {(stats.syncs.avgDuration / 1000).toFixed(1)}s
                        </span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400">No sync history available</p>
                )}
              </div>
            </div>

            {/* Audio Features Coverage */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-6">
                Audio Features Coverage
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Object.entries(stats.audioFeatures.coverage).map(
                  ([feature, { count }]) => {
                    const percentage =
                      stats.tracks.total > 0
                        ? (count / stats.tracks.total) * 100
                        : 0;

                    return (
                      <div key={feature} className="bg-white/5 rounded-lg p-4">
                        <p className="text-sm text-slate-400 capitalize mb-2">
                          {feature}
                        </p>
                        <p className="text-2xl font-bold text-white">
                          {percentage.toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {count.toLocaleString()} tracks
                        </p>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            {/* Failed Requests Breakdown */}
            {stats.failedRequests.byErrorCode.length > 0 && (
              <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg p-6">
                <h2 className="text-2xl font-bold text-white mb-6">
                  Failed Requests by Error Code
                </h2>

                <div className="space-y-3">
                  {stats.failedRequests.byErrorCode.map(
                    ({ error_code, count }) => (
                      <div
                        key={error_code}
                        className="flex items-center justify-between bg-white/5 rounded-lg p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-red-500/20 text-red-400 font-mono text-sm px-3 py-1 rounded">
                            {error_code || "N/A"}
                          </div>
                          <span className="text-slate-300">
                            {error_code === 404
                              ? "Not Found"
                              : error_code === 403
                              ? "Forbidden"
                              : error_code === 429
                              ? "Rate Limited"
                              : error_code === 402
                              ? "Quota Exceeded"
                              : "Unknown Error"}
                          </span>
                        </div>
                        <span className="text-white font-semibold">
                          {count} tracks
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance" className="space-y-6">
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-6">
                Database Maintenance Operations
              </h2>

              {maintenanceMessage && (
                <div
                  className={`mb-6 p-4 rounded-lg ${
                    maintenanceMessage.type === "success"
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : maintenanceMessage.type === "error"
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  }`}
                >
                  {maintenanceMessage.text}
                </div>
              )}

              <div className="space-y-6">
                {/* Migrate ISRCs */}
                <div className="bg-white/5 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-white mb-3">
                    1. Migrate ISRCs
                  </h3>
                  <p className="text-slate-300 mb-4">
                    Extract ISRC codes from spotify_data JSON and populate the
                    isrc column. This improves SoundCharts lookup success rate.
                  </p>
                  <Button
                    onClick={handleMigrateISRC}
                    disabled={isRunningMigration}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Download
                      size={16}
                      className={isRunningMigration ? "animate-pulse" : ""}
                    />
                    <span className="ml-2">
                      {isRunningMigration
                        ? "Migrating..."
                        : "Run ISRC Migration"}
                    </span>
                  </Button>
                </div>

                {/* Clear Failed Requests */}
                <div className="bg-white/5 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-white mb-3">
                    2. Clear Failed Requests
                  </h3>
                  <p className="text-slate-300 mb-4">
                    Remove all failed request records to allow retry with the
                    new ISRC strategy.
                  </p>
                  <Button
                    onClick={handleClearFailed}
                    disabled={isClearingFailed}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Trash2
                      size={16}
                      className={isClearingFailed ? "animate-pulse" : ""}
                    />
                    <span className="ml-2">
                      {isClearingFailed
                        ? "Clearing..."
                        : "Clear Failed Requests"}
                    </span>
                  </Button>
                </div>

                {/* Trigger Sync */}
                <div className="bg-white/5 rounded-lg p-6">
                  <h3 className="text-xl font-bold text-white mb-3">
                    3. Trigger Manual Sync
                  </h3>
                  <p className="text-slate-300 mb-4">
                    Manually trigger a sync to fetch new tracks from Spotify and
                    update SoundCharts data.
                  </p>
                  <Button
                    onClick={handleRunSync}
                    disabled={isRunningSync}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Play
                      size={16}
                      className={isRunningSync ? "animate-pulse" : ""}
                    />
                    <span className="ml-2">
                      {isRunningSync ? "Syncing..." : "Start Sync"}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Failed Tracks Tab */}
          <TabsContent value="failed-tracks" className="space-y-6">
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-6">
                Tracks with Failed Audio Features
              </h2>

              {failedTracks.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle
                    size={48}
                    className="text-green-500 mx-auto mb-4"
                  />
                  <p className="text-slate-300 text-lg">
                    No failed tracks! All audio features fetched successfully.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-white/10">
                      <tr className="text-left text-slate-400">
                        <th className="pb-3 font-semibold">Track</th>
                        <th className="pb-3 font-semibold">Artist</th>
                        <th className="pb-3 font-semibold">ISRC</th>
                        <th className="pb-3 font-semibold">Error</th>
                        <th className="pb-3 font-semibold">Attempts</th>
                        <th className="pb-3 font-semibold">Last Attempt</th>
                        <th className="pb-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {failedTracks.map((track) => (
                        <tr
                          key={track.spotify_id}
                          className="border-b border-white/5 hover:bg-white/5"
                        >
                          <td className="py-3">
                            <p className="text-white font-medium">
                              {track.track_name || "Unknown Track"}
                            </p>
                          </td>
                          <td className="py-3 text-slate-300">
                            {track.artists.length > 0
                              ? track.artists.map((a) => a.name).join(", ")
                              : "Unknown Artist"}
                          </td>
                          <td className="py-3">
                            {track.isrc ? (
                              <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded font-mono">
                                {track.isrc}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-xs">
                                No ISRC
                              </span>
                            )}
                          </td>
                          <td className="py-3">
                            <span className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded font-mono">
                              {track.error_code || "N/A"}
                            </span>
                          </td>
                          <td className="py-3 text-slate-300">
                            {track.attempt_count}/{track.max_attempts}
                          </td>
                          <td className="py-3 text-slate-400 text-xs">
                            {new Date(track.updated_at).toLocaleString()}
                          </td>
                          <td className="py-3">
                            <a
                              href={`https://open.spotify.com/track/${track.spotify_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <ExternalLink size={16} />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

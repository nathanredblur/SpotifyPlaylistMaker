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
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

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

  useEffect(() => {
    fetchStats();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

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
          <Button
            onClick={fetchStats}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span className="ml-2">Refresh</span>
          </Button>
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

        {/* Detailed Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Track Coverage */}
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Database size={24} />
              Track Coverage
            </h2>

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
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg p-6 mb-8">
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
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              Failed Requests by Error Code
            </h2>

            <div className="space-y-3">
              {stats.failedRequests.byErrorCode.map(({ error_code, count }) => (
                <div
                  key={error_code}
                  className="flex items-center justify-between bg-white/5 rounded-lg p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-red-500/20 text-red-400 font-mono text-sm px-3 py-1 rounded">
                      {error_code}
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
              ))}
            </div>
          </div>
        )}

        {/* Recent Tracks */}
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Recent Tracks</h2>

          <div className="space-y-2">
            {stats.recentTracks.map((track) => (
              <div
                key={track.spotify_id}
                className="flex items-center justify-between bg-white/5 rounded-lg p-4"
              >
                <div className="flex-1">
                  <p className="text-white font-medium">{track.name}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Added: {new Date(track.added_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {track.isrc ? (
                    <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded">
                      ISRC
                    </span>
                  ) : (
                    <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded">
                      No ISRC
                    </span>
                  )}
                  {track.has_soundcharts ? (
                    <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded">
                      ✓ Features
                    </span>
                  ) : (
                    <span className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded">
                      ✗ Features
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex items-center justify-center gap-4">
          <a
            href="/maintenance"
            className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-6 py-3 rounded-lg transition"
          >
            Database Maintenance
          </a>
          <a href="/" className="text-blue-400 hover:text-blue-300 text-lg">
            ← Back to App
          </a>
        </div>
      </div>
    </div>
  );
}

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
  LogIn,
  LogOut,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ADMIN_DASHBOARD, STORAGE_KEYS } from "@/config/constants";
import { authorizeSpotify } from "@/lib/spotify-auth";

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
    default: "border-border bg-card",
    success: "border-green-500/30 bg-green-500/10",
    warning: "border-orange-500/30 bg-orange-500/10",
    danger: "border-red-500/30 bg-red-500/10",
  };

  const iconColors = {
    default: "bg-accent/20 text-accent",
    success: "bg-green-500/20 text-green-400",
    warning: "bg-orange-500/20 text-orange-400",
    danger: "bg-red-500/20 text-red-400",
  };

  return (
    <div
      className={`${variantColors[variant]} border rounded-lg p-6 transition-all hover:border-accent/50`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </p>
          <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2 text-xs text-green-400">
              <TrendingUp size={14} />
              <span>{trend}</span>
            </div>
          )}
        </div>
        <div className={`${iconColors[variant]} p-3 rounded-lg`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

function ProgressBar({
  value,
  max,
  label,
  color = "bg-accent",
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
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground">
          {value.toLocaleString()} / {max.toLocaleString()}
        </span>
      </div>
      <div className="w-full bg-secondary rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className="text-right text-xs text-muted-foreground">
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
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Maintenance action states
  const [isRunningMigration, setIsRunningMigration] = useState(false);
  const [isClearingFailed, setIsClearingFailed] = useState(false);
  const [isRunningSync, setIsRunningSync] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Check admin access on mount (and handle OAuth callback)
  useEffect(() => {
    handleAuthAndCheckAccess();
  }, []);

  const handleAuthAndCheckAccess = async () => {
    setAuthChecking(true);
    try {
      // Check for OAuth callback in URL hash
      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get("access_token");
        const expiresIn = params.get("expires_in");
        const error = params.get("error");

        if (error) {
          console.error("OAuth error:", error);
          setIsAdmin(false);
          setAuthChecking(false);
          return;
        }

        if (accessToken) {
          // Store the token
          const tokenData = {
            token: accessToken,
            expiresAt: Date.now() + parseInt(expiresIn || "3600") * 1000,
          };
          localStorage.setItem(
            STORAGE_KEYS.ACCESS_TOKEN,
            JSON.stringify(tokenData)
          );
          // Clean up URL
          window.history.replaceState(null, "", window.location.pathname);
          // Verify admin status with the new token
          await verifyAdminStatus(accessToken);
          return;
        }
      }

      // Get token from localStorage
      const tokenData = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!tokenData) {
        setIsAdmin(false);
        setAuthChecking(false);
        return;
      }

      const { token, expiresAt } = JSON.parse(tokenData);
      if (!token || (expiresAt && Date.now() > expiresAt)) {
        // Token missing or expired
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        setIsAdmin(false);
        setAuthChecking(false);
        return;
      }

      // Verify admin status
      await verifyAdminStatus(token);
    } catch (err) {
      console.error("Error checking admin access:", err);
      setIsAdmin(false);
      setAuthChecking(false);
    }
  };

  const verifyAdminStatus = async (token: string) => {
    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.user?.isAdmin === true);
      } else {
        setIsAdmin(false);
      }
    } catch (err) {
      console.error("Error verifying admin status:", err);
      setIsAdmin(false);
    }
    setAuthChecking(false);
  };

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

  // Fetch stats only after confirming admin access
  useEffect(() => {
    if (isAdmin !== true) return;

    fetchStats();
    fetchFailedTracks();

    // Auto-refresh based on configured interval
    const interval = setInterval(() => {
      fetchStats();
      fetchFailedTracks();
    }, ADMIN_DASHBOARD.REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [isAdmin]);

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    window.location.reload();
  };

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

      const { token, expiresAt } = JSON.parse(tokenData);

      // Check if token is expired
      if (Date.now() >= expiresAt) {
        setMaintenanceMessage({
          type: "error",
          text: "Your Spotify session has expired. Please go back to the home page and log in again.",
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

      // Handle 401 Unauthorized (expired token)
      if (response.status === 401) {
        setMaintenanceMessage({
          type: "error",
          text: "Your Spotify session has expired. Please go back to the home page and log in again.",
        });
        // Clear the expired token
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        return;
      }

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

  // Show loading while checking auth
  if (authChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-accent mx-auto mb-4" />
          <p className="text-lg">Checking access...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated or not admin
  if (isAdmin === false) {
    // Check if user is logged in but not admin
    const tokenData = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const isLoggedIn = tokenData !== null;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-center max-w-md px-4">
          {isLoggedIn ? (
            // Logged in but not admin
            <>
              <AlertCircle size={48} className="text-destructive mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <p className="text-muted-foreground mb-4">
                Your account doesn't have admin privileges. Only the first user
                to log in becomes the admin.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => (window.location.href = "/")}
                  variant="outline"
                  className="border-border text-muted-foreground hover:bg-secondary"
                >
                  <Home size={18} className="mr-2" />
                  Go to Gallery
                </Button>
              </div>
            </>
          ) : (
            // Not logged in - show login page
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent flex items-center justify-center">
                <Music size={40} className="text-accent-foreground" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Admin Login</h1>
              <p className="text-muted-foreground mb-8">
                Log in with your Spotify account to access the admin dashboard.
              </p>
              <Button
                onClick={() => authorizeSpotify()}
                className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-3 text-lg"
              >
                <LogIn size={20} className="mr-2" />
                Login with Spotify
              </Button>
              <p className="text-muted-foreground text-sm mt-6">
                The first user to log in will become the admin.
              </p>
              <div className="mt-8 pt-6 border-t border-border">
                <a
                  href="/"
                  className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                >
                  ← Back to Gallery
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-accent mx-auto mb-4" />
          <p className="text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-center max-w-md">
          <AlertCircle size={48} className="text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Error Loading Dashboard</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchStats} className="bg-accent hover:bg-accent/90 text-accent-foreground">Retry</Button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={fetchStats}
              disabled={loading}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              <span className="ml-2">Refresh</span>
            </Button>
            <a
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Gallery
            </a>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              <LogOut size={16} className="mr-2" />
              Logout
            </Button>
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
          <TabsList className="bg-secondary border border-border p-1">
            <TabsTrigger
              value="overview"
              className="text-muted-foreground data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="maintenance"
              className="text-muted-foreground data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
            >
              Maintenance
            </TabsTrigger>
            <TabsTrigger
              value="failed-tracks"
              className="text-muted-foreground data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
            >
              Failed Tracks ({failedTracks.length})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Track Coverage & Sync History */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Track Coverage */}
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Database size={24} className="text-accent" />
                    Track Coverage
                  </h2>
                  <Button
                    onClick={handleRunSync}
                    disabled={isRunningSync}
                    size="sm"
                    className="bg-accent hover:bg-accent/90 text-accent-foreground"
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

                  <div className="pt-4 border-t border-border">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Missing Audio Features</p>
                        <p className="text-2xl font-bold text-orange-400">
                          {stats.tracks.withoutSoundCharts.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Missing ISRC</p>
                        <p className="text-2xl font-bold text-yellow-400">
                          {stats.tracks.withoutISRC.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sync History */}
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                  <Clock size={24} className="text-accent" />
                  Sync History
                </h2>

                {stats.syncs.lastSync ? (
                  <div className="space-y-4">
                    <div className="bg-secondary rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-2">Last Sync</p>
                      <p className="text-lg font-semibold text-foreground">
                        {new Date(
                          stats.syncs.lastSync.completedAt
                        ).toLocaleString()}
                      </p>
                      <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">New Tracks</p>
                          <p className="text-xl font-bold text-green-400">
                            {stats.syncs.lastSync.newTracks}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Duration</p>
                          <p className="text-xl font-bold text-blue-400">
                            {(stats.syncs.lastSync.duration / 1000).toFixed(1)}s
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Fetched Features</p>
                          <p className="text-xl font-bold text-accent">
                            {stats.syncs.lastSync.soundchartsFetched}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Failed</p>
                          <p className="text-xl font-bold text-destructive">
                            {stats.syncs.lastSync.failedTracks}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      <p>
                        Total Syncs:{" "}
                        <span className="text-foreground font-semibold">
                          {stats.syncs.total}
                        </span>
                      </p>
                      <p>
                        Avg Duration:{" "}
                        <span className="text-foreground font-semibold">
                          {(stats.syncs.avgDuration / 1000).toFixed(1)}s
                        </span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No sync history available</p>
                )}
              </div>
            </div>

            {/* Audio Features Coverage */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-2xl font-bold text-foreground mb-6">
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
                      <div key={feature} className="bg-secondary rounded-lg p-4">
                        <p className="text-sm text-muted-foreground capitalize mb-2">
                          {feature}
                        </p>
                        <p className="text-2xl font-bold text-foreground">
                          {percentage.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
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
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  Failed Requests by Error Code
                </h2>

                <div className="space-y-3">
                  {stats.failedRequests.byErrorCode.map(
                    ({ error_code, count }) => (
                      <div
                        key={error_code}
                        className="flex items-center justify-between bg-secondary rounded-lg p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-destructive/20 text-destructive font-mono text-sm px-3 py-1 rounded">
                            {error_code || "N/A"}
                          </div>
                          <span className="text-muted-foreground">
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
                        <span className="text-foreground font-semibold">
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
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Database Maintenance Operations
              </h2>

              {maintenanceMessage && (
                <div
                  className={`mb-6 p-4 rounded-lg ${
                    maintenanceMessage.type === "success"
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : maintenanceMessage.type === "error"
                      ? "bg-destructive/20 text-destructive border border-destructive/30"
                      : "bg-accent/20 text-accent border border-accent/30"
                  }`}
                >
                  <p className="mb-0">{maintenanceMessage.text}</p>
                  {maintenanceMessage.type === "error" &&
                    maintenanceMessage.text.includes("expired") && (
                      <Button
                        onClick={() => (window.location.href = "/")}
                        className="mt-3 bg-accent hover:bg-accent/90 text-accent-foreground"
                      >
                        Go to Login
                      </Button>
                    )}
                </div>
              )}

              <div className="space-y-6">
                {/* Migrate ISRCs */}
                <div className="bg-secondary rounded-lg p-6">
                  <h3 className="text-xl font-bold text-foreground mb-3">
                    1. Migrate ISRCs
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Extract ISRC codes from spotify_data JSON and populate the
                    isrc column. This improves SoundCharts lookup success rate.
                  </p>
                  <Button
                    onClick={handleMigrateISRC}
                    disabled={isRunningMigration}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
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
                <div className="bg-secondary rounded-lg p-6">
                  <h3 className="text-xl font-bold text-foreground mb-3">
                    2. Clear Failed Requests
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Remove all failed request records to allow retry with the
                    new ISRC strategy.
                  </p>
                  <Button
                    onClick={handleClearFailed}
                    disabled={isClearingFailed}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
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
                <div className="bg-secondary rounded-lg p-6">
                  <h3 className="text-xl font-bold text-foreground mb-3">
                    3. Trigger Manual Sync
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Manually trigger a sync to fetch new tracks from Spotify and
                    update SoundCharts data.
                  </p>
                  <Button
                    onClick={handleRunSync}
                    disabled={isRunningSync}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground"
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
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Tracks with Failed Audio Features
              </h2>

              {failedTracks.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle
                    size={48}
                    className="text-green-500 mx-auto mb-4"
                  />
                  <p className="text-muted-foreground text-lg">
                    No failed tracks! All audio features fetched successfully.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border">
                      <tr className="text-left text-muted-foreground">
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
                          className="border-b border-border hover:bg-secondary/50"
                        >
                          <td className="py-3">
                            <p className="text-foreground font-medium">
                              {track.track_name || "Unknown Track"}
                            </p>
                          </td>
                          <td className="py-3 text-muted-foreground">
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
                              <span className="text-muted-foreground text-xs">
                                No ISRC
                              </span>
                            )}
                          </td>
                          <td className="py-3">
                            <span className="bg-destructive/20 text-destructive text-xs px-2 py-1 rounded font-mono">
                              {track.error_code || "N/A"}
                            </span>
                          </td>
                          <td className="py-3 text-muted-foreground">
                            {track.attempt_count}/{track.max_attempts}
                          </td>
                          <td className="py-3 text-muted-foreground text-xs">
                            {new Date(track.updated_at).toLocaleString()}
                          </td>
                          <td className="py-3">
                            <a
                              href={`https://open.spotify.com/track/${track.spotify_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent hover:text-accent/80"
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

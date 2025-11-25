import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, FileCode, ExternalLink } from "lucide-react";

interface ConfigErrorProps {
  error: Error;
}

/**
 * Displays configuration errors in a user-friendly way
 * Shows helpful instructions for fixing environment variable issues
 */
export function ConfigError({ error }: ConfigErrorProps) {
  const isConfigError = error.name === "ConfigurationError";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl backdrop-blur-lg bg-red-950/20 border-red-500/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <div>
              <CardTitle className="text-2xl text-red-400">
                {isConfigError ? "Configuration Error" : "Application Error"}
              </CardTitle>
              <CardDescription className="text-red-300/80">
                {isConfigError
                  ? "There's a problem with your environment configuration"
                  : "An unexpected error occurred"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error Message */}
          <div className="bg-slate-900/50 border border-red-500/30 rounded-lg p-4">
            <pre className="text-sm text-red-300 whitespace-pre-wrap font-mono">
              {error.message}
            </pre>
          </div>

          {isConfigError && (
            <>
              {/* Quick Fix Instructions */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FileCode className="w-5 h-5" />
                  Quick Fix
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-slate-300 text-sm">
                  <li>
                    Make sure you have a <code className="bg-slate-800 px-2 py-1 rounded">.env</code> file
                    in the project root
                  </li>
                  <li>
                    Copy <code className="bg-slate-800 px-2 py-1 rounded">.env.example</code> to{" "}
                    <code className="bg-slate-800 px-2 py-1 rounded">.env</code> if you haven't already
                  </li>
                  <li>
                    Add your Spotify Client ID to the{" "}
                    <code className="bg-slate-800 px-2 py-1 rounded">PUBLIC_SPOTIFY_CLIENT_ID</code> variable
                  </li>
                  <li>
                    <strong className="text-white">Restart the development server</strong> after
                    changing <code className="bg-slate-800 px-2 py-1 rounded">.env</code>
                  </li>
                </ol>
              </div>

              {/* Terminal Commands */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                  Terminal Commands
                </h4>
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 font-mono text-sm">
                  <div className="text-slate-400"># Copy the example file</div>
                  <div className="text-green-400">cp .env.example .env</div>
                  <div className="text-slate-400 mt-2"># Edit the .env file</div>
                  <div className="text-green-400">nano .env</div>
                  <div className="text-slate-400 mt-2"># Restart dev server</div>
                  <div className="text-green-400">pnpm dev</div>
                </div>
              </div>

              {/* Get Spotify Credentials */}
              <div className="bg-purple-950/30 border border-purple-500/30 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-purple-300 mb-2 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Don't have a Spotify Client ID?
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 text-sm">
                  <li>
                    Go to{" "}
                    <a
                      href="https://developer.spotify.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 hover:text-green-300 underline"
                    >
                      Spotify Developer Dashboard
                    </a>
                  </li>
                  <li>Create a new app or select an existing one</li>
                  <li>Copy the "Client ID" from the app settings</li>
                  <li>
                    Add redirect URIs: <code className="bg-slate-800 px-1 rounded">http://localhost:4321/</code>
                  </li>
                </ol>
              </div>

              {/* Documentation Link */}
              <div className="text-center pt-2">
                <a
                  href="/docs/ENVIRONMENT_VARIABLES.md"
                  className="text-sm text-slate-400 hover:text-slate-300 underline"
                >
                  View full documentation →
                </a>
              </div>
            </>
          )}

          {!isConfigError && (
            <div className="text-center text-slate-400 text-sm">
              <p>Please check the browser console for more details.</p>
              <p className="mt-2">
                If this problem persists, please{" "}
                <a
                  href="https://github.com/your-repo/issues"
                  className="text-green-400 hover:text-green-300 underline"
                >
                  report an issue
                </a>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


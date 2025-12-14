// @ts-check

import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  // Use server mode to allow dynamic API routes
  output: "server",

  vite: {
    plugins: [tailwindcss()],
    server: {
      watch: {
        // Ignore SQLite journal files to prevent unnecessary HMR refreshes
        ignored: ["**/*.db-shm", "**/*.db-wal", "**/*.db-journal"],
      },
    },
  },
  server: {
    host: "127.0.0.1", // Explicitly set the host to 127.0.0.1
    port: 4321, // Optional: You can also specify a port if needed
  },
  integrations: [react()],
});

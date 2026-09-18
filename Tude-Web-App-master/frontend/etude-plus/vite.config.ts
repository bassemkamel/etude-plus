import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Load all env vars from .env (including non-VITE_ prefixed ones used in this config file).
const localEnv = loadEnv("development", path.resolve(import.meta.dirname), "");
const merged = { ...localEnv, ...process.env };

// PORT is only required when running the dev/preview server, not during `vite build`.
const rawPort = merged.PORT;
const port = rawPort ? Number(rawPort) : 5173;

// BASE_PATH controls the router base and asset prefix.
// Defaults to "/" for standard Railway / Vercel deployments.
const basePath = merged.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    // Replit-only plugins — loaded dynamically so they don't break non-Replit builds
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-runtime-error-modal").then((m) =>
            m.default()
          ),
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            })
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner()
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    // In local dev, proxy /api requests to the backend server.
    // Set API_DEV_PORT to match whatever PORT your api-server uses (default 3000).
    proxy: {
      "/api": {
        target: `http://localhost:${merged.API_DEV_PORT ?? 3000}`,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": {
        target: `http://localhost:${merged.API_DEV_PORT ?? 3000}`,
        changeOrigin: true,
      },
    },
  },
});

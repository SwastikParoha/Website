import { defineConfig } from "vite";

// three.js lives in the lazily loaded stage chunk (~140 KB gzipped), loaded after the page paints
export default defineConfig({ build: { chunkSizeWarningLimit: 700 } });

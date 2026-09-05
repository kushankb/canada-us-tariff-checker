import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    // Honour a port assigned by the environment; Vite otherwise picks its own
    // and the caller ends up watching the wrong one.
    port: Number(process.env.PORT) || 5173,
    strictPort: !!process.env.PORT,
  },
  build: {
    // ca-history.json is large and only needed when a search misses the
    // current list, so it is dynamically imported and must stay its own chunk.
    chunkSizeWarningLimit: 1200,
  },
});

/**
 * Build variant that produces one self-contained bundle, for publishing the
 * app as a single hosted page. Code splitting is disabled because the history
 * chunk is dynamically imported and there is nowhere to fetch it from once the
 * page is a single file.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist-artifact",
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
});

import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Related: https://github.com/remix-run/remix/issues/2835#issuecomment-1144102176
export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    remix({
      ignoredRouteFiles: ["**/.*"],
    }),
    tsconfigPaths(),
  ],
  build: {
    // Treat JSON import attribute inconsistencies as warnings, not errors
    target: 'esnext',
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress these specific warnings
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        if (warning.message?.includes('import attribute')) return;
        warn(warning);
      },
    },
  },
  // Force consistent JSON handling
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },
  esbuild: {
    // Suppress warnings during esbuild phase
    logOverride: {
      'ignored-import-attributes': 'silent',
    },
  },
});

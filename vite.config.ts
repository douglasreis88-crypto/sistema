import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [TanStackRouterVite(), react(), tsconfigPaths(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    host: "0.0.0.0"
  },
  build: {
    outDir: "dist",
  },
  // ✅ IMPORTANTE: Deve ser apenas isso
  base: '/',
});

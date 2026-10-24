import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  root: "web",
  plugins: [react()],
  optimizeDeps: {
    include: [
      "fast-xml-parser",
      "fflate",
      "pdfjs-dist",
      "shiki/core",
      "shiki/engine/oniguruma",
      "shiki/langs",
      "shiki/themes/github-light-high-contrast.mjs",
      "shiki/themes/github-dark.mjs",
      "shiki/wasm",
    ],
  },
  server: {
    hmr: process.env.STARTER_HMR_PORT ? { port: Number(process.env.STARTER_HMR_PORT) } : undefined,
    fs: { deny: ["**/.env*", "**/.data/**", "**/.copilotkit/**", "**/*.sqlite", "**/.git/**"] },
  },
  build: { outDir: "../dist/web", emptyOutDir: true },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  cacheDir: fileURLToPath(new URL("../../.data/vite-fixtures", import.meta.url)),
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
    host: "127.0.0.1",
    port: 4174,
    strictPort: true,
    fs: {
      allow: [fileURLToPath(new URL("../..", import.meta.url))],
      deny: ["**/.env*", "**/.data/**", "**/.copilotkit/**", "**/*.sqlite", "**/.git/**"],
    },
  },
});

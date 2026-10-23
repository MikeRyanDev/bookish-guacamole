import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  root: "web",
  plugins: [react()],
  server: {
    fs: { deny: ["**/.env*", "**/.data/**", "**/.copilotkit/**", "**/*.sqlite", "**/.git/**"] },
  },
  build: { outDir: "../dist/web", emptyOutDir: true },
});

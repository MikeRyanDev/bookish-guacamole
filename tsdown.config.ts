import { defineConfig } from "tsdown";
export default defineConfig({
  entry: ["src/server/main.ts"],
  outDir: "dist/server",
  deps: { neverBundle: ["vite"] },
  platform: "node",
  format: "esm",
  target: "node22",
  clean: true,
  sourcemap: true,
});

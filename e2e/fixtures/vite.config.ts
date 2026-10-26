import { readWorktreeIdentity } from "../../src/server/worktree-identity.js";
import { localAccessError } from "../../src/server/http/local-access.js";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  cacheDir: fileURLToPath(new URL("../../.data/vite-fixtures", import.meta.url)),
  plugins: [
    react(),
    {
      name: "worktree-identity",
      configureServer(server) {
        const identity = readWorktreeIdentity("fixture");
        const token = process.env.STARTER_WORKTREE_TOKEN;
        server.middlewares.use((request, response, next) => {
          if (request.url !== "/__worktree") return next();
          response.setHeader("cache-control", "no-store");
          if (localAccessError(request.headers.host ?? "", request.headers.origin)) {
            response.writeHead(403).end();
            return;
          }
          if (!identity || !token) {
            response.writeHead(404).end();
            return;
          }
          if (request.headers.authorization !== `Bearer ${token}`) {
            response.writeHead(401).end();
            return;
          }
          response
            .writeHead(200, { "content-type": "application/json" })
            .end(JSON.stringify(identity));
        });
      },
    },
  ],
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

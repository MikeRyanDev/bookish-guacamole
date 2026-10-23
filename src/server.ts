import sirv from "sirv";
import { startApp } from "./app.js";

/** Starts the browser workspace and closes both runtime and dev server on exit. */
async function main(): Promise<void> {
  const development = process.env.NODE_ENV !== "production";
  const vite = development
    ? await (
        await import("vite")
      ).createServer({ server: { middlewareMode: true }, appType: "spa" })
    : undefined;
  const app = await startApp({
    port: Number(process.env.PORT ?? 4173),
    serve: vite?.middlewares ?? sirv("dist/web", { single: true }),
  });
  console.log(`Coding workspace: ${app.runtimeUrl.replace("/api/copilotkit", "")}`);
  let closing = false;
  async function close() {
    if (closing) return;
    closing = true;
    await vite?.close();
    await app.close();
  }
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.once(signal, () => {
      close().catch((error) => {
        console.error(error);
        process.exitCode = 1;
      });
    });
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Startup failed");
  process.exitCode = 1;
});

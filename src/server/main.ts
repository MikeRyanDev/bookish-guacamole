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
  let app: Awaited<ReturnType<typeof startApp>>;
  try {
    app = await startApp({
      port: Number(process.env.PORT ?? 4173),
      serve: vite?.middlewares ?? sirv("dist/client", { single: true }),
    });
  } catch (error) {
    await vite?.close();
    throw error;
  }
  console.log(`Coding workspace: ${app.runtimeUrl.replace("/api/copilotkit", "")}`);
  let closing = false;
  async function close() {
    if (closing) return;
    closing = true;
    try {
      await app.close();
    } finally {
      await vite?.close();
    }
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

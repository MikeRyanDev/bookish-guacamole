import { resolve } from "node:path";
import { definePlugin, PermissionResources, type ToolResources } from "@tanstack/ai-harness";
import type { AnyChatMiddleware } from "@tanstack/ai";
import type { PermissionRule } from "@tanstack/ai-harness/plugins";

export interface PermissionPreview {
  rules: PermissionRule[];
  partial: boolean;
}
export const PREVIEW_PLUGIN = "starter/permission-preview";

/** Describes native `always` rules from the tool plugins' actual resources. Never grants access. */
export function permissionPreview(root: string) {
  return definePlugin({
    name: PREVIEW_PLUGIN,
    setup(ctx) {
      const state = ctx.state<{ calls: Record<string, PermissionPreview> }>({ calls: {} });
      const middleware: AnyChatMiddleware = {
        name: PREVIEW_PLUGIN,
        async onInterruptBoundary(run) {
          if (run.phase !== "beforeTools") return undefined;
          const index = run.messages.findLastIndex(
            (m) => m.role === "assistant" && m.toolCalls?.length,
          );
          const done = new Set(
            run.messages
              .slice(index + 1)
              .flatMap((m) => (m.role === "tool" && m.toolCallId ? [m.toolCallId] : [])),
          );
          const calls: Record<string, PermissionPreview> = {};
          for (const call of run.messages[index]?.toolCalls ?? []) {
            if (done.has(call.id)) continue;
            const tool = call.function.name;
            try {
              const input: unknown = JSON.parse(call.function.arguments);
              const entries = ctx
                .collect<Readonly<Record<string, ToolResources>>>(PermissionResources)
                .flatMap((item) => (item[tool] ? [item[tool]!] : []));
              const rules: PermissionRule[] = [];
              let partial = false;
              if (!entries.length) rules.push({ tool, decision: "allow" });
              for (const entry of entries) {
                const paths = [
                  ...((await entry.paths?.(input)) ?? []),
                  ...((await entry.outside?.(input)) ?? []),
                ];
                for (const path of paths) {
                  const full = resolve(root, path).replaceAll("\\", "/");
                  const base = resolve(root).replaceAll("\\", "/");
                  const fold = (s: string) =>
                    process.platform === "darwin" || process.platform === "win32"
                      ? s.toLowerCase()
                      : s;
                  const inside =
                    fold(full) === fold(base) || fold(full).startsWith(fold(base + "/"));
                  const resource = inside ? full.slice(base.length + 1) : full;
                  if (/[*?]/.test(resource)) partial = true;
                  else rules.push({ tool, resource, decision: "allow" });
                }
                for (const command of (await entry.commands?.(input)) ?? []) {
                  if (/[`;&|<>\r\n*?]|\$\(/.test(command)) partial = true;
                  else rules.push({ tool, resource: command.trim(), decision: "allow" });
                }
                for (const action of (await entry.actions?.(input)) ?? []) {
                  if (action.includes("@unsaved:")) partial = true;
                  else rules.push({ tool: action, decision: "allow" });
                }
              }
              calls[call.id] = {
                rules: [...new Map(rules.map((r) => [JSON.stringify(r), r])).values()],
                partial,
              };
            } catch {
              calls[call.id] = { rules: [], partial: true };
            }
          }
          await state.update(() => ({ calls }));
          return undefined;
        },
      };
      return { middleware: [middleware], agentMiddleware: [middleware] };
    },
  });
}

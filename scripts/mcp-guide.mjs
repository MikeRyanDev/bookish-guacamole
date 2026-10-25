import { toolDefinition } from "@tanstack/ai";
import { createMCPServer } from "@tanstack/ai-mcp/server";
import { serveMCPStdio } from "@tanstack/ai-mcp/server/stdio";
import { z } from "zod";

// An optional, local, read-only integration. No filesystem or network access.
const guide = toolDefinition({
  name: "starter_guide",
  description: "Read the coding starter's short guide to messages, approvals, and Learning.",
  inputSchema: z.object({}),
  outputSchema: z.object({ text: z.string() }),
}).server(async () => ({
  text: "CopilotKit owns the conversation. Intelligence stores product runs and provides Learning. TanStack runs coding tools. Review requested tool approvals before continuing. Execution settings control context, limits, retries, and optional code mode. Connections adds optional MCP tools.",
}));

serveMCPStdio(createMCPServer({ name: "starter-guide", version: "1.0.0", tools: [guide] }));

import type { WorkspaceGitStatus } from "../../src/file-status";
import { queryOptions } from "@tanstack/react-query";
export interface AppConfig {
  token: string;
  runtimeUrl: string;
  workspace: string;
  workspaceId: string;
  workspaceName: string;
  agentId: string;
  model: string;
  containerId: string;
}
export interface Skill {
  name: string;
  description: string;
  content: string;
}
/** Reads typed local data; private provider credentials never enter this module. */
export async function request<T>(path: string, token?: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    signal,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok)
    throw new Error(`Request failed (${response.status}). Check the local runtime.`);
  return response.json() as Promise<T>;
}
export const configQuery = (workspace?: string) =>
  queryOptions({
    queryKey: ["config", workspace],
    queryFn: ({ signal }) =>
      request<AppConfig>(
        `/api/config${workspace ? `?workspace=${encodeURIComponent(workspace)}` : ""}`,
        undefined,
        signal,
      ),
    staleTime: Infinity,
    retry: 1,
  });
export const filesQuery = (token: string, workspace: string) =>
  queryOptions({
    queryKey: ["files", workspace],
    queryFn: ({ signal }) =>
      request<{ files: string[]; truncated: boolean; git?: WorkspaceGitStatus }>(
        `/api/workspace/files?workspace=${encodeURIComponent(workspace)}`,
        token,
        signal,
      ),
    staleTime: 2000,
  });
export const skillsQuery = (token: string) =>
  queryOptions({
    queryKey: ["skills"],
    queryFn: ({ signal }) =>
      request<{ revision: string; skills: Skill[] }>("/api/skills", token, signal),
    staleTime: 10000,
  });

export interface WorkspaceEntry {
  id: string;
  name: string;
  path: string;
  createdAt: string;
}
export const workspacesQuery = (token: string) =>
  queryOptions({
    queryKey: ["workspaces"],
    queryFn: ({ signal }) => request<WorkspaceEntry[]>("/api/workspaces", token, signal),
  });
/** Sends explicit local workspace edits; provider credentials never enter these requests. */
export async function changeWorkspace<T>(
  path: string,
  token: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      typeof result.error === "string"
        ? result.error
        : `Workspace request failed (${response.status}).`,
    );
  return result as T;
}

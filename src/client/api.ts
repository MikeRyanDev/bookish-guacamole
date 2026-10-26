import { queryOptions } from "@tanstack/react-query";
import type { AppConfig, Skill, WorkspaceEntry } from "../shared/api.js";
export type { AppConfig, Skill, WorkspaceEntry } from "../shared/api.js";
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
export const skillsQuery = (token: string, workspace = "default") =>
  queryOptions({
    queryKey: ["skills", workspace],
    queryFn: ({ signal }) =>
      request<{ revision: string; skills: Skill[] }>(
        `/api/skills?workspace=${encodeURIComponent(workspace)}`,
        token,
        signal,
      ),
    staleTime: 10000,
  });

export const workspacesQuery = (token: string) =>
  queryOptions({
    queryKey: ["workspaces"],
    queryFn: ({ signal }) => request<WorkspaceEntry[]>("/api/workspaces", token, signal),
  });
/** Sends explicit local workspace edits; provider credentials never enter these requests. */
export async function changeWorkspace<T>(
  path: string,
  token: string,
  method: "POST" | "PATCH" | "DELETE" | "PUT",
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

/** Directory and search pages share the files prefix for post-run invalidation. */
export const directoryQuery = (
  token: string,
  workspace: string,
  directory: string,
  cursor?: string,
) =>
  queryOptions({
    queryKey: ["files", workspace, "directory", directory, cursor],
    queryFn: ({ signal }) =>
      request<import("../shared/workspace").DirectoryPage>(
        `/api/workspace/directory?${new URLSearchParams({ workspace, path: directory, ...(cursor ? { cursor } : {}) })}`,
        token,
        signal,
      ),
    staleTime: 2000,
    retry: false,
  });

export const searchFilesQuery = (
  token: string,
  workspace: string,
  query: string,
  cursor?: string,
) =>
  queryOptions({
    queryKey: ["files", workspace, "search", query, cursor],
    queryFn: ({ signal }) =>
      request<import("../shared/workspace").SearchPage>(
        `/api/workspace/search?${new URLSearchParams({ workspace, q: query, ...(cursor ? { cursor } : {}) })}`,
        token,
        signal,
      ),
    staleTime: 2000,
    retry: false,
  });

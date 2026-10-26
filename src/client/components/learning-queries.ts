import { queryOptions } from "@tanstack/react-query";
import { request, type AppConfig } from "../api";

/** Builds a management URL from the server-confirmed workspace identity. */
export const pathFor = (config: AppConfig, path = "") =>
  `/api/learning${path}?workspace=${encodeURIComponent(config.workspaceId)}`;
/** Scopes cached Learning reads by workspace, space, and path; forwards cancellation. */
export function learningQuery<T>(
  config: AppConfig,
  path: string,
  containerId: string | null = null,
) {
  return queryOptions({
    queryKey: ["learning", config.workspaceId, containerId, path],
    queryFn: ({ signal }) => request<T>(pathFor(config, path), config.token, signal),
    retry: false,
  });
}

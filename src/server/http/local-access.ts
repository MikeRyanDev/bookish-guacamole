/** Checks the local browser boundary for both Fetch APIs and Node asset middleware. */
export function localAccessError(host: string, origin?: string): string | undefined {
  if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) return "Invalid host";
  if (origin && origin !== `http://${host}`) return "Invalid origin";
  return undefined;
}

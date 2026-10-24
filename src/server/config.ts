/** Reads a required setting without printing its value on failure. */
export function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} in .env. See README.md.`);
  return value;
}

/** Refuses accidental use of a hosted backend in this local starter. */
export function localUrl(name: string, protocols: string[]): string {
  const value = required(name);
  const url = new URL(value);
  if (
    !protocols.includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  ) {
    throw new Error(`${name} must point to your CLI-installed local backend.`);
  }
  return value;
}

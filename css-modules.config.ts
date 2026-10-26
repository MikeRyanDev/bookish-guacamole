import { basename } from "node:path";

/** Stable feature scopes keep development, production, and layout tests consistent. */
export const cssModules = {
  localsConvention: "camelCaseOnly" as const,
  generateScopedName: (name: string, filename: string) =>
    `starter-${basename(filename, ".module.css")}-${name}`,
};

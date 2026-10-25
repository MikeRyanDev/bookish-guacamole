import { dirname, resolve } from "node:path";
import ts from "typescript";
import { expect, test } from "vitest";

test("editor-discovered projects cover all maintained TypeScript files", () => {
  const root = process.cwd();
  const files = ts.sys.readDirectory(
    root,
    [".ts", ".tsx"],
    [],
    ["src/**/*", "tests/**/*", "e2e/**/*", "*.ts"],
  );
  const uncovered: string[] = [];
  for (const file of files) {
    const config = ts.findConfigFile(dirname(file), ts.sys.fileExists);
    if (!config) {
      uncovered.push(file);
      continue;
    }
    const parsed = ts.getParsedCommandLineOfConfigFile(
      config,
      {},
      {
        ...ts.sys,
        onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
          throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
        },
      },
    );
    if (!parsed?.fileNames.includes(resolve(file))) uncovered.push(file);
    if (file.endsWith(".tsx")) expect(parsed?.options.jsx, file).toBeDefined();
  }
  expect(uncovered).toEqual([]);
});

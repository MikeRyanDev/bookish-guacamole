import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import ts from "typescript";
import { expect, test } from "vitest";

test("browser screenshots stay inside the ignored Playwright output directory", async () => {
  const violations: string[] = [];
  for (const name of (await readdir("e2e")).filter((entry) => entry.endsWith(".spec.ts"))) {
    const file = join("e2e", name);
    const source = ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest);
    const visit = (node: ts.Node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "screenshot"
      ) {
        const options = node.arguments[0];
        if (options && ts.isObjectLiteralExpression(options)) {
          for (const property of options.properties) {
            if (!ts.isPropertyAssignment(property) || property.name.getText(source) !== "path")
              continue;
            const value = property.initializer;
            if (
              !ts.isCallExpression(value) ||
              !ts.isPropertyAccessExpression(value.expression) ||
              value.expression.expression.getText(source) !== "testInfo" ||
              value.expression.name.text !== "outputPath"
            ) {
              violations.push(
                `${file}:${source.getLineAndCharacterOfPosition(property.pos).line + 1}`,
              );
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  expect(violations).toEqual([]);
});

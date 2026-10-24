import { readdir, readFile } from "node:fs/promises";
import { resolve, relative, dirname } from "node:path";
import ts from "typescript";
import { expect, test } from "vitest";

/** Resolve relative module references without executing browser or server modules. */
async function imports(directory: string) {
  const paths = await readdir(directory, { recursive: true });
  const references: Array<{ file: string; target: string }> = [];
  for (const path of paths.filter((path) => /\.tsx?$/.test(path))) {
    const file = resolve(directory, path);
    const source = ts.createSourceFile(file, await readFile(file, "utf8"), ts.ScriptTarget.Latest);
    const visit = (node: ts.Node) => {
      if (
        ts.isStringLiteral(node) &&
        node.text.startsWith(".") &&
        (ts.isImportDeclaration(node.parent) ||
          ts.isExportDeclaration(node.parent) ||
          ts.isCallExpression(node.parent) ||
          ts.isLiteralTypeNode(node.parent))
      ) {
        references.push({ file, target: resolve(dirname(file), node.text) });
      }
      ts.forEachChild(node, visit);
    };
    // Parent links distinguish imports from ordinary path strings.
    const tree = ts.createSourceFile(file, source.text, ts.ScriptTarget.Latest, true);
    visit(tree);
  }
  return references;
}

test("browser and shared contracts cannot import server modules", async () => {
  for (const directory of ["src/client", "src/shared"]) {
    const violations = (await imports(directory)).filter(
      ({ target }) => relative(resolve("src/server"), target).split("/")[0] !== "..",
    );
    expect(violations).toEqual([]);
  }
});

test("server implementation does not import browser modules", async () => {
  const violations = (await imports("src/server")).filter(
    ({ target }) => relative(resolve("src/client"), target).split("/")[0] !== "..",
  );
  expect(violations).toEqual([]);
});

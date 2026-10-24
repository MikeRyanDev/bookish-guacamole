import { createHighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";
import { bundledLanguagesInfo } from "shiki/langs";
import light from "shiki/themes/github-light-high-contrast.mjs";
import dark from "shiki/themes/github-dark.mjs";

const extensions: Record<string, string> = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "jsx",
  ts: "typescript",
  tsx: "tsx",
  py: "python",
  rb: "ruby",
  rs: "rust",
  go: "go",
  sh: "shellscript",
  bash: "shellscript",
  zsh: "shellscript",
  yml: "yaml",
  md: "markdown",
  mdx: "mdx",
  h: "c",
  hpp: "cpp",
  cs: "csharp",
  kt: "kotlin",
  kts: "kotlin",
  ps1: "powershell",
  vue: "vue",
  svelte: "svelte",
  tf: "terraform",
  tex: "latex",
  sql: "sql",
  conf: "ini",
  env: "dotenv",
};
/** Tokenization runs in a disposable worker; grammars are imported only when requested. */
self.onmessage = async (event: MessageEvent<{ path: string; content: string }>) => {
  try {
    const name = event.data.path.split("/").pop()?.toLowerCase() ?? "";
    const extension = name.split(".").pop() ?? "";
    const id =
      name === "dockerfile"
        ? "dockerfile"
        : name === "makefile"
          ? "make"
          : (extensions[extension] ?? extension);
    const info = bundledLanguagesInfo.find(
      (language) => language.id === id || language.aliases?.includes(id),
    );
    if (!info) {
      self.postMessage({ lines: [] });
      return;
    }
    const highlighter = await createHighlighterCore({
      themes: [light, dark],
      langs: [info.import],
      engine: createOnigurumaEngine(import("shiki/wasm")),
    });
    const lines = highlighter
      .codeToTokensWithThemes(event.data.content, {
        lang: info.id,
        themes: { light: "github-light-high-contrast", dark: "github-dark" },
      })
      .map((line) =>
        line.map((token) => ({
          content: token.content,
          light: token.variants?.light?.color,
          dark: token.variants?.dark?.color,
        })),
      );
    self.postMessage({ lines });
    highlighter.dispose();
  } catch {
    self.postMessage({ lines: [] });
  }
};

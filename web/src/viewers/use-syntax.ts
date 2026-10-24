import { useEffect, useState } from "react";
export interface SourceToken {
  content: string;
  light?: string;
  dark?: string;
}
/** Keeps plain text immediately usable; aborts expensive grammars after five seconds. */
export function useSyntax(path: string, content: string) {
  const [result, setResult] = useState<{ content: string; lines: SourceToken[][] }>();
  useEffect(() => {
    if (content.split("\n").some((line) => line.length > 10000)) return;
    const worker = new Worker(new URL("./syntax.worker.ts", import.meta.url), { type: "module" });
    const timeout = setTimeout(() => worker.terminate(), 5000);
    worker.onmessage = (event: MessageEvent<{ lines: SourceToken[][] }>) => {
      clearTimeout(timeout);
      setResult({ content, lines: event.data.lines });
      worker.terminate();
    };
    worker.onerror = () => {
      clearTimeout(timeout);
      worker.terminate();
    };
    worker.postMessage({ path, content });
    return () => {
      clearTimeout(timeout);
      worker.terminate();
    };
  }, [path, content]);
  return result?.content === content ? result.lines : undefined;
}

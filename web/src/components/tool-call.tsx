import { Terminal, Check, ChevronRight, FileCode, FileDiff, CircleAlert } from "lucide-react";

/** Reads complete tool arguments; partial streaming JSON stays available in the raw view. */
function argumentsOf(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
/** Unwraps serialized string results without interpreting model output as HTML. */
function outputText(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === "string" ? parsed : value;
  } catch {
    return value;
  }
}
/** Adds restrained code coloring while preserving the exact source text. */
function SourceText({ text }: { text: string }) {
  return (
    <>
      {text
        .split(
          /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`|\b(?:const|let|function|return|export|import|from|async|await|if|throw|new|true|false|null)\b|\b\d+\b)/g,
        )
        .map((token, index) => (
          <span
            key={index}
            className={
              /^["'`]/.test(token)
                ? "syntax-string"
                : /^(const|let|function|return|export|import|from|async|await|if|throw|new|true|false|null)$/.test(
                      token,
                    )
                  ? "syntax-keyword"
                  : undefined
            }
          >
            {token}
          </span>
        ))}
    </>
  );
}
/** Shows a proposed patch verbatim, with explicit addition/removal signs as well as color. */
function Patch({ patch }: { patch: string }) {
  return (
    <pre className="patch-preview" aria-label="Proposed patch">
      <code>
        {patch.split("\n").map((line, index) => {
          const kind =
            line.startsWith("+") && !line.startsWith("+++")
              ? "added"
              : line.startsWith("-") && !line.startsWith("---")
                ? "removed"
                : /^(\*\*\*|@@|diff |---|\+\+\+)/.test(line)
                  ? "heading"
                  : "";
          return (
            <span key={index} className={`diff-line ${kind}`}>
              {line || " "}
              {"\n"}
            </span>
          );
        })}
      </code>
    </pre>
  );
}
/** Preserves provider-supplied line numbers and leaves non-text results readable. */
function FileContents({ content }: { content: string }) {
  return (
    <pre className="file-tool-preview" aria-label="File contents">
      <code>
        {content.split("\n").map((line, index) => {
          const numbered = /^\s*(\d+)(?:\t|\s*[|:] ?)(.*)$/.exec(line);
          return (
            <span key={index} className="code-line">
              {numbered ? (
                <>
                  <span className="line-number">{numbered[1]}</span>
                  <SourceText text={numbered[2] ?? ""} />
                </>
              ) : (
                <SourceText text={line} />
              )}{" "}
              {"\n"}
            </span>
          );
        })}
      </code>
    </pre>
  );
}
/** Presents coding tools with their exact command, proposed changes, and observed outcome. */
export function ToolCall({
  name,
  args,
  result,
  running,
}: {
  name: string;
  args: string;
  result?: string;
  running: boolean;
}) {
  const parameters = argumentsOf(args);
  const output = outputText(result);
  const command = typeof parameters.command === "string" ? parameters.command : undefined;
  const path = typeof parameters.path === "string" ? parameters.path : undefined;
  const patch =
    typeof parameters.patch === "string"
      ? parameters.patch
      : name === "edit_file" &&
          typeof parameters.old === "string" &&
          typeof parameters.new === "string"
        ? [
            ...parameters.old.split("\n").map((line) => `-${line}`),
            ...parameters.new.split("\n").map((line) => `+${line}`),
          ].join("\n")
        : undefined;
  const exitCode = output === undefined ? undefined : /^exit code:\s*(-?\d+)/i.exec(output)?.[1];
  const failed =
    (exitCode !== undefined && Number(exitCode) !== 0) ||
    Boolean(output && /^\s*(?:Error:|\{"error":)/.test(output));
  const status = failed
    ? exitCode
      ? `Exit ${exitCode}`
      : "Error"
    : output !== undefined
      ? exitCode
        ? `Exit ${exitCode}`
        : "Result received"
      : running
        ? "Running"
        : "No result";
  const Icon =
    name === "read_file" ? FileCode : patch || name === "write_file" ? FileDiff : Terminal;
  const detailed = Boolean(command || patch || name === "read_file");
  const additions =
    patch?.split("\n").filter((line) => line.startsWith("+") && !line.startsWith("+++")).length ??
    0;
  const removals =
    patch?.split("\n").filter((line) => line.startsWith("-") && !line.startsWith("---")).length ??
    0;
  return (
    <section
      className={`tool-call ${failed ? "tool-failed" : ""}`}
      aria-label={`${name} tool call`}
    >
      <header className="tool-header">
        <Icon size={14} />
        <strong>{name}</strong>
        {path && (
          <code className="tool-path" title={path}>
            {path}
          </code>
        )}
        {patch && (
          <span
            className="diff-count"
            aria-label={`${additions} lines added, ${removals} lines removed`}
          >
            <span>+{additions}</span>
            <span>−{removals}</span>
          </span>
        )}
        <span className="tool-status" title={status}>
          {failed ? (
            <CircleAlert size={14} />
          ) : running && output === undefined ? (
            <span className="spinner" />
          ) : output !== undefined ? (
            <Check size={14} />
          ) : (
            <ChevronRight size={14} />
          )}
          <span>{status}</span>
        </span>
      </header>
      {command && (
        <div className="shell-command">
          <span aria-hidden="true">$</span>
          <code>{command}</code>
        </div>
      )}
      {patch && <Patch patch={patch} />}
      {name === "read_file" && output !== undefined && <FileContents content={output} />}
      {name !== "read_file" && output !== undefined && (
        <details className="tool-result" open={failed || undefined}>
          <summary>{failed ? "Error output" : "Output"}</summary>
          <pre className="tool-output">{output}</pre>
        </details>
      )}
      <details className="tool-arguments" open={(!detailed && output === undefined) || undefined}>
        <summary>Arguments</summary>
        <pre>{args}</pre>
      </details>
    </section>
  );
}

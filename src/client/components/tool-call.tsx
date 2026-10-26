import sharedStyles from "../styles/shared.module.css";
import toolsStyles from "../styles/tools.module.css";
import { toolOutcome } from "./tool-outcome";
import { revealToolContent, useToolDisclosure } from "./tool-disclosure";
import { CopyToolText } from "./tool-copy";
import { TypeScriptOutput } from "./typescript-output";
import {
  Terminal,
  Check,
  ChevronRight,
  FileCode,
  FileDiff,
  CircleAlert,
  ShieldCheck,
  Search,
  FolderSearch,
  BookOpen,
  Wrench,
} from "lucide-react";

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
                ? toolsStyles.syntaxString
                : /^(const|let|function|return|export|import|from|async|await|if|throw|new|true|false|null)$/.test(
                      token,
                    )
                  ? toolsStyles.syntaxKeyword
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
  const fileCount = [...patch.matchAll(/^\*\*\* (?:Update|Add|Delete) File:/gm)].length;
  return (
    <pre className={toolsStyles.patchPreview} aria-label="Proposed patch">
      <code>
        {patch.split("\n").map((line, index) => {
          if (/^\*\*\* (?:Begin|End) Patch$/.test(line) || line === "@@") return null;
          if (fileCount === 1 && /^\*\*\* (?:Update|Add|Delete) File:/.test(line)) return null;
          const kind =
            line.startsWith("+") && !line.startsWith("+++")
              ? "added"
              : line.startsWith("-") && !line.startsWith("---")
                ? "removed"
                : /^(\*\*\*|@@|diff |---|\+\+\+)/.test(line)
                  ? "heading"
                  : "";
          return (
            <span
              key={index}
              className={`${toolsStyles.diffLine} ${kind ? toolsStyles[kind] : ""}`}
            >
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
    <pre className={toolsStyles.fileToolPreview} aria-label="File contents">
      <code>
        {content.split("\n").map((line, index) => {
          const numbered = /^\s*(\d+)(?:\t|\s*[|:] ?)(.*)$/.exec(line);
          return (
            <span key={index} className={toolsStyles.codeLine}>
              {numbered ? (
                <>
                  <span className={sharedStyles.lineNumber}>{numbered[1]}</span>
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
  awaitingApproval = false,
}: {
  name: string;
  args: string;
  result?: string;
  running: boolean;
  awaitingApproval?: boolean;
}) {
  const parameters = argumentsOf(args);
  const { output, exitCode, failed, denied } = toolOutcome(result, name);
  const [open, setOpen] = useToolDisclosure(awaitingApproval || failed || running);
  const isTypeScript = name === "execute_typescript";
  const program =
    typeof parameters.typescriptCode === "string" ? parameters.typescriptCode : undefined;
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
  const status = awaitingApproval
    ? "Approval required"
    : denied
      ? "Denied"
      : failed
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
    name === "read_file" || isTypeScript
      ? FileCode
      : patch || name === "write_file"
        ? FileDiff
        : name === "bash"
          ? Terminal
          : name === "search"
            ? Search
            : name === "list_files"
              ? FolderSearch
              : name === "load_skill" || name === "read_skill_resource"
                ? BookOpen
                : Wrench;
  const filePath =
    path ?? (patch ? /^\*\*\* (?:Update|Add|Delete) File: (.+)$/m.exec(patch)?.[1] : undefined);
  const title = isTypeScript
    ? "Execute TypeScript"
    : name === "bash"
      ? "Run command"
      : name === "read_file"
        ? "Read file"
        : patch
          ? "Edit file"
          : name === "write_file"
            ? "Write file"
            : name.replaceAll("_", " ");
  const hasPreview = Boolean(
    isTypeScript || command || patch || name === "read_file" || name === "write_file",
  );
  const additions =
    patch?.split("\n").filter((line) => line.startsWith("+") && !line.startsWith("+++")).length ??
    0;
  const removals =
    patch?.split("\n").filter((line) => line.startsWith("-") && !line.startsWith("---")).length ??
    0;
  return (
    <section
      className={`${toolsStyles.toolCall} ${failed ? toolsStyles.toolFailed : ""}`}
      aria-label={`${name} tool call`}
    >
      <details
        className={toolsStyles.toolDetails}
        open={open}
        onToggle={(event) => {
          if (event.currentTarget.open !== open) setOpen(event.currentTarget.open);
        }}
      >
        <summary
          className={toolsStyles.toolHeader}
          onClick={(event) => {
            if (!open)
              revealToolContent(event.currentTarget.parentElement, `.${toolsStyles.toolBody}`);
          }}
        >
          <ChevronRight size={14} className={sharedStyles.toolChevron} />
          <Icon size={14} aria-hidden="true" />
          <strong>{title}</strong>
          {(filePath || command) && (
            <code className={toolsStyles.toolPath} title={filePath || command}>
              {filePath || command}
            </code>
          )}
          {patch && (
            <span
              className={toolsStyles.diffCount}
              aria-label={`${additions} lines added, ${removals} lines removed`}
            >
              <span>+{additions}</span>
              <span>−{removals}</span>
            </span>
          )}
          <span
            className={toolsStyles.toolStatus}
            data-state={
              awaitingApproval
                ? "approval"
                : failed
                  ? "error"
                  : running && output === undefined
                    ? "running"
                    : "settled"
            }
            title={status}
          >
            {awaitingApproval ? (
              <ShieldCheck size={14} />
            ) : failed ? (
              <CircleAlert size={14} />
            ) : running && output === undefined ? (
              <span className={sharedStyles.spinner} />
            ) : output !== undefined ? (
              <Check size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
            <span className={status === "Result received" ? sharedStyles.srOnly : undefined}>
              {status}
            </span>
          </span>
        </summary>
        <div className={toolsStyles.toolBody}>
          {isTypeScript && (
            <div className={[toolsStyles.toolSurface, toolsStyles.typescriptSurface].join(" ")}>
              <div className={toolsStyles.toolSurfaceHeading}>
                <span>TypeScript</span>
                {program !== undefined && <CopyToolText text={program} label="Copy TypeScript" />}
              </div>
              {program ? (
                <pre
                  className={toolsStyles.typescriptSource}
                  aria-label="TypeScript source"
                  tabIndex={0}
                >
                  <code>
                    <SourceText text={program} />
                  </code>
                </pre>
              ) : (
                <p className={toolsStyles.typescriptEmpty}>
                  {program === ""
                    ? "Empty TypeScript source"
                    : running
                      ? "Receiving TypeScript…"
                      : "TypeScript source unavailable. Inspect Raw details."}
                </p>
              )}
              <TypeScriptOutput
                output={output}
                running={running}
                awaitingApproval={awaitingApproval}
                failed={failed}
                denied={denied}
              />
            </div>
          )}
          {!isTypeScript && command && (
            <div className={toolsStyles.toolSurface}>
              <div className={toolsStyles.shellCommand}>
                <span aria-hidden="true">$</span>
                <code>{command}</code>
                <CopyToolText text={command} label="Copy command" />
              </div>
              {output !== undefined && (
                <details className={toolsStyles.toolResult} open={failed || undefined}>
                  <summary>
                    <ChevronRight size={12} />
                    {failed ? "Error output" : "Output"}
                  </summary>
                  <pre data-testid="tool-output">{output}</pre>
                </details>
              )}
            </div>
          )}
          {patch && (
            <div className={toolsStyles.toolSurface}>
              <div className={toolsStyles.toolSurfaceHeading}>
                <FileDiff size={14} />
                <code>{filePath ?? "Proposed changes"}</code>
                <CopyToolText text={patch} label="Copy patch" />
              </div>
              <Patch patch={patch} />
            </div>
          )}
          {name === "read_file" && output !== undefined && (
            <div className={toolsStyles.toolSurface}>
              <div className={toolsStyles.toolSurfaceHeading}>
                <FileCode size={14} />
                <code>{filePath ?? "File contents"}</code>
                <CopyToolText text={output} label="Copy file output" />
              </div>
              <FileContents content={output} />
            </div>
          )}
          {name === "write_file" && typeof parameters.content === "string" && (
            <div className={toolsStyles.toolSurface}>
              <div className={toolsStyles.toolSurfaceHeading}>
                <FileCode size={14} />
                <code>{filePath ?? "File contents"}</code>
                <CopyToolText text={parameters.content} label="Copy file content" />
              </div>
              <FileContents content={parameters.content} />
            </div>
          )}
          {!isTypeScript && !command && name !== "read_file" && output !== undefined && (
            <details className={toolsStyles.toolResult} open={failed || undefined}>
              <summary>
                <ChevronRight size={12} />
                {failed ? "Error output" : "Output"}
              </summary>
              <pre data-testid="tool-output">{output}</pre>
            </details>
          )}
          <details
            className={toolsStyles.toolArguments}
            open={
              (!hasPreview && output === undefined) ||
              (isTypeScript && program === undefined) ||
              undefined
            }
          >
            <summary>
              <ChevronRight size={12} />
              Raw details
            </summary>
            <pre>{args}</pre>
          </details>
        </div>
      </details>
    </section>
  );
}

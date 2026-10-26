import toolsStyles from "../styles/tools.module.css";
import { Check, ChevronRight, CircleAlert } from "lucide-react";
import { CopyToolText } from "./tool-copy";
import { formatJsonEvidence, parseTypeScriptResponse } from "./typescript-response";

/** Colors JSON tokens without interpreting values as HTML or changing their text. */
function JsonEvidence({ json }: { json: string }) {
  const formatted = formatJsonEvidence(json);
  return (
    <code>
      {formatted
        .split(
          /("(?:[^"\\]|\\.)*"\s*:|"(?:[^"\\]|\\.)*"|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
        )
        .map((token, index) => (
          <span
            key={index}
            className={
              token.endsWith(":")
                ? toolsStyles.jsonKey
                : token.startsWith('"')
                  ? toolsStyles.syntaxString
                  : /^(true|false|null)$/.test(token)
                    ? toolsStyles.syntaxKeyword
                    : /^-?\d/.test(token)
                      ? toolsStyles.jsonNumber
                      : undefined
            }
          >
            {token}
          </span>
        ))}
    </code>
  );
}

/** Presents a native execution outcome and its evidence; never executes or retries a program. */
export function TypeScriptOutput({
  output,
  running,
  awaitingApproval,
  failed,
  denied,
}: {
  output?: string;
  running: boolean;
  awaitingApproval: boolean;
  failed: boolean;
  denied: boolean;
}) {
  if (output === undefined || output === "")
    return (
      <section className={toolsStyles.typescriptOutput} aria-label="Execution output">
        <p className={toolsStyles.typescriptEmpty}>
          {output === ""
            ? "No output"
            : awaitingApproval
              ? "Awaiting approval"
              : running
                ? "Waiting for output"
                : "No result received"}
        </p>
      </section>
    );
  const response = parseTypeScriptResponse(output);
  if (!response)
    return (
      <section className={toolsStyles.typescriptOutput} aria-label="Execution output">
        <div className={toolsStyles.typescriptSectionHeading}>
          <strong>
            {denied ? "Execution denied" : failed ? "Error output" : "Unrecognized response"}
          </strong>
          <CopyToolText text={output} label="Copy output" />
        </div>
        {!failed && (
          <p className={toolsStyles.typescriptNote}>
            The response does not match the execution format. Original output is shown below.
          </p>
        )}
        <pre tabIndex={0} aria-label="Original output">
          {output}
        </pre>
      </section>
    );
  const conflict = response.success && response.error !== undefined;
  const OutcomeIcon = response.success && !conflict ? Check : CircleAlert;
  return (
    <section className={toolsStyles.typescriptOutput} aria-label="Execution output">
      <div
        className={`${toolsStyles.typescriptOutcome} ${!response.success || conflict ? toolsStyles.typescriptError : ""}`}
      >
        <OutcomeIcon size={15} aria-hidden="true" />
        <strong>
          {conflict ? "Conflicting outcome" : response.success ? "Completed" : "Execution failed"}
        </strong>
      </div>
      {conflict && (
        <p className={toolsStyles.typescriptNote}>
          The response reports success but also includes an error.
        </p>
      )}
      {response.error ? (
        <div className={toolsStyles.typescriptErrorDetail}>
          <div className={toolsStyles.typescriptErrorMeta}>
            {response.error.name && <span>{response.error.name}</span>}
            {response.error.line !== undefined && <span>Line {response.error.line}</span>}
          </div>
          <p className={toolsStyles.typescriptErrorMessage} tabIndex={0} aria-label="Error message">
            {response.error.message || "No error message returned."}
          </p>
          {response.error.stack && (
            <details className={toolsStyles.typescriptDiagnostic}>
              <summary>
                <ChevronRight size={12} />
                Stack trace
              </summary>
              <pre tabIndex={0} aria-label="Stack trace">
                {response.error.stack}
              </pre>
            </details>
          )}
        </div>
      ) : (
        !response.success && (
          <p className={toolsStyles.typescriptNote}>No error details returned.</p>
        )
      )}
      {response.resultJson !== undefined ? (
        <>
          <div className={toolsStyles.typescriptSectionHeading}>
            <span>{response.success ? "Return value" : "Partial return value"}</span>
            <CopyToolText text={response.resultJson} label="Copy return value JSON" />
          </div>
          <pre tabIndex={0} aria-label="Return value">
            <JsonEvidence json={response.resultJson} />
          </pre>
        </>
      ) : (
        response.success && <p className={toolsStyles.typescriptNote}>No value returned.</p>
      )}
      {response.logs.length ? (
        <>
          <div className={toolsStyles.typescriptSectionHeading}>
            <span>Console output</span>
            <CopyToolText text={response.logs.join("\n")} label="Copy console output" />
          </div>
          <pre tabIndex={0} aria-label="Console output">
            {response.logs.map((log, index) => (
              <span
                key={index}
                className={log.startsWith("ERROR:") ? toolsStyles.consoleError : undefined}
              >
                {log || <span className={toolsStyles.consoleEmpty}>Empty line</span>}
                {index < response.logs.length - 1 ? "\n" : ""}
              </span>
            ))}
          </pre>
        </>
      ) : (
        <p className={toolsStyles.typescriptNote}>No console output.</p>
      )}
      <details className={[toolsStyles.typescriptDiagnostic, toolsStyles.typescriptRaw].join(" ")}>
        <summary>
          <ChevronRight size={12} />
          Raw response
        </summary>
        <div className={toolsStyles.typescriptSectionHeading}>
          <span>Response JSON</span>
          <CopyToolText text={output} label="Copy response JSON" />
        </div>
        <pre tabIndex={0} aria-label="Raw response JSON">
          <JsonEvidence json={output} />
        </pre>
      </details>
    </section>
  );
}

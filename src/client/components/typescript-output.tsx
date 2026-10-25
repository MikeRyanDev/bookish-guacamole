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
                ? "json-key"
                : token.startsWith('"')
                  ? "syntax-string"
                  : /^(true|false|null)$/.test(token)
                    ? "syntax-keyword"
                    : /^-?\d/.test(token)
                      ? "json-number"
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
      <section className="typescript-output" aria-label="Execution output">
        <p className="typescript-empty">
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
      <section className="typescript-output" aria-label="Execution output">
        <div className="typescript-section-heading">
          <strong>
            {denied ? "Execution denied" : failed ? "Error output" : "Unrecognized response"}
          </strong>
          <CopyToolText text={output} label="Copy output" />
        </div>
        {!failed && (
          <p className="typescript-note">
            The response does not match the execution format. Original output is shown below.
          </p>
        )}
        <pre className="typescript-result" tabIndex={0} aria-label="Original output">
          {output}
        </pre>
      </section>
    );
  const conflict = response.success && response.error !== undefined;
  const OutcomeIcon = response.success && !conflict ? Check : CircleAlert;
  return (
    <section className="typescript-output" aria-label="Execution output">
      <div
        className={`typescript-outcome ${!response.success || conflict ? "typescript-error" : ""}`}
      >
        <OutcomeIcon size={15} aria-hidden="true" />
        <strong>
          {conflict ? "Conflicting outcome" : response.success ? "Completed" : "Execution failed"}
        </strong>
      </div>
      {conflict && (
        <p className="typescript-note">The response reports success but also includes an error.</p>
      )}
      {response.error ? (
        <div className="typescript-error-detail">
          <div className="typescript-error-meta">
            {response.error.name && <span>{response.error.name}</span>}
            {response.error.line !== undefined && <span>Line {response.error.line}</span>}
          </div>
          <p className="typescript-error-message" tabIndex={0} aria-label="Error message">
            {response.error.message || "No error message returned."}
          </p>
          {response.error.stack && (
            <details className="typescript-diagnostic">
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
        !response.success && <p className="typescript-note">No error details returned.</p>
      )}
      {response.resultJson !== undefined ? (
        <>
          <div className="typescript-section-heading">
            <span>{response.success ? "Return value" : "Partial return value"}</span>
            <CopyToolText text={response.resultJson} label="Copy return value JSON" />
          </div>
          <pre className="typescript-result" tabIndex={0} aria-label="Return value">
            <JsonEvidence json={response.resultJson} />
          </pre>
        </>
      ) : (
        response.success && <p className="typescript-note">No value returned.</p>
      )}
      {response.logs.length ? (
        <>
          <div className="typescript-section-heading">
            <span>Console output</span>
            <CopyToolText text={response.logs.join("\n")} label="Copy console output" />
          </div>
          <pre
            className="typescript-result typescript-console"
            tabIndex={0}
            aria-label="Console output"
          >
            {response.logs.map((log, index) => (
              <span key={index} className={log.startsWith("ERROR:") ? "console-error" : undefined}>
                {log || <span className="console-empty">Empty line</span>}
                {index < response.logs.length - 1 ? "\n" : ""}
              </span>
            ))}
          </pre>
        </>
      ) : (
        <p className="typescript-note">No console output.</p>
      )}
      <details className="typescript-diagnostic typescript-raw">
        <summary>
          <ChevronRight size={12} />
          Raw response
        </summary>
        <div className="typescript-section-heading">
          <span>Response JSON</span>
          <CopyToolText text={output} label="Copy response JSON" />
        </div>
        <pre className="typescript-result" tabIndex={0} aria-label="Raw response JSON">
          <JsonEvidence json={output} />
        </pre>
      </details>
    </section>
  );
}

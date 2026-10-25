type ExecutionError = { message: string; name?: string; line?: number; stack?: string };
export type TypeScriptResponse = {
  success: boolean;
  resultJson: string | undefined;
  logs: string[];
  error: ExecutionError | undefined;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Gets a top-level JSON value verbatim, keeping number precision and escape sequences.
 * Input must already be validated as a JSON object. Duplicate keys use the last value.
 */
function memberJson(text: string, member: string): string | undefined {
  let depth = 0;
  let key: string | undefined;
  let start: number | undefined;
  let value: string | undefined;
  for (const match of text.matchAll(/"(?:[^"\\]|\\.)*"|[^\s"{}[\],:]+|[{}[\],:]/g)) {
    const token = match[0];
    if (depth === 1) {
      if (key === undefined && token.startsWith('"')) key = JSON.parse(token) as string;
      else if (token === ":") start = match.index + 1;
      else if (token === "," || token === "}") {
        if (key === member && start !== undefined) value = text.slice(start, match.index).trim();
        key = undefined;
        start = undefined;
      }
    }
    if (token === "{" || token === "[") depth++;
    else if (token === "}" || token === "]") depth--;
  }
  return value;
}

/** Recognizes the native envelope; unknown/malformed data stays available as raw evidence. */
export function parseTypeScriptResponse(output: string): TypeScriptResponse | undefined {
  try {
    const value: unknown = JSON.parse(output);
    if (!isRecord(value) || typeof value.success !== "boolean") return undefined;
    if (
      value.logs !== undefined &&
      (!Array.isArray(value.logs) || !value.logs.every((log) => typeof log === "string"))
    )
      return undefined;
    let error: ExecutionError | undefined;
    if (value.error !== undefined) {
      const item = value.error;
      if (
        !isRecord(item) ||
        typeof item.message !== "string" ||
        (item.name !== undefined && typeof item.name !== "string") ||
        (item.stack !== undefined && typeof item.stack !== "string") ||
        (item.line !== undefined && (typeof item.line !== "number" || !Number.isFinite(item.line)))
      )
        return undefined;
      error = { message: item.message, name: item.name, line: item.line, stack: item.stack };
    }
    return {
      success: value.success,
      resultJson: memberJson(output, "result"),
      logs: value.logs ?? [],
      error,
    };
  } catch {
    return undefined;
  }
}
/** Indents JSON evidence for reading; copy retains the original provider text. */
export function formatJsonEvidence(output: string): string {
  try {
    const parsed: unknown = JSON.parse(output);
    if (parsed === null || typeof parsed !== "object") return output;
    // Do not reserialize values: large numbers and escape sequences must remain exact.
    const tokens = output.match(/"(?:[^"\\]|\\.)*"|[^\s"{}[\],:]+|[{}[\],:]/g);
    if (!tokens) return output;
    let depth = 0;
    return tokens
      .map((token, index) => {
        const previous = tokens[index - 1];
        if (token === "}" || token === "]") {
          depth--;
          return previous === "{" || previous === "[" ? token : `\n${"  ".repeat(depth)}${token}`;
        }
        if (token === "{" || token === "[") {
          depth++;
          return (
            token +
            (tokens[index + 1] === "}" || tokens[index + 1] === "]"
              ? ""
              : `\n${"  ".repeat(depth)}`)
          );
        }
        if (token === ",") return `,\n${"  ".repeat(depth)}`;
        if (token === ":") return ": ";
        return token;
      })
      .join("");
  } catch {
    return output;
  }
}

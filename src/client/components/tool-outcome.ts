/** Decodes string payloads without interpreting provider output as HTML. */
export function outputText(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === "string" ? parsed : value;
  } catch {
    return value;
  }
}

/** Classifies observed results only; absence never implies successful execution. */
export function toolOutcome(result: string | undefined, name?: string) {
  const output = outputText(result);
  const exitCode = output === undefined ? undefined : /^exit code:\s*(-?\d+)/i.exec(output)?.[1];
  const denied = Boolean(
    output && /^(?:The user denied this tool call|Tool call (?:denied|rejected))/i.test(output),
  );
  // Code Mode reports errors in its native envelope. Other tools retain their existing contract.
  let executionFailed = false;
  if (name === "execute_typescript" && output !== undefined) {
    try {
      const value: unknown = JSON.parse(output);
      executionFailed =
        value !== null &&
        typeof value === "object" &&
        "success" in value &&
        value.success === false;
    } catch {
      // Plain-text failures are classified below; malformed JSON remains inspectable verbatim.
    }
  }
  const failed =
    executionFailed ||
    denied ||
    (exitCode !== undefined && Number(exitCode) !== 0) ||
    Boolean(output && /^\s*(?:Error:|\{"error":)/.test(output));
  return { output, exitCode, failed, denied };
}

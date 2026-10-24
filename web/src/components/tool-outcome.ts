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
export function toolOutcome(result: string | undefined) {
  const output = outputText(result);
  const exitCode = output === undefined ? undefined : /^exit code:\s*(-?\d+)/i.exec(output)?.[1];
  const denied = Boolean(
    output && /^(?:The user denied this tool call|Tool call (?:denied|rejected))/i.test(output),
  );
  const failed =
    denied ||
    (exitCode !== undefined && Number(exitCode) !== 0) ||
    Boolean(output && /^\s*(?:Error:|\{"error":)/.test(output));
  return { output, exitCode, failed, denied };
}

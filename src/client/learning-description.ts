/** Removes exact repeated generated prefixes for display only; stored Skill source stays unchanged. */
export function learningDescription(description: string): string {
  return description
    .replace(/^Use when\s+(?:Use when\s+)+/i, "Use when ")
    .replace(/^Use when\s+(?:When\s+)+/i, "Use when ")
    .replace(/\bDo not use for\s+(?:Do not use for\s+)+/gi, "Do not use for ");
}

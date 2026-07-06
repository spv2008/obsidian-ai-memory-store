export type ActiveWorkKind =
  | "specification"
  | "architecture"
  | "plan"
  | "manual-test"
  | "unknown";

export function classifyArtifactPath(filePath: string): ActiveWorkKind {
  if (filePath.startsWith("specifications/")) return "specification";
  if (filePath.startsWith("architecture/")) return "architecture";
  if (filePath.startsWith("plans/")) return "plan";
  if (filePath.startsWith("manual-test-plans/")) return "manual-test";
  return "unknown";
}

export function resolveVaultLink(
  target: string,
  allPaths: string[],
): string | undefined {
  const normalized = target.trim().replace(/\\/g, "/");
  const directCandidates = [normalized, `${normalized}.md`];

  for (const candidate of directCandidates) {
    if (allPaths.includes(candidate)) {
      return candidate;
    }
  }

  const suffixMatches = allPaths.filter(
    (filePath) =>
      filePath.endsWith(`/${normalized}`) ||
      filePath.endsWith(`/${normalized}.md`),
  );
  if (suffixMatches.length > 0) {
    return suffixMatches.sort()[0];
  }

  const basenameMatches = allPaths.filter((filePath) => {
    const base = filePath.split("/").pop() ?? filePath;
    return base === normalized || base === `${normalized}.md`;
  });
  if (basenameMatches.length > 0) {
    return basenameMatches.sort()[0];
  }

  return undefined;
}

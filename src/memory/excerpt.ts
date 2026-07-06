export const DEFAULT_EXCERPT_LENGTH = 500;
export const MAX_EXCERPT_LENGTH = 2000;

export function capExcerptLength(length?: number): number {
  const requested = length ?? DEFAULT_EXCERPT_LENGTH;
  return Math.min(Math.max(requested, 50), MAX_EXCERPT_LENGTH);
}

export function excerpt(content: string, maxLength: number): string {
  const trimmed = content.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, maxLength)}…`;
}

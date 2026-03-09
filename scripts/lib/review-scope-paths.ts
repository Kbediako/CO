function normalizeReviewScopePath(value: string): string {
  return value.trim().replace(/\\/gu, '/').replace(/^\.\//u, '');
}

export function parseStatusZPaths(statusOutput: string): string[] {
  const paths = new Set<string>();
  const entries = statusOutput.split('\0');
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index] ?? '';
    if (entry.length < 3) {
      continue;
    }
    const status = entry.slice(0, 2);
    const currentPath = normalizeReviewScopePath(entry.slice(3));
    if (currentPath) {
      paths.add(currentPath);
    }
    if ((status.includes('R') || status.includes('C')) && index + 1 < entries.length) {
      index += 1;
    }
  }
  return [...paths];
}

export function parseNameOnlyPaths(output: string): string[] {
  const paths = new Set<string>();
  for (const rawLine of output.split(/\r?\n/u)) {
    const normalized = normalizeReviewScopePath(rawLine);
    if (normalized) {
      paths.add(normalized);
    }
  }
  return [...paths];
}

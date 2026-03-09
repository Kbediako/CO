function normalizeReviewScopePath(value: string): string {
  return value.trim().replace(/\\/gu, '/').replace(/^\.\//u, '');
}

function addNormalizedPath(paths: Set<string>, value: string): void {
  const normalized = normalizeReviewScopePath(value);
  if (normalized) {
    paths.add(normalized);
  }
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
    addNormalizedPath(paths, entry.slice(3));
    if ((status.includes('R') || status.includes('C')) && index + 1 < entries.length) {
      addNormalizedPath(paths, entries[index + 1] ?? '');
      index += 1;
    }
  }
  return [...paths];
}

export function parseNameStatusPaths(output: string): string[] {
  const paths = new Set<string>();
  for (const rawLine of output.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }
    const fields = line.split('\t').filter((entry) => entry.length > 0);
    const status = fields[0] ?? '';
    if (fields.length < 2) {
      continue;
    }
    if ((status.startsWith('R') || status.startsWith('C')) && fields.length >= 3) {
      addNormalizedPath(paths, fields[1] ?? '');
      addNormalizedPath(paths, fields[2] ?? '');
      continue;
    }
    addNormalizedPath(paths, fields[1] ?? '');
  }
  return [...paths];
}

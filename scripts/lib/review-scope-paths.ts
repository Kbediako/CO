function normalizeReviewScopePath(value: string): string {
  return value.trim().replace(/\\/gu, '/').replace(/^\.\//u, '');
}

export interface ReviewScopePathCollection {
  paths: string[];
  renderedLines: string[];
}

interface ReviewScopePathItem {
  renderedLine: string;
  pathValues: string[];
}

function addNormalizedPath(paths: Set<string>, value: string): void {
  const normalized = normalizeReviewScopePath(value);
  if (normalized) {
    paths.add(normalized);
  }
}

function formatScopePathForPrompt(value: string): string {
  if (value !== value.trim() || value.includes('\n') || value.includes('\r') || value.includes(' -> ')) {
    return JSON.stringify(value);
  }
  return value;
}

function buildScopePathCollection(items: ReviewScopePathItem[]): ReviewScopePathCollection {
  const paths = new Set<string>();
  const renderedLines: string[] = [];
  for (const item of items) {
    for (const value of item.pathValues) {
      addNormalizedPath(paths, value);
    }
    renderedLines.push(item.renderedLine);
  }

  return {
    paths: [...paths],
    renderedLines
  };
}

export function parseStatusZPathCollection(statusOutput: string): ReviewScopePathCollection {
  const items: ReviewScopePathItem[] = [];
  const entries = statusOutput.split('\0');
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index] ?? '';
    if (entry.length < 3) {
      continue;
    }
    const status = entry.slice(0, 2);
    const currentPathRaw = entry.slice(3);
    const currentPath = normalizeReviewScopePath(currentPathRaw);
    if ((status.includes('R') || status.includes('C')) && index + 1 < entries.length) {
      const sourcePathRaw = entries[index + 1] ?? '';
      const sourcePath = normalizeReviewScopePath(sourcePathRaw);
      if (sourcePath && currentPath) {
        items.push({
          renderedLine: `${formatScopePathForPrompt(sourcePathRaw)} -> ${formatScopePathForPrompt(currentPathRaw)}`,
          pathValues: [currentPathRaw, sourcePathRaw]
        });
      } else if (currentPath) {
        items.push({
          renderedLine: formatScopePathForPrompt(currentPathRaw),
          pathValues: [currentPathRaw]
        });
      } else if (sourcePath) {
        items.push({
          renderedLine: formatScopePathForPrompt(sourcePathRaw),
          pathValues: [sourcePathRaw]
        });
      }
      index += 1;
      continue;
    }
    if (currentPath) {
      items.push({
        renderedLine: formatScopePathForPrompt(currentPathRaw),
        pathValues: [currentPathRaw]
      });
    }
  }
  return buildScopePathCollection(items);
}

export function parseStatusZPaths(statusOutput: string): string[] {
  return parseStatusZPathCollection(statusOutput).paths;
}

export function parseNameStatusPathCollection(output: string): ReviewScopePathCollection {
  const items: ReviewScopePathItem[] = [];
  for (const rawLine of output.split(/\r?\n/u)) {
    if (!rawLine.trim()) {
      continue;
    }
    const fields = rawLine.split('\t').filter((entry) => entry.length > 0);
    const status = fields[0] ?? '';
    if (fields.length < 2) {
      continue;
    }
    if ((status.startsWith('R') || status.startsWith('C')) && fields.length >= 3) {
      const sourcePathRaw = fields[1] ?? '';
      const destinationPathRaw = fields[2] ?? '';
      const sourcePath = normalizeReviewScopePath(sourcePathRaw);
      const destinationPath = normalizeReviewScopePath(destinationPathRaw);
      if (sourcePath && destinationPath) {
        items.push({
          renderedLine: `${formatScopePathForPrompt(sourcePathRaw)} -> ${formatScopePathForPrompt(destinationPathRaw)}`,
          pathValues: [sourcePathRaw, destinationPathRaw]
        });
      } else if (sourcePath) {
        items.push({
          renderedLine: formatScopePathForPrompt(sourcePathRaw),
          pathValues: [sourcePathRaw]
        });
      } else if (destinationPath) {
        items.push({
          renderedLine: formatScopePathForPrompt(destinationPathRaw),
          pathValues: [destinationPathRaw]
        });
      }
      continue;
    }
    const pathRaw = fields[1] ?? '';
    const path = normalizeReviewScopePath(pathRaw);
    if (path) {
      items.push({ renderedLine: formatScopePathForPrompt(pathRaw), pathValues: [pathRaw] });
    }
  }
  return buildScopePathCollection(items);
}

export function parseNameStatusPaths(output: string): string[] {
  return parseNameStatusPathCollection(output).paths;
}

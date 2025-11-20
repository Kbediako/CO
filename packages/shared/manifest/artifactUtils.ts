export function sanitizeRelativeArtifactPath(value: string): string {
  const normalized = value.replace(/\\+/g, '/').split('/');
  const segments: string[] = [];
  for (const segmentRaw of normalized) {
    const segment = segmentRaw.trim();
    if (!segment || segment === '.') {
      continue;
    }
    if (segment === '..' || segment.includes('..')) {
      throw new Error(`relative_path contains invalid segment '${segment}'`);
    }
    segments.push(segment);
  }
  if (segments.length === 0) {
    throw new Error('relative_path must include at least one segment');
  }
  return segments.join('/');
}

export function isIsoDate(value: string): boolean {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

export function coerceNonNegativeInteger(value: unknown): number | null {
  if (typeof value === 'number' || typeof value === 'string') {
    const converted = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(converted) && converted >= 0) {
      return Math.floor(converted);
    }
  }
  return null;
}

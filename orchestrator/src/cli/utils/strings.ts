export function slugify(value: string, fallback = 'command'): string {
  const cleaned = value.trim().replace(/[^a-zA-Z0-9]+/g, '-').replace(/-+/g, '-');
  const normalized = cleaned.replace(/^-|-$/g, '');
  if (!normalized) {
    return fallback;
  }
  return normalized.slice(0, 80);
}

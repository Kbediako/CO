export interface SlugifyOptions {
  fallback?: string;
  maxLength?: number;
  lowercase?: boolean;
  pattern?: RegExp;
  collapseDashes?: boolean;
}

export function slugify(value: string, options: SlugifyOptions = {}): string {
  const fallback = typeof options.fallback === 'string' ? options.fallback : 'command';
  const maxLength = Number.isFinite(options.maxLength)
    ? Math.max(1, Math.floor(options.maxLength as number))
    : 80;
  const lowercase = options.lowercase ?? false;
  const pattern = options.pattern ?? /[^a-zA-Z0-9]+/g;
  const collapseDashes = options.collapseDashes ?? true;
  const base = lowercase ? value.toLowerCase() : value;
  const cleaned = base.trim().replace(pattern, '-');
  const collapsed = collapseDashes ? cleaned.replace(/-+/g, '-') : cleaned;
  const normalized = collapsed.replace(/^-+|-+$/g, '');
  if (!normalized) {
    return fallback;
  }
  return normalized.slice(0, maxLength);
}

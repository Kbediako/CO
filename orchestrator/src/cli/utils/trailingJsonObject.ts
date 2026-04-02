export function parseTrailingJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  if (!trimmed.endsWith('}')) {
    return null;
  }
  const direct = safeJsonObjectParse(trimmed);
  if (direct) {
    return direct;
  }
  const lines = trimmed.split(/\r?\n/u);
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index]?.trimStart().startsWith('{')) {
      continue;
    }
    const parsed = safeJsonObjectParse(lines.slice(index).join('\n'));
    if (parsed) {
      return parsed;
    }
  }
  return null;
}

function safeJsonObjectParse(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

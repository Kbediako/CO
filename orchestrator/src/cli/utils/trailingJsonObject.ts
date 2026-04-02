interface ParseTrailingJsonObjectOptions {
  allowTrailingTextAfterJson?: boolean;
}

export function parseTrailingJsonObject(
  raw: string,
  options: ParseTrailingJsonObjectOptions = {}
): Record<string, unknown> | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const direct = safeJsonObjectParse(trimmed);
  if (direct) {
    return direct;
  }
  if (options.allowTrailingTextAfterJson) {
    return parseJsonObjectBeforeTrailingText(trimmed);
  }
  return parseStrictTrailingJsonObject(trimmed);
}

function parseStrictTrailingJsonObject(trimmed: string): Record<string, unknown> | null {
  if (!trimmed.endsWith('}')) {
    return null;
  }
  const lines = trimmed.split(/\r?\n/u);
  for (let start = 0; start < lines.length; start += 1) {
    if (!lines[start]?.trimStart().startsWith('{')) {
      continue;
    }
    const parsed = safeJsonObjectParse(lines.slice(start).join('\n'));
    if (parsed) {
      return parsed;
    }
  }
  return null;
}

function parseJsonObjectBeforeTrailingText(trimmed: string): Record<string, unknown> | null {
  const lines = trimmed.split(/\r?\n/u);
  for (let start = lines.length - 1; start >= 0; start -= 1) {
    if (!lines[start]?.trimStart().startsWith('{')) {
      continue;
    }
    for (let end = lines.length - 1; end >= start; end -= 1) {
      if (!lines[end]?.includes('}')) {
        continue;
      }
      const parsed = safeJsonObjectParse(lines.slice(start, end + 1).join('\n'));
      if (parsed) {
        return parsed;
      }
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

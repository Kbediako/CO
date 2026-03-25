export const REVIEW_SHELL_COMMANDS = new Set([
  'bash',
  'sh',
  'zsh',
  'ksh',
  'fish',
  'pwsh',
  'powershell',
  'cmd',
  'cmd.exe'
]);

export type ShellControlSeparator = ';' | '\n' | '&&' | '||' | '|' | '&' | null;

export type ShellControlSegment = {
  segment: string;
  separatorAfter: ShellControlSeparator;
};

function isWindowsPathSegmentStart(char: string): boolean {
  return /^[A-Za-z0-9._-]$/u.test(char);
}

export function normalizeShellCommandPathSeparators(command: string): string {
  let normalized = '';
  let currentToken = '';
  let quote: '"' | "'" | '`' | null = null;
  let escaped = false;

  const flushToken = () => {
    if (!currentToken) {
      return;
    }
    normalized += looksLikeWindowsPathToken(currentToken)
      ? normalizeWindowsPathToken(currentToken)
      : currentToken;
    currentToken = '';
  };

  for (let index = 0; index < command.length; index += 1) {
    const char = command[index] ?? '';
    if (escaped) {
      currentToken += char;
      escaped = false;
      continue;
    }

    if (char === '\\' && quote !== "'") {
      currentToken += char;
      escaped = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = null;
      }
      currentToken += char;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      currentToken += char;
      continue;
    }

    if (/\s/u.test(char)) {
      flushToken();
      normalized += char;
      continue;
    }

    currentToken += char;
  }
  flushToken();
  return normalized;
}

function looksLikeWindowsPathToken(token: string): boolean {
  const unquoted = stripMatchingQuotes(token);
  const candidate = stripTrailingShellControlSuffix(unquoted);
  if (/^[A-Za-z]:\\/u.test(candidate) || /^\\\\[^\\/\s"'`]+[\\/]/u.test(candidate)) {
    return true;
  }

  // Keep quoted relative tokens untouched so regex/search literals do not regress again.
  if (unquoted !== token) {
    return false;
  }

  return looksLikeRelativeWindowsLauncherToken(candidate);
}

function stripTrailingShellControlSuffix(token: string): string {
  return token.replace(/(?:&&|\|\||[;&|])+$/u, '');
}

function looksLikeRelativeWindowsLauncherToken(token: string): boolean {
  if (!token.includes('\\')) {
    return false;
  }

  if (/\\[^\\/\s"'`]+\.(?:cmd|exe|bat|com|ps1)$/iu.test(token)) {
    return true;
  }

  return /^node_modules\\\.bin\\[^\\/\s"'`]+$/iu.test(token);
}

function stripMatchingQuotes(token: string): string {
  if (token.length < 2) {
    return token;
  }
  const first = token[0] ?? '';
  const last = token[token.length - 1] ?? '';
  if ((first === '"' || first === "'" || first === '`') && last === first) {
    return token.slice(1, -1);
  }
  return token;
}

function normalizeWindowsPathToken(token: string): string {
  const first = token[0] ?? '';
  const last = token[token.length - 1] ?? '';
  const hasMatchingQuotes =
    token.length >= 2 && (first === '"' || first === "'" || first === '`') && last === first;
  const raw = hasMatchingQuotes ? token.slice(1, -1) : token;
  const normalized = raw.replace(/\\\\(?=[^\\\s])/gu, '//').replace(/\\(?=[^\\\s])/gu, '/');
  return hasMatchingQuotes ? `${first}${normalized}${last}` : normalized;
}

export function splitShellControlSegmentsDetailed(command: string): ShellControlSegment[] {
  if (!command.trim()) {
    return [];
  }
  const segments: ShellControlSegment[] = [];
  let current = '';
  let quote: '"' | "'" | '`' | null = null;
  let escaped = false;

  const pushCurrent = (separatorAfter: ShellControlSeparator) => {
    const trimmed = current.trim();
    if (trimmed.length > 0) {
      segments.push({ segment: trimmed, separatorAfter });
    }
    current = '';
  };

  for (let index = 0; index < command.length; index += 1) {
    const char = command[index] ?? '';
    const next = command[index + 1] ?? '';

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\' && quote !== "'") {
      current += char;
      escaped = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = null;
      }
      current += char;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      current += char;
      continue;
    }

    if (char === ';' || char === '\n') {
      pushCurrent(char);
      continue;
    }

    if (char === '&') {
      if (next === '&') {
        pushCurrent('&&');
        index += 1;
        continue;
      }
      pushCurrent('&');
      continue;
    }

    if (char === '|') {
      if (next === '|') {
        pushCurrent('||');
        index += 1;
        continue;
      }
      pushCurrent('|');
      continue;
    }

    current += char;
  }

  pushCurrent(null);
  return segments;
}

export function splitShellControlSegments(command: string): string[] {
  return splitShellControlSegmentsDetailed(command).map((entry) => entry.segment);
}

export function separatorCarriesParentShellStateForward(
  separator: ShellControlSeparator
): boolean {
  return separator !== '|' && separator !== '&';
}

export function inferStaticShellTruthiness(segment: string): boolean | null {
  const rawTokens = tokenizeShellSegment(segment);
  const strippedTokens = stripLeadingEnvAssignments(rawTokens);
  if (strippedTokens.length === 0) {
    return null;
  }
  const tokens = unwrapEnvCommandTokens(strippedTokens);
  if (tokens.length === 0) {
    return null;
  }
  const command = normalizeCommandToken(tokens[0] ?? '');
  if (command === 'true' || command === ':' || command === 'export' || command === 'unset') {
    return true;
  }
  if (command === 'false') {
    return false;
  }
  return null;
}

export function segmentRunsInParentShell(
  separatorBefore: ShellControlSeparator,
  previousSegmentTruthiness: boolean | null
): boolean {
  if (separatorBefore === null || separatorBefore === ';' || separatorBefore === '\n' || separatorBefore === '&') {
    return true;
  }
  if (separatorBefore === '|') {
    return false;
  }
  if (separatorBefore === '&&') {
    return previousSegmentTruthiness === true;
  }
  if (separatorBefore === '||') {
    return previousSegmentTruthiness === false;
  }
  return false;
}

export function tokenizeShellSegment(segment: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | '`' | null = null;
  let escaped = false;

  const pushCurrent = () => {
    if (current.length > 0) {
      tokens.push(current);
      current = '';
    }
  };

  for (let index = 0; index < segment.length; index += 1) {
    const char = segment[index] ?? '';

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\' && quote !== "'") {
      escaped = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = null;
        continue;
      }
      current += char;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }

    if (/\s/u.test(char)) {
      pushCurrent();
      continue;
    }

    current += char;
  }

  pushCurrent();
  return tokens;
}

export function normalizeCommandToken(token: string): string {
  const normalized = token.trim().replace(/\\/gu, '/');
  const basename = normalized.split('/').pop() ?? normalized;
  return basename.replace(/\.(?:exe|cmd|bat|ps1)$/i, '').toLowerCase();
}

export function stripLeadingEnvAssignments(tokens: string[]): string[] {
  let index = 0;
  while (index < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(tokens[index] ?? '')) {
    index += 1;
  }
  return tokens.slice(index);
}

export function unwrapEnvCommandTokens(tokens: string[]): string[] {
  if (tokens.length === 0 || normalizeCommandToken(tokens[0] ?? '') !== 'env') {
    return tokens;
  }

  let index = 1;
  while (index < tokens.length) {
    const token = tokens[index] ?? '';
    const normalized = token.toLowerCase();

    if (token === '--') {
      index += 1;
      break;
    }

    if (/^[A-Za-z_][A-Za-z0-9_]*=.*/u.test(token)) {
      index += 1;
      continue;
    }

    if (normalized === '-u' || normalized === '--unset') {
      index += 2;
      continue;
    }

    if (normalized.startsWith('--unset=')) {
      index += 1;
      continue;
    }

    if (token.startsWith('-')) {
      index += 1;
      continue;
    }

    break;
  }

  return tokens.slice(index);
}

export function isShellCommandFlagWithPayload(flag: string): boolean {
  const normalized = flag.toLowerCase();
  if (normalized === '/c' || normalized === '-c') {
    return true;
  }
  return /^-[^-]*c[^-]*$/u.test(normalized);
}

export function extractShellCommandPayload(tokens: string[]): string | null {
  if (tokens.length < 2) {
    return null;
  }
  const command = normalizeCommandToken(tokens[0] ?? '');
  if (!REVIEW_SHELL_COMMANDS.has(command)) {
    return null;
  }
  for (let index = 1; index < tokens.length; index += 1) {
    if (!isShellCommandFlagWithPayload(tokens[index] ?? '')) {
      continue;
    }
    if (command === 'cmd') {
      const payload = tokens.slice(index + 1).join(' ').trim();
      return payload.length > 0 ? payload : null;
    }
    const payload = tokens[index + 1];
    return payload ? payload.trim() : null;
  }
  return null;
}

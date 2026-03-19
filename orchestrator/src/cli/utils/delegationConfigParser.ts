import { existsSync, readFileSync } from 'node:fs';

import { hasMcpServerEntry } from './mcpServerEntry.js';

export interface DelegationFallbackConfig {
  args: string[];
  envVars: Record<string, string>;
}

export function readDelegationFallbackConfig(configPath: string): DelegationFallbackConfig | null {
  if (!existsSync(configPath)) {
    return null;
  }
  try {
    const raw = readFileSync(configPath, 'utf8');
    if (!hasMcpServerEntry(raw, 'delegation')) {
      return null;
    }
    return {
      args: readDelegationArgsFromConfig(raw),
      envVars: readDelegationEnvVarsFromConfig(raw)
    };
  } catch {
    return null;
  }
}

function readDelegationArgsFromConfig(raw: string): string[] {
  const section = readSectionBody(raw, [
    'mcp_servers.delegation',
    'mcp_servers."delegation"',
    "mcp_servers.'delegation'"
  ]);
  if (!section) {
    const inlineEntry = readDelegationInlineEntry(raw);
    return inlineEntry ? readQuotedTokens(readInlinePropertyContents(inlineEntry, 'args', '[', ']')) : [];
  }
  const argsMatch = section.match(/^\s*args\s*=\s*\[([\s\S]*?)\]/mu);
  if (!argsMatch) {
    return [];
  }
  return readQuotedTokens(argsMatch[1] ?? '');
}

function readDelegationEnvVarsFromConfig(raw: string): Record<string, string> {
  const envVars: Record<string, string> = {};
  const section = readSectionBody(raw, [
    'mcp_servers.delegation.env',
    'mcp_servers."delegation".env',
    "mcp_servers.'delegation'.env"
  ]);
  if (!section) {
    const inlineEntry = readDelegationInlineEntry(raw);
    return inlineEntry ? readInlineEnvVars(inlineEntry) : envVars;
  }
  const linePattern = /^\s*([A-Za-z0-9_.-]+)\s*=\s*("(?:\\"|[^"])*"|'(?:\\'|[^'])*')\s*$/gmu;
  let match = linePattern.exec(section);
  while (match) {
    const key = match[1];
    const rawValue = match[2] ?? '';
    if (key) {
      const unquoted = rawValue.slice(1, -1);
      const decoded = unquoted.replace(/\\"/gu, '"').replace(/\\'/gu, '\'');
      envVars[key] = decoded;
    }
    match = linePattern.exec(section);
  }
  return envVars;
}

function readDelegationInlineEntry(raw: string): string | null {
  let currentTable: string | null = null;
  for (const line of raw.split('\n')) {
    const trimmed = stripTomlComment(line).trim();
    if (!trimmed) {
      continue;
    }
    const tableMatch = trimmed.match(/^\[(.+)\]$/u);
    if (tableMatch) {
      currentTable = tableMatch[1]?.trim() ?? null;
      continue;
    }
    const dottedMatch = trimmed.match(
      /^mcp_servers\.(?:"delegation"|'delegation'|delegation)\s*=\s*\{([\s\S]*)\}\s*$/u
    );
    if (dottedMatch) {
      return dottedMatch[1] ?? '';
    }
    if (currentTable === 'mcp_servers') {
      const entryMatch = trimmed.match(/^(?:"delegation"|'delegation'|delegation)\s*=\s*\{([\s\S]*)\}\s*$/u);
      if (entryMatch) {
        return entryMatch[1] ?? '';
      }
    }
  }
  return null;
}

function readInlineEnvVars(raw: string): Record<string, string> {
  const envVars: Record<string, string> = {};
  const envRaw = readInlinePropertyContents(raw, 'env', '{', '}');
  if (!envRaw) {
    return envVars;
  }
  const linePattern = /([A-Za-z0-9_.-]+)\s*=\s*("(?:\\"|[^"])*"|'(?:\\'|[^'])*')/gu;
  let match = linePattern.exec(envRaw);
  while (match) {
    const key = match[1];
    const rawValue = match[2] ?? '';
    if (key) {
      const unquoted = rawValue.slice(1, -1);
      const decoded = unquoted.replace(/\\"/gu, '"').replace(/\\'/gu, '\'');
      envVars[key] = decoded;
    }
    match = linePattern.exec(envRaw);
  }
  return envVars;
}

function readSectionBody(raw: string, names: string[]): string | null {
  let currentTable: string | null = null;
  let collecting = false;
  const lines: string[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = stripTomlComment(line).trim();
    const tableMatch = trimmed.match(/^\[(.+)\]$/u);
    if (tableMatch) {
      const tableName = tableMatch[1]?.trim() ?? null;
      if (collecting) {
        break;
      }
      currentTable = tableName;
      collecting = currentTable !== null && names.includes(currentTable);
      continue;
    }
    if (collecting) {
      lines.push(line);
    }
  }
  return collecting || lines.length > 0 ? lines.join('\n') : null;
}

function readInlinePropertyContents(raw: string, propertyName: string, open: string, close: string): string {
  const propertyPattern = new RegExp(`\\b${escapeRegExp(propertyName)}\\s*=\\s*\\${open}`, 'u');
  const propertyMatch = propertyPattern.exec(raw);
  if (!propertyMatch) {
    return '';
  }
  const openIndex = propertyMatch.index + propertyMatch[0].length - 1;
  return readDelimitedContents(raw, openIndex, open, close);
}

function readDelimitedContents(raw: string, openIndex: number, open: string, close: string): string {
  let quote: '"' | '\'' | null = null;
  let escaped = false;
  let depth = 0;
  let start = -1;
  for (let index = openIndex; index < raw.length; index += 1) {
    const character = raw[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\' && quote) {
      escaped = true;
      continue;
    }
    if (character === '"' || character === '\'') {
      quote = quote === character ? null : quote ?? character;
      continue;
    }
    if (quote) {
      continue;
    }
    if (character === open) {
      depth += 1;
      if (depth === 1) {
        start = index + 1;
      }
      continue;
    }
    if (character === close) {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        return raw.slice(start, index);
      }
    }
  }
  return '';
}

function readQuotedTokens(raw: string): string[] {
  const tokens: string[] = [];
  const tokenPattern = /"((?:\\"|[^"])*)"|'((?:\\'|[^'])*)'/gu;
  let token = tokenPattern.exec(raw);
  while (token) {
    const quoted = token[1] ?? token[2] ?? '';
    const decoded = quoted.replace(/\\"/gu, '"').replace(/\\'/gu, '\'');
    tokens.push(decoded);
    token = tokenPattern.exec(raw);
  }
  return tokens;
}

function stripTomlComment(line: string): string {
  let quote: '"' | '\'' | null = null;
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\' && quote) {
      escaped = true;
      continue;
    }
    if (character === '"' || character === '\'') {
      quote = quote === character ? null : quote ?? character;
      continue;
    }
    if (character === '#' && !quote) {
      return line.slice(0, index);
    }
  }
  return line;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

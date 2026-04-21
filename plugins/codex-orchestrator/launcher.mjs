#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import process from 'node:process';

const FORWARDABLE_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP'];
const MARKETPLACE_NAME = 'codex-orchestrator';
const MARKETPLACE_SECTION = `[marketplaces.${MARKETPLACE_NAME}]`;
const MARKETPLACE_SECTION_PATTERN = new RegExp(
  `^marketplaces\\s*\\.\\s*(?:"${escapeRegExp(MARKETPLACE_NAME)}"|'${escapeRegExp(MARKETPLACE_NAME)}'|${escapeRegExp(MARKETPLACE_NAME)})$`,
  'u'
);

function main() {
  const sourceRoot = resolveMarketplaceSourceRoot();
  const entrypoint = join(sourceRoot, 'bin', 'codex-orchestrator.js');
  if (!existsSync(entrypoint)) {
    throw new Error(
      `Codex Orchestrator marketplace source is missing ${entrypoint}. Keep the marketplace source installed or re-run codex plugin marketplace add.`
    );
  }

  const child = spawn(process.execPath, [entrypoint, ...process.argv.slice(2)], {
    env: {
      ...process.env,
      CODEX_ORCHESTRATOR_PACKAGE_ROOT: sourceRoot
    },
    stdio: 'inherit'
  });

  let forwardedStopSignal = null;
  const disposeSignalForwarding = installSignalForwarding(child, (signal) => {
    forwardedStopSignal ??= signal;
  });

  child.once('error', (error) => {
    disposeSignalForwarding();
    writeWarning(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });

  child.once('close', (code, signal) => {
    disposeSignalForwarding();
    if (forwardedStopSignal) {
      reemitSignal(forwardedStopSignal);
      return;
    }
    if (signal) {
      reemitSignal(signal);
      return;
    }
    process.exitCode = typeof code === 'number' ? code : 1;
  });
}

function resolveMarketplaceSourceRoot() {
  const { codexHome, configPath } = resolveCodexPaths();
  if (!existsSync(configPath)) {
    throw new Error(
      `Unable to locate Codex config at ${configPath}. Re-run codex plugin marketplace add for Codex Orchestrator.`
    );
  }

  const raw = readFileSync(configPath, 'utf8');
  const marketplaceConfig = readMarketplaceConfig(raw, configPath);
  const source = marketplaceConfig?.source;
  const sourceType = marketplaceConfig?.sourceType;
  if (!source) {
    throw new Error(
      `Codex config at ${configPath} is missing ${MARKETPLACE_SECTION}. Re-run codex plugin marketplace add for Codex Orchestrator.`
    );
  }
  if (sourceType === 'local') {
    return resolveLocalMarketplaceSourceRoot(source, configPath);
  }
  if (sourceType === 'git') {
    return resolveInstalledMarketplaceSourceRoot(codexHome, source);
  }
  if (sourceType) {
    throw new Error(
      `Codex config at ${configPath} has unsupported ${MARKETPLACE_SECTION}.source_type=${JSON.stringify(sourceType)}. Expected "local" or "git".`
    );
  }
  if (isAbsolute(source)) {
    return source;
  }
  return resolveInstalledMarketplaceSourceRoot(codexHome, source);
}

function resolveLocalMarketplaceSourceRoot(source, configPath) {
  return isAbsolute(source) ? source : join(dirname(configPath), source);
}

function resolveInstalledMarketplaceSourceRoot(codexHome, source) {
  const installedMarketplaceRoot = join(codexHome, '.tmp', 'marketplaces', MARKETPLACE_NAME);
  if (existsSync(installedMarketplaceRoot)) {
    return installedMarketplaceRoot;
  }
  throw new Error(
    `Codex marketplace source resolved to ${JSON.stringify(source)}, but ${installedMarketplaceRoot} is unavailable. Re-run codex plugin marketplace add for Codex Orchestrator.`
  );
}

function resolveCodexPaths() {
  const codexHome = normalizeOptionalString(process.env.CODEX_HOME);
  if (codexHome) {
    return {
      codexHome,
      configPath: join(codexHome, 'config.toml')
    };
  }
  const resolvedCodexHome = join(homedir(), '.codex');
  return {
    codexHome: resolvedCodexHome,
    configPath: join(resolvedCodexHome, 'config.toml')
  };
}

function readMarketplaceConfig(rawConfig, configPath) {
  const marketplaceSectionLines = findMarketplaceSectionLines(rawConfig);
  if (!marketplaceSectionLines) {
    return null;
  }
  const source = normalizeOptionalString(readMarketplaceAssignment(marketplaceSectionLines, 'source', configPath));
  const sourceType = normalizeOptionalString(
    readMarketplaceAssignment(marketplaceSectionLines, 'source_type', configPath) ??
      readMarketplaceAssignment(marketplaceSectionLines, 'sourceType', configPath)
  );
  if (!source && !sourceType) {
    return null;
  }
  return { source, sourceType };
}

function findMarketplaceSectionLines(rawConfig) {
  const lines = rawConfig.split(/\r?\n/u);
  const sectionLines = [];
  let inMarketplaceSection = false;
  for (const line of lines) {
    const trimmed = stripTomlInlineComment(line).trim();
    const tableMatch = trimmed.match(/^\[(.+)\]$/u);
    if (tableMatch) {
      const tableName = tableMatch[1]?.trim() ?? '';
      if (MARKETPLACE_SECTION_PATTERN.test(tableName)) {
        inMarketplaceSection = true;
        continue;
      }
      if (inMarketplaceSection) {
        break;
      }
      continue;
    }
    if (inMarketplaceSection) {
      sectionLines.push(line);
    }
  }
  return inMarketplaceSection ? sectionLines : null;
}

function readMarketplaceAssignment(sectionLines, key, configPath) {
  const keyPattern = new RegExp(`^(?:"${escapeRegExp(key)}"|'${escapeRegExp(key)}'|${escapeRegExp(key)})\\s*=`, 'u');
  for (const line of sectionLines) {
    const withoutComment = stripTomlInlineComment(line).trim();
    if (!keyPattern.test(withoutComment)) {
      continue;
    }
    const separatorIndex = withoutComment.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }
    const rawKey = withoutComment.slice(0, separatorIndex).trim();
    const parsedKey = rawKey.startsWith('"') || rawKey.startsWith("'")
      ? parseTomlStringValue(rawKey, configPath, `key:${key}`)
      : rawKey;
    if (parsedKey !== key) {
      continue;
    }
    const rawValue = withoutComment.slice(separatorIndex + 1).trim();
    if (rawValue.length === 0) {
      throw new Error(`Unable to parse Codex config at ${configPath}: ${MARKETPLACE_SECTION}.${key} is empty.`);
    }
    return parseTomlStringValue(rawValue, configPath, key);
  }
  return null;
}

function stripTomlInlineComment(line) {
  let result = '';
  let inBasicString = false;
  let inLiteralString = false;
  let escaping = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (escaping) {
      result += char;
      escaping = false;
      continue;
    }
    if (inBasicString) {
      result += char;
      if (char === '\\') {
        escaping = true;
      } else if (char === '"') {
        inBasicString = false;
      }
      continue;
    }
    if (inLiteralString) {
      result += char;
      if (char === "'") {
        if (line[index + 1] === "'") {
          result += "'";
          index += 1;
        } else {
          inLiteralString = false;
        }
      }
      continue;
    }
    if (char === '#') {
      break;
    }
    result += char;
    if (char === '"') {
      inBasicString = true;
    } else if (char === "'") {
      inLiteralString = true;
    }
  }
  return result;
}

function parseTomlStringValue(rawValue, configPath, key) {
  if (rawValue.startsWith("'")) {
    return parseTomlLiteralString(rawValue, configPath, key);
  }
  if (rawValue.startsWith('"')) {
    return parseTomlBasicString(rawValue, configPath, key);
  }
  return rawValue;
}

function parseTomlBasicString(rawValue, configPath, key) {
  let escaping = false;
  for (let index = 1; index < rawValue.length; index += 1) {
    const char = rawValue[index];
    if (escaping) {
      escaping = false;
      continue;
    }
    if (char === '\\') {
      escaping = true;
      continue;
    }
    if (char === '"') {
      try {
        return JSON.parse(rawValue.slice(0, index + 1));
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Unable to parse Codex config at ${configPath}: ${MARKETPLACE_SECTION}.${key} has an invalid basic string (${detail}).`
        );
      }
    }
  }
  throw new Error(
    `Unable to parse Codex config at ${configPath}: ${MARKETPLACE_SECTION}.${key} has an unterminated basic string.`
  );
}

function parseTomlLiteralString(rawValue, configPath, key) {
  let parsed = '';
  for (let index = 1; index < rawValue.length; index += 1) {
    const char = rawValue[index];
    if (char !== "'") {
      parsed += char;
      continue;
    }
    if (rawValue[index + 1] === "'") {
      parsed += "'";
      index += 1;
      continue;
    }
    return parsed;
  }
  throw new Error(
    `Unable to parse Codex config at ${configPath}: ${MARKETPLACE_SECTION}.${key} has an unterminated literal string.`
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function normalizeOptionalString(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function writeWarning(message) {
  const line = `${message}\n`;
  const stderrFd = process.stderr.fd;
  if (typeof stderrFd === 'number') {
    try {
      writeSync(stderrFd, line);
      return;
    } catch {
      // Fall through to process.stderr when direct fd writes are unavailable.
    }
  }
  process.stderr.write(line);
}

function installSignalForwarding(child, onForwardedSignal) {
  const handlers = new Map();
  for (const signal of FORWARDABLE_SIGNALS) {
    const handler = () => {
      onForwardedSignal(signal);
      forwardSignal(child, signal);
    };
    process.on(signal, handler);
    handlers.set(signal, handler);
  }
  return () => {
    for (const [signal, handler] of handlers) {
      process.off(signal, handler);
    }
  };
}

function forwardSignal(child, signal) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }
  try {
    child.kill(signal);
  } catch {
    // Ignore forwarding races when the child exits between checks.
  }
}

function reemitSignal(signal) {
  try {
    process.kill(process.pid, signal);
  } catch {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  writeWarning(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

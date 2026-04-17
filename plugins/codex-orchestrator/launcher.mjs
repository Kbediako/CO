#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import process from 'node:process';

const FORWARDABLE_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP'];
const MARKETPLACE_NAME = 'codex-orchestrator';
const MARKETPLACE_SECTION = `[marketplaces.${MARKETPLACE_NAME}]`;

function main() {
  const sourceRoot = resolveMarketplaceSourceRoot();
  const entrypoint = join(sourceRoot, 'bin', 'codex-orchestrator.js');
  if (!existsSync(entrypoint)) {
    throw new Error(
      `Codex Orchestrator marketplace source is missing ${entrypoint}. Keep the marketplace source installed or re-run codex marketplace add.`
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
    throw new Error(`Unable to locate Codex config at ${configPath}. Re-run codex marketplace add for Codex Orchestrator.`);
  }

  const raw = readFileSync(configPath, 'utf8');
  const source = readMarketplaceSource(raw);
  if (!source) {
    throw new Error(
      `Codex config at ${configPath} is missing ${MARKETPLACE_SECTION}. Re-run codex marketplace add for Codex Orchestrator.`
    );
  }
  if (isAbsolute(source)) {
    return source;
  }
  const installedMarketplaceRoot = join(codexHome, '.tmp', 'marketplaces', MARKETPLACE_NAME);
  if (existsSync(installedMarketplaceRoot)) {
    return installedMarketplaceRoot;
  }
  throw new Error(
    `Codex marketplace source resolved to ${JSON.stringify(source)}, but ${installedMarketplaceRoot} is unavailable. Re-run codex marketplace add for Codex Orchestrator.`
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

function readMarketplaceSource(rawConfig) {
  let inMarketplaceSection = false;
  for (const line of rawConfig.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      inMarketplaceSection = trimmed === MARKETPLACE_SECTION;
      continue;
    }
    if (!inMarketplaceSection) {
      continue;
    }
    const match = trimmed.match(/^source\s*=\s*"((?:[^"\\]|\\.)*)"\s*$/u);
    if (!match) {
      continue;
    }
    return JSON.parse(`"${match[1]}"`);
  }
  return null;
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

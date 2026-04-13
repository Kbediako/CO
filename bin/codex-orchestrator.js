#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, writeSync } from 'node:fs'
import { join, normalize } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const FORWARDABLE_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP']

function main() {
  const packageRoot = resolvePackageRoot()
  const sourceEntry = join(packageRoot, 'bin', 'codex-orchestrator.ts')
  const distEntry = join(packageRoot, 'dist', 'bin', 'codex-orchestrator.js')
  const sourceLoader = existsSync(sourceEntry) ? resolveTsNodeLoader(packageRoot) : null

  let args
  if (sourceLoader) {
    args = ['--no-warnings', '--loader', sourceLoader, sourceEntry, ...process.argv.slice(2)]
  } else if (existsSync(distEntry)) {
    args = [distEntry, ...process.argv.slice(2)]
    if (existsSync(sourceEntry)) {
      writeWarning(
        [
          'Source checkout fallback: ts-node/esm is unavailable, so execution is using the built dist artifact instead of the live source entrypoint.',
          `source=${sourceEntry}`,
          `dist=${distEntry}`,
          'Fresh merged TypeScript changes may remain stale until dist is rebuilt.'
        ].join(' ')
      )
    }
  } else if (existsSync(sourceEntry)) {
    throw new Error(
      `Unable to run ${sourceEntry} because ts-node/esm is unavailable, and fallback dist artifact ${distEntry} is missing.`
    )
  } else {
    throw new Error(`Unable to locate CLI entrypoint. Expected ${distEntry}.`)
  }

  const env = {
    ...process.env,
    CODEX_ORCHESTRATOR_PACKAGE_ROOT: packageRoot
  }
  if (sourceLoader) {
    env.TS_NODE_PROJECT = join(packageRoot, 'tsconfig.json')
  }

  const child = spawn(process.execPath, [...process.execArgv, ...args], {
    env,
    stdio: 'inherit'
  })
  let forwardedStopSignal = null
  const disposeSignalForwarding = installSignalForwarding(child, (signal) => {
    forwardedStopSignal ??= signal
  })
  child.once('error', (error) => {
    disposeSignalForwarding()
    writeWarning(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  child.once('close', (code, signal) => {
    disposeSignalForwarding()
    if (forwardedStopSignal) {
      reemitSignal(forwardedStopSignal)
      return
    }
    if (signal) {
      reemitSignal(signal)
      return
    }
    process.exitCode = typeof code === 'number' ? code : 1
  })
}

function resolvePackageRoot() {
  const selfPath = fileURLToPath(import.meta.url)
  const selfRoot = normalize(join(selfPath, '..', '..'))
  const configured = normalizeOptionalString(process.env.CODEX_ORCHESTRATOR_PACKAGE_ROOT)
  if (configured && pathsEqual(configured, selfRoot)) {
    return normalize(configured)
  }
  return selfRoot
}

function resolveTsNodeLoader(packageRoot) {
  try {
    return createRequire(join(packageRoot, 'package.json')).resolve('ts-node/esm')
  } catch {
    return null
  }
}

function normalizeOptionalString(value) {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function pathsEqual(leftPath, rightPath) {
  return normalize(leftPath) === normalize(rightPath)
}

function writeWarning(message) {
  const line = `${message}\n`
  const stderrFd = process.stderr.fd
  if (typeof stderrFd === 'number') {
    try {
      writeSync(stderrFd, line)
      return
    } catch {
      // Fall through to process.stderr when direct fd writes are unavailable.
    }
  }
  process.stderr.write(line)
}

function installSignalForwarding(child, onForwardedSignal) {
  const handlers = new Map()
  for (const signal of FORWARDABLE_SIGNALS) {
    const handler = () => {
      onForwardedSignal(signal)
      forwardSignal(child, signal)
    }
    process.on(signal, handler)
    handlers.set(signal, handler)
  }
  return () => {
    for (const [signal, handler] of handlers) {
      process.off(signal, handler)
    }
  }
}

function forwardSignal(child, signal) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return
  }
  try {
    child.kill(signal)
  } catch {
    // Ignore forwarding races when the child exits between checks.
  }
}

function reemitSignal(signal) {
  try {
    process.kill(process.pid, signal)
  } catch {
    process.exitCode = 1
  }
}

try {
  main()
} catch (error) {
  writeWarning(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}

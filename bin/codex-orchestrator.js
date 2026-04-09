#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, writeSync } from 'node:fs'
import { join, normalize } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

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

  const child = spawn(process.execPath, [...process.execArgv, ...args], {
    env,
    stdio: 'inherit'
  })
  child.once('error', (error) => {
    writeWarning(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  child.once('close', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal)
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

try {
  main()
} catch (error) {
  writeWarning(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}

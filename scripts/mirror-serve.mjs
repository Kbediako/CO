#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { startMirrorServer, resolveCspPolicy } from "./lib/mirror-server.mjs";
import { parseArgs, hasFlag } from "./lib/cli-args.js";
import { resolveEnvironmentPaths } from "./lib/run-manifests.js";

async function ensureDirExists(dir) {
  try {
    const stat = await fs.stat(dir);
    if (!stat.isDirectory()) {
      throw new Error(`${dir} exists but is not a directory`);
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`Mirror public directory not found: ${dir}`);
    }
    throw error;
  }
}

async function main() {
  const { repoRoot } = resolveEnvironmentPaths();
  const { args, positionals } = parseArgs(process.argv.slice(2));
  if (hasFlag(args, "help") || hasFlag(args, "h")) {
    console.log("Usage: npm run mirror:serve -- --project <name> [--port <port>] [--csp <policy>] [--no-range]");
    return;
  }
  const knownFlags = new Set(["project", "port", "csp", "no-range", "range", "h", "help"]);
  const unknown = Object.keys(args).filter((key) => !knownFlags.has(key));
  if (unknown.length > 0 || positionals.length > 0) {
    const label = unknown[0] ? `--${unknown[0]}` : positionals[0];
    console.error(`Unknown option: ${label}`);
    process.exitCode = 2;
    return;
  }

  const project = typeof args.project === "string" ? args.project : null;
  if (!project) {
    console.error("Missing required --project argument (e.g. --project obys-library)");
    process.exitCode = 1;
    return;
  }

  const portInput = typeof args.port === "string" ? args.port : process.env.PORT ?? 4173;
  const port = Number(portInput) || 4173;
  const enableRange = hasFlag(args, "no-range") ? false : args.range === "false" ? false : true;
  const cspHeader = resolveCspPolicy(typeof args.csp === "string" ? args.csp : "self");
  const rootDir = path.resolve(repoRoot, "packages", project, "public");

  try {
    await ensureDirExists(rootDir);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  const { port: resolvedPort } = await startMirrorServer({
    rootDir,
    port,
    csp: cspHeader,
    enableRange,
    log: (message) => console.log(message)
  });

  console.log(`[mirror:serve] ${project} ready at http://localhost:${resolvedPort}`);
}

main().catch((error) => {
  console.error("[mirror:serve] failed to start server", error);
  process.exitCode = 1;
});

#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { startMirrorServer, resolveCspPolicy } from "./lib/mirror-server.mjs";

function parseArgs(rawArgs) {
  const args = {};
  for (let i = 0; i < rawArgs.length; i += 1) {
    const arg = rawArgs[i];
    if (!arg.startsWith("--")) {
      continue;
    }

    const [flag, value] = arg.split("=");
    const key = flag.replace(/^--/, "");

    if (value !== undefined) {
      args[key] = value;
      continue;
    }

    const next = rawArgs[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }

  return args;
}

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

function buildCsp(option) {
  if (option === undefined) {
    return resolveCspPolicy("self");
  }

  return resolveCspPolicy(option);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    console.log("Usage: npm run mirror:serve -- --project <name> [--port <port>] [--csp <policy>] [--no-range]");
    return;
  }

  const project = args.project;
  if (!project) {
    console.error("Missing required --project argument (e.g. --project obys-library)");
    process.exitCode = 1;
    return;
  }

  const port = Number(args.port ?? process.env.PORT ?? 4173) || 4173;
  const enableRange = args["no-range"] ? false : args.range === "false" ? false : true;
  const cspHeader = buildCsp(args.csp);
  const rootDir = path.resolve(process.cwd(), "packages", project, "public");

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

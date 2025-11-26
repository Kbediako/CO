#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { startMirrorServer } from "./lib/mirror-server.mjs";

const TRACKER_PATTERNS = [/gtag/i, /google-analytics/i, /hotjar/i];
const TEXT_CONTENT_TYPE = /(text|javascript|json|xml|svg)/i;

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

async function readConfig(project, providedPath) {
  const configPath = path.resolve(providedPath ?? path.join("packages", project, "mirror.config.json"));
  const raw = JSON.parse(await fs.readFile(configPath, "utf8"));

  if (!raw.origin) {
    throw new Error(`mirror.config.json for ${project} is missing required "origin"`);
  }

  if (!Array.isArray(raw.routes) || !raw.routes.length) {
    throw new Error(`mirror.config.json for ${project} requires a non-empty "routes" array`);
  }

  const originHost = new URL(raw.origin).hostname;
  const allowlistHosts = Array.from(
    new Set([...(raw.allowlistHosts ?? []), originHost, "localhost", "127.0.0.1"])
  );

  const routes = raw.routes.map((route) => {
    const parsed = new URL(route, "http://localhost");
    return parsed.pathname || "/";
  });

  return {
    configPath,
    origin: raw.origin,
    routes,
    allowlistHosts,
    blocklistHosts: raw.blocklistHosts ?? [],
    originHost
  };
}

async function ensurePublicDir(project) {
  const publicDir = path.resolve("packages", project, "public");
  const stat = await fs.stat(publicDir);
  if (!stat.isDirectory()) {
    throw new Error(`Expected public directory at ${publicDir}`);
  }
  return publicDir;
}

function summarizeIssues(name, issues) {
  if (!issues.length) {
    return;
  }
  console.log(`\n${name}:`);
  for (const issue of issues) {
    console.log(`- ${issue}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    console.log("Usage: npm run mirror:check -- --project <name> [--port <port>] [--config <path>] [--headless=false]");
    return;
  }

  const project = args.project;
  if (!project) {
    console.error("Missing required --project argument (e.g. --project obys-library)");
    process.exitCode = 1;
    return;
  }

  let config;
  try {
    config = await readConfig(project, args.config);
  } catch (error) {
    console.error(`[mirror:check] Unable to read config: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  let serverHandle = null;
  let port = args.port ? Number(args.port) : null;

  if (!port) {
    const publicDir = await ensurePublicDir(project);
    serverHandle = await startMirrorServer({
      rootDir: publicDir,
      port: 0,
      csp: args.csp ?? "self",
      enableRange: true,
      log: () => {}
    });
    port = serverHandle.port;
  }

  const baseUrl = `http://localhost:${port}`;
  const allowlist = new Set(config.allowlistHosts);
  const blocklist = new Set(config.blocklistHosts);

  console.log(`[mirror:check] project=${project} base=${baseUrl} routes=${config.routes.length}`);

  const outboundViolations = [];
  const assetFailures = [];
  const routeFailures = [];
  const contentViolations = [];

  const browser = await chromium.launch({ headless: args.headless === "false" ? false : true });
  const context = await browser.newContext({ baseURL: baseUrl });

  for (const route of config.routes) {
    const page = await context.newPage();
    const responseChecks = [];

    await page.route("**/*", async (routeHandler) => {
      const request = routeHandler.request();
      const url = new URL(request.url());

      const protocol = url.protocol.replace(":", "");
      if (protocol === "data" || protocol === "blob") {
        await routeHandler.continue();
        return;
      }

      if (blocklist.has(url.hostname)) {
        outboundViolations.push(`${route}: blocked host ${url.hostname} (${url.toString()})`);
        await routeHandler.abort();
        return;
      }

      if (allowlist.size && !allowlist.has(url.hostname)) {
        outboundViolations.push(`${route}: host ${url.hostname} not in allowlist (${url.toString()})`);
        await routeHandler.abort();
        return;
      }

      await routeHandler.continue();
    });

    page.on("requestfailed", (request) => {
      const failure = request.failure();
      const url = request.url();
      const type = request.resourceType();
      const isMedia = ["media", "video", "audio"].includes(type) || /\.(mp4|mov|webm)(\?|$)/i.test(url);
      if (isMedia) {
        return;
      }
      assetFailures.push(`${route}: ${url} failed (${failure?.errorText ?? "unknown"})`);
    });

    page.on("response", (response) => {
      const url = response.url();
      const status = response.status();
      if (url.startsWith("data:") || url.startsWith("blob:")) {
        return;
      }

      if (status >= 400) {
        assetFailures.push(`${route}: ${url} returned ${status}`);
      }

      const headers = response.headers();
      const contentType = headers["content-type"] || headers["Content-Type"] || "";
      if (contentType && TEXT_CONTENT_TYPE.test(contentType) && !/text\/html/i.test(contentType)) {
        responseChecks.push(
          response
            .text()
            .then((body) => {
              for (const pattern of TRACKER_PATTERNS) {
                if (pattern.source === "facebook") {
                  continue;
                }
                if (pattern.test(body)) {
                  contentViolations.push(`${route}: tracker pattern "${pattern.source}" found in ${url}`);
                  break;
                }
              }
            })
            .catch(() => {})
        );
      }
    });

    const navigation = await page.goto(route, { waitUntil: "networkidle" });
    const navStatus = navigation?.status() ?? 0;
    if (!navigation || navStatus >= 400) {
      routeFailures.push(`${route}: expected 200, received ${navStatus || "no response"}`);
    }

    const pageContent = await page.content();
    for (const pattern of TRACKER_PATTERNS) {
      if (pattern.test(pageContent)) {
        contentViolations.push(`${route}: tracker pattern "${pattern.source}" found in HTML`);
      }
    }

    await Promise.all(responseChecks);
    await page.close();
  }

  await browser.close();
  if (serverHandle?.server) {
    await new Promise((resolve) => serverHandle.server.close(() => resolve()));
  }

  summarizeIssues("Route failures", routeFailures);
  summarizeIssues("Outbound host violations", outboundViolations);
  summarizeIssues("Asset failures", assetFailures);
  summarizeIssues("Content violations", contentViolations);

  const hasIssues =
    routeFailures.length || outboundViolations.length || assetFailures.length || contentViolations.length;

  if (hasIssues) {
    process.exitCode = 1;
    console.error(
      `[mirror:check] detected issues (${routeFailures.length} routes, ${outboundViolations.length} outbound, ${assetFailures.length} assets, ${contentViolations.length} content)`
    );
  } else {
    console.log("[mirror:check] all routes returned 200 with no outbound or tracker violations");
  }
}

main().catch((error) => {
  console.error("[mirror:check] unexpected failure", error);
  process.exitCode = 1;
});

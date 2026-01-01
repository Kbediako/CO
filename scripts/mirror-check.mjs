#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { loadCheerio, loadPlaywright } from "./mirror-optional-deps.mjs";
import { parseArgs, hasFlag } from "./lib/cli-args.js";
import { DEFAULT_STRIP_PATTERNS, compileStripPatterns, loadMirrorConfig } from "./mirror-site.mjs";
import { startMirrorServer } from "./lib/mirror-server.mjs";

const cheerio = await loadCheerio();
const playwright = await loadPlaywright();
const TRACKER_PATTERNS = compileStripPatterns(DEFAULT_STRIP_PATTERNS);
const TEXT_CONTENT_TYPE = /(text|javascript|json|xml|svg)/i;
const ABSOLUTE_HTTPS_REGEX = /https:\/\/[^\s"'<>]+/gi;

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

function recordAbsoluteUrls(text, route, collector, options) {
  if (!text) return;
  const matches = text.matchAll(ABSOLUTE_HTTPS_REGEX);
  const urls = collector.get(route) ?? new Set();

  for (const match of matches) {
    if (!match[0]) continue;
    try {
      const urlObj = new URL(match[0]);
      const isOrigin = urlObj.hostname === options.originHost;
      const isBlocked = options.blocklist.has(urlObj.hostname);
      if (!isOrigin && !isBlocked) {
        continue;
      }
      urls.add(urlObj.toString());
    } catch {
      continue;
    }
  }

  if (urls.size) {
    collector.set(route, urls);
  }
}

function scanDomForIssues(pageContent, route, options) {
  const absolute = new Set();
  const trackerHits = [];
  const $ = cheerio.load(pageContent);
  const base = new URL(route, options.baseUrl);

  const assetSelectors = [
    { selector: "script[src]", attr: "src" },
    { selector: "link[href]", attr: "href" },
    { selector: "img[src]", attr: "src" },
    { selector: "img[srcset]", attr: "srcset", isSrcset: true },
    { selector: "source[src]", attr: "src" },
    { selector: "source[srcset]", attr: "srcset", isSrcset: true },
    { selector: "video[src]", attr: "src" },
    { selector: "audio[src]", attr: "src" },
    { selector: "track[src]", attr: "src" },
    { selector: "iframe[src]", attr: "src" },
    { selector: "use[href]", attr: "href" },
    { selector: "use[xlink\\:href]", attr: "xlink:href" },
    { selector: "[data-src]", attr: "data-src" },
    { selector: "[data-srcset]", attr: "data-srcset", isSrcset: true }
  ];

  const trackerCandidates = [];

  for (const mapping of assetSelectors) {
    $(mapping.selector).each((_, el) => {
      const raw = $(el).attr(mapping.attr);
      if (!raw) return;
      const parts = mapping.isSrcset
        ? raw.split(",").map((part) => part.trim().split(/\s+/, 2)[0]).filter(Boolean)
        : [raw];

      for (const value of parts) {
        const trimmed = value.trim();
        if (!trimmed || trimmed.startsWith("#")) {
          continue;
        }
        let urlObj;
        try {
          urlObj = new URL(trimmed, base);
        } catch {
          continue;
        }
        if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
          continue;
        }
        const matchTarget = `${urlObj.origin}${urlObj.pathname}${urlObj.search}`;
        trackerCandidates.push(matchTarget);
        if (urlObj.hostname === options.originHost || options.blocklist.has(urlObj.hostname)) {
          absolute.add(urlObj.toString());
        }
      }
    });
  }

  $("script:not([src])").each((_, el) => {
    const text = $(el).html() || "";
    if (text.trim()) {
      trackerCandidates.push(text);
    }
  });

  for (const candidate of trackerCandidates) {
    for (const pattern of TRACKER_PATTERNS) {
      if (pattern.test(candidate)) {
        trackerHits.push(`tracker pattern "${pattern.source}" found in ${route}`);
        break;
      }
    }
  }

  return { absolute, trackerHits };
}

async function main() {
  const { args, positionals } = parseArgs(process.argv.slice(2));
  if (hasFlag(args, "help") || hasFlag(args, "h")) {
    console.log("Usage: npm run mirror:check -- --project <name> [--port <port>] [--config <path>] [--headless=false] [--csp <policy>]");
    return;
  }
  const knownFlags = new Set(["project", "port", "config", "headless", "csp", "h", "help"]);
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

  let config;
  try {
    const result = await loadMirrorConfig(project, args.config);
    config = result.config;
  } catch (error) {
    console.error(`[mirror:check] ${error.message}`);
    process.exitCode = 1;
    return;
  }

  let serverHandle = null;
  let port = typeof args.port === "string" ? Number(args.port) : null;

  if (!port) {
    const publicDir = await ensurePublicDir(project);
    serverHandle = await startMirrorServer({
      rootDir: publicDir,
      port: 0,
      csp: typeof args.csp === "string" ? args.csp : "self",
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
  const absoluteReferences = new Map();

  const browser = await playwright.chromium.launch({ headless: args.headless === "false" ? false : true });
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
                if (pattern.test(body)) {
                  contentViolations.push(`${route}: tracker pattern "${pattern.source}" found in ${url}`);
                  break;
                }
              }
              recordAbsoluteUrls(body, route, absoluteReferences, {
                originHost: config.originHost,
                blocklist
              });
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
    const domScan = scanDomForIssues(pageContent, route, {
      originHost: config.originHost,
      blocklist,
      baseUrl
    });
    if (domScan.absolute.size) {
      const existing = absoluteReferences.get(route) ?? new Set();
      for (const value of domScan.absolute.values()) {
        existing.add(value);
      }
      absoluteReferences.set(route, existing);
    }
    contentViolations.push(...domScan.trackerHits);

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
  // Hint clusters for common foot-guns (e.g., numbered sequences or missing worker chunks)
  const urlRegex = /(https?:\/\/[^\s)]+)/;
  const clusterCounts = new Map();
  const chunkMisses = [];
  for (const failure of assetFailures) {
    const match = failure.match(urlRegex);
    if (!match) continue;
    const url = match[1];
    if (/_next\/static\/chunks\//.test(url)) {
      chunkMisses.push(failure);
    }
    // Normalize numbered frames: replace 4-6 digit stems before extension.
    const normalized = url.replace(/\/(\d{4,6})(?=\.\w+$)/, "/<frame>");
    const current = clusterCounts.get(normalized) ?? 0;
    clusterCounts.set(normalized, current + 1);
  }
  const clustered = Array.from(clusterCounts.entries())
    .filter(([, count]) => count >= 10)
    .map(([url, count]) => `~${count} similar failures (possible sequence/frameset): ${url}`);
  summarizeIssues("Asset failure clusters", clustered);
  summarizeIssues("Missing worker/chunk files", chunkMisses);

  const absoluteIssues = [];
  for (const [route, urls] of absoluteReferences.entries()) {
    for (const url of urls) {
      absoluteIssues.push(`${route}: ${url}`);
    }
  }
  if (absoluteIssues.length) {
    summarizeIssues("Absolute https:// references", absoluteIssues);
  } else {
    console.log("\nAbsolute https:// references: none");
  }

  const hasIssues =
    routeFailures.length || outboundViolations.length || assetFailures.length || contentViolations.length || absoluteIssues.length;

  if (hasIssues) {
    process.exitCode = 1;
    console.error(
      `[mirror:check] detected issues (${routeFailures.length} routes, ${outboundViolations.length} outbound, ${assetFailures.length} assets, ${contentViolations.length} content, ${absoluteIssues.length} absolute)`
    );
  } else {
    console.log("[mirror:check] all routes returned 200 with no outbound or tracker violations");
  }
}

main().catch((error) => {
  console.error("[mirror:check] unexpected failure", error);
  process.exitCode = 1;
});

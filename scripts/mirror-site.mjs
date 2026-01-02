#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadCheerio } from "./mirror-optional-deps.mjs";
import { parseArgs, hasFlag } from "./lib/cli-args.js";
import { pathExists, toPosixPath } from "./lib/docs-helpers.js";
import { resolveEnvironmentPaths } from "./lib/run-manifests.js";
import { findPermitEntry, loadPermitFile } from "./design/pipeline/permit.js";

const cheerio = await loadCheerio();

const WAYBACK_PREFIX = "https://web.archive.org/web";
const DEFAULT_ASSET_ROOTS = ["/wp-content", "/wp-includes", "/"];
const DEFAULT_STRIP_PATTERNS = [
  "\\bgtag\\b",
  "googletagmanager",
  "google-analytics",
  "\\bhotjar\\b",
  "metricool",
  "pagesense",
  "serviceworker",
  "connect\\.facebook\\.net",
  "facebook\\.com/tr",
  "fbevents",
  "\\bclarity\\b",
  "doubleclick",
  "googlesyndication",
  "\\btiktok\\b",
  "pixel\\.wp\\.com",
  "cdn-cgi/challenge-platform"
];
const DEFAULT_SHARE_HOST_REWRITES = {
  "facebook.com": "https://fb.com",
  "www.facebook.com": "https://fb.com",
  "m.facebook.com": "https://fb.com",
  "l.facebook.com": "https://fb.com",
  "web.facebook.com": "https://fb.com"
};
const META_IMAGE_KEYS = new Set([
  "og:image",
  "og:image:url",
  "og:image:secure_url",
  "twitter:image",
  "twitter:image:src",
  "twitter:image:url"
]);

function sanitizeTimestamp(value) {
  return value.replace(/[:]/g, "-");
}

function encodeKey(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function buildWaybackUrl(targetUrl) {
  if (!targetUrl.startsWith("http")) {
    return null;
  }

  try {
    const parsed = new URL(targetUrl);
    return `${WAYBACK_PREFIX}/0if_/${parsed.toString()}`;
  } catch {
    return null;
  }
}

async function fetchWithCache(url, cacheDir, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const fallbackBuilder = options.fallbackBuilder ?? buildWaybackUrl;
  const key = encodeKey(url);
  const bodyPath = path.join(cacheDir, `${key}.bin`);
  const metaPath = path.join(cacheDir, `${key}.json`);

  if (await pathExists(bodyPath) && await pathExists(metaPath)) {
    const [body, metaRaw] = await Promise.all([fs.readFile(bodyPath), fs.readFile(metaPath, "utf8")]);
    const parsedMeta = JSON.parse(metaRaw);
    return {
      ...parsedMeta,
      resolvedUrl: parsedMeta.resolvedUrl ?? url,
      source: parsedMeta.source ?? "primary",
      body,
      fromCache: true,
      fallback: (parsedMeta.source ?? "primary") === "wayback"
    };
  }

  const attempts = [];
  let fallbackAttempted = false;
  let fallbackUrl = null;

  async function tryFetch(target, source) {
    const response = await fetchImpl(target);
    const arrayBuffer = await response.arrayBuffer();
    const body = Buffer.from(arrayBuffer);
    const meta = {
      url,
      resolvedUrl: target,
      status: response.status,
      fetchedAt: new Date().toISOString(),
      headers: Object.fromEntries(response.headers.entries()),
      source
    };
    return { meta, body };
  }

  let result = null;
  let lastError = null;

  try {
    result = await tryFetch(url, "primary");
  } catch (error) {
    attempts.push({ source: "primary", error: error.message });
    lastError = error;
  }

  if (!result || result.meta.status >= 400) {
    fallbackUrl = fallbackBuilder?.(url);
    if (fallbackUrl) {
      fallbackAttempted = true;
      try {
        result = await tryFetch(fallbackUrl, "wayback");
      } catch (error) {
        attempts.push({ source: "wayback", error: error.message });
        lastError = error;
      }
    }
  }

  if (!result) {
    const failure = attempts.length ? `attempts: ${attempts.map((a) => `${a.source}=${a.error}`).join(", ")}` : lastError?.message || "unknown";
    throw new Error(`Failed to fetch ${url}${failure ? ` (${failure})` : ""}`);
  }

  const { body, meta } = result;
  const resolvedMeta = {
    ...meta,
    fallbackUrl: meta.source === "wayback" ? fallbackUrl : undefined,
    fallbackAttempted
  };

  await fs.mkdir(cacheDir, { recursive: true });
  await Promise.all([fs.writeFile(bodyPath, body), fs.writeFile(metaPath, JSON.stringify(resolvedMeta, null, 2))]);

  return { ...resolvedMeta, body, fromCache: false, fallback: meta.source === "wayback" };
}

function compileStripPatterns(patterns = []) {
  return patterns.map((pattern) => new RegExp(pattern, "i"));
}

function normalizeRoute(route) {
  if (!route) return "/";
  const parsed = new URL(route, "http://localhost");
  const pathname = parsed.pathname || "/";
  return pathname;
}

function routeToOutputPath(baseDir, route) {
  const parsed = new URL(route, "http://localhost");
  const cleaned = parsed.pathname.replace(/^\/+/, "");
  const looksLikeFile = Boolean(path.extname(cleaned));

  if (!cleaned || parsed.pathname.endsWith("/") || !looksLikeFile) {
    const target = path.join(baseDir, cleaned, "index.html");
    const resolvedBase = path.resolve(baseDir);
    const resolvedTarget = path.resolve(target);
    if (!resolvedTarget.startsWith(resolvedBase)) {
      throw new Error(`Refusing to write outside staging dir for route ${route}`);
    }
    return target;
  }

  const target = path.join(baseDir, cleaned);
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(target);
  if (!resolvedTarget.startsWith(resolvedBase)) {
    throw new Error(`Refusing to write outside staging dir for route ${route}`);
  }
  return target;
}

function resolveInside(baseDir, relativePath, contextLabel) {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(baseDir, relativePath);
  const relative = path.relative(resolvedBase, resolvedTarget);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(
      `Refusing to write outside ${resolvedBase}${contextLabel ? ` (${contextLabel})` : ""}: ${relativePath}`
    );
  }
  return resolvedTarget;
}

function buildRouteBase(origin, route) {
  const base = new URL(route || "/", origin);
  const pathname = base.pathname || "/";
  const looksLikeFile = Boolean(path.extname(pathname));

  if (!pathname.endsWith("/") && !looksLikeFile) {
    base.pathname = `${pathname}/`;
  }

  return base;
}

function hashSuffix(input) {
  return crypto.createHash("sha1").update(input).digest("hex").slice(0, 8);
}

function buildLocalAssetPath(urlObj, originHost) {
  const pathname = urlObj.pathname || "/";
  const cleanedPath = pathname.replace(/^\/+/, "") || "index.html";
  const querySuffix = urlObj.search ? `__${hashSuffix(urlObj.search)}` : "";
  const ext = path.extname(cleanedPath);
  const baseName = path.basename(cleanedPath, ext);
  const dirName = path.dirname(cleanedPath);
  const rewrittenName = ext ? `${baseName}${querySuffix}${ext}` : `${baseName}${querySuffix}`;
  const relativePath = dirName === "." ? rewrittenName : path.join(dirName, rewrittenName);

  const prefix = urlObj.hostname && urlObj.hostname !== originHost ? path.join("external", urlObj.hostname) : "";
  return prefix ? path.join(prefix, relativePath) : relativePath;
}

function shouldUseArchiveFallback(urlObj, originHost, enabled) {
  if (!enabled) return false;
  return Boolean(urlObj.hostname && urlObj.hostname !== originHost);
}

function normalizeConfig(config, project) {
  if (!config.origin) {
    throw new Error(`mirror.config.json for ${project} is missing required "origin"`);
  }
  if (!Array.isArray(config.routes) || !config.routes.length) {
    throw new Error(`mirror.config.json for ${project} requires a non-empty "routes" array`);
  }

  const originHost = new URL(config.origin).hostname;
  const allowlist = Array.from(
    new Set([...(config.allowlistHosts ?? []), originHost, "localhost", "127.0.0.1"])
  );
  const assetRoots = Array.isArray(config.assetRoots) ? config.assetRoots : [...DEFAULT_ASSET_ROOTS];
  const stripPatternsRaw = config.disableDefaultStripPatterns ? config.stripPatterns ?? [] : [
    ...DEFAULT_STRIP_PATTERNS,
    ...(config.stripPatterns ?? [])
  ];

  return {
    origin: config.origin,
    originHost,
    routes: config.routes.map(normalizeRoute),
    assetRoots,
    stripPatterns: compileStripPatterns(stripPatternsRaw),
    rewriteRules: config.rewriteRules ?? [],
    blocklistHosts: config.blocklistHosts ?? [],
    allowlistHosts: allowlist,
    shareHostRewrites: { ...DEFAULT_SHARE_HOST_REWRITES, ...(config.shareHostRewrites ?? {}) },
    enableArchiveFallback: config.enableArchiveFallback ?? true,
    additionalAssets: config.additionalAssets ?? []
  };
}

function resolveMirrorConfigPath(project, providedPath) {
  return path.resolve(providedPath ?? path.join("packages", project, "mirror.config.json"));
}

async function loadMirrorConfig(project, providedPath) {
  const configPath = resolveMirrorConfigPath(project, providedPath);
  let rawConfig;
  try {
    rawConfig = JSON.parse(await fs.readFile(configPath, "utf8"));
  } catch (error) {
    throw new Error(`Failed to read config at ${configPath}: ${error.message}`);
  }

  try {
    const config = normalizeConfig(rawConfig, project);
    return { config, configPath };
  } catch (error) {
    throw new Error(`Invalid config: ${error.message}`);
  }
}

function allowedHost(urlObj, allowlist, blocklist) {
  if (blocklist.includes(urlObj.hostname)) {
    return { allowed: false, reason: "blocklist" };
  }

  if (allowlist.length && !allowlist.includes(urlObj.hostname)) {
    return { allowed: false, reason: "allowlist" };
  }

  return { allowed: true };
}

function matchesAssetRoots(pathname, assetRoots = []) {
  if (!assetRoots.length) return true;
  return assetRoots.some((root) => pathname.startsWith(root));
}

function applyRewriteRules(input, rules) {
  if (!rules?.length) return input;
  return rules.reduce((output, rule) => {
    if (!rule?.pattern) {
      return output;
    }
    const replacement = rule.replace ?? "";
    try {
      const flags = rule.flags || "g";
      const finalFlags = flags.includes("g") ? flags : `${flags}g`;
      const regex = new RegExp(rule.pattern, finalFlags);
      return output.replace(regex, replacement);
    } catch {
      return output;
    }
  }, input);
}

function rewriteLinks($, origin, route) {
  const base = buildRouteBase(origin, route);
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      return;
    }

    try {
      const resolved = new URL(href, base);
      if (resolved.origin === origin) {
        $(el).attr("href", resolved.pathname + resolved.search + resolved.hash);
      }
    } catch {
      // Ignore invalid URLs
    }
  });
}

function rewriteShareLinks($, options) {
  const rewrites = [];
  if (!options?.shareHostRewrites || !Object.keys(options.shareHostRewrites).length) {
    return rewrites;
  }

  const routeBase = buildRouteBase(options.origin, options.route);

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    let resolved;
    try {
      resolved = new URL(href, routeBase);
    } catch {
      return;
    }

    const mapped = options.shareHostRewrites[resolved.hostname];
    if (!mapped) {
      return;
    }

    const normalizedTarget = mapped.startsWith("http") ? mapped : `https://${mapped}`;
    const replacement = new URL(resolved.pathname + resolved.search + resolved.hash, normalizedTarget);
    const newValue = replacement.toString();
    if (newValue === href) {
      return;
    }
    $(el).attr("href", newValue);
    rewrites.push({ from: resolved.toString(), to: newValue });
  });

  return rewrites;
}

function stripElements($, patterns, record) {
  if (!patterns.length) return;
  $("script, link, iframe, img, source, meta").each((_, el) => {
    const snippet = $.html(el);
    if (patterns.some((pattern) => pattern.test(snippet))) {
      record.push($(el).attr("src") || $(el).attr("href") || snippet.slice(0, 80));
      $(el).remove();
    }
  });
}

function registerAsset(urlValue, options) {
  if (!urlValue || urlValue.startsWith("data:") || urlValue.startsWith("blob:") || urlValue.startsWith("#")) {
    return null;
  }

  let resolved;
  try {
    const base = options.routeBase ?? buildRouteBase(options.origin, options.route);
    resolved = new URL(urlValue, base);
  } catch {
    options.warnings.push(`Skipped invalid URL: ${urlValue}`);
    return null;
  }

  const hostCheck = allowedHost(resolved, options.allowlist, options.blocklist);
  if (!hostCheck.allowed) {
    options.warnings.push(`Blocked URL ${urlValue} (${hostCheck.reason})`);
    return null;
  }

  if (!matchesAssetRoots(resolved.pathname, options.assetRoots)) {
    options.warnings.push(`Asset outside declared roots: ${resolved.pathname}`);
  }

  const localPath = buildLocalAssetPath(resolved, options.originHost);
  const normalizedKey = resolved.toString();

  if (!options.assetMap.has(normalizedKey)) {
    options.assetMap.set(normalizedKey, {
      url: normalizedKey,
      localPath,
      fromRoute: options.route
    });
  }

  return { localPath, url: normalizedKey };
}

function rewriteAssetAttr($, el, attr, options) {
  const value = $(el).attr(attr);
  if (!value) return null;

  const isInlineRef = value.startsWith("data:") || value.startsWith("blob:") || value.startsWith("#");
  const registered = registerAsset(value, options);
  if (!registered) {
    if (!isInlineRef) {
      $(el).attr(attr, "");
    }
    return null;
  }

  const posixPath = `/${toPosixPath(registered.localPath)}`;
  $(el).attr(attr, posixPath);
  return registered;
}

function rewriteSrcSet($, el, attr, options) {
  const value = $(el).attr(attr);
  if (!value) return;
  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
  const rewritten = [];
  const registeredAssets = [];

  for (const part of parts) {
    const [urlPart, descriptor] = part.split(/\s+/, 2);
    const result = registerAsset(urlPart, options);
    if (!result) continue;
    registeredAssets.push(result);
    rewritten.push([`/${toPosixPath(result.localPath)}`, descriptor].filter(Boolean).join(" "));
  }

  if (rewritten.length) {
    $(el).attr(attr, rewritten.join(", "));
  } else {
    $(el).attr(attr, "");
  }

  return registeredAssets;
}

function rewriteAssets($, options) {
  const routeAssets = [];

  const routeBase = buildRouteBase(options.origin, options.route);
  const attrOptions = {
    origin: options.origin,
    originHost: options.originHost,
    assetRoots: options.assetRoots,
    allowlist: options.allowlist,
    blocklist: options.blocklist,
    assetMap: options.assetMap,
    warnings: options.warnings,
    route: options.route,
    routeBase
  };

  const allowedLinkRels = [
    "stylesheet",
    "preload",
    "modulepreload",
    "prefetch",
    "icon",
    "apple-touch-icon",
    "manifest"
  ];
  $("link[href]").each((_, el) => {
    const relValue = ($(el).attr("rel") || $(el).attr("ref") || "").toLowerCase();
    const relTokens = relValue.split(/\s+/).filter(Boolean);
    if (!relTokens.some((token) => allowedLinkRels.includes(token))) {
      return;
    }

    const result = rewriteAssetAttr($, el, "href", attrOptions);
    if (result) {
      routeAssets.push(result);
    }
  });

  const mappings = [
    { selector: "script[src]", attr: "src" },
    { selector: "img[src]", attr: "src" },
    { selector: "img[srcset]", attr: "srcset", isSrcset: true },
    { selector: "source[src]", attr: "src" },
    { selector: "source[srcset]", attr: "srcset", isSrcset: true },
    { selector: "video[src]", attr: "src" },
    { selector: "[data-src]", attr: "data-src" },
    { selector: "[data-srcset]", attr: "data-srcset", isSrcset: true },
    { selector: "video[poster]", attr: "poster" },
    { selector: "audio[src]", attr: "src" },
    { selector: "track[src]", attr: "src" },
    { selector: "use[href]", attr: "href" },
    { selector: "use[xlink\\:href]", attr: "xlink:href" },
    { selector: "iframe[src]", attr: "src" }
  ];

  for (const mapping of mappings) {
    $(mapping.selector).each((_, el) => {
      if (mapping.isSrcset) {
        const registered = rewriteSrcSet($, el, mapping.attr, attrOptions);
        if (registered?.length) {
          routeAssets.push(...registered);
        }
        return;
      }

      const result = rewriteAssetAttr($, el, mapping.attr, attrOptions);
      if (result) {
        routeAssets.push(result);
      }
    });
  }

  $("style").each((_, el) => {
    const css = $(el).html() || "";
    if (!css.trim()) return;
    const { css: rewritten, assets } = rewriteCssUrls(css, attrOptions);
    if (assets.length) {
      routeAssets.push(...assets);
    }
    if (rewritten !== css) {
      $(el).text(rewritten);
    }
  });

  $("[style]").each((_, el) => {
    const style = $(el).attr("style");
    if (!style) return;
    const { css: rewritten, assets } = rewriteCssUrls(style, attrOptions);
    if (assets.length) {
      routeAssets.push(...assets);
    }
    if (rewritten !== style) {
      $(el).attr("style", rewritten);
    }
  });

  return routeAssets;
}

function rewriteCssUrls(cssText, options) {
  const registeredAssets = [];
  const rewritten = cssText.replace(/url\(([^)]+)\)/g, (match, rawUrl) => {
    const cleaned = rawUrl.trim().replace(/^['"]|['"]$/g, "");
    if (!cleaned) {
      return match;
    }

    const isInlineRef =
      cleaned.startsWith("data:") ||
      cleaned.startsWith("blob:") ||
      cleaned.startsWith("#") ||
      cleaned.startsWith("%23") ||
      (cleaned.includes("%23") && !/^https?:/i.test(cleaned));
    if (isInlineRef) {
      return match;
    }
    const registered = registerAsset(cleaned, options);
    if (!registered) {
      return 'url("")';
    }

    registeredAssets.push(registered);
    return `url("/${toPosixPath(registered.localPath)}")`;
  });

  return { css: rewritten, assets: registeredAssets };
}

function rewriteMetaImages($, options) {
  const metaAssets = [];
  const routeBase = buildRouteBase(options.origin, options.route);
  $("meta[content]").each((_, el) => {
    const name = ($(el).attr("property") || $(el).attr("name") || "").toLowerCase();
    if (!META_IMAGE_KEYS.has(name)) {
      return;
    }
    const content = $(el).attr("content");
    if (!content) {
      return;
    }

    const registered = registerAsset(content, { ...options, routeBase });
    if (!registered) {
      $(el).attr("content", "");
      return;
    }

    const posixPath = `/${toPosixPath(registered.localPath)}`;
    $(el).attr("content", posixPath);
    metaAssets.push(registered);
  });

  return metaAssets;
}

function rewriteEmojiSettings($, options) {
  const registered = [];
  $("script:not([src])").each((_, el) => {
    const content = $(el).html() || "";
    if (!content.includes("concatemoji")) {
      return;
    }

    const doubleQuoted = content.match(/concatemoji"\s*:\s*"([^"]+)"/);
    const singleQuoted = content.match(/concatemoji'\s*:\s*'([^']+)'/);
    const match = doubleQuoted ?? singleQuoted;
    if (!match?.[1]) {
      return;
    }

    let resolved;
    try {
      resolved = new URL(match[1], options.origin);
    } catch {
      return;
    }

    if (resolved.hostname !== options.originHost) {
      return;
    }

    const asset = registerAsset(resolved.toString(), {
      origin: options.origin,
      originHost: options.originHost,
      assetRoots: options.assetRoots,
      allowlist: options.allowlist,
      blocklist: options.blocklist,
      assetMap: options.assetMap,
      warnings: options.warnings,
      route: options.route,
      routeBase: new URL(options.origin)
    });

    if (!asset) {
      return;
    }

    const localPath = `/${toPosixPath(asset.localPath)}`;
    const updated = content.replace(match[1], localPath);
    $(el).text(updated);
    registered.push(asset);
  });

  return registered;
}

async function writeBuffer(destination, contents) {
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, contents);
}

export {
  DEFAULT_ASSET_ROOTS,
  DEFAULT_STRIP_PATTERNS,
  DEFAULT_SHARE_HOST_REWRITES,
  buildLocalAssetPath,
  compileStripPatterns,
  loadMirrorConfig,
  resolveMirrorConfigPath,
  normalizeConfig,
  fetchWithCache,
  buildWaybackUrl,
  registerAsset,
  stripElements,
  rewriteCssUrls,
  rewriteMetaImages,
  rewriteShareLinks,
  rewriteAssets,
  rewriteEmojiSettings
};

async function main() {
  const { args } = parseArgs(process.argv.slice(2));
  if (hasFlag(args, "help") || hasFlag(args, "h")) {
    console.log("Usage: npm run mirror:fetch -- --project <name> [--config <path>] [--dry-run] [--force] [--archive-fallback=false]");
    return;
  }

  const project = typeof args.project === "string" ? args.project : null;
  if (!project) {
    console.error("Missing required --project argument (e.g. --project obys-library)");
    process.exitCode = 1;
    return;
  }

  const dryRun = hasFlag(args, "dry-run");
  let config;
  try {
    const result = await loadMirrorConfig(project, args.config);
    config = result.config;
  } catch (error) {
    console.error(`[mirror:fetch] ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const forcePromote = hasFlag(args, "force") || hasFlag(args, "force-promote");
  const archiveFallback = args["archive-fallback"] === "false" || hasFlag(args, "no-archive-fallback")
    ? false
    : config.enableArchiveFallback;

  const taskId = process.env.MCP_RUNNER_TASK_ID;
  const { repoRoot, runsRoot } = resolveEnvironmentPaths();
  if (!taskId) {
    console.warn(`[mirror:fetch] MCP_RUNNER_TASK_ID is not set; manifest will be written under ${runsRoot}/adhoc`);
  }

  const timestamp = sanitizeTimestamp(new Date().toISOString());
  const runRoot = path.join(runsRoot, taskId || "adhoc", "mirror", project);
  const runDir = path.join(runRoot, timestamp);
  const manifestPath = path.join(runDir, "manifest.json");
  const stagingDir = path.join(runDir, "staging");
  const stagingPublicDir = path.join(stagingDir, "public");
  const cacheDir = path.join(runRoot, "cache");
  const destinationPublicDir = path.resolve(repoRoot, "packages", project, "public");

  await fs.mkdir(stagingPublicDir, { recursive: true });
  await fs.mkdir(cacheDir, { recursive: true });

  const permitResult = await loadPermitFile(repoRoot);
  const permitEntry = permitResult.status === "found" ? findPermitEntry(permitResult.permit, config.origin) : null;
  const permit =
    permitResult.status === "error"
      ? { status: "unavailable", error: permitResult.error }
      : permitEntry
        ? { status: "found", entry: permitEntry }
        : { status: "missing" };

  if (permit.status === "found") {
    console.log(`[mirror:fetch] permit located for ${config.origin} (approval_id=${permit.entry?.approval_id ?? "n/a"})`);
  } else if (permit.status === "missing") {
    console.log(`[mirror:fetch] no permit entry for ${config.origin}; proceeding under assumed authority`);
  } else {
    console.warn(`[mirror:fetch] unable to read permit file: ${permit.error}`);
  }
  const warnings = [];
  const strippedElements = [];
  const manifest = {
    project,
    origin: config.origin,
    originHost: config.originHost,
    routes: config.routes,
    assetRoots: config.assetRoots,
    allowlistHosts: config.allowlistHosts,
    blocklistHosts: config.blocklistHosts,
    shareHostRewrites: config.shareHostRewrites,
    timestamp,
    taskId: taskId || null,
    dryRun,
    archiveFallback,
    forcePromote,
    stagingDir: stagingPublicDir,
    destination: destinationPublicDir,
    cacheDir,
    permit,
    routesProcessed: [],
    assetsWritten: [],
    warnings
  };

  const assetMap = new Map();
  let fatalError = null;
  let hasErrors = false;

  try {
    for (const route of config.routes) {
      const routeUrl = new URL(route, config.origin).toString();
      let response;
      try {
        response = await fetchWithCache(routeUrl, cacheDir, { fallbackBuilder: null });
      } catch (error) {
        warnings.push(`Failed to fetch ${routeUrl}: ${error.message}`);
        hasErrors = true;
        manifest.routesProcessed.push({ route, status: "error", error: error.message });
        continue;
      }

      if (response.status >= 400) {
        warnings.push(`Received status ${response.status} for ${routeUrl}`);
        hasErrors = true;
        manifest.routesProcessed.push({ route, status: response.status });
        continue;
      }

      const html = Buffer.from(response.body).toString("utf8");
      const $ = cheerio.load(html, { decodeEntities: false });
      rewriteLinks($, config.origin, route);
      const shareRewrites = rewriteShareLinks($, {
        origin: config.origin,
        route,
        shareHostRewrites: config.shareHostRewrites
      });
      stripElements($, config.stripPatterns, strippedElements);
      const routeAssets = rewriteAssets($, {
        origin: config.origin,
        originHost: config.originHost,
        assetRoots: config.assetRoots,
        allowlist: config.allowlistHosts,
        blocklist: config.blocklistHosts,
        assetMap,
        warnings,
        route
      });
      const metaAssets = rewriteMetaImages($, {
        origin: config.origin,
        originHost: config.originHost,
        assetRoots: config.assetRoots,
        allowlist: config.allowlistHosts,
        blocklist: config.blocklistHosts,
        assetMap,
        warnings,
        route
      });
      const emojiAssets = rewriteEmojiSettings($, {
        origin: config.origin,
        originHost: config.originHost,
        assetRoots: config.assetRoots,
        allowlist: config.allowlistHosts,
        blocklist: config.blocklistHosts,
        assetMap,
        warnings,
        route
      });

      if (shareRewrites.length) {
        manifest.shareLinkRewrites = manifest.shareLinkRewrites ?? [];
        manifest.shareLinkRewrites.push(
          ...shareRewrites.map((entry) => ({ route, from: entry.from, to: entry.to }))
        );
      }

      if (metaAssets.length) {
        routeAssets.push(...metaAssets);
      }

      if (emojiAssets.length) {
        routeAssets.push(...emojiAssets);
      }

      let outputHtml = $.html();
      outputHtml = outputHtml.replaceAll(config.origin, "");
      outputHtml = applyRewriteRules(outputHtml, config.rewriteRules);

      const outputPath = routeToOutputPath(stagingPublicDir, route);
      await writeBuffer(outputPath, outputHtml);

      manifest.routesProcessed.push({
        route,
        status: response.status,
        assets: routeAssets.map((asset) => ({ url: asset.url, localPath: asset.localPath })),
        outputPath
      });
    }

    if (config.additionalAssets.length) {
      console.log(`[mirror:fetch] processing ${config.additionalAssets.length} additional assets...`);
      for (const assetUrl of config.additionalAssets) {
        const fullUrl = assetUrl.startsWith("http") ? assetUrl : new URL(assetUrl, config.origin).toString();
        registerAsset(fullUrl, {
          origin: config.origin,
          originHost: config.originHost,
          assetRoots: config.assetRoots,
          allowlist: config.allowlistHosts,
          blocklist: config.blocklistHosts,
          assetMap,
          warnings,
          route: "/" // attributed to root
        });
      }
    }

    for (const asset of assetMap.values()) {
      const assetUrl = new URL(asset.url);
      const useArchiveFallback = shouldUseArchiveFallback(assetUrl, config.originHost, archiveFallback);
      let response;
      try {
        response = await fetchWithCache(asset.url, cacheDir, {
          fallbackBuilder: useArchiveFallback ? buildWaybackUrl : null
        });
      } catch (error) {
        const suffix = useArchiveFallback ? " (wayback attempted)" : "";
        warnings.push(`Failed to fetch asset ${asset.url}${suffix}: ${error.message}`);
        hasErrors = true;
        continue;
      }

      if (response.status >= 400) {
        warnings.push(`Asset ${asset.url} returned ${response.status}`);
        hasErrors = true;
        continue;
      }

      if (response.source === "wayback" && !response.fromCache) {
        warnings.push(`Asset ${asset.url} fulfilled via web archive (${response.resolvedUrl})`);
      }

      const headers = response.headers || {};
      const contentType = headers["content-type"] || headers["Content-Type"] || "";
      const isCss = /text\/css/i.test(contentType) || /\.css(\?|$)/i.test(asset.url);
      const isTextLike = /text|javascript|json|xml|svg/.test(contentType) || isCss;
      let contents = response.body;

      if (isTextLike) {
        let text = Buffer.from(response.body).toString("utf8");
        if (isCss) {
          const cssResult = rewriteCssUrls(text, {
            origin: config.origin,
            originHost: config.originHost,
            assetRoots: config.assetRoots,
            allowlist: config.allowlistHosts,
            blocklist: config.blocklistHosts,
            assetMap,
            warnings,
            route: asset.fromRoute,
            routeBase: new URL(asset.url)
          });
          text = cssResult.css;
        }

        // Generic rewrite for all known assets (crucial for JS files referencing external assets)
        // We do this for all text files to catch references in JS, JSON, etc.
        for (const [knownUrl, knownAsset] of assetMap.entries()) {
          if (knownUrl === asset.url) continue; // Don't replace self
          // Replace absolute URL with local path
          const localRef = `/${toPosixPath(knownAsset.localPath)}`;
          text = text.replaceAll(knownUrl, localRef);
        }

        text = text.replaceAll(config.origin, "");
        text = applyRewriteRules(text, config.rewriteRules);
        contents = Buffer.from(text);
      }

      let destination;
      try {
        destination = resolveInside(stagingPublicDir, asset.localPath, "assets");
      } catch (error) {
        warnings.push(error.message);
        hasErrors = true;
        continue;
      }

      await writeBuffer(destination, contents);
      manifest.assetsWritten.push({
        url: asset.url,
        localPath: asset.localPath,
        fromCache: Boolean(response.fromCache),
        status: response.status,
        resolvedUrl: response.resolvedUrl,
        fetchedFrom: response.source,
        fallbackAttempted: Boolean(response.fallbackAttempted),
        contentType,
        fromRoute: asset.fromRoute
      });
    }

    manifest.stripped = strippedElements;

    if (!dryRun) {
      if (hasErrors && !forcePromote) {
        manifest.promotion = { status: "skipped", reason: "errors present without --force" };
        console.warn("[mirror:fetch] errors detected; skipping promotion to packages/<project>/public (use --force to override)");
      } else {
        await fs.rm(destinationPublicDir, { recursive: true, force: true });
        await fs.mkdir(path.dirname(destinationPublicDir), { recursive: true });
        await fs.cp(stagingPublicDir, destinationPublicDir, { recursive: true });
        manifest.promotion = { status: "promoted", destination: destinationPublicDir };
      }
    } else {
      manifest.promotion = { status: "dry-run" };
      console.log("[mirror:fetch] dry-run enabled; staged output not promoted to public/");
    }

    manifest.status = hasErrors ? "incomplete" : "ok";
    if (hasErrors) {
      process.exitCode = 1;
    }
  } catch (error) {
    fatalError = error;
    warnings.push(`fatal: ${error.message}`);
    manifest.status = "failed";
    process.exitCode = 1;
  }

  try {
    await writeBuffer(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`[mirror:fetch] wrote manifest to ${manifestPath}`);
    console.log(
      `[mirror:fetch] reminder: Run npm run mirror:check -- --project ${project} and rg 'https://' packages/${project}/public/index.html to spot lingering externals.`
    );
  } catch (error) {
    console.error(`[mirror:fetch] failed to write manifest to ${manifestPath}: ${error.message}`);
    process.exitCode = 1;
  }

  if (fatalError) {
    console.error("[mirror:fetch] failed", fatalError);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("[mirror:fetch] unexpected failure", error);
    process.exitCode = 1;
  });
}

import * as cheerio from "cheerio";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_ASSET_ROOTS,
  DEFAULT_SHARE_HOST_REWRITES,
  buildWaybackUrl,
  fetchWithCache,
  normalizeConfig,
  rewriteCssUrls,
  rewriteAssets,
  rewriteEmojiSettings,
  rewriteMetaImages,
  rewriteShareLinks,
  stripElements
} from "../scripts/mirror-site.mjs";

describe("mirror-site defaults and rewrites", () => {
  it("applies WordPress asset root defaults when assetRoots are missing", () => {
    const config = normalizeConfig({ origin: "https://example.test", routes: ["/"] }, "example");
    expect(config.assetRoots).toEqual(DEFAULT_ASSET_ROOTS);
  });

  it("registers font URLs discovered inside CSS", () => {
    const assetMap = new Map();
    const warnings = [];
    const css = '@font-face { src: url("/wp-content/fonts/sample.woff2") format("woff2"); }';
    const result = rewriteCssUrls(css, {
      origin: "https://example.test",
      originHost: "example.test",
      assetRoots: DEFAULT_ASSET_ROOTS,
      allowlist: ["example.test"],
      blocklist: [],
      assetMap,
      warnings,
      route: "/",
      routeBase: new URL("https://example.test/wp-content/themes/theme.css")
    });

    expect(result.assets).toHaveLength(1);
    expect(result.css).toContain('url("/wp-content/fonts/sample.woff2")');
    const asset = result.assets[0];
    expect(asset.localPath).toContain("wp-content/fonts/sample");
    expect(assetMap.get(asset.url)).toBeDefined();
  });

  it("rewrites concatemoji to a local path when hosted on the origin", () => {
    const assetMap = new Map();
    const warnings = [];
    const $ = cheerio.load(
      '<script>window._wpemojiSettings={"source":{"concatemoji":"https://example.test/wp-includes/js/wp-emoji-release.min.js?ver=6.4.1"}};</script>'
    );
    const assets = rewriteEmojiSettings($, {
      origin: "https://example.test",
      originHost: "example.test",
      assetRoots: DEFAULT_ASSET_ROOTS,
      allowlist: ["example.test"],
      blocklist: [],
      assetMap,
      warnings,
      route: "/"
    });

    const scriptContent = $("script").html() || "";
    expect(assets).toHaveLength(1);
    expect(scriptContent).toMatch(/concatemoji":"\/wp-includes\/js\/wp-emoji-release\.min__.+\.js"/);
    expect(assetMap.size).toBe(1);
  });

  it("strips tracker patterns by default", () => {
    const config = normalizeConfig({ origin: "https://example.test", routes: ["/"] }, "example");
    const stripped = [];
    const $ = cheerio.load(
      '<script src="https://www.googletagmanager.com/gtag/js?id=123"></script><link href="https://metricool.com" />'
    );

    stripElements($, config.stripPatterns, stripped);

    expect(stripped.length).toBeGreaterThan(0);
    expect($.html()).not.toContain("googletagmanager");
  });

  it("strips facebook tracker host but not local assets containing the word", () => {
    const config = normalizeConfig({ origin: "https://example.test", routes: ["/"] }, "example");
    const stripped = [];
    const $ = cheerio.load(
      '<script src="https://connect.facebook.net/en_US/fbevents.js"></script><img src="/wp-content/uploads/facebook-icon.svg" />'
    );

    stripElements($, config.stripPatterns, stripped);

    expect(stripped).toContain("https://connect.facebook.net/en_US/fbevents.js");
    expect($.html()).toContain("facebook-icon.svg");
  });

  it("rewrites meta image tags to local assets for og/twitter", () => {
    const assetMap = new Map();
    const warnings = [];
    const $ = cheerio.load(
      '<head><meta property="og:image" content="https://cdn.example.com/img/hero.png" /><meta name="twitter:image" content="/wp-content/uploads/twitter.png" /></head>'
    );
    const assets = rewriteMetaImages($, {
      origin: "https://example.test",
      originHost: "example.test",
      assetRoots: DEFAULT_ASSET_ROOTS,
      allowlist: ["example.test", "cdn.example.com"],
      blocklist: [],
      assetMap,
      warnings,
      route: "/"
    });

    expect(assets).toHaveLength(2);
    expect($('meta[property="og:image"]').attr("content")).toBe("/external/cdn.example.com/img/hero.png");
    expect($('meta[name="twitter:image"]').attr("content")).toMatch(/^\/wp-content\/uploads\/twitter/);
  });

  it("rewrites facebook share links to fb.com while preserving path/query", () => {
    const $ = cheerio.load(
      '<div><a class="share" href="https://www.facebook.com/share.php?u=https://example.test/page">Share</a></div>'
    );
    const rewrites = rewriteShareLinks($, {
      origin: "https://example.test",
      route: "/",
      shareHostRewrites: DEFAULT_SHARE_HOST_REWRITES
    });

    expect(rewrites).toHaveLength(1);
    expect($("a.share").attr("href")).toContain("https://fb.com/share.php?u=https://example.test/page");
  });

  it("captures assets inside inline style attributes", () => {
    const assetMap = new Map();
    const warnings = [];
    const $ = cheerio.load('<div style="background:url(https://example.test/wp-content/bg.jpg)"></div>');
    const assets = rewriteAssets($, {
      origin: "https://example.test",
      originHost: "example.test",
      assetRoots: DEFAULT_ASSET_ROOTS,
      allowlist: ["example.test"],
      blocklist: [],
      assetMap,
      warnings,
      route: "/"
    });

    expect(assets).toHaveLength(1);
    expect($("div").attr("style")).toContain("/wp-content/bg.jpg");
    expect(assetMap.size).toBe(1);
  });

  it("falls back to wayback when the primary fetch fails", async () => {
    const cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), "mirror-cache-"));
    const fetchLog = [];
    const fakeFetch = async (url) => {
      fetchLog.push(url);
      if (!url.includes("web.archive.org")) {
        throw new Error("primary down");
      }
      return {
        status: 200,
        headers: new Map([["content-type", "text/plain"]]),
        arrayBuffer: async () => Buffer.from("ok")
      };
    };

    const result = await fetchWithCache("https://primary.example/asset.js", cacheDir, {
      fetchImpl: fakeFetch,
      fallbackBuilder: buildWaybackUrl
    });

    expect(result.fallback).toBe(true);
    expect(result.resolvedUrl).toContain("web.archive.org");
    expect(fetchLog.some((entry) => entry.includes("primary.example"))).toBe(true);
    await fs.rm(cacheDir, { recursive: true, force: true });
  });
});

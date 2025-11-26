import * as cheerio from "cheerio";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_ASSET_ROOTS,
  normalizeConfig,
  rewriteCssUrls,
  rewriteEmojiSettings,
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
});

# Pixel-Perfect Local Clones

Use the mirror tooling to keep hi-fi site clones fully featured while staying offline-safe.

## Permits & Config
- Check `compliance/permit.json` for the origin; if a record exists it’s logged and honored, and if absent the fetch proceeds assuming authority.
- Define the mirror in `packages/<project>/mirror.config.json` (origin, explicit `routes` list, `assetRoots`, `stripPatterns` for trackers/SW, `rewriteRules`, `blocklistHosts`/`allowlistHosts`, optional `shareHostRewrites`); include tracker `stripPatterns` + `blocklistHosts` you’ve seen in the live site. See `reference/mirror.config.wp.example.json` for a WordPress-friendly template with defaults and host allowlists.
- Export `MCP_RUNNER_TASK_ID=<task>` so manifests land under `.runs/<task>/mirror/<project>/<timestamp>/`.

## Pre-flight Checklist
- Pre-scan the live HTML/CSS with `rg`/`curl` for tracker hosts and query-suffixed assets so you can block them up front.
- Set WP-friendly `assetRoots` (`/wp-content`, `/wp-includes`, `/`) and mirror @font-face URLs plus the emoji loader.
- After fetch, run `rg "https://"` on `packages/<project>/public/index.html` (and other HTML if present) to surface lingering absolute hosts.
- Finish with `npm run mirror:check -- --project <name>` to confirm no outbound calls, trackers, or traversal/range regressions.

## Fetch the Mirror
- `npm run mirror:fetch -- --project <name> [--dry-run] [--force]`
  - Pulls only the configured routes (no crawling), strips tracker/analytics/service-worker code via `stripPatterns`, rewrites externals to `/external/<host>/...`, localizes OG/twitter preview images, and rewrites share links off tracker-heavy hosts while keeping UI behavior.
  - Non-origin assets fall back to Web Archive when the primary host fails; cached bodies are scoped per project under `.runs/<task>/mirror/<project>/cache`. Promotion is skipped on errors unless `--force` is set; staged files live under `.runs/<task>/mirror/<project>/<timestamp>/staging` before being promoted to `packages/<project>/public`.
  - Each run logs `.runs/<task>/mirror/<project>/<timestamp>/manifest.json` with routes, assets, cache hits, fallbacks, share rewrites, and warnings.
- After fetch, generate a style fingerprint so downstream apps can reuse the look/feel:
  - `npm run mirror:fingerprint -- --project <name> [--outDir docs/reference]`
  - Outputs `<project>-style-profile.json` + `<project>-style.md` summarizing fonts, palette, spacing, motion, backgrounds, component silhouettes, and do-not-copy notes.

## Serve Locally (Local Mirror)
- `npm run mirror:serve -- --project <name> --port <port> [--csp self|strict|off] [--no-range]`
- Shared harness enforces traversal guards, HTML no-cache + immutable assets, optional CSP header (default `self data: blob:`), optional byte-range support for media, and blocks directory listings so mirrors stay production-like.

## Automated Health Check
- `npm run mirror:check -- --project <name> [--port <port>]`
  - Spins up the mirror server when needed and asserts 200s for all configured routes.
  - Blocks outbound hosts not in the allowlist and fails on tracker strings (gtag/gtm/analytics/hotjar/facebook/clarity/etc.), absolute `https://` references, or unresolved asset URLs.
  - Keep this opt-in; run it when `packages/<project>/public` changes or before publishing artifacts.

## Final Guardrails
- Mirrors should remain fully featured and offline-ready (immutable assets, Range support, no trackers/SW).
- Before review run: `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`. Attach the latest mirror manifest path when updating task docs.

## Troubleshooting & Best Practices
- **Ad/tracker blockers:** Localhost mirrors can be broken by ad blockers (common when we strip GA/TikTok). If you see “client-side exception” with no 404s, retry in incognito or disable blockers.
- **Worker chunks:** Next/React apps often load small worker chunks (e.g., `_next/static/chunks/825...js`). Missing workers cause silent failures. After fetch, `rg "_next/static/chunks"` and confirm every referenced file exists in `public/_next/static/chunks`.
- **Numbered sequences:** Hero sequences frequently ship as hundreds of padded frames (`00000.avif` etc.). If you see a burst of 404s for `/images/sequence/.../00xxx.avif`, bulk-download the whole range (desktop/tablet/mobile) before serving.
- **Video codecs:** Headless Chromium may warn `NotSupportedError: The element has no supported sources` even when real browsers play the MP4. Verify in a real browser before treating it as a blocker.
- **Preload hints:** Keep preloaded assets local (OG/Twitter images, hero video, displacement maps, stage images) so `<link rel="preload">` doesn’t point at 404s.
- **Brittle vendor calls:** Guard optional chains in vendor bundles (e.g., GSAP timelines with `.kill()`) and bypass custom image loaders when they still try to reach the origin.
- **Style fingerprints:** If the design will be reused, always run `npm run mirror:fingerprint -- --project <name>` and attach the resulting `style-profile.json` / `style.md` in handoffs.
- **CDN Allowlisting:** Always check the network tab or source code for external asset hosts (e.g., `cdn.prod.website-files.com`, `cloudfront.net`) and add them to `allowlistHosts` in `mirror.config.json`. Strict allowlists cause missing assets.
- **Percent-encoded filenames:** Webflow and some CDNs emit filenames with `%20`/`%40` etc., but browsers request the decoded form. After fetch, run a quick decoder to rename files (`find ... -name '*%*'` or a small `path.rename(unquote(path.name))` script) so images don’t 404. Keep asset URLs absolute-from-root (`/external/...`) and serve from the site root; subpath or `file://` serving will break those references.
- **Tracker Sanitization:**
  - Use `stripPatterns` for broad blocking.
  - For stubborn inline scripts, use `rewriteRules` with regex.
  - You can now use flags in rewrite rules for case-insensitive matching:
    ```json
    {
      "pattern": "gtag",
      "replace": "void",
      "flags": "gi"
    }
    ```
  - If automated rewriting fails, use `sed` or `perl` as a final sanitization step: `find packages/<project>/public -name "*.js" -exec perl -pi -e 's/gtag/void/ig' {} +`.
- **CSS Inlining:** `mirror:fingerprint` can extract inlined CSS from HTML files. Ensure the HTML file exists in `public/` before running the fingerprint command.
- **Desktop-vs-mobile gaps:** If a section is blank only on desktop, look for missing 3D/canvas assets or CSP blocks that mobile fallbacks avoid. Check the console for 404s on split chunks and CSP violations before debugging app logic.
- **Local decoders:** Bundle third-party decoders (e.g., Draco wasm/js) into `/public` and point loaders at those paths. If remote fallbacks remain, whitelist the host in CSP/allowlist.
- **CSP alignment:** Default `self` CSP may break Pixi/Draco. Permit `blob:`/`data:` for connect/worker, and add `unsafe-eval` only when required by the runtime. Keep the policy as tight as possible otherwise.

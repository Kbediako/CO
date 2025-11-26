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

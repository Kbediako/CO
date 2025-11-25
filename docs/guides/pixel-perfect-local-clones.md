# Pixel-Perfect Local Clones

Use the mirror tooling to keep hi-fi site clones fully featured while staying offline-safe.

## Permits & Config
- Check `compliance/permit.json` for the origin; if a record exists it’s logged and honored, and if absent the fetch proceeds assuming authority.
- Define the mirror in `packages/<project>/mirror.config.json` (origin, explicit `routes` list, `assetRoots`, `stripPatterns` for trackers/SW, `rewriteRules`, `blocklistHosts`/`allowlistHosts`).
- Export `MCP_RUNNER_TASK_ID=<task>` so manifests land under `.runs/<task>/mirror/<timestamp>/`.

## Fetch the Mirror
- `npm run mirror:fetch -- --project <name> [--dry-run]`
  - Pulls only the configured routes (no crawling), strips tracker/analytics/service-worker code via `stripPatterns`, rewrites externals to local paths, and replaces origin URLs with local equivalents.
  - Idempotent cached downloads live under `.runs/<task>/mirror/cache`; files are staged into `.runs/<task>/mirror/<timestamp>/staging` before being promoted to `packages/<project>/public` (skips promotion when `--dry-run`).
  - Each run logs `.runs/<task>/mirror/<timestamp>/manifest.json` with routes, assets, cache hits, and warnings.

## Serve Locally (Local Mirror)
- `npm run mirror:serve -- --project <name> --port <port> [--csp self|strict|off] [--no-range]`
- Shared harness enforces traversal guards, HTML no-cache + immutable assets, optional CSP header (default `self data: blob:`), optional byte-range support for media, and blocks directory listings so mirrors stay production-like.

## Automated Health Check
- `npm run mirror:check -- --project <name> [--port <port>]`
  - Spins up the mirror server when needed and asserts 200s for all configured routes.
  - Blocks outbound hosts not in the allowlist and fails on tracker strings (`gtag`, `google-analytics`, `facebook`, `hotjar`) or unresolved asset URLs.
  - Keep this opt-in; run it when `packages/<project>/public` changes or before publishing artifacts.

## Final Guardrails
- Mirrors should remain fully featured and offline-ready (immutable assets, Range support, no trackers/SW).
- Before review run: `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`. Attach the latest mirror manifest path when updating task docs.

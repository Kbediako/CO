# Abetka Mirror

Local, tracker-free mirror of https://abetkaua.com/en/ for HiFi toolkit testing. Static output lives in `packages/abetkaua/public`.

## Run Locally
- Refresh the mirror (keeps per-project cache, Web Archive fallback for externals): `npm run mirror:fetch -- --project abetkaua`
- Serve the site: `npm run mirror:serve -- --project abetkaua --port 4173`
- Optional: set `MCP_RUNNER_TASK_ID=abetkaua` before mirror commands to route manifests.

## Validation Commands
- `rg "https://" packages/abetkaua/public`
- `npm run mirror:check -- --project abetkaua`
- `npm run lint`
- `npm run test`
- `npm run eval:test`
- `node scripts/spec-guard.mjs --dry-run`
- `printf '4\n' | npm run review`

## Assets & Notes
- The upstream CMS host `abetka-strapi.onrender.com` was returning 503/429, so all `/external/abetka-strapi.onrender.com/**` assets were backfilled from Wayback snapshots and stored locally. Web Archive fallback is now built in for non-origin assets; reruns will prefer cache and skip promotion on errors unless `--force` is set.
- OG preview images now point to local assets to prevent external fetches.
- Tracker/service worker snippets are stripped via `mirror.config.json` (`gtag`, `googletagmanager`, `serviceWorker`, etc.), and share links are rewritten off `facebook.com` to reduce tracker domains.

## Manifests
- Mirror fetch (legacy path): `.runs/abetkaua/mirror/2025-11-26T02-15-46.050Z/manifest.json` (status incomplete upstream 503; assets patched locally). New runs will land under `.runs/abetkaua/mirror/abetkaua/<timestamp>/manifest.json`.
- Review: `.runs/0101/2025-11-26T02-50-23-598Z-fbf8c18f/manifest.json`.

# Slimdown Audit Findings (0101-slimdown-audit)

## Evidence-backed findings
Completed phases 1-7 removed wrapper scripts, doc helpers, pack helpers, devtools pipeline duplicates, guardrail stage sets, mirror/permit overlap, adapter defaults, and slugify drift.

Phase 8 consolidations executed:
- Shared docs-review checks stage-set (`docs:check` + `docs:freshness`) across `docs-review` + `implementation-gate`.
- Status UI serving now reuses the shared static file handler in `scripts/lib/mirror-server.mjs`.
- Fallback diagnostics pipeline definition removed; diagnostics pipeline is sourced from `codex.orchestrator.json`.
- Script-side repo/runs/out resolution now flows through `scripts/lib/run-manifests.js` (design context + status UI).

Phase 9 consolidation executed:
- Orchestrator env resolution now uses shared run-manifests helpers (`resolveEnvironmentPaths`, `listDirectories`); status UI build/serve, run-review defaults, and ExperienceStore defaults honor the same resolver, and the helpers ship in `dist/`.

Phase 10 consolidation executed:
- Spec-guard, mirror fetch, and design purge/tasks archive now reuse shared helpers (`scripts/lib/docs-helpers.js`, `scripts/lib/run-manifests.js`).

Phase 11 consolidation executed:
- Status UI dataset build now reuses the shared `normalizeTaskKey` helper.

Phase 12 consolidation executed:
- Run-review + mirror tooling (fetch/check/serve/style-fingerprint) now reuse shared repo/run resolvers for run locations and public paths; docs tooling + guardrail runners now use shared repo/out resolvers (`scripts/docs-hygiene.ts`, docs archive/freshness scripts, spec-guard runner) and CLI persistence outputs honor env roots.

Phase 13 consolidation executed:
- Remaining script-side env resolver call sites (mirror/docs/guardrail/design helpers + spec-guard runner) now route through `resolveEnvironmentPaths`.

Phase 14 consolidation executed:
- Docs tooling now reuses the shared `pathExists` helper for path checks, reducing per-script duplication.

## Usage signals (still referenced)
- `scripts/status-ui-build.mjs` is referenced by `scripts/status-ui-serve.mjs` and `docs/TECH_SPEC-orchestrator-status-ui.md` (do not remove; only consolidate helpers).

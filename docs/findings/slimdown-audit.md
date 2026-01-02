# Slimdown Audit Findings (0101-slimdown-audit)

## Evidence-backed findings
Completed phases 1-7 removed wrapper scripts, doc helpers, pack helpers, devtools pipeline duplicates, guardrail stage sets, mirror/permit overlap, adapter defaults, and slugify drift.

Phase 8 consolidations executed:
- Shared docs-review checks stage-set (`docs:check` + `docs:freshness`) across `docs-review` + `implementation-gate`.
- Status UI serving now reuses the shared static file handler in `scripts/lib/mirror-server.mjs`.
- Fallback diagnostics pipeline definition removed; diagnostics pipeline is sourced from `codex.orchestrator.json`.
- Script-side repo/runs/out resolution now flows through `scripts/lib/run-manifests.js` (design context + status UI).

Phase 9 consolidation executed:
- Orchestrator env resolution now reuses `scripts/lib/run-manifests.js` and ships the resolver in `dist/`.

Phase 10 consolidation executed:
- Spec-guard, mirror fetch, and design purge/tasks archive now reuse shared helpers (`scripts/lib/docs-helpers.js`, `scripts/lib/run-manifests.js`).

Phase 11 consolidation executed:
- Status UI dataset build now reuses the shared `normalizeTaskKey` helper.

Phase 12 consolidation executed:
- `scripts/run-review.ts` + `scripts/mirror-site.mjs` now reuse `resolveRepoRoot` / `resolveRunsDir` for run locations.
- Docs archive/freshness tooling now uses `resolveOutDir` (`scripts/docs-freshness.mjs`, `scripts/tasks-archive.mjs`, `scripts/implementation-docs-archive.mjs`).

## Remaining opportunities
None logged at this time; continue scanning for additional duplication and resolver drift.

## Usage signals (still referenced)
- `scripts/status-ui-build.mjs` is referenced by `scripts/status-ui-serve.mjs` and `docs/TECH_SPEC-orchestrator-status-ui.md` (do not remove; only consolidate helpers).

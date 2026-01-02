# Slimdown Audit Findings (0101-slimdown-audit)

## Evidence-backed findings
Completed phases 1-7 removed wrapper scripts, doc helpers, pack helpers, devtools pipeline duplicates, guardrail stage sets, mirror/permit overlap, adapter defaults, and slugify drift.

Phase 8 consolidations executed:
- Shared docs-review checks stage-set (`docs:check` + `docs:freshness`) across `docs-review` + `implementation-gate`.
- Status UI serving now reuses the shared static file handler in `scripts/lib/mirror-server.mjs`.
- Fallback diagnostics pipeline definition removed; diagnostics pipeline is sourced from `codex.orchestrator.json`.
- Script-side repo/runs/out resolution now flows through `scripts/lib/run-manifests.js` (design context + status UI).

## Remaining opportunities
- If needed, consider unifying the orchestrator resolver (`orchestrator/src/cli/run/environment.ts`) with `scripts/lib/run-manifests.js` to remove the last parallel path resolver.

## Usage signals (still referenced)
- `scripts/status-ui-build.mjs` is referenced by `scripts/status-ui-serve.mjs` and `docs/TECH_SPEC-orchestrator-status-ui.md` (do not remove; only consolidate helpers).

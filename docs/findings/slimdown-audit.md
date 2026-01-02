# Slimdown Audit Findings (0101-slimdown-audit)

## Evidence-backed findings
Completed phases 1-7 removed wrapper scripts, doc helpers, pack helpers, devtools pipeline duplicates, guardrail stage sets, mirror/permit overlap, adapter defaults, and slugify drift. Remaining duplication targets:

- Pipeline definitions also exist in code for fallback behavior.
  - `orchestrator/src/cli/pipelines/index.ts` defines `fallbackDiagnosticsPipeline`, which overlaps the `diagnostics` pipeline in `codex.orchestrator.json`.
- Docs-review tail stages are duplicated across pipelines.
  - `docs-review` and `implementation-gate` both repeat `docs:check`, `docs:freshness`, `diff-budget`, and `review` stages.
- Static file server logic is duplicated between the status UI and mirror tooling.
  - `scripts/status-ui-serve.mjs` reimplements static serving and content-type mapping already present in `scripts/lib/mirror-server.mjs`.
- Repo/run/out path resolution is duplicated across orchestrator + scripts + design tooling.
  - `orchestrator/src/cli/run/environment.ts`, `scripts/lib/run-manifests.js`, `scripts/status-ui-serve.mjs`, and `scripts/design/pipeline/context.ts` each resolve roots with slightly different env fallbacks.

## Quick wins (low risk)
- Extract a shared docs-review tail stage-set to remove repeated docs-check/docs-freshness/diff-budget/review blocks.
- Reuse static file serving helpers between status UI and mirror tooling to avoid drift.
- Centralize repo/runs/out path resolution to avoid env fallback mismatches.

## Usage signals (still referenced)
- `scripts/status-ui-build.mjs` is referenced by `scripts/status-ui-serve.mjs` and `docs/TECH_SPEC-orchestrator-status-ui.md` (do not remove; only consolidate helpers).

## Deeper refactors (moderate risk)
- Remove or centralize the fallback diagnostics pipeline definition.
- Unify repo/run/out path resolution across orchestrator + scripts + design tooling.
- Reuse static file server helpers in status UI serve while preserving refresh-on-request behavior.

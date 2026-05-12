# TECH_SPEC Mirror - CO-522 docs:freshness:maintain owner rehome

This mirror follows `tasks/specs/linear-b642e879-ba50-45ef-b0d9-b059afa9e932.md`.

## Scope
- Re-home `docs:freshness:maintain` owner metadata from terminal `CO-511` to live `CO-522`.
- Preserve `canonical_owner_key=docs:freshness:maintain` and marker `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`.
- Preserve baseline evidence: `configured_owner_terminal`, `issue_state=Done`, `blocking_changed_paths=[]`, `freshness_decision=block_diff_local`, stale docs, and registry rows.
- Keep CO-514 provider-worker manifest serialization out of scope.

## Acceptance Criteria
- [x] CO-522 is the usable live same-project owner.
- [x] `docs:freshness:maintain -- --format json` no longer reports `configured_owner_terminal` for the canonical owner key.
- [x] Stale cohort evidence remains visible and owner-routed.
- [x] `docs:freshness` and spec-guard are not weakened.

## Validation
- Before and after `docs:freshness:maintain -- --format json`.
- `node scripts/spec-guard.mjs --dry-run`.
- `npm run docs:freshness`.
- `npm run docs:check`.

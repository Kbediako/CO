# ACTION_PLAN - CO-474 Ready Accepted/No-Run Revalidation Recovery

## Goal
Make explicit `control-host recover` / relaunch / nudge for a `Ready issue` in `accepted/no-run` `provider_issue_rehydration_pending_revalidation` state either start with run manifest provenance or fail fast before `request timeout 120000ms`.

## Guardrails
- Preserve protected terms: `CO-470`, `CO-472`, `control-host recover`, `Ready issue`, `accepted/no-run`, `provider_issue_rehydration_pending_revalidation`, `run_id=null`, `run_manifest_path=null`, `launch_started_at=null`, `request timeout 120000ms`.
- Do not implement CO-470 fixture-env cleanup, rewrite CO-472, manually edit `provider-intake-state.json`, relax admission caps, or directly start `provider-linear-worker`.
- Micro-task path is unavailable because exact recovery semantics, fallback removal, and adjacent CO-472 preservation define correctness.

## Sequence
1. Accept docs packet and record workpad evidence.
2. Reproduce the accepted/no-run pending-revalidation shape from CO-470 artifacts or a focused fixture.
3. Inspect `ProviderIssueHandoff`, control-host recovery lifecycle, and admission occupancy for no-run claims.
4. Implement the smallest recovery lifecycle change that bounds active waits, preserves launch provenance, retries/fails deterministically, and avoids stale no-run capacity occupancy.
5. Add focused tests for recover/relaunch/nudge, active refresh wait, stranded recovery retry, slow launch, retry deadline, stale queued cleanup, skipped diagnostics, and manifestless stale starting retry.
6. Run required validation, standalone review, elegance review, PR attach, ready-review drain, and Linear review handoff.

## Validation
- Focused ProviderIssueHandoff/control-server lifecycle regressions.
- `node scripts/delegation-guard.mjs`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run docs:check`
- `npm run docs:freshness`
- `npm run repo:stewardship`
- `node scripts/diff-budget.mjs`
- Manifest-backed standalone review and explicit elegance pass.
- `npm run pack:smoke` because control-host/package behavior is touched.

## Rollback
If duplicate-launch safety, CO-472 adjacency, or deterministic fail-fast evidence cannot be preserved, revert source changes and keep this packet as evidence for a wider owner issue.

# ACTION_PLAN - CO Reduce Review Long Tails and Make Review Evidence Accounting Truthful

## Added by Bootstrap (refresh as needed)

## Traceability
- Linear issue: `CO-16` / `1ea6b7f9-ff6f-42b6-af83-a77dce870514`
- Linear URL: https://linear.app/asabeko/issue/CO-16/co-reduce-review-long-tails-and-make-review-evidence-accounting

## Summary
- Goal: Finish Linear issue `CO-16` by reducing low-yield bounded diff-review tails, making review evidence accounting truthful for gate consumers, and tightening large-scope review intent handling.
- Scope: docs-first packet, one persistent Linear workpad, pre-implementation docs-review, bounded review-runtime/state/accounting changes, focused tests, full validation, PR prep, and review handoff.
- Assumptions:
  - the live team review handoff state is `In Review`
  - current truthfulness drift is real and is already evidenced by recent manifest/run-summary versus telemetry mismatch
  - subagent spawning remains unavailable in-session, so delegation must be explicitly overridden

## Milestones & Sequencing
1) Register the docs-first packet for `linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514`, update `tasks/index.json`, update `docs/TASKS.md`, update freshness registry entries, and create the persistent `## Codex Workpad` comment.
2) Run docs-review with an explicit delegation override for this worker run before touching implementation code.
3) Patch the bounded review runtime/state so post-startup low-yield diff reviews can terminate truthfully on the success side without affecting legitimate deep reviews.
4) Patch review-gated pipeline consumers so docs-review and implementation-gate require fresh, terminal, internally consistent review evidence unless an explicit waiver is present.
5) Tighten large uncommitted review scope so `--base`, `--commit`, or an explicit override is required once thresholds trip.
6) Add focused regressions, run the required validation sequence, refresh the docs packet/workpad, attach the PR, and stop coding at the live review handoff state.

## Dependencies
- `scripts/run-review.ts`
- `scripts/lib/review-execution-boundary-preflight.ts`
- `scripts/lib/review-execution-runtime.ts`
- `scripts/lib/review-execution-state.ts`
- `scripts/lib/review-execution-telemetry.ts`
- `scripts/lib/review-scope-advisory.ts`
- `docs/standalone-review-guide.md`
- `codex.orchestrator.json`
- orchestrator review command / summary consumers

## Validation
- Checks / tests:
  - `DELEGATION_GUARD_OVERRIDE_REASON="subagent spawning unavailable in-session for this provider worker" node dist/bin/codex-orchestrator.js start docs-review --format json --no-interactive --task linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514`
  - `DELEGATION_GUARD_OVERRIDE_REASON="subagent spawning unavailable in-session for this provider worker" node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke`
- Rollback plan:
  - revert the review-runtime/state/accounting changes if they regress forced execution or deep review behavior outside this issue's contract
  - keep the issue active until the fix or blocker is clear and reflected in the workpad

## Risks & Mitigations
- Risk: success-side low-yield termination accidentally shortens reviews that still have meaningful concrete progress.
  - Mitigation: keep the success-side stop narrowly tied to post-startup diff-review low-yield conditions and prove the boundaries with focused tests.
- Risk: evidence-consistency gating breaks review wrappers that currently rely on process exit alone.
  - Mitigation: wire the gate through existing review-pipeline seams, preserve explicit waiver behavior, and cover downstream summary surfaces in tests.
- Risk: large-scope gating surprises operators who rely on the previous warning-only behavior.
  - Mitigation: require an explicit override path and update the standalone review guide to document the new contract clearly.

## Approvals
- Reviewer: docs-review approved
- Date: 2026-03-24

## Manifest Evidence
- Docs-review manifest: `.runs/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514/cli/2026-03-24T08-11-34-245Z-b218e257/manifest.json`
- Baseline audit: `out/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514/manual/20260324T080455Z-baseline-audit.md`

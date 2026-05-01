# Task Checklist - linear-7badbb88-ab4b-4091-9cd1-5d74643b6443

- Linear: `CO-474` / `7badbb88-ab4b-4091-9cd1-5d74643b6443`
- PRD: `docs/PRD-linear-7badbb88-ab4b-4091-9cd1-5d74643b6443.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-7badbb88-ab4b-4091-9cd1-5d74643b6443.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-7badbb88-ab4b-4091-9cd1-5d74643b6443.md`
- Child docs manifest: `.runs/linear-7badbb88-ab4b-4091-9cd1-5d74643b6443-docs-packet/cli/2026-05-01T20-33-30-098Z-88f678f6/manifest.json`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, checklist, `.agent/task` mirror, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` created or updated.
- [x] Protected terms preserved: `CO-470`, `CO-472`, `control-host recover`, `Ready issue`, `accepted/no-run`, `provider_issue_rehydration_pending_revalidation`, `run_id=null`, `run_manifest_path=null`, `launch_started_at=null`, `request timeout 120000ms`.
- [x] Non-goals recorded: no CO-470 fixture-env cleanup, no CO-472 rewrite, no manual `provider-intake-state.json` fix, no direct `provider-linear-worker` launch, no cap relaxation.
- [x] Docs-review child stream completed with manifest-backed clean telemetry.
| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-worker recover | Accepted/no-run pending-revalidation recovery treated as indefinite inflight truth | remove fallback | CO-474 | Ready issue has null run/manifest/launch and no retry error | observed 2026-05-01 | N/A after removal | N/A after removal | Explicit recover launches/retries or fails fast deterministically without occupying capacity | Focused lifecycle and handoff regressions |

## Acceptance Criteria
- [x] Reproduce accepted/no-run pending-revalidation shape from CO-470 artifacts or a focused fixture.
- [x] Explicit recover/relaunch/nudge starts with provenance or returns deterministic actionable failure.
- [x] Null run/manifest/launch evidence no longer consumes active capacity indefinitely.
- [x] Regression coverage protects released-pending-reopen to accepted/pending-revalidation launch/retry/fail-fast.
- [x] CO-470 can be admitted without parent-side manual provider-intake edits.

## Validation
- [x] Focused ProviderIssueHandoff/control-server lifecycle regressions.
- [x] Delegation guard, spec guard, build, lint, full test, docs checks, freshness, stewardship, diff budget, and pack smoke.
- [ ] Final standalone review and elegance pass after latest review fix.
- [ ] PR create/attach, latest-main merge, checks, ready-review drain, and Linear review handoff.

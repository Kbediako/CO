# ACTION_PLAN - CO STATUS: make Next refresh truthful under Linear cooldown and shared-budget poll suppression

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: land the smallest truthful polling-projection patch so `CO STATUS` `Next refresh` always reflects the real next eligible tracked-issue refresh during shared Linear cooldown, real in-flight polling, and ordinary scheduling.
- Scope: docs-first packet, active-state/workpad bootstrap, audited docs-review child stream, additive polling-payload projection, bounded presenter and renderer consumption, focused tests, required validation, and review-handoff preparation.
- Assumptions:
  - current `main` already has the shared-budget and polling state needed to compute the authoritative next-refresh truth
  - the mismatch is caused by raw `checking` and `next_poll_in_ms` consumption, not by a need to redesign the scheduler
  - persisted polling snapshots can safely carry additive projected fields

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: preserve `CO STATUS`, `Next refresh`, `checking now...`, `linear requests exhausted; polling deferred until reset`, `linear complexity budget exhausted; polling deferred until reset`, `cooldown_until`, `next_poll_in_ms`, `ControlPollingHealthPayload`, `linearBudgetState.ts`, `providerPollingHealth.ts`, `controlServerPublicLifecycle.ts`, and `controlStatusDashboard.ts`.
- Not done if:
  - active cooldown can still be masked by `checking now...`
  - the displayed countdown can still outlive the authoritative cooldown or reset window
  - requests or complexity exhaustion lack focused regression coverage
  - restart or rehydrate drops back to stale scheduled countdown truth
- Pre-implementation issue-quality review:
  - this is narrower than general STATUS or rate-limit parity work
  - the correct seam is shared-budget plus polling projection, not renderer-only patching
  - the lane can stay additive by extending the polling payload and reusing existing shared-budget state

## Milestones & Sequencing
1. Bootstrap the docs packet and registry mirrors, record the verified current code-path audit, and stage the initial single workpad body.
2. Upsert the workpad to Linear and launch `linear child-stream --pipeline docs-review` for audited delegation evidence.
3. Implement the bounded projection-first patch:
   - extend `ControlPollingHealthPayload` with authoritative next-refresh projection fields
   - compute cooldown, checking, and scheduled precedence in `providerPollingHealth.ts`
   - preserve and normalize the projected fields through `controlRuntime.ts`
   - update `compatibilityIssuePresenter.ts` and `controlStatusDashboard.ts` to consume the projected truth
4. Add focused regressions for requests and complexity suppression, cooldown-to-checking transition, and persisted-snapshot truth.
5. Run the validation floor, standalone review, and elegance pass; then refresh the workpad and prepare PR or handoff artifacts.

## Dependencies
- audited docs-review child stream under the workspace-scoped artifact root
- current shared-budget cooldown fields remaining authoritative
- existing provider polling lifecycle tests remaining stable enough to extend rather than rewrite

## Validation
- Checks / tests:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `FORCE_CODEX_REVIEW=1 MCP_RUNNER_TASK_ID=linear-e09ce1db-e2f8-4fe7-9509-9f61a02f4844 npm run review -- --manifest <manifest>`
  - `npm run pack:smoke`
- Rollback plan:
  - revert the additive next-refresh payload fields plus the bounded presenter or renderer changes if they misclassify cooldown, checking, or scheduled states

## Risks & Mitigations
- Risk: a renderer-only fix leaves projection and persisted snapshot truth inconsistent.
  - Mitigation: project the new truth in `providerPollingHealth.ts` and normalize it in `controlRuntime.ts`.
- Risk: a payload extension accidentally breaks older persisted polling snapshots.
  - Mitigation: backfill the projected fields from existing raw polling plus budget data during normalization.
- Risk: the lane broadens into general STATUS event wording.
  - Mitigation: restrict presenter changes to reusing the projected next-refresh countdown for existing Linear budget exhaustion semantics.

## Approvals
- Reviewer: `codex-orchestrator docs-review (failed-other, manual fallback accepted)`
- Date: 2026-04-07

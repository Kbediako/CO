# Task Checklist - linear-a91cfc38-be9e-496f-90bd-5cb2625763a5

- Linear Issue: `CO-555` / `a91cfc38-be9e-496f-90bd-5cb2625763a5`
- Task registry id: `20260518-linear-a91cfc38-be9e-496f-90bd-5cb2625763a5`
- MCP Task ID: `linear-a91cfc38-be9e-496f-90bd-5cb2625763a5`
- Primary PRD: `docs/PRD-linear-a91cfc38-be9e-496f-90bd-5cb2625763a5.md`
- TECH_SPEC: `tasks/specs/linear-a91cfc38-be9e-496f-90bd-5cb2625763a5.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-a91cfc38-be9e-496f-90bd-5cb2625763a5.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-a91cfc38-be9e-496f-90bd-5cb2625763a5.md`
- Linear workpad: `b7f6b317-12bc-4a87-aab7-cfb0b7fc41bb`

## Docs-First
- [x] Live issue-context read before implementation. Evidence: `codex-orchestrator linear issue-context --issue-id a91cfc38-be9e-496f-90bd-5cb2625763a5 --format json` reported `Ready`, UUID `a91cfc38-be9e-496f-90bd-5cb2625763a5`, and no attached PR.
- [x] Issue moved to the team's active state before coding. Evidence: CO-555 moved `Ready` -> `In Progress`.
- [x] Workpad created and maintained as a single active comment. Evidence: Linear workpad `b7f6b317-12bc-4a87-aab7-cfb0b7fc41bb`.
- [x] Exactly one `linear parallelization` decision recorded. Evidence: `parallelize_now` / `independent_scope_available`; same-issue child lane `terminal-retry-tests` completed successfully before parent invalidated stale patch metadata and reimplemented final tests.
- [x] PRD created with live CO-555 issue contract, protected terms, non-goals, Not Done If, and fallback/refactor decisions. Evidence: `docs/PRD-linear-a91cfc38-be9e-496f-90bd-5cb2625763a5.md`.
- [x] TECH_SPEC created with root-cause design boundaries and validation plan. Evidence: `tasks/specs/linear-a91cfc38-be9e-496f-90bd-5cb2625763a5.md`, `docs/TECH_SPEC-linear-a91cfc38-be9e-496f-90bd-5cb2625763a5.md`.
- [x] ACTION_PLAN created for implementation, validation, review, PR drain, and handoff sequencing. Evidence: `docs/ACTION_PLAN-linear-a91cfc38-be9e-496f-90bd-5cb2625763a5.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-a91cfc38-be9e-496f-90bd-5cb2625763a5.md`.
- [x] Task registration updated in canonical `tasks/index.json` `items[]` shape. Evidence: `tasks/index.json`.
- [x] Rework recurrence packet refreshed after CO-534 exposed cached-terminal and stale-run gaps. Evidence: 2026-05-24 docs/spec/checklist updates plus GPT Pro consult summary.

## Acceptance Criteria
- [x] Terminal Linear states (`Done`/completed, canceled, duplicate, archived/trashed where surfaced) take precedence over `retry_queued`, `resumable`, and resume-eligible historical run status for active WIP accounting. Evidence: shared terminal predicate now gates active/retry helpers and projection retry state.
- [x] Rehydration paths that find resume-eligible runs for terminal issues preserve audit evidence but downgrade/release/ignore the active claim instead of queuing retry WIP. Evidence: provider issue handoff rehydration releases terminal retry/resumable claims and clears retry WIP fields.
- [x] `co-status`, freshness-gauge, and quota-hygiene surfaces no longer count terminal retryable/resumable claims as active or retrying, while still surfacing retained terminal audit evidence. Evidence: runtime and selected-run retry projections use terminal-aware helpers and retained retry metadata reports inactive.
- [x] Regression coverage includes a CO-512-shaped fixture: live issue Done/completed plus stale failed/resume-eligible run plus `retry_queued=true` must not produce an active claim or selected active issue. Evidence: `ProviderIntakeState.test.ts` and `ProviderIssueHandoff.test.ts` CO-512-shaped tests.
- [x] Regression coverage includes the CO-554-shaped completed-retry fixture: cached `state=completed`, `reason=provider_issue_rehydrated_completed_run`, `retry_queued=true`, cached `issue_state=In Progress`/`started`, fresh live `Done`/`completed`, expected retry cleared/inactive and no start/resume/requeue. Evidence: `ProviderIssueHandoff.test.ts` exact CO-554-shaped rehydrate test plus `ControlRuntime.test.ts` terminal selected-retry clearing projection test.
- [x] Existing non-terminal retry/resumable workers remain active and retry-visible. Evidence: non-terminal retry-resumable provider-intake regression.
- [x] No manual `provider-intake-state.json` edits are required. Evidence: no state files changed; supported control-host logic converges the stale claim.
- [x] Cached terminal `Duplicate`/duplicate metadata releases stale retry/resumable claims when refresh is disabled or unavailable, without requiring `passive_release` metadata or exact run identity as a classification prerequisite. Evidence: CO-534-shaped cached Duplicate rehydrate regressions release and clear retry fields without a fresh Linear fetch, including stale `run_id`/`run_manifest_path` identity.
- [x] Terminal claims with stale `retry_queued=true`, `retry_attempt`, and valid `retry_due_at` are not scheduled by the retry queue. Evidence: terminal stale retry metadata regression asserts no retry timer, no start, and no resume.
- [x] Newer active Linear issue updates, including CO-555 `Rework`, supersede older failed/resume-eligible runs and admit fresh work instead of preserving stale `resumable` retry WIP. Evidence: direct accepted-issue, poll/refresh, and due retry-dispatch regressions launch fresh Rework work while preserving generic non-Rework failed-run retry diagnostics and queued-run protection.

## Protected Issue Terms
- [x] `provider-intake-state.json`
- [x] `provider_issue_rehydrated_resumable_run`
- [x] `retry_queued`
- [x] `resumable`
- [x] `issue_state=Done`
- [x] `issue_state_type=completed`
- [x] `active_issue_identifiers`
- [x] `isActiveProviderIntakeClaim`
- [x] terminal Linear truth
- [x] no manual state edits

## Fallback Decision Table
- Large-refactor decision: not required; this lane removes stale terminal active-WIP authority from existing provider-intake predicates and rehydration without splitting source authority.
- Minor-seam decision: acceptable because terminal Linear truth wins before retry/resumable metadata and retained terminal evidence is inactive audit evidence only.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-intake retry/resumable WIP | Cached `retry_queued` or `resumable` metadata can mark a terminal Linear issue active before terminal issue-state exclusion. | `remove fallback` | CO-555 | Live issue metadata is terminal (`Done`/completed, canceled, duplicate, archived, or trashed) for a retry/resumable provider claim. | Observed 2026-05-18 | 2026-05-18 | This issue | Terminal issue metadata is checked before retry/resumable active-WIP and retry projections. | CO-512-shaped provider-intake and provider-handoff regressions plus full validation floor. |
| Retained terminal provider audit evidence | Historical retry/run metadata remains visible after terminal release. | `justify retaining fallback` | Provider-intake control-host | Terminal issue has retained provider run or retry metadata after release/non-active classification. | Existing provider-intake audit retention behavior | 2026-05-18 | Durable audit contract | Separate archival policy replaces retained provider-intake audit rows with equivalent source-labeled evidence. | Regression asserts retained terminal retry metadata is inactive while non-terminal retry remains active. |

- Contract name: provider-intake retained terminal audit evidence.
- Owning surface: provider-intake control-host claim persistence and status projection.
- Steady-state proof: terminal retry/run metadata is retained only as inactive source-labeled audit evidence and never consumes active WIP.
- Tests/docs: focused `ProviderIntakeState` and `ProviderIssueHandoff` regressions plus this CO-555 packet.
- Non-expiring rationale: retained audit evidence is durable operator traceability, not temporary compatibility debt; remove only after a reviewed archival replacement preserves equivalent evidence.

## Implementation
- [x] Inspect provider-intake active claim and retry selection. Evidence: root cause isolated to retry/resumable checks occurring before terminal issue-state exclusion.
- [x] Implement terminal-aware active/retry predicates. Evidence: `providerIntakeState.ts` exports terminal issue-state predicate and `hasQueuedProviderIntakeRetry` ignores terminal issues.
- [x] Implement terminal-aware rehydration release and capacity helpers. Evidence: `providerIssueHandoff.ts` releases terminal retry/resumable claims and excludes terminal queued claims from poll/admission occupancy.
- [x] Update runtime and selected-run retry projections. Evidence: `controlRuntime.ts` and `selectedRunProjection.ts` suppress terminal retry state.
- [x] Add focused regression coverage. Evidence: `ProviderIntakeState.test.ts`, `ProviderIssueHandoff.test.ts`, and `ControlRuntime.test.ts`.
- [x] Rework cached-terminal release and retry-queue scheduling. Evidence: cached terminal release path plus terminal-aware retry queue scheduling/dispatch helpers.
- [x] Rework stale failed-run freshness checks for active issue reclaim. Evidence: stale-run reclaim requires current `Rework` issue freshness from the trusted tracked issue input and only applies to failed/canceled resume-eligible latest runs, avoiding broad relaunch of generic failed proof diagnostics or duplicate launches for queued runs.
- [x] Add CO-534/CO-555 recurrence regressions for cached Duplicate release, identity-drift cached terminal release, terminal retry queue suppression, newer Rework reclaim, absent/stale retained claim cache, due retry-dispatch reclaim, and due retry queued-run protection. Evidence: focused recurrence slices and full `ProviderIssueHandoff.test.ts` pass after review feedback.

## Validation
- [x] Same-issue child lane. Evidence: `terminal-retry-tests` run `2026-05-18T19-23-32-870Z-f45dcca5` completed successfully; parent invalidated stale patch metadata and reimplemented final tests directly.
- [x] Focused provider-intake/handoff regression. Evidence: full `ProviderIssueHandoff.test.ts` passed after review feedback, including terminal release side effects after an earlier pending claim and the exact CO-554 completed-retry rehydrate fixture.
- [x] Full provider-worker validation floor after identity-drift, due-retry-dispatch, claim-cache, and queued-run rework. Evidence: focused due-retry queued-run slice, full `ProviderIssueHandoff.test.ts`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/spec-guard.mjs --dry-run`, `git diff --check`, `node scripts/diff-budget.mjs`, `node scripts/docs-freshness-maintain.mjs --check --format json`, delegation guard override, and `npm run pack:smoke` pass.
- [x] Manifest-backed standalone review after identity-drift, due-retry-dispatch, claim-cache, and queued-run rework. Evidence: `.runs/linear-a91cfc38-be9e-496f-90bd-5cb2625763a5/cli/2026-05-24T05-30-02-250Z-b0d4f724/review/telemetry.json` reports `review_verdict=clean`, `contract_validation.status=valid`, `contract_overall_verdict=clean`, and `finding_count=0`.
- [x] Explicit elegance/minimality pass after identity-drift, due-retry-dispatch, claim-cache, and queued-run rework. Evidence: post-review minimality pass kept the local stale-run status gate, retry-clearing flag, and explicit fixtures because each maps to a distinct recurrence and avoids a broader provider-intake abstraction.
- [ ] PR ready-review drain. Evidence: pending after post-merge validation and branch push.
- [x] Rework validation after 2026-05-24 identity-drift, due-retry-dispatch, claim-cache, and queued-run findings. Evidence: full provider-worker validation floor passes after the queued-run protection fix.
- [x] Rework standalone review rerun after identity-drift, due-retry-dispatch, claim-cache, and queued-run fixes. Evidence: enforced `codex-orchestrator review --uncommitted` completed clean under `gpt-5.5`/`xhigh` with telemetry at `.runs/linear-a91cfc38-be9e-496f-90bd-5cb2625763a5/cli/2026-05-24T05-30-02-250Z-b0d4f724/review/telemetry.json`.
- [x] Explicit rework elegance/minimality pass after identity-drift, due-retry-dispatch, claim-cache, and queued-run fixes. Evidence: no avoidable helper extraction or fixture collapse found without weakening source readability or recurrence coverage.
- [x] External docs freshness handoff blocker cleared. Evidence: after merging current `origin/main`, `npm run docs:freshness`, `npm run docs:check`, `node scripts/spec-guard.mjs --dry-run`, and `node scripts/docs-freshness-maintain.mjs --check --format json` pass for this branch; the maintenance report has `freshness_decision=pass_with_owned_rolling_debt`, `blocks_handoff=false`, and warning-level terminal-owner succession remains separately routed.

## Progress Log
- 2026-05-18: Live issue-context read confirmed CO-555 was `Ready`, then moved to `In Progress`.
- 2026-05-18: Workpad created, decomposition matrix recorded, and `parallelize_now` decision launched `terminal-retry-tests`.
- 2026-05-18: Implemented terminal-aware provider-intake active/retry and rehydration release behavior.
- 2026-05-18: Validation floor passed before the PR opened; standalone review rerun returned clean after fixing terminal poll occupancy.
- 2026-05-18: PR #834 opened and attached; ready-review stopped because the branch was behind `main`; current-main merge applied cleanly and post-merge validation is underway.
- 2026-05-24: CO-534 recurrence showed terminal cached `Duplicate` metadata could still rehydrate as retry/resumable and CO-555 `Rework` could be held by an older failed run; reopened CO-555 for root-cause rework.
- 2026-05-24: Enforced standalone review found a P1 poll/refresh stale-run gap; fixed by passing claim freshness into that branch and constraining stale-run reclaim to live `Rework` updates so generic failed-run proof diagnostics remain retry-visible.
- 2026-05-24: Rework review rerun after the current-main refresh found P1 gaps for cached terminal identity drift and due retry dispatch. Fixed by separating cached terminal classification from exact run identity, keeping release side effects identity-bound, and applying stale Rework freshness before owned/retry-dispatch paths can requeue or resume older failed runs.
- 2026-05-24: Rework review rerun found a P2 gap where absent or stale retained claim metadata could still let an older failed run outvote a newer Rework issue. Fixed by making trusted tracked issue freshness authoritative for stale-run reclaim and adding absent/stale claim-cache regressions.
- 2026-05-24: Rework review rerun found a P1 gap where due retry dispatch could treat queued latest runs as stale and launch duplicates. Fixed by gating stale-run replacement to failed/canceled resume-eligible runs and adding queued-run protection coverage.
- 2026-05-24: CodeRabbit current-head review found two remaining stale-run seams: cached terminal release used `started_at` as issue freshness proof, and released-claim Rework relaunch still passed stale failed-run retry identity into fresh starts. Fixed by requiring explicit `issue_updated_at` for cached-terminal freshness and by carrying the stale-run predicate into released refresh starts with retry clearing.
- 2026-05-24: CodeRabbit follow-up found stale released Rework fresh-launch inputs could still carry old run identity, launch provenance, or worker host into `launchStartForTrackedIssue` capacity/fresh-start handling. Fixed by clearing run identity/provenance alongside retry fields before launch and adding a stale worker-host regression.
- 2026-05-24: Codex current-head review found the same stale identity class in due-retry and refresh relaunch paths. Fixed by routing stale Rework fresh starts through a shared stale-run identity sanitizer, passing `previousRun: null`, excluding the stale claim from replacement-start admission, and adding due-retry capacity-blocked coverage.
- 2026-05-24: CodeRabbit current-head review found two released stale-reopen call sites still omitted `excludeCurrentClaimFromAdmission`, allowing a stale persisted released row to self-block fresh relaunch despite the sanitized transient claim. Fixed both call sites and tightened the due-retry capacity-blocked regression to assert `launch_started_at` clears in memory and persistence.
- 2026-05-24: Enforced gpt-5.5/xhigh standalone review rerun returned clean with a valid contract and zero findings; explicit elegance pass kept the local status gate plus explicit regression fixtures as the smallest safe shape.

## Notes
- Parent orchestration remains responsible for PR feedback drain, Linear state handoff, and final workpad closeout.

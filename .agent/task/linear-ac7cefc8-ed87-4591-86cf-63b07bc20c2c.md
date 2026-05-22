# Task Checklist - linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c

- Linear Issue: `CO-330` / `ac7cefc8-ed87-4591-86cf-63b07bc20c2c`
- MCP Task ID: `linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c`
- Primary PRD: `docs/PRD-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`
- TECH_SPEC: `tasks/specs/linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`
- Parent manifest: `.runs/linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c-co330-recurrence-docs/cli/2026-04-25T12-07-04-429Z-22659fae/manifest.json`
- Current manifest: `.runs/linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c/cli/2026-04-28T04-50-04-951Z-a8df80f3/manifest.json`
- Source anchor: `ctx:sha256:d14a6cd66c90db64bf91248f6f68d329bf0b540a68b4243aec21a6770b4dce3b#chunk:c000001`
- Current recurrence anchor: `ctx:sha256:71b3705dcb95cb3d85f4202978c8c661ce6ca70898a38c2971762666659af3f2#chunk:c000001`

## Docs-First
- [x] Source anchor refreshed for the 2026-04-25 recurrence handoff. Evidence: `ctx:sha256:d14a6cd66c90db64bf91248f6f68d329bf0b540a68b4243aec21a6770b4dce3b#chunk:c000001`.
- [x] PRD refreshed for CO-330 reopened stale-owner/provider-refresh recurrence after PR #624. Evidence: `docs/PRD-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`.
- [x] TECH_SPEC refreshed with protected terms, recurrence parity matrix, acceptance criteria, and parent-owned implementation scope. Evidence: `tasks/specs/linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`, `docs/TECH_SPEC-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`.
- [x] ACTION_PLAN refreshed for recurrence packet handoff, parent source reconciliation, parent implementation, and scoped validation. Evidence: `docs/ACTION_PLAN-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`.
- [x] `tasks/index.json` and docs-freshness registry refreshed by the parent lane after child-lane handoff. Evidence: `tasks/index.json`, `docs/docs-freshness-registry.json`.
- [x] 2026-04-28 docs-first packet refreshed for the post-PR #658 explicit recovery recurrence. Evidence: `docs/PRD-linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`, `tasks/specs/linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c.md`, current manifest `.runs/linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c/cli/2026-04-28T04-50-04-951Z-a8df80f3/manifest.json`.

## Protected Scope
- [x] Protected terms preserved. Evidence: PRD and canonical TECH_SPEC include `stale_control_host_owner`, `stale_reclaimed`, `control-host`, `provider-linear-worker could not request control-host refresh`, `refresh request timeout`, `fetch failed`, `control-host-stale-owner.json`, `provider-control-host-refresh-failure.json`, `active_worker_probe_timeout_quarantine`, `owner pid/host/task/run`, `attempted pid/host`, `co-status freshness`, `owner reclaim`, `provider refresh`, and `retry/resumable queue behavior`.
- [x] Wrong interpretations rejected. Evidence: PRD and canonical TECH_SPEC reject CO-41 ownership, CO-317-only admission/backfill, generic host restart workaround, and stdin bootstrap regression.
- [x] Related context bounded. Evidence: packet references CO-152 stale-owner ownership, CO-119 refresh-timeout recovery, and PR #624 only as prior context.

## Historical PR #624 Context
- [x] PR #624 added one bounded provider refresh retry after `stale_reclaimed`. Evidence: prior CO-330 checklist context in this packet.
- [x] PR #624 behavior is now treated as insufficient for reopened acceptance because `CO-351`, `CO-352`, and `CO-355` still observed `stale_control_host_owner` plus `fetch failed` / `refresh request timeout`, and live freshness still timed out/staled.

## Parent Implementation Targets
- [x] Treat `stale_reclaimed` as intermediate state until provider refresh and `co-status freshness` / `control-host` freshness prove recovery. Evidence: PR #624 retry/failure artifact behavior remains intact; this recurrence fix prevents supervision from rotating the owner again while active provider refresh is still visible.
- [x] Ensure `control-host-stale-owner.json` records `owner pid/host/task/run`, `attempted pid/host`, stale reason, reclaim outcome, and freshness follow-up. Evidence: existing stale-owner diagnostic contract preserved while this lane changes only supervision restart classification.
- [x] Write `provider-control-host-refresh-failure.json` for unrecovered `fetch failed` / `refresh request timeout` after reclaim and refresh/freshness verification. Evidence: PR #624 failure diagnostic behavior preserved; focused regression covers the reopened timeout/fetch-failure recurrence before another owner rotation.
- [x] Preserve provider refresh queue state as retryable/resumable without dropped work, duplicate launch, or false terminal state. Evidence: repeated same-worker timeout churn now returns `active_worker_probe_timeout_quarantine` instead of another fail-closed restart while active provider-intake workers remain visible.
- [x] Quarantine repeated same-worker `probe_timeout` supervision churn while provider refresh is active before `restart_required`, including retries with retained historical `last_error`. Evidence: `orchestrator/src/cli/control/controlHostSupervision.ts`.
- [x] Cover `CO-351`, `CO-352`, and `CO-355` recurrence shapes in focused parent-owned tests. Evidence: `orchestrator/tests/ControlHostSupervision.test.ts`.
- [x] Preserve provider-worker progress when `control-host recover` / `/api/v1/provider-worker/recover` is requested after stale-owner reclaim and prior polling is stuck with `provider_refresh_lifecycle_stuck`. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`.
- [x] Cover the `CO-403` / `CO-399` explicit recovery recurrence. Evidence: `orchestrator/tests/ProviderIssueHandoff.test.ts`.

## Validation
- [x] Protected-term text check across the six packet files. Evidence: `rg -n "stale_control_host_owner|stale_reclaimed|provider-control-host-refresh-failure.json|control-host-stale-owner.json|active_worker_probe_timeout_quarantine|owner pid/host/task/run|attempted pid/host|co-status freshness|CO-351|CO-352|CO-355" ...` returned matches in the packet.
- [x] Scoped child-lane diff review confirmed no edits outside declared file scope before parent application. Evidence: child-lane manifest `.runs/linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c-co330-recurrence-docs/cli/2026-04-25T12-07-04-429Z-22659fae/manifest.json`.
- [x] Delegation evidence passed. Evidence: `node scripts/delegation-guard.mjs`.
- [x] Spec guard passed. Evidence: `node scripts/spec-guard.mjs --dry-run`.
- [x] Build passed. Evidence: `npm run build`.
- [x] Lint passed with pre-existing `no-explicit-any` warnings in `orchestrator/tests/DelegationMcpHealth.test.ts`. Evidence: `npm run lint`.
- [x] Focused parent regression passed. Evidence: `npm test -- --run orchestrator/tests/ControlHostSupervision.test.ts`.
- [x] Full test suite passed after refreshing from latest `origin/main`. Evidence: `npm run test` (352 files, 4,807 tests).
- [x] Docs check passed. Evidence: `npm run docs:check`.
- [x] Docs freshness passed after parent registry refresh. Evidence: `npm run docs:freshness`.
- [x] Repo stewardship passed. Evidence: `npm run repo:stewardship`.
- [x] Diff budget passed. Evidence: `node scripts/diff-budget.mjs`.
- [x] Pack smoke passed after one transient temp cleanup failure and immediate rerun. Evidence: `npm run pack:smoke`.
- [x] Standalone review addressed one P1 and then returned bounded success with no actionable findings. Evidence: `.runs/linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c/cli/2026-04-25T12-02-45-644Z-e115d96f/review/telemetry.json` (`review_outcome=bounded-success`).
- [x] Elegance/minimality pass completed. Evidence: no code simplification patch was needed; registry freshness was parent-owned and refreshed.
- [x] 2026-04-28 docs-review completed after packet refresh. Blocked after packet refresh by unrelated `docs:freshness:maintain` policy over-budget baseline now owned by `CO-409` and blocked by `CO-415`. Evidence: workspace-scoped child-stream manifests `.runs/linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c-docs-review/cli/2026-04-28T05-17-30-286Z-dec6c33d/manifest.json` and `.runs/linear-ac7cefc8-ed87-4591-86cf-63b07bc20c2c-docs-review/cli/2026-04-28T05-21-08-155Z-a28c8efc/manifest.json`.
- [x] Out-of-scope terminal docs-freshness owner debt moved to the live canonical follow-up owner instead of widening CO-330. Evidence: Linear follow-up `CO-409` with canonical owner key `docs:freshness:maintain`; `CO-414` is duplicate/historical residue only; `docs/docs-catalog.json`, `docs/guides/docs-freshness-cohorts.md`.
- [x] Focused recovery regression passed. Evidence: `npm test -- --run orchestrator/tests/ProviderIssueHandoff.test.ts` (381 tests).
- [x] Focused supervision regression stayed green. Evidence: `npm test -- --run orchestrator/tests/ControlHostSupervision.test.ts` (82 tests).
- [x] Current implementation gates passed. Evidence: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run docs:check`, `npm run repo:stewardship`, and `node scripts/diff-budget.mjs`.
- [x] Current docs freshness gate passed. Blocked by unrelated `CO-409` `docs:freshness:maintain` baseline over-budget state and `CO-415` dependency (`current_cohorts=6`, `max_cohorts=2`, `stale_entries=33`, `blocking_changed_paths=[]`). Evidence: `npm run docs:freshness`, `npm run docs:freshness:maintain -- --format json`.
- [x] Current full test suite passed. Full `npm run test` hit load-sensitive timeouts in five existing suites; isolated reruns for the timed-out surfaces passed. Evidence: full run plus focused reruns for `ControlRuntime`, `CheckoutPosture`, `Doctor`, `cli-command-surface`, and `ProviderLinearWorkerRunner`.

## Progress Log
- 2026-04-23: bounded same-issue docs child lane created the CO-330 docs-first packet and task registration only. Parent reconciled the source-0 payload after accepting the child patch; source-0 is run metadata/provenance, and Linear issue text remains the requirements source.
- 2026-04-23: parent implementation added one retry after stale-owner reclaim for provider refresh fetch/timeout failures and a persistent `provider-control-host-refresh-failure.json` diagnostic when retry cannot recover.
- 2026-04-23: parent added CO-330 docs freshness registry entries, isolated the work onto clean branch `linear/co-330-stale-owner-refresh-clean`, and restored docs gates to green on the clean branch.
- 2026-04-23: standalone review returned bounded success with no actionable findings; elegance pass found no simplification patch.
- 2026-04-25: recurrence packet refresh records that PR #624's single retry was insufficient because provider workers still saw `stale_control_host_owner` plus `fetch failed` / `refresh request timeout` and freshness still timed out/staled.
- 2026-04-25: parent implementation identified the surviving recurrence as supervision restart churn during active provider refresh before `restart_required`; after one fail-closed timeout restart, repeated same-worker timeouts now quarantine instead of rotating the control-host owner again.
- 2026-04-25: standalone review first found the historical `last_error` predicate risk; parent removed that restriction and updated the regression to cover retained `last_error: fetch failed`; the second review returned bounded success with no actionable findings.
- 2026-04-28: reopened recurrence now includes explicit recovery failure after PR #658: `CO-403` retained stale-owner timeout/fetch failures and `CO-399` `control-host recover` returned `provider_refresh_lifecycle_stuck`. Parent target is recovery-path lifecycle reset without broadening normal refresh/rehydrate behavior.
- 2026-04-28: docs-review exposed unrelated `docs:freshness:maintain` owner debt because configured owner `CO-401` was terminal; later queue reconciliation established `CO-409` as the canonical live owner, with `CO-415` as its blocker. `CO-414` is duplicate/historical residue only and CO-330 remains provider-recovery scoped.
- 2026-04-28: parent implementation now lets explicit control-host recovery reset a stuck provider polling lifecycle for the recovery attempt, records recovery progress, and marks polling completed on success/failure while leaving normal refresh/rehydrate fail-closed behavior intact.
- 2026-04-28: current worker stream decomposition matrix before `linear parallelization`: candidate child lane `reconcile-validation-scout`; file/phase scope read-only upstream overlap and focused validation proof; dependencies current dirty patch plus `origin/main` two-commit delta; overlap risk high for `tasks/index.json`, `docs/docs-freshness-registry.json`, and `orchestrator/tests/ProviderIssueHandoff.test.ts`; expected validation artifact this stream's direct command output; child-lane owner none because the parent already owns PR/handoff and docs-freshness lanes own external debt; cap-slot use `0/2 -> 0/2`. Decision: `stay_serial` because this bounded salvage/validation stream has no safe independent write slice without colliding with the dirty patch or external owner lanes.
- 2026-04-28: worker fast-forwarded `linear/co-330-stale-owner-refresh-recurrence-r3` from `3e9da5228` to `3305dab13` with a path-scoped stash/reapply after three-way patch simulation reported every CO-330 dirty file cleanly applicable. Focused recovery regression, spec guard, build, lint, and docs check passed on the reconciled base.

## Notes
- The 2026-04-25 docs child lane succeeded but helper acceptance was invalidated by Linear timestamp staleness; parent reviewed and applied the bounded docs patch manually.
- Linear request reserve temporarily blocked workpad refresh; parent deferred Linear mutation until budget reset.
- Final PR handoff still requires latest `origin/main` merge/rebase, PR creation/attachment, PR checks, ready-review drain, and refreshed workpad.
- Do not broaden CO-330 into CO-41, CO-317-only, generic host restart, or stdin bootstrap work.

## CO-575 terminal lifecycle reconciliation

- 2026-05-22: Historical open checklist residue was reconciled under CO-575 after tasks/index and live Linear terminal evidence showed this task is already complete. This allows implementation-docs archival to preserve the full packet on doc-archives without keeping active docs-freshness debt open on main.

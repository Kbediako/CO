# Task Checklist - linear-b84c9a78-b62f-48fa-b1c4-88f8222535da

- Linear Issue: `CO-163` / `b84c9a78-b62f-48fa-b1c4-88f8222535da`
- MCP Task ID: `linear-b84c9a78-b62f-48fa-b1c4-88f8222535da`
- Primary PRD: `docs/PRD-linear-b84c9a78-b62f-48fa-b1c4-88f8222535da.md`
- TECH_SPEC: `tasks/specs/linear-b84c9a78-b62f-48fa-b1c4-88f8222535da.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-b84c9a78-b62f-48fa-b1c4-88f8222535da.md`

## Docs
- [x] Live Linear workflow states were rechecked before transition. Evidence: `linear issue-context --issue-id b84c9a78-b62f-48fa-b1c4-88f8222535da`.
- [x] Issue moved from `Ready` to `In Progress` before active coding. Evidence: `linear transition --state "In Progress"` succeeded at `2026-04-12T15:42:37.762Z`.
- [x] Required same-turn parallelization decision recorded. Evidence: `linear parallelization --decision stay_serial --reason overlapping_scope`.
- [x] Exactly one persistent Linear workpad comment is current. Evidence: `linear upsert-workpad --issue-id b84c9a78-b62f-48fa-b1c4-88f8222535da --body-file out/linear-b84c9a78-b62f-48fa-b1c4-88f8222535da/manual/workpad.md` reused comment `0638a1a6-97e5-4c55-932b-ea05dbdd68c7`.
- [x] Workspace moved from `main` onto branch `linear/co-163-harden-supervise-restart-orphan-burn` before repo edits. Evidence: `git switch -c linear/co-163-harden-supervise-restart-orphan-burn`.
- [x] Docs packet created and mirrored in `docs/`, `tasks/`, `.agent/`, `tasks/index.json`, and `docs/TASKS.md`. Evidence: this checklist plus PRD, TECH_SPEC, ACTION_PLAN, and registry updates.
- [x] Docs-review child-stream evidence recorded before implementation. Evidence: `linear child-stream --pipeline docs-review --format json` failed closed with `provider_worker_child_stream_provenance_invalid`; fallback `FORCE_CODEX_REVIEW=1 npx codex-orchestrator start docs-review --format json --no-interactive --task linear-b84c9a78-b62f-48fa-b1c4-88f8222535da-co-163-docs-review` succeeded at `.runs/linear-b84c9a78-b62f-48fa-b1c4-88f8222535da-co-163-docs-review/cli/2026-04-12T15-55-23-100Z-6b52bdd3/manifest.json` with `review_outcome: clean-success`.

## Investigation
- [x] Baseline control-host restart, ownership, and stuck-refresh surfaces inspected. Evidence: `controlHostSupervisionCliShell.ts`, `controlHostOwnership.ts`, `controlServerPublicLifecycle.ts`, `providerIssueHandoff.ts`, and `providerPollingHealth.ts`.
- [x] Pre-implementation issue-quality review captured. Evidence: `tasks/specs/linear-b84c9a78-b62f-48fa-b1c4-88f8222535da.md` review notes and readiness gate.

## Implementation
- [x] Supervised restart waits for or force-cleans the previous tracked child tree before success. Evidence: `orchestrator/src/cli/controlHostSupervisionCliShell.ts` now reads the stored `child_pid`, waits for the prior supervised process group after `launchctl kickstart -k`, validates that a timed-out PID still matches the expected supervised control-host command, and fails closed unless that stale group exits or is force-cleaned.
- [x] Restart/orphan evidence preserves owner-token/process diagnostics. Evidence: restart output now includes `previous_child_pid`, `child_pid`, and `cleanup` orphan evidence, while the existing `controlHostOwnership.ts` / `polling.control_host_owner` owner-token+pid diagnostic surface remains the operator path for duplicate or stale ownership.
- [x] Stuck refresh aborts further issue-by-id reads or fresh discovery after the stuck boundary. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts` adds `shouldAbortRefreshCycle()` guards around tracked-issue resolution, queued retry rereads, and fresh discovery.
- [x] Operator-facing status/runbook guidance distinguishes supervised control-host pids from provider workers. Evidence: `formatControlHostSupervisionStatus(...)` now prints the supervised child pid and `docs/public/provider-onboarding.md` documents `co-status --format json` owner diagnostics plus the detached provider-worker exclusion.

## CO-382 Fallback Decision Table

Large-refactor check: A broad control-host restart refactor is not required for this historical packet alignment; CO-530 only removes the stale active-debt treatment from already-terminal docs metadata.
Minor-seam decision: CO-530 aligns the historical packet metadata with live terminal evidence and does not add a new runtime or validation branch.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| docs freshness | Already-terminal CO-163 packet still treated as active docs-freshness debt | remove fallback | CO-530 | CO-530 archives the already-terminal CO-163 packet from docs freshness active debt | 2026-04-13 | N/A after removal | N/A after removal | Packet metadata is terminal/archived and no longer appears as active debt | CO-163 terminal evidence plus CO-530 `spec-guard` and `docs:freshness:maintain` clean output |

## Validation
- [x] Focused regression tests for supervision restart/orphan cleanup and stuck-refresh abort. Evidence: the earlier `npx vitest run orchestrator/tests/ControlServerPublicLifecycle.test.ts orchestrator/tests/ControlHostSupervision.test.ts orchestrator/tests/ProviderIssueHandoff.test.ts` runtime set remained green with `343` tests, the later rereview patch added `keeps lifecycle-stuck polling fail-closed when later schedules arrive` with `npx vitest run orchestrator/tests/ControlServerPublicLifecycle.test.ts` passing `42` tests, the supervision cleanup follow-ups added `skips force cleanup when the tracked process group exits before the kill step`, `fails closed when the tracked process-group recheck errors before force cleanup`, `rejects overlapping task and run prefixes when verifying the supervised control-host command`, and `matches the supervised control-host when the CLI entrypoint path contains spaces`, and the final focused reruns passed with `npx vitest run orchestrator/tests/ControlHostSupervision.test.ts` at `57` tests and `npx vitest run orchestrator/tests/ProviderIssueHandoff.test.ts` at `250` tests on the current head.
- [x] `node scripts/delegation-guard.mjs`. Evidence: `Delegation guard: OK (2 subagent manifest(s) found).`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `✅ Spec guard: OK`
- [x] `npm run build`. Evidence: passed on the final diff.
- [x] `npm run lint`. Evidence: passed on the final diff.
- [x] `npm run test`. Evidence: passed on the current head with `333` files / `3663` tests green.
- [x] `npm run docs:check`. Evidence: `✅ docs:check: OK`
- [x] `npm run docs:freshness`. Evidence: `docs:freshness OK - 3713 docs, 3716 registry entries`
- [x] `npm run repo:stewardship`. Evidence: `repo:stewardship OK - 4698 tracked files, 0 action-required`
- [x] `node scripts/diff-budget.mjs`. Evidence: `✅ Diff budget: OK (scope=working-tree, files=5/25, lines=250/1200, +231/-19)`
- [x] Standalone review plus explicit elegance review before review handoff. Evidence: manifest-backed standalone review has now executed five times via `FORCE_CODEX_REVIEW=1 npm run review -- --manifest .runs/linear-b84c9a78-b62f-48fa-b1c4-88f8222535da/cli/2026-04-12T15-41-35-613Z-026f9583/manifest.json`; each run ended in the documented `review_outcome: failed-boundary` / `termination_boundary.kind: command-intent`, with the latest boundary again caused by an attempted `npm test -- --run orchestrator/tests/ControlHostSupervision.test.ts orchestrator/tests/ProviderIssueHandoff.test.ts` launch after the wrapper independently reproduced the macOS `ps -o args=` path-with-spaces behavior. The lane therefore used the documented manual fallback review on the final 4-file diff, confirmed the boundary-safe task/run/pipeline match plus `command.includes(config.cliEntrypoint)` compatibility fix keep real supervised hosts matchable without reopening the prefix-overlap bug, confirmed the post-rehydrate `assertRefreshCycleNotStuck()` closes the refresh-completion gap, found no additional correctness issues, and kept the explicit elegance pass to the smallest viable parser plus focused regressions.
- [x] `npm run pack:smoke` if downstream-facing CLI surfaces change. Evidence: passed in the downstream mock install environment.

## Handoff
- [x] PR attached to the issue. Evidence: PR `#456` (`https://github.com/Kbediako/CO/pull/456`).
- [x] Latest `origin/main` merged into the branch before review-state transition. Evidence: historical terminal classification from CO-530 cleanup; live Linear `issue-context` verified `CO-163` is `Done` / completed on 2026-05-13T19:59Z.
- [x] PR checks green and `pr ready-review` drain clean before review-state transition. Evidence: historical terminal classification from CO-530 cleanup; the issue is already `Done` / completed and PR `#456` is attached.
- [x] Unresolved actionable review threads: `0` or explicit pushback recorded. Evidence: historical terminal classification from CO-530 cleanup; the issue is already `Done` / completed and no longer active implementation debt.
- [x] Issue moved to `In Review`. Evidence: historical terminal classification from CO-530 cleanup; live Linear `issue-context` verified `CO-163` later reached `Done` / completed.

## Progress Log
- 2026-04-12: Issue moved to `In Progress`, same-turn parallelization decision recorded as serial due to overlapping supervision/ownership/polling scope, and branch `linear/co-163-harden-supervise-restart-orphan-burn` created from `main`.
- 2026-04-12: Source audit narrowed the lane to two concrete gaps: `restartControlHostSupervision(...)` currently only issues `launchctl kickstart -k`, and the active `providerIssueHandoff.poll(...)` loop has no sticky abort check once polling health is already classified as stuck.
- 2026-04-12: The audited child-stream docs-review path failed closed on missing provider control-host provenance for this worker manifest, so the lane used the truthful direct fallback and recorded a clean `review_outcome: clean-success` at `.runs/linear-b84c9a78-b62f-48fa-b1c4-88f8222535da-co-163-docs-review/cli/2026-04-12T15-55-23-100Z-6b52bdd3/`.
- 2026-04-13: Implemented restart replacement hardening (`previous_child_pid` capture, process-group exit wait, force-clean fallback, and supervised-child status output), sticky stuck-refresh abort guards in `providerIssueHandoff.ts`, focused regressions, and operator runbook updates.
- 2026-04-13: Manifest-backed standalone review failed with a bounded `command-intent` violation, so the lane used the allowed manual fallback review, found and fixed the descendant-collateral bug in restart cleanup, then reran the validation floor successfully.
- 2026-04-13: Filed follow-up `CO-164` for the adjacent generic control-host teardown path so CO-163 stays bounded to supervise restart/orphan cleanup.
- 2026-04-13: The first PR bot pass identified one remaining kill-safety gap: a reused stale `child_pid` could point at an unrelated process group. The final diff now validates the tracked PID command identity before forced cleanup and reran the full validation floor successfully.
- 2026-04-13: The later PR feedback sweep identified two more fail-closed gaps after `restart_required`: idle public refresh/poll entrypoints could restart work, and same-process concurrent `state.polling.restart_required` snapshots could still allow later direct issue reads. The final diff added the corresponding public-lifecycle and provider-handoff regressions, reran the full validation floor (`3657` tests), and closed with the documented manual review plus elegance fallback after the wrapper stalled without a fresh terminal verdict.
- 2026-04-13: The next current-head CodeRabbit rereview surfaced two real bounded gaps and one deliberate-contract question. The lane fixed the sticky `provider_refresh_lifecycle_stuck` reason overwrite in `scheduleProviderPolling(...)`, corrected the injected `ensureTrackedProcessTreeExited(...)` option typing, pushed back on restart-time inheritance of persisted stuck state because startup intentionally preserves the stale snapshot for observability while still allowing a fresh host attempt, reran the full validation floor (`3658` tests), and recorded a second bounded standalone-review wrapper failure before closing with a no-new-findings manual fallback plus elegance pass.
- 2026-04-13: A final current-head Codex review thread found one last supervision cleanup race: after timeout, the code could still call `SIGKILL` even if the tracked process group had already disappeared between identity verification and the kill step. The fix now re-enumerates the tracked group immediately before force cleanup, skips the kill when the group is already gone, adds a focused `ControlHostSupervision.test.ts` regression for that path, reruns the full validation floor (`3659` tests), and records a third bounded standalone-review wrapper failure before closing with a no-new-findings manual fallback plus elegance pass.
- 2026-04-13: The subsequent current-head Codex rereview found one final fail-closed gap in that follow-up: the new pre-kill re-enumeration checks still mapped `listProcessGroupPids` probe errors to `[]`, which could incorrectly report `exited_after_kickstart` when `ps` failed. The lane removed those false-success fallbacks, added `fails closed when the tracked process-group recheck errors before force cleanup`, reran the full validation floor (`3660` tests), and recorded a fourth bounded standalone-review wrapper failure before closing with a no-new-findings manual fallback plus elegance pass.
- 2026-04-13: The latest standalone-review wrapper rerun independently reproduced the macOS `ps -o args=` path-with-spaces behavior for `cliEntrypoint`, which exposed that the new token parser would stop matching legitimate supervised hosts in that environment before the wrapper again hit the bounded `command-intent` review boundary. The final diff restored `command.includes(config.cliEntrypoint)` compatibility while keeping exact task/run/pipeline matching, added the focused supervision compatibility regression plus the final provider-handoff refresh regression, reran the full validation floor (`3663` tests), and closed with a fifth bounded wrapper failure followed by a no-new-findings manual fallback plus elegance pass.
- 2026-05-13: CO-530 legacy docs-freshness cleanup aligned this historical packet with live Linear terminal evidence. `CO-163` was verified as `Done` / completed, so the checklist no longer presents pending handoff rows while its registry entries are archived as completed-lane historical metadata.

## Relevant Files
- `orchestrator/src/cli/controlHostSupervisionCliShell.ts`
- `orchestrator/src/cli/control/controlHostOwnership.ts`
- `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
- `orchestrator/src/cli/control/providerIssueHandoff.ts`
- `orchestrator/src/cli/control/providerPollingHealth.ts`
- `orchestrator/tests/ControlHostSupervision.test.ts`
- `orchestrator/tests/ControlServerPublicLifecycle.test.ts`
- `orchestrator/tests/ProviderIssueHandoff.test.ts`
- `docs/public/provider-onboarding.md`

## Notes
- This lane intentionally builds on `CO-152` ownership protection instead of reopening startup ownership design.
- Same-issue child lanes stayed serial in this turn because supervision restart cleanup and stuck-refresh abort share the same control-host ownership and polling contract.
- The final restart cleanup only SIGKILLs the stale supervised control-host process group, preserves out-of-group descendants, and now keeps legitimate supervised hosts matchable even when `cliEntrypoint` lives under a path containing spaces.
- The final `providerIssueHandoff` diff also covers active-run rehydrate metadata refresh, not just later poll/fresh-discovery reads, so a mid-rehydrate `provider_refresh_lifecycle_stuck` classification now suppresses subsequent direct issue-by-id rereads in the same recovery pass.

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

## Validation
- [x] Focused regression tests for supervision restart/orphan cleanup and stuck-refresh abort. Evidence: `npx vitest run orchestrator/tests/ControlHostSupervision.test.ts orchestrator/tests/ProviderIssueHandoff.test.ts` passed after the final descendant-preservation fix.
- [x] `node scripts/delegation-guard.mjs`. Evidence: `Delegation guard: OK (2 subagent manifest(s) found).`
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `✅ Spec guard: OK`
- [x] `npm run build`. Evidence: passed on the final diff.
- [x] `npm run lint`. Evidence: passed on the final diff.
- [x] `npm run test`. Evidence: passed on the final diff with `333` files / `3650` tests green.
- [x] `npm run docs:check`. Evidence: `✅ docs:check: OK`
- [x] `npm run docs:freshness`. Evidence: `docs:freshness OK - 3713 docs, 3716 registry entries`
- [x] `npm run repo:stewardship`. Evidence: `repo:stewardship OK - 4692 tracked files, 0 action-required`
- [x] `node scripts/diff-budget.mjs`. Evidence: `✅ Diff budget: OK (scope=working-tree, files=13/25, lines=986/1200, +969/-17)`
- [x] Standalone review plus explicit elegance review before review handoff. Evidence: manifest-backed standalone review executed via `FORCE_CODEX_REVIEW=1 npm run review -- --uncommitted` but ended with `review_outcome: failed-boundary` / `termination_boundary.kind: command-intent` at `.runs/linear-b84c9a78-b62f-48fa-b1c4-88f8222535da/cli/2026-04-12T15-41-35-613Z-026f9583/review/telemetry.json`; manual fallback review then found and fixed the descendant-collateral bug in restart cleanup, and the final elegance pass found no further simplification worth the extra risk.
- [x] `npm run pack:smoke` if downstream-facing CLI surfaces change. Evidence: passed in the downstream mock install environment.

## Handoff
- [ ] PR attached to the issue. Evidence: pending.
- [ ] Latest `origin/main` merged into the branch before review-state transition. Evidence: pending.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition. Evidence: pending.
- [ ] Unresolved actionable review threads: `0` or explicit pushback recorded. Evidence: pending.
- [ ] Issue moved to `In Review`. Evidence: pending.

## Progress Log
- 2026-04-12: Issue moved to `In Progress`, same-turn parallelization decision recorded as serial due to overlapping supervision/ownership/polling scope, and branch `linear/co-163-harden-supervise-restart-orphan-burn` created from `main`.
- 2026-04-12: Source audit narrowed the lane to two concrete gaps: `restartControlHostSupervision(...)` currently only issues `launchctl kickstart -k`, and the active `providerIssueHandoff.poll(...)` loop has no sticky abort check once polling health is already classified as stuck.
- 2026-04-12: The audited child-stream docs-review path failed closed on missing provider control-host provenance for this worker manifest, so the lane used the truthful direct fallback and recorded a clean `review_outcome: clean-success` at `.runs/linear-b84c9a78-b62f-48fa-b1c4-88f8222535da-co-163-docs-review/cli/2026-04-12T15-55-23-100Z-6b52bdd3/`.
- 2026-04-13: Implemented restart replacement hardening (`previous_child_pid` capture, process-group exit wait, force-clean fallback, and supervised-child status output), sticky stuck-refresh abort guards in `providerIssueHandoff.ts`, focused regressions, and operator runbook updates.
- 2026-04-13: Manifest-backed standalone review failed with a bounded `command-intent` violation, so the lane used the allowed manual fallback review, found and fixed the descendant-collateral bug in restart cleanup, then reran the validation floor successfully.
- 2026-04-13: Filed follow-up `CO-164` for the adjacent generic control-host teardown path so CO-163 stays bounded to supervise restart/orphan cleanup.
- 2026-04-13: The first PR bot pass identified one remaining kill-safety gap: a reused stale `child_pid` could point at an unrelated process group. The final diff now validates the tracked PID command identity before forced cleanup and reran the full validation floor successfully.

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
- The final restart cleanup only SIGKILLs the stale supervised control-host process group, preserves out-of-group descendants, and skips forced cleanup entirely when the tracked PID no longer matches the supervised control-host command identity.

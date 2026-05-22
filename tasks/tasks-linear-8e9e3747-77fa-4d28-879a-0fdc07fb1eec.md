# Task Checklist - linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec

- Linear Issue: `CO-406` / `8e9e3747-77fa-4d28-879a-0fdc07fb1eec`
- MCP Task ID: `linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec`
- Primary PRD: `docs/PRD-linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`
- TECH_SPEC: `tasks/specs/linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`
- Worktree: .workspaces/linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec
- Branch: `linear/co-406-no-run-accepted-recover-capacity`

## Docs-First
- [x] Current `origin/main` worktree branch created after detached stale HEAD was detected. Evidence: branch `linear/co-406-no-run-accepted-recover-capacity` from `origin/main` `a952298b3f12e6bbdfc736ba3ce9f1b1322d5d94`.
- [x] PRD drafted with intent checksum, capacity matrix, non-goals, and acceptance criteria. Evidence: `docs/PRD-linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`.
- [x] TECH_SPEC drafted with issue-shaping contract, fallback/refactor decisions, and validation plan. Evidence: `tasks/specs/linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`, `docs/TECH_SPEC-linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`.
- [x] ACTION_PLAN drafted for parent implementation and child-lane sequencing. Evidence: `docs/ACTION_PLAN-linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec.md`.
- [x] Task registration mirrors updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Docs-review completed before implementation. Evidence: attempted manifests `.runs/linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec-docs-review/cli/2026-04-28T03-36-07-064Z-71f62a6f/manifest.json` and `.runs/linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec-docs-review/cli/2026-04-28T03-39-14-364Z-38e264be/manifest.json`; blocked by out-of-scope `docs:freshness:maintain` owner verification/stale baseline debt now filed as `CO-412`.

## Protected Issue Terms
- [x] `accepted pending-revalidation claims`
- [x] `run_id=null`
- [x] `run_manifest_path=null`
- [x] `launch_token=null`
- [x] `provider_issue_start_blocked:max_concurrency`
- [x] `provider_issue_rehydration_pending_revalidation`
- [x] `control_host_provider_worker_recover`
- [x] `recover/relaunch/nudge`
- [x] `running=2`
- [x] `max_allowed=3`
- [x] `provider-intake-state.json`
- [x] `co-status --format json`
- [x] `/ui/data.json`

## Child Lane
- [x] Pre-turn decomposition matrix recorded in the Linear workpad. Evidence: workpad comment `2805e8aa-a832-4f9e-b492-5727cbb5b1ff`.
- [x] Parallelization decision recorded as `parallelize_now` / `independent_scope_available`. Evidence: `linear parallelization --issue-id 8e9e3747-77fa-4d28-879a-0fdc07fb1eec`.
- [x] Same-issue tests child lane reaches terminal status. Evidence: `.runs/linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec-no-run-capacity-regression/cli/2026-04-28T03-29-34-077Z-7236a3f1/manifest.json`.
- [x] Parent accepts, rejects, or invalidates child-lane patch before editing delegated test files. Evidence: accept attempt invalidated the lane as `provider_worker_child_lane_stale` after Linear `updated_at` changed; parent then ran `git apply --check` and applied `.runs/linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec-no-run-capacity-regression/cli/2026-04-28T03-29-34-077Z-7236a3f1/provider-linear-child-lane.patch` manually.

## Implementation
- [x] Inspect accepted-claim occupancy logic in `providerIssueHandoff.ts`, `controlRuntime.ts`, and provider-intake helpers. Evidence: `shouldProviderClaimOccupyAdmissionSlot` excludes `accepted`, provider-intake summaries already distinguish active claims from `state=running` claims, and control-runtime keeps accepted pending-revalidation active only for status truth.
- [x] Add or reuse a capacity predicate that excludes accepted pending-revalidation no-run/no-launch claims from running/launching capacity. Evidence: reused existing admission occupancy classification and pinned it with `ProviderIssueHandoff` regression coverage.
- [x] Apply the predicate to recover/relaunch/nudge retry admission so same-issue no-run residue cannot self-block as `provider_issue_start_blocked:max_concurrency`. Evidence: focused `ProviderIssueHandoff` regression for `running=2`, `max_allowed=3`, plus same-issue accepted no-run claim.
- [x] Preserve duplicate launch protection for real running/launching claims. Evidence: focused `ProviderIssueHandoff` duplicate-running and launch-inflight regressions.
- [x] Align `co-status --format json`, `/ui/data.json`, and provider-intake summaries on active/no-run versus running truth. Evidence: focused `ControlRuntime` status/UI regression for accepted no-run pending-revalidation claim.

## Validation
- [x] JSON parse check for `tasks/index.json`.
- [x] JSON parse check for `docs/docs-freshness-registry.json`.
- [x] Protected-term coverage check for packet files and `docs/TASKS.md`.
- [x] `git diff --check`.
- [x] `node scripts/delegation-guard.mjs`. Evidence: 3 subagent manifests found.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: command exited 0 on current `origin/main`.
- [x] Focused provider-worker/control-runtime regressions. Evidence: `npx vitest run orchestrator/tests/ProviderIssueHandoff.test.ts -t "no-run pending-revalidation|does not relaunch a same-issue"` and `npx vitest run orchestrator/tests/ControlRuntime.test.ts -t "accepted no-run pending-revalidation|serializes concurrent running provider intake"`.
- [x] `npm run build`.
- [x] `npm run lint`. Evidence: passed with pre-existing `DelegationMcpHealth.test.ts` `no-explicit-any` warnings.
- [x] `npm run test`. Evidence: full suite hit one loaded-suite `ControlRuntime` timeout; the exact failed test and full `ControlRuntime.test.ts` reran cleanly on current `origin/main`.
- [x] `npm run docs:check`. Evidence: passed after preserving CO-406 and CO-404 snapshots and compacting one legacy 0101 update pair to keep `docs/TASKS.md` below the hard cap.
- [x] `npm run docs:freshness`. Evidence: failed on unrelated stale docs baseline; `npm run docs:freshness:maintain -- --format json` reported `freshness_decision=block_unowned_repo_debt`, `blocking_changed_paths=[]`, and terminal configured owner `CO-401`; follow-up `CO-412` owns refresh. Waiver owner: `CO-412`; expiry: when `CO-412` resolves or 2026-05-05, whichever comes first.
- [x] `npm run repo:stewardship`.
- [x] `node scripts/diff-budget.mjs`.
- [x] `npm run pack:smoke` skip justified. Evidence: diff only touches docs/task registration and tests, not CLI/package/skills/review-wrapper downstream npm surfaces.
- [x] Standalone review executed with manifest-backed `FORCE_CODEX_REVIEW=1` evidence. Evidence: `.runs/linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec/cli/2026-04-28T03-24-10-840Z-68459578/review/telemetry.json` reports `status=succeeded`, `review_outcome=clean-success`.
- [x] Elegance/minimality pass completed after review findings. Evidence: `out/linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec/manual/elegance-review.md`.
- [x] PR attached, checks green, latest `origin/main` merged, and `ready-review` drained cleanly before `In Review`.

## Progress Log
- 2026-04-28: live Linear issue context showed CO-406 in `Ready` with no attached PR and no workpad; moved to `In Progress`, switched stale detached workspace to branch `linear/co-406-no-run-accepted-recover-capacity` from current `origin/main`, created the single workpad, recorded pre-turn decomposition, and recorded `parallelize_now`.
- 2026-04-28: parent created the docs-first packet and mirrors; JSON mirrors parsed and protected-term scan passed.
- 2026-04-28: docs-review child stream failed on unrelated `docs:freshness:maintain` owner/baseline debt; filed canonical follow-up `CO-412` and kept CO-406 scoped.
- 2026-04-28: tests child lane reached terminal success, but accept was invalidated by stale Linear `updated_at`; parent manually applied the checked patch and added the status/UI read-model regression.
- 2026-04-28: synced to current `origin/main` `3e9da5228`, preserved the newly landed CO-404 docs packet, compacted one legacy 0101 docs/TASKS update pair to restore hard-limit headroom, and reran validation. The floor passes except `docs:freshness`, which is waived to `CO-412` because `blocking_changed_paths=[]` and the configured owner `CO-401` is terminal; standalone review rerun completed clean-success and final elegance review found no simplification edits.

## Notes
- `no-run-capacity-regression` is no longer active; child patch was invalidated by stale Linear metadata and reconciled manually in the parent.
- Do not change CO-404 acknowledgement-timeout behavior.
- Do not weaken duplicate provider-worker launch protection.

## CO-575 terminal lifecycle reconciliation

- 2026-05-22: Historical open checklist residue was reconciled under CO-575 after tasks/index and live Linear terminal evidence showed this task is already complete. This allows implementation-docs archival to preserve the full packet on doc-archives without keeping active docs-freshness debt open on main.

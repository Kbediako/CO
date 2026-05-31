# Task Checklist - CO-588

## Docs-First
- [x] PRD, TECH_SPEC mirror, ACTION_PLAN, canonical task spec, task checklist, and agent mirror created for `linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2`.
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` register the CO-588 packet.
- [x] Protected terms are visible: `docs-first`, `subagents`, `Linear issue consolidation`, `docs:freshness:maintain`, `block_spec_guard_pre_expiry`, `WIP under 4`, `gpt-5.5/xhigh`, `CO-579`, `CO-490`, `CO-519`, `CO-520`, `CO-524`, `CO-528`, `CO-537`, `CO-561`, `CO-588`.

## Decomposition
- [x] Same-turn decomposition matrix recorded in CO-588 Linear workpad and `docs/ACTION_PLAN-linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2.md`.
- [x] Exactly one parallelization decision recorded: `parallelize_now` / `independent_scope_available`.
- [x] Bounded subagent `linear-audit` completed read-only grouping and WIP evidence. Evidence: `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/linear-consolidation-audit.md`.
- [x] Bounded subagent `docs-freshness` classified current blockers and did not make unsafe tracked edits. Evidence: `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/docs-freshness-remediation.md`, `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/subagents/docs-freshness.json`, and `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/subagents/docs-freshness-maintain.json`.
- [x] Bounded subagent `automation-map` grouped review/goals/label automation overlaps into three minimal workstreams. Evidence: `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/review-goals-labels-map.md`.
- [x] Bounded subagent `process-monitor` reported no safe kill recommendation; parent checkpoint supersedes worktree-local EPERM/ENOENT host-health evidence. Evidence: `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/process-hygiene.md` plus parent/root checkpoint on 2026-05-31 confirming shared-root `co-status` healthy/current and only expected CO-588 worker processes.
- [x] Bounded docs-freshness write/review slices cleared the active spec pre-expiry and completed-lane cohort-cap blockers without cap raises, gate weakening, broad Linear reads, or CO-579/CO-490 mutation. Evidence: `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/spec-pre-expiry-remediation.md`, `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/spec-pre-expiry-verifier.md`, `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/cohort-cap-remediation.md`, and `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/cohort-cap-verifier.md`.

## Acceptance
- [x] CO-588 docs-first packet remains linked from `tasks/index.json`, `docs/TASKS.md`, `.agent/task`, and `docs/docs-freshness-registry.json`. Evidence: `tasks/index.json` item `20260531-linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2`, first `docs/TASKS.md` snapshot row, `.agent/task/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2.md`, and active registry rows for the CO-588 packet paths.
- [ ] Current open CO issues are grouped into a small set of consolidated workstreams with verified Linear labels and related/parent/duplicate links.
- [ ] Duplicate or superseded backlog issues are linked or marked without creating new issue fanout.
- [x] Docs-freshness blockers are resolved or routed with proof from `docs:freshness` and `docs:freshness:maintain -- --format json`. Evidence: `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/post-cohort-cap-docs-freshness.json` reports `stale_entries=0` and `terminal_lifecycle_entries=0`; `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/post-cohort-cap-docs-freshness-maintenance.json` reports `freshness_decision=clean`, `candidate_entries=0`, `policy_capacity_status.status=no_candidates`, and `blocks_handoff=false`.
- [x] CO-579 remains Backlog/non-terminal as passive `docs:freshness:maintain` owner and receives no CO-588 PR deliverable. Evidence: `bin/codex-orchestrator.js linear issue-context --issue-id CO-579 --format json` reported `state=Backlog`, `stateType=backlog`.
- [ ] CO-490 remains Blocked unless fresh cloud environment evidence changes.
- [x] WIP remains under 4, preferably 1-2 active issues. Evidence: `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/linear-consolidation-audit.md` records WIP as 1 active (`CO-588`) or 2 when counting blocked governance posture (`CO-588`, `CO-490`), and parent/root `co-status` evidence records `running=0`, `retrying=0`, `issues=0`.
- [ ] Parent-level validation, standalone review, elegance pass, PR checks, ready-review drain, merge, and shared-root closeout are recorded.

## Not Done If
- More fragmented Linear issues are created without prior CO-588 rationale.
- Full Linear `issue-context` pulls remain the primary coordination mechanism.
- CO-579 is terminal or deliverable-attached.
- CO-490 is unblocked without fresh cloud evidence.
- Docs freshness/spec/review gates are weakened.
- Parent-only implementation replaces bounded subagent execution.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Decision: expire the issue-by-issue orchestration fallback and expire CO-588's temporary passive-owner interpretation layer for CO-579 within the high-churn docs-freshness ownership cap. CO-579 itself remains passive/non-terminal while current owner policy still names it.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Linear orchestration | Repeated issue-by-issue orchestration substitutes for consolidated ownership. | expire fallback | CO-588 | Overlapping backlog lanes require coordination. | 2026-05-31 | 2026-05-31 | 30 days | Workstreams, relations, and labels make consolidated ownership explicit. | Linear consolidation audit and final workpad. |
| Passive docs-freshness owner | CO-588 temporarily guards against treating passive CO-579 owner evidence as an active deliverable or terminal closeout target. | expire fallback | CO-579 / CO-588 | `docs:freshness:maintain` resolves recurring owner to CO-579 while CO-588 coordinates active remediation. | 2026-05-26 | 2026-06-14 | 2026-06-25 | New approved owner policy replaces CO-579, or fresh review proves CO-579 is no longer Backlog/non-terminal live owner evidence. CO-579 remains passive/non-terminal while the policy still names it. | `docs:freshness:maintain -- --format json` plus live CO-579 state. |

## Validation
- [x] Shared root clean at `64f9fa32ad5ef808709108f052c9a6f9ebcaa930`, matching `origin/main`.
- [x] `bin/codex-orchestrator.js co-status --format json`: `running=0`, `retrying=0`, `issues=0`, `stuck=false`, `restart_required=false`, source root current.
- [x] `bin/codex-orchestrator.js control-host supervise status --format json`: live host healthy.
- [x] `gh pr list --state open --json ...`: no open PRs.
- [x] `bin/codex-orchestrator.js linear issue-context --issue-id CO-588 --format json`: CO-588 `In Progress`, no attached PR, no prior workpad.
- [x] CO-588 workpad created: comment `8a6569cf-56b5-4b33-b370-1d5185329260`.
- [x] `linear parallelization --decision parallelize_now --reason independent_scope_available`.
- [x] Successful docs-review rerun recorded after docs-freshness remediation. Evidence: `.runs/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/cli/2026-05-31T08-10-46-696Z-119e94a0/manifest.json` completed successfully with review contract verdict `clean`; final post-remediation reports `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/final-docs-freshness.json` and `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/final-docs-freshness-maintenance.json` are clean.
- [x] Task-scoped delegation manifest created for guard compliance. Evidence: `.runs/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2-guard/cli/2026-05-31T06-34-53-949Z-e615530c/manifest.json`.
- [x] `node scripts/delegation-guard.mjs`. Evidence: `node scripts/delegation-guard.mjs --task linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2` reported `Delegation guard: OK (4 subagent manifest(s) found)`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `MCP_RUNNER_TASK_ID=linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2 node scripts/spec-guard.mjs --dry-run` reported `Spec guard: OK`.
- [x] `npm run build`.
- [x] `npm run lint`. Evidence: passed with three existing warnings in `orchestrator/tests/DelegationMcpHealth.test.ts`.
- [x] `CODEX_NON_INTERACTIVE=1 npm run test`. Evidence: capped full test passed; the earlier bare uncapped full-suite failure is recorded as a timing/environment flake after the two reported files passed in a narrow rerun.
- [x] `CODEX_NON_INTERACTIVE=1 npm run docs:check`.
- [x] `npm run docs:freshness`. Evidence: `npm run docs:freshness -- --report out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/post-cohort-cap-docs-freshness.json` passed with `stale_entries=0`.
- [x] `npm run docs:freshness:maintain -- --format json`. Evidence: `npm run docs:freshness:maintain -- --format json --dry-run-linear-actions --report out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/post-cohort-cap-docs-freshness-maintenance.json` passed with `freshness_decision=clean` and `blocks_handoff=false`.
- [x] `CODEX_NON_INTERACTIVE=1 npm run repo:stewardship`. Evidence: 6834 tracked files, 0 action-required.
- [x] `node scripts/diff-budget.mjs` with CO-588 override. Evidence: `DIFF_BUDGET_OVERRIDE_REASON` accepted because the overage is localized to docs-first packet plus 26 spec metadata reviews and 150 freshness cohort classifications.
- [x] `codex-orchestrator review` / `npm run review` final pass. Evidence: `.runs/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/cli/2026-05-31T08-10-46-696Z-119e94a0/manifest.json` succeeded, all review wrapper commands exited `0`, and `review/contract.json` reports `overall_verdict=clean` with `spec_conformance`, `coding_standards`, `code_changes`, and `agent_loop` all clean.
- [x] Post-fix elegance review. Evidence: `codex review --uncommitted` session `019e7d24-2c41-7293-b6a4-531e4eeca7b8` ran on Codex `0.135.0` with `gpt-5.5` / `xhigh` and reported one P2 lifecycle gap: five retained terminal packet families still had active sibling `tasks/specs` registry rows. CO-588 addressed that by reclassifying those sibling spec rows as retained terminal packet history; clean rerun session `019e7d2b-b99b-7ed1-8ba2-84c20953aad7` found no actionable correctness issue after checking the registry lifecycle reclassification and freshness gates.
- [ ] PR checks, ready-review, merge, and shared-root closeout.

## Notes
- Low-token Linear policy is active for the entire lane.
- GPT Pro advisory is reserved for repeated/high-impact ambiguity only.
- Stashes are preserved; no stash drop is in scope.
- Process-health authority note: worktree-local `ps`/`co-status` EPERM/ENOENT from the process-monitor child is not control-host stale evidence. Parent/root checks from `/Users/kbediako/Code/CO` confirm the control host is healthy/current with zero active WIP, and only supervised control-host plus expected CO-588 worker processes are visible.

# Agent Task Mirror - CO-588

## Environment / Workspace Stamp
- Issue: CO-588 / `38f28b8d-bed2-42b8-b07c-d782c13da0c2`
- Worktree: `/Users/kbediako/Code/CO/.workspaces/linear-co-588-consolidated-orchestration`
- Branch: `linear/co-588-consolidated-orchestration`
- Base: `origin/main` at `64f9fa32ad5ef808709108f052c9a6f9ebcaa930`
- Linear state: `In Progress` / `started`
- Workpad comment: `8a6569cf-56b5-4b33-b370-1d5185329260`

## Plan
- [x] Verify shared root and control-host baseline.
- [x] Read live CO-588 issue context.
- [x] Create one persistent CO-588 workpad with decomposition matrix.
- [x] Record exactly one `linear parallelization` decision.
- [x] Create isolated CO-588 worktree and branch.
- [x] Create docs-first packet and registry mirrors.
- [x] Record successful docs-review after final docs-freshness remediation. Evidence: `.runs/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/cli/2026-05-31T08-10-46-696Z-119e94a0/manifest.json` completed successfully after the final `docs:freshness` stale count reached `0` and `docs:freshness:maintain` reported `freshness_decision=clean` / `blocks_handoff=false`.
- [x] Spawn bounded subagents and record their artifacts.
- [x] Integrate safe docs-freshness fixes from bounded write/review slices. Evidence: `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/spec-pre-expiry-remediation.md`, `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/spec-pre-expiry-verifier.md`, `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/cohort-cap-remediation.md`, and `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/cohort-cap-verifier.md`.
- [ ] Integrate Linear consolidation mutations after exact targeted issue reads.
- [ ] Validate, review, open PR, drain checks, merge, and close out CO-588.

## Acceptance Criteria
- [x] CO-588 packet remains linked from all task/docs registries. Evidence: `tasks/index.json`, `docs/TASKS.md`, `.agent/task/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2.md`, and `docs/docs-freshness-registry.json`.
- [ ] Current CO issues are grouped into a small linked workstream set.
- [ ] CO-579 remains Backlog/non-terminal and CO-490 remains Blocked absent fresh cloud evidence.
- [x] Docs-freshness blockers are resolved or routed without weakening gates. Evidence: `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/post-cohort-cap-docs-freshness.json` reports `stale_entries=0`; `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/post-cohort-cap-docs-freshness-maintenance.json` reports `freshness_decision=clean`, `candidate_entries=0`, and `blocks_handoff=false`.
- [x] WIP remains under 4. Evidence: `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/linear-consolidation-audit.md` and parent checkpoint root `co-status --format json --compact` with `running=0`, `retrying=0`, `issues=0`, `active_claim_count=0`.
- [x] Subagent execution evidence exists for non-trivial workstreams. Evidence: the completed artifacts listed in Notes plus the delegation guard manifest show bounded research, write, and verifier streams.

## Validation
- [x] `git status --short --branch` in shared root.
- [x] `bin/codex-orchestrator.js co-status --format json`.
- [x] `bin/codex-orchestrator.js control-host supervise status --format json`.
- [x] `gh pr list --state open --json ...`.
- [x] `bin/codex-orchestrator.js linear issue-context --issue-id CO-588 --format json`.
- [x] `bin/codex-orchestrator.js linear upsert-workpad --issue-id CO-588 --body-file /tmp/co588-workpad-startup.md --format json`.
- [x] `bin/codex-orchestrator.js linear parallelization --issue-id CO-588 --decision parallelize_now --reason independent_scope_available --summary ... --format json`.
- [x] docs-review rerun recorded. Evidence: `.runs/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/cli/2026-05-31T08-10-46-696Z-119e94a0/manifest.json` succeeded with review contract verdict `clean`; `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/final-docs-freshness.json` and `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/final-docs-freshness-maintenance.json` provide the post-remediation clean freshness evidence.
- [x] Delegation evidence manifest: `.runs/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2-guard/cli/2026-05-31T06-34-53-949Z-e615530c/manifest.json`.
- [x] delegation guard. Evidence: `node scripts/delegation-guard.mjs --task linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2` reported `Delegation guard: OK (4 subagent manifest(s) found)`.
- [x] spec guard. Evidence: `MCP_RUNNER_TASK_ID=linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2 node scripts/spec-guard.mjs --dry-run` reported `Spec guard: OK`.
- [x] docs freshness gates. Evidence: `npm run docs:freshness -- --report out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/post-cohort-cap-docs-freshness.json` passed; `npm run docs:freshness:maintain -- --format json --dry-run-linear-actions --report out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/post-cohort-cap-docs-freshness-maintenance.json` passed.
- [x] build, lint, capped full test, docs:check, final docs gates, stewardship, and diff budget override. Evidence: `npm run build`, `npm run lint`, `CODEX_NON_INTERACTIVE=1 npm run test`, `CODEX_NON_INTERACTIVE=1 npm run docs:check`, final freshness reports, `CODEX_NON_INTERACTIVE=1 npm run repo:stewardship`, and the CO-588 `DIFF_BUDGET_OVERRIDE_REASON` run all passed.
- [x] standalone review rerun. Evidence: `.runs/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/cli/2026-05-31T08-10-46-696Z-119e94a0/manifest.json` succeeded, all review wrapper commands exited `0`, and `review/contract.json` reports `overall_verdict=clean` with all four review axes clean.
- [x] post-fix elegance review. Evidence: `codex review --uncommitted` session `019e7d24-2c41-7293-b6a4-531e4eeca7b8` ran on Codex `0.135.0` with `gpt-5.5` / `xhigh` and reported one P2 lifecycle gap: five retained terminal packet families still had active sibling `tasks/specs` registry rows. CO-588 addressed that by reclassifying those sibling spec rows as retained terminal packet history; clean rerun session `019e7d2b-b99b-7ed1-8ba2-84c20953aad7` found no actionable correctness issue after checking the registry lifecycle reclassification and freshness gates.
- [ ] PR checks, ready-review, merge, and shared-root closeout.

## Notes
- Parent is coordinator/integrator/reviewer. Implementation/research/verification work should be delegated to bounded subagents with explicit ownership.
- Full Linear issue-context is reserved for CO-588 and mutation-required issues.
- Completed subagent artifacts: `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/linear-consolidation-audit.md`, `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/docs-freshness-remediation.md`, `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/review-goals-labels-map.md`, `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/process-hygiene.md`, `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/spec-pre-expiry-remediation.md`, `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/spec-pre-expiry-verifier.md`, `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/cohort-cap-remediation.md`, and `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/cohort-cap-verifier.md`.
- Parent/root checkpoint supersedes worktree-local process-health ambiguity: shared-root control-host is healthy/current with zero active WIP; do not classify it stale from worktree EPERM/ENOENT.
- Review note: the bare uncapped `npm run test` failure reproduced only in the full-suite environment; the narrow failing files passed together, and `CODEX_NON_INTERACTIVE=1 npm run test` passed as the capped evidence command.
- Fallback-expiry note: CO-588's temporary interpretation layer for passive CO-579 docs-freshness ownership is now an expiring high-churn fallback with next review `2026-06-14` and maximum lifetime `2026-06-25`; this does not make CO-579 terminal or attach CO-588 deliverables to CO-579.

# ACTION_PLAN - CO-588 consolidated CO orchestration for backlog completion

## Summary
- Goal: complete CO-588 end to end by consolidating overlapping CO backlog work into a small, linked workstream set while preserving gate integrity, shared-root posture, WIP limits, and delegated execution evidence.
- Scope: docs-first packet, Linear grouping, docs-freshness remediation/routing, review/goals/label workstream consolidation, process hygiene, validation, PR lifecycle, and final CO-588 closeout.
- Assumptions: shared root remains clean/latest main, control-host remains healthy, CO-579 remains passive Backlog owner, and CO-490 stays Blocked unless fresh cloud evidence changes.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `docs-first`, `subagents`, `Linear issue consolidation`, `docs:freshness:maintain`, `block_spec_guard_pre_expiry`, `WIP under 4`, `gpt-5.5/xhigh`, `CO-579`, `CO-490`, `CO-519`, `CO-520`, `CO-524`, `CO-528`, `CO-537`, `CO-561`, `CO-588`.
- Not done if: work expands into more Linear fanout, docs freshness gates are weakened, CO-579 is terminal or deliverable-attached, CO-490 is unblocked without fresh evidence, WIP exceeds 4, or parent-only implementation replaces bounded subagents.
- Pre-implementation issue-quality review: parent verified CO-588 `In Progress`, no attached PR, no prior workpad; shared root clean at `64f9fa32ad`; control-host healthy with zero active WIP; no open PRs; and current docs-freshness blocker evidence captured.
- Fallback / refactor decision: the lane touches fallback/seam surfaces. CO-588 expires issue-by-issue orchestration fallback within 30 days and also expires the temporary CO-579 passive-owner interpretation layer within the high-churn docs-freshness ownership cap. CO-579 itself remains passive/non-terminal while current owner policy still names it.
- Durable retention evidence: CO-579 retention is supported only while live Linear state remains non-terminal and `docs:freshness:maintain -- --format json` verifies it as the passive owner.
- Large-refactor check: defer broad provider-worker/review-wrapper refactors until subagent evidence shows grouped small workstreams cannot remove the fanout.

## Decomposition Matrix
| Candidate lane | File / phase scope | Dependencies | Overlap risk | Expected validation artifact | Child-lane owner | Cap-slot use |
| --- | --- | --- | --- | --- | --- | --- |
| Linear consolidation audit | Read-only Linear issue grouping, relation/label recommendations, WIP evidence | CO-588 context, Linear list/search summaries | Low: no repo writes | `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/linear-consolidation-audit.md` | subagent: linear-audit | read-only, no same-issue repo slot |
| Docs freshness remediation | Reports, registry/catalog classification, safe docs metadata repairs after docs-first | Current docs-freshness reports | Medium: docs metadata ownership | `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/docs-freshness-remediation.md` | subagent: docs-freshness | candidate 1/2 |
| Review/goals/label automation map | CO-519/CO-520/CO-524/CO-528/CO-537/CO-561 grouping | Linear search summaries | Low: read-only first pass | `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/review-goals-labels-map.md` | subagent: automation-map | read-only |
| Quota/stray process monitor | Local process and control-host status | None | Low: read-only | `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/process-hygiene.md` | subagent: process-monitor | read-only |

Decision: `parallelize_now` / `independent_scope_available`. The workpad records safe independent streams and the same-issue child cap is 0/2 -> 1/2 for the docs-freshness stream.

## Milestones & Sequencing
1. Create docs-first packet and registry mirrors.
2. Run docs-review and record manifest evidence.
3. Spawn bounded subagents for Linear consolidation, docs-freshness remediation, automation grouping, and process hygiene.
4. Integrate safe scoped fixes and Linear relation/label changes only after evidence.
5. Run implementation gate, full validation, standalone review, elegance pass, and open PR.
6. Drain checks/reviews with `ready-review`, merge, update shared root, refresh workpad, and transition CO-588 to Done if no true blocker remains.

## Subagent Evidence Snapshot
- `linear-audit`: completed read-only grouping and WIP proof at `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/linear-consolidation-audit.md`; recommendation is one active owner (`CO-588`), passive `CO-579`, blocked external `CO-490`, and three backlog workstream clusters.
- `docs-freshness`: completed classification at `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/docs-freshness-remediation.md`; the follow-up bounded write/review slices cleared the 26 active spec pre-expiry rows and the 150-row completed-lane cohort-cap blocker. Evidence: `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/spec-pre-expiry-remediation.md`, `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/spec-pre-expiry-verifier.md`, `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/cohort-cap-remediation.md`, `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/cohort-cap-verifier.md`, `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/post-cohort-cap-docs-freshness.json`, and `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/post-cohort-cap-docs-freshness-maintenance.json`.
- `automation-map`: completed read-only grouping at `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/review-goals-labels-map.md`; recommended minimal workstreams are governed review/preflight automation, provider-worker goals from Linear truth, and release/follow-up label determinism.
- `process-monitor`: completed partial process artifact at `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/process-hygiene.md`; parent/root checkpoint supersedes worktree-local EPERM/ENOENT evidence and confirms control-host healthy/current with zero active WIP.
- Guard proof: `.runs/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2-guard/cli/2026-05-31T06-34-53-949Z-e615530c/manifest.json` succeeded and provides manifest-backed delegation evidence for later guard runs.

## Dependencies
- Linear issue list/search/comment/update APIs and repo `linear` helper.
- Current docs-freshness reports from `npm run docs:freshness` and `npm run docs:freshness:maintain -- --format json`.
- GitHub PR/check/review state.
- Healthy local control-host and clean shared root.

## Validation
- Checks / tests: docs-review, delegation guard, spec guard, build, lint, test, docs:check, docs:freshness, docs:freshness:maintain, repo:stewardship, diff budget, standalone review, elegance pass, PR checks, ready-review.
- Current validation checkpoint: JSON parse, `git diff --check`, task-scoped delegation guard, spec guard, `docs:freshness`, and `docs:freshness:maintain -- --format json --dry-run-linear-actions` passed after the spec-pre-expiry and cohort-cap slices. `docs:freshness:maintain` now reports `freshness_decision=clean`, `candidate_entries=0`, `policy_capacity_status.status=no_candidates`, and `blocks_handoff=false`.
- Rollback plan: before merge, revert CO-588 branch and undo external Linear mutations only when they are proven incorrect; do not drop stashes or mutate CO-579/CO-490 contrary to policy.

## Risks & Mitigations
- Risk: grouping audit burns Linear tokens. Mitigation: prefer `list_issues`/search summaries, one targeted context per mutation, and local artifacts.
- Risk: docs-freshness remediation becomes another broad freshness lane. Mitigation: classify rows and implement only safe scoped fixes; route retained or external blockers explicitly.
- Risk: consolidation hides real owner boundaries. Mitigation: no new issue or duplicate/parent mutation without evidence artifact and workpad rationale.
- Risk: review quota or long waits interrupt handoff. Mitigation: use long-poll monitoring; record quota evidence or wait to terminal state.

## Approvals
- Reviewer: parent CO orchestrator
- Date: 2026-05-31

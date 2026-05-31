---
id: 20260531-linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2
title: CO-588 consolidated CO orchestration for backlog completion
relates_to: docs/PRD-linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2.md
risk: high
owners:
  - Codex
last_review: 2026-05-31
---

## Summary
- Objective: coordinate CO backlog completion through one consolidated control lane that reduces Linear/token fanout while preserving strict gates, shared-root posture, and bounded delegated execution.
- Scope: docs-first packet, Linear consolidation audit, docs-freshness remediation/routing, review/goals/label automation grouping, process hygiene, validation, PR/review/merge closeout, and Linear lifecycle truth for CO-588.
- Constraints: keep CO-579 passive Backlog/non-terminal, keep CO-490 Blocked absent fresh cloud evidence, keep WIP under 4, avoid new issue fanout, and use gpt-5.5/xhigh or newer approved posture for subagents/reviews.

## Issue-Shaping Contract
- User-request translation carried forward: consolidate overlapping CO work into a small set of linked workstreams and oversee completion from CO-588 instead of burning tokens on issue-by-issue orchestration.
- Protected terms / exact artifact and surface names: `docs-first`, `subagents`, `Linear issue consolidation`, `docs:freshness:maintain`, `block_spec_guard_pre_expiry`, `WIP under 4`, `gpt-5.5/xhigh`, `CO-579`, `CO-490`, `CO-519`, `CO-520`, `CO-524`, `CO-528`, `CO-537`, `CO-561`, `co-status --format json`, `## Codex Workpad`, `linear parallelization`.
- Nearby wrong interpretations to reject: do not create fresh issues for every recurrence, do not close CO-579, do not unblock CO-490 without fresh evidence, do not weaken gates, and do not bypass delegated execution.
- Explicit non-goals carried forward: no broad provider-worker rewrite, no cloud unblock without evidence, no stale stash cleanup, no root shared-checkout edits outside controlled closeout.

## Parity / Alignment Matrix
| Surface | Current truth | Reference truth | Target truth / intended delta | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Active issue control | CO-588 is In Progress and owns consolidated execution. | CO-588 issue description and workpad. | One parent lane coordinates a small workstream set, with related/duplicate/parent links only after evidence. | Moving dormant backlog issues to In Progress just to inspect. |
| Docs freshness | CO-588 branch now has local post-remediation evidence that `docs:freshness` and `docs:freshness:maintain` are clean after the active-spec and cohort-cap slices. | Machine-readable freshness reports. | Safe rows are remediated; remaining strict public/current pre-expiry advisories stay visible without blocking handoff or weakening gate behavior. | Cap raising, blind last_review bumping, historical deletion. |
| Review/goals/label automation | CO-519/CO-520/CO-524/CO-528/CO-537/CO-561 overlap. | Low-token Linear grouping audit. | Minimal linked workstream set with no duplicate active lanes. | Implementing every feature in the first PR. |
| Execution ownership | Parent is coordinator. | Subagent ledger and artifacts. | Subagents own bounded research/implementation/verification streams; parent integrates and reviews. | GPT Pro as deterministic authority. |

## Readiness Gate
- Not done if: CO-588 lacks linked docs packet/evidence, Linear grouping is not reflected in Linear, docs-freshness blockers remain unexplained, or WIP exceeds 4.
- Pre-implementation issue-quality review evidence: live CO-588 `issue-context`, workpad `8a6569cf-56b5-4b33-b370-1d5185329260`, clean shared root at `64f9fa32ad`, healthy `co-status`, no open PRs, and recorded `parallelize_now` / `independent_scope_available`.
- Safeguard ownership split: parent owns CO-588 lifecycle, workpad, integration, reviews, and final merge/closeout; subagents own bounded streams and return artifacts.

## Technical Requirements
- Functional requirements:
  - Create and maintain CO-588 docs-first packet and task/registry mirrors.
  - Record exactly one active CO-588 workpad and keep it current through milestones.
  - Use low-token Linear issue list/search summaries for grouping; use full issue context only before mutations.
  - Produce a grouping map for CO-579, CO-490, CO-519, CO-520, CO-524, CO-528, CO-537, CO-561, and any discovered duplicate/superseded backlog items.
  - Classify docs-freshness rows into safe repair, retained-owner action, real review, or explicit external blocker routing.
  - Preserve fail-closed behavior for `docs:freshness`, `docs:freshness:maintain`, `spec-guard`, standalone review, and ready-review.
- Non-functional requirements: concise artifacts, reproducible evidence paths, no shared-root drift, bounded subagent ownership, deterministic validation before lifecycle transitions.
- Interfaces / contracts: Linear app issue/comment/list APIs, repo `linear` helper commands, `co-status --format json`, docs freshness scripts, task registry, docs freshness registry, GitHub PR checks/reviews.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Linear orchestration | Repeated issue-by-issue orchestration substitutes for consolidated ownership. | expire fallback | CO-588 | Overlapping backlog lanes require coordination. | 2026-05-31 | 2026-05-31 | 30 days | Workstreams, relations, and labels make the consolidated ownership explicit. | Linear consolidation audit and final workpad. |
| Passive docs-freshness owner | CO-588 temporarily guards against treating passive CO-579 owner evidence as an active deliverable or terminal closeout target. | expire fallback | CO-579 / CO-588 | `docs:freshness:maintain` resolves recurring owner to CO-579 while CO-588 coordinates active remediation. | 2026-05-26 | 2026-06-14 | 2026-06-25 | A newer approved owner policy replaces CO-579, or fresh review proves CO-579 is no longer Backlog/non-terminal live owner evidence. CO-579 remains passive/non-terminal while the policy still names it. | `docs:freshness:maintain -- --format json` plus live CO-579 state. |

## Architecture & Data
- Architecture / design adjustments: no initial source architecture changes; first PR should land planning, grouping, and safe scoped repairs only. Larger code refactors require subagent evidence and a fresh fallback/refactor decision.
- Data model changes / migrations: none expected for the docs-first packet. Linear relation/label updates are external state mutations and must be recorded in the workpad/artifacts.
- External dependencies / integrations: Linear, GitHub PR state, local control-host, Codex review tooling.

## Validation Plan
- Tests / checks: docs-review before implementation, delegation guard, spec guard, build, lint, tests, docs:check, docs:freshness, docs:freshness:maintain, repo stewardship, diff budget, standalone review, elegance pass, PR checks, ready-review.
- Rollout verification: Linear workpad references subagent artifacts, PR evidence, review verdict, ready-review quiet window, merge, shared-root closeout, and final CO-588 transition.
- Monitoring / alerts: process hygiene stream checks stray `codex exec`/subagent processes and reports only actionable items.

## Open Questions
- Which issue relation mutations are necessary after low-token audit?
- Which Linear labels already exist for the three workstream groups, and should CO-588 avoid new labels in favor of workpad grouping plus existing relation edges?

## Evidence Update - 2026-05-31
- Active spec pre-expiry remediation evidence: `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/spec-pre-expiry-remediation.md` and `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/spec-pre-expiry-verifier.md`.
- Completed-lane cohort-cap remediation evidence: `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/cohort-cap-remediation.md` and `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/cohort-cap-verifier.md`.
- Post-remediation freshness proof: `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/post-cohort-cap-docs-freshness.json` reports `stale_entries=0`; `out/linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2/post-cohort-cap-docs-freshness-maintenance.json` reports `freshness_decision=clean`, `candidate_entries=0`, `policy_capacity_status.status=no_candidates`, and `blocks_handoff=false`.

## Approvals
- Reviewer: parent CO orchestrator
- Date: 2026-05-31

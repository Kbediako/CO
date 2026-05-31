# PRD - CO-588 consolidated CO orchestration for backlog completion

## Traceability
- Linear issue: `CO-588` / `38f28b8d-bed2-42b8-b07c-d782c13da0c2`
- Task id: `linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2`
- Registry id: `20260531-linear-38f28b8d-bed2-42b8-b07c-d782c13da0c2`
- Canonical owner key: `co:consolidated-orchestration:2026-05-31`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=co:consolidated-orchestration:2026-05-31`
- Live issue-context evidence: `bin/codex-orchestrator.js linear issue-context --issue-id CO-588 --format json` returned `In Progress` / `started`, no attached PR, and no prior workpad on 2026-05-31.

## Summary
- Problem Statement: CO backlog execution is burning too many tokens and Linear mutations through issue-by-issue orchestration. Overlapping docs-freshness, review, goal, label, and automation issues are being inspected and worked as separate active lanes even when one consolidated control lane can group them.
- Desired Outcome: CO-588 becomes the consolidated control lane that keeps shared-root latest-main posture, keeps WIP under 4, delegates bounded execution streams, consolidates overlapping backlog into a small set of linked workstreams, and resolves or truthfully routes current `docs:freshness:maintain` blockers without weakening gates.

## User Request Translation
- The operator wants a dedicated orchestration thread that coordinates completion, not another narrow freshness ticket.
- The thread must use docs-first planning, then bounded subagents for execution and verification while the parent integrates and decides.
- Linear API usage must stay low: use full `issue-context` only for CO-588 or mutation-required issues; prefer issue list/search summaries, local `co-status`, GitHub PR state, and repo artifacts.
- CO-579 must remain Backlog/non-terminal as passive `docs:freshness:maintain` owner, and CO-490 must remain Blocked unless fresh cloud evidence changes.

## Intent Checksum
- Exact wording / phrases to preserve: `docs-first`, `subagents`, `Linear issue consolidation`, `docs:freshness:maintain`, `block_spec_guard_pre_expiry`, `WIP under 4`, `gpt-5.5/xhigh`, `CO-579`, `CO-490`, `CO-519`, `CO-520`, `CO-524`, `CO-528`, `CO-537`, `CO-561`, `CO-588`.
- Protected terms / exact artifact and surface names: `co-status --format json`, `docs:freshness`, `docs:freshness:maintain -- --format json`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `## Codex Workpad`, `linear parallelization`, `ready-review`, `review_verdict`.
- Nearby wrong interpretations to reject: do not create more fragmented Linear issues for every recurrence, do not close CO-579 as a deliverable, do not attach CO-588 PRs to CO-579, do not move dormant backlog issues to In Progress just to inspect them, do not weaken `docs:freshness` or `spec-guard`, do not use gpt-5.4 fallback without concrete access failure, and do not let the parent implement everything without delegated execution.

## Parity / Alignment Matrix
| Surface | Current truth | Reference truth | Target truth / intended delta | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Linear orchestration | Backlog contains overlapping CO-519/CO-520/CO-524/CO-528/CO-537/CO-561 plus passive owner CO-579 and blocked cloud CO-490. | CO-588 issue description defines the consolidated owner and low-token policy. | Group issues into a small linked workstream set and mutate only when evidence supports labels, relations, duplicates, or parentage. | Creating new issues before proving a separate owner boundary. |
| Docs freshness blockers | CO-588 branch has resolved the active spec pre-expiry and completed-lane cohort-cap blockers through bounded write/review slices. | `docs:freshness:maintain -- --format json` is the owner-truth surface. | Preserve the clean post-remediation gate state while strict public/current pre-expiry advisories remain visible as non-blocking direct-action work. | Blind date bumps, cap raises, historical deletion, or terminal CO-579 closeout. |
| Shared-root posture | Shared root is clean `main` at `64f9fa32ad`, control-host current, no open PRs. | Parent handoff requires shared root remain clean/latest. | CO-588 edits happen in isolated worktree/branch; shared root stays clean/latest for control-host. | Dropping stashes or broad shared-root cleanup. |
| Execution model | Parent thread could absorb all context and implementation. | Operator requested bounded subagents only for execution. | Parent coordinates/integrates/reviews; subagents own Linear audit, docs-freshness remediation, backlog grouping, and process hygiene streams. | GPT Pro replacing deterministic local checks. |

## Acceptance Criteria
1. The CO-588 docs-first packet is linked from `tasks/index.json`, `docs/TASKS.md`, `.agent/task`, and `docs/docs-freshness-registry.json`.
2. A single CO-588 `## Codex Workpad` records environment stamp, plan, acceptance criteria, validation, notes, low-token Linear policy, decomposition matrix, and exactly one `linear parallelization` decision.
3. Active WIP stays under 4, preferably 1-2 active issues, with CO-579 kept Backlog/non-terminal and CO-490 kept Blocked absent fresh cloud evidence.
4. Current CO issues are grouped into a small set of consolidated workstreams with evidence-backed related/parent/duplicate/label mutations.
5. Docs freshness blockers are resolved or routed with proof from `docs:freshness` and `docs:freshness:maintain -- --format json`; gates remain strict.
6. Execution and verification streams are delegated with bounded ownership, concise evidence artifacts, and parent-level integration/review.
7. CO-588 reaches Done only after PR merge, review/check drain, shared-root closeout, and Linear workpad closeout; otherwise a true user-required blocker names the exact decision needed.

## Not Done If
- More fragmented Linear issues are created without proven owner boundaries.
- Full Linear `issue-context` scans remain the primary coordination surface.
- CO-579 is terminal, marked Done, or receives CO-588 deliverables.
- CO-490 is unblocked without fresh cloud environment evidence.
- `docs:freshness`, `docs:freshness:maintain`, `spec-guard`, review gates, or WIP caps are weakened.
- The parent thread implements or verifies non-trivial work without bounded subagent evidence.

## Goals
- Consolidate overlapping CO backlog work into a small linked workstream set.
- Reduce token and Linear fanout while preserving deterministic state transitions.
- Clear or truthfully route docs-freshness blockers from current main.
- Preserve latest-main shared-root and healthy control-host posture.

## Non-Goals
- No new Linear issues unless a distinct owner boundary is proven and recorded in CO-588 first.
- No cloud unblock for CO-490 without fresh evidence.
- No terminal closeout or deliverable attachment for CO-579.
- No broad rewrite of provider-worker, review-wrapper, or docs-freshness architecture unless a subagent and review evidence show the small fix cannot work.

## Metrics & Guardrails
- WIP: fewer than 4 active issues; target 1-2 active issues.
- Linear API use: full `issue-context` reserved for active mutation targets.
- Gate integrity: docs freshness and spec guard fail closed until evidence resolves or routes blockers.
- Review integrity: standalone review, elegance pass, PR checks, review feedback, and ready-review drain complete before review/merge handoff.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- This lane touches fallback-facing governance surfaces because it coordinates docs-freshness ownership, review/goals/label automation, stale backlog routing, and blocked cloud posture. Each implementation stream must choose `remove fallback`, `expire fallback`, or `justify retaining fallback` before touching a fallback/seam.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CO-588 consolidation packet | Issue-by-issue Linear orchestration is used as the de facto fallback for overlapping backlog ownership. | expire fallback | CO-588 | Overlapping backlog issues require repeated full-context inspection. | 2026-05-31 | 2026-05-31 | 30 days | Backlog is grouped into durable workstreams and Linear relations/labels reflect the grouping. | Linear consolidation audit plus CO-588 workpad closeout. |
| `docs:freshness:maintain` owner truth | CO-588 temporarily guards against misreading passive recurring owner CO-579 as an active deliverable or terminal closeout target. | expire fallback | CO-579 / CO-588 | Candidate cohorts resolve to passive recurring docs-freshness ownership while CO-588 handles active remediation. | 2026-05-26 | 2026-06-14 | 2026-06-25 | A new approved passive owner policy replaces CO-579, or a fresh review confirms CO-579 is no longer Backlog/non-terminal live owner evidence. CO-579 itself remains passive/non-terminal while the policy still names it. | `docs:freshness:maintain -- --format json` owner evidence and CO-579 live state. |

## Open Questions
- Which backlog issues are duplicate/superseded after low-token Linear audit completes?
- Which exact Linear labels/relations should be applied after targeted issue-body confirmation for the three workstream groups?

## Approvals
- Pre-implementation issue-quality review: parent CO orchestrator self-approval after live CO-588 issue-context, clean shared-root/control-host verification, open PR audit, and docs-freshness baseline evidence.
- Date: 2026-05-31.

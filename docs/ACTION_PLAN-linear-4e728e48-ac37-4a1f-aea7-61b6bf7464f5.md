# ACTION_PLAN - CO appserver child lanes stall after runtime selection and leave the parent blocked on a synthetic launching reservation

## Summary
- Goal: create the docs-first packet for `CO-224` and define the bounded parent-owned path for pre-startup appserver child-lane stall recovery.
- Scope: packet files plus `tasks/index.json` and `docs/TASKS.md`, followed by parent-owned implementation and validation outside this child patch.
- Assumptions: the parent prompt carries the authoritative issue statement; the referenced source-0 payload is not available inside this checkout; current repo seams confirm that runtime selection happens inside `providerLinearChildLaneRunner` before child-run execution.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `provider-linear-child-lane`
  - `Child lane reserved before child run startup.`
  - synthetic launching reservation
  - runtime selection
  - `appserver`
  - `provider-linear-child-lane-proof.json`
  - `CO-210`
  - `CO-211`
  - `CO-218`
- Not done if:
  - parent can still remain indefinitely blocked on a synthetic launching reservation after runtime selection completed and startup never produced real child proof
  - the lane drifts into `CO-210` started-manifest hydration, `CO-211` refresh-stuck churn, or `CO-218` recovered-manifest repair
  - the proposed recovery path fabricates child proof or auto-accept semantics
  - the lane broadens into runtime-mode or scheduler redesign
- Pre-implementation issue-quality review:
  - 2026-04-18: bounded docs child lane confirmed from prompt-carried issue wording plus current source seams that `CO-224` is the missing pre-startup/appserver-stall boundary. It is broader than a render-only fix, narrower than generic runtime redesign, and explicitly separate from `CO-210`, `CO-211`, and `CO-218`. The micro-task path is ineligible because correctness depends on exact boundary wording and adjacent-issue separation.

## Milestones & Sequencing
1. Create the docs-first packet and bounded registry mirrors for `CO-224`.
2. Preserve the exact issue statement and cross-issue boundaries in the PRD, canonical spec, and action plan.
3. Parent inspects the child-lane startup seam in `providerLinearChildLaneRunner`, `providerLinearChildLaneShell`, `providerLinearWorkerRunner`, and `runtime/provider`.
4. Parent defines the smallest truthful startup-stall classification or recovery path for the post-runtime-selection / pre-proof gap.
5. Parent implements bounded unblocking so a synthetic launching reservation does not remain indefinitely active after stalled startup.
6. Parent adds focused regression coverage for startup-stall classification plus no-regression coverage for `CO-210`, `CO-211`, and `CO-218`.
7. Parent runs docs-review, focused validation, and remaining review/handoff steps in the authoritative workspace.

## Dependencies
- Linear issue `CO-224`
- Source anchor `ctx:sha256:b7611a224cd777bffc38c866661c0a8d2cdaf4f31619cac8fd78150f5b46cbea#chunk:c000001`
- Parent manifest `.runs/linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5-docs-packet/cli/2026-04-17T18-52-06-926Z-75ac64a4/manifest.json`
- Parent-owned implementation surfaces:
  - `orchestrator/src/cli/providerLinearChildLaneRunner.ts`
  - `orchestrator/src/cli/providerLinearChildLaneShell.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/runtime/provider.ts`
- Adjacent scope boundaries:
  - `CO-210` started child-manifest hydration
  - `CO-211` refresh-stuck restart churn with healthy workers
  - `CO-218` post-startup stale launching repair with recoverable manifest/proof evidence

## Validation
- Child-lane packet checks:
  - `jq empty tasks/index.json`
  - `git diff --check -- docs/PRD-linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5.md tasks/specs/linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5.md docs/ACTION_PLAN-linear-4e728e48-ac37-4a1f-aea7-61b6bf7464f5.md tasks/index.json docs/TASKS.md`
  - boundary grep over the touched packet files for `CO-210`, `CO-211`, `CO-218`, `synthetic launching reservation`, `runtime selection`, and `Child lane reserved before child run startup.`
- Parent implementation lane:
  - `**/*.{ts,tsx,js,jsx,json,md,yml,yaml,toml,ini,conf,config}` -> `node scripts/spec-guard.mjs --dry-run`
  - `**/{docs/**,skills/**,README.md}` -> `npm run docs:check`
  - `**/{docs/**,*.md}` -> `npm run docs:freshness`
  - `**/*` -> `node scripts/diff-budget.mjs`
  - focused startup-stall regression coverage
  - focused no-regression coverage for `CO-210`, `CO-211`, and `CO-218`
  - parent-owned docs-review before implementation
  - parent-selected validation and review after source edits
- Rollback posture:
  - if a bounded startup-stall fix cannot be completed without widening into runtime redesign or adjacent issue scopes, stop and relaunch with widened ownership instead of silently broadening the patch

## Risks & Mitigations
- Risk: the lane is misread as `CO-218` and wrongly assumes recoverable child proof already exists.
  - Mitigation: packet repeats that `CO-224` is the pre-startup gap where runtime selection happened but real startup proof did not.
- Risk: parent recovery path fabricates child success or auto-accepts a stalled child lane.
  - Mitigation: packet keeps truthful absence-of-proof and fail-closed authority as explicit acceptance criteria.
- Risk: the fix broadens into runtime-mode redesign or scheduler redesign.
  - Mitigation: packet confines the change to the startup/reservation seam and rejects general policy expansion.
- Risk: boundaries with `CO-210` and `CO-211` drift during implementation.
  - Mitigation: packet requires focused no-regression coverage and repeated boundary language in every touched mirror.

## Approvals
- Child packet: bounded same-issue docs child lane.
- Parent implementation/review/PR lifecycle: pending in the authoritative workspace.

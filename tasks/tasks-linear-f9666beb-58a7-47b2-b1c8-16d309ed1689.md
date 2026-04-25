# Task Checklist - linear-f9666beb-58a7-47b2-b1c8-16d309ed1689

- Linear Issue: `CO-302` / `f9666beb-58a7-47b2-b1c8-16d309ed1689`
- MCP Task ID: `linear-f9666beb-58a7-47b2-b1c8-16d309ed1689`
- Primary PRD: `docs/PRD-linear-f9666beb-58a7-47b2-b1c8-16d309ed1689.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-f9666beb-58a7-47b2-b1c8-16d309ed1689.md`
- Task spec: `tasks/specs/linear-f9666beb-58a7-47b2-b1c8-16d309ed1689.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-f9666beb-58a7-47b2-b1c8-16d309ed1689.md`
- Shared source 0 anchor: `ctx:sha256:d829d982421ba4529dabb021e70362809faafbd4fc438e1d113e8992538c858c#chunk:c000001`
- Source object id: `sha256:d829d982421ba4529dabb021e70362809faafbd4fc438e1d113e8992538c858c`
- Docs packet child-lane manifest: `.runs/linear-f9666beb-58a7-47b2-b1c8-16d309ed1689-docs-packet/cli/2026-04-22T05-53-20-299Z-b3f6fed4/manifest.json`

## Docs-First
- [x] PRD drafted for stale released blocker metadata re-blocking `CO-295` after `CO-300` is already `Done`. Evidence: `docs/PRD-linear-f9666beb-58a7-47b2-b1c8-16d309ed1689.md`.
- [x] TECH_SPEC drafted with issue-shaping contract, protected terms, readiness gate, parity/alignment matrix, Not Done If, and parent-owned validation requirements. Evidence: `tasks/specs/linear-f9666beb-58a7-47b2-b1c8-16d309ed1689.md`, `docs/TECH_SPEC-linear-f9666beb-58a7-47b2-b1c8-16d309ed1689.md`.
- [x] ACTION_PLAN drafted for parent implementation and closeout. Evidence: `docs/ACTION_PLAN-linear-f9666beb-58a7-47b2-b1c8-16d309ed1689.md`.
- [x] Task checklist and `.agent` mirror drafted within child-lane scope. Evidence: `tasks/tasks-linear-f9666beb-58a7-47b2-b1c8-16d309ed1689.md`, `.agent/task/linear-f9666beb-58a7-47b2-b1c8-16d309ed1689.md`.
- [x] Registry and snapshot mirrors updated within this docs lane. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Pre-implementation issue-quality review recorded in the TECH_SPEC readiness gate. Evidence: `tasks/specs/linear-f9666beb-58a7-47b2-b1c8-16d309ed1689.md`, `docs/TECH_SPEC-linear-f9666beb-58a7-47b2-b1c8-16d309ed1689.md`.

## Source / Assumptions
- [x] Shared source-0 metadata anchor recorded. Evidence: `ctx:sha256:d829d982421ba4529dabb021e70362809faafbd4fc438e1d113e8992538c858c#chunk:c000001`.
- [x] Child lane verified the shared source-0 payload is metadata/provenance only, not the substantive issue body. Evidence: `.runs/linear-f9666beb-58a7-47b2-b1c8-16d309ed1689-docs-packet/cli/2026-04-22T05-53-20-299Z-b3f6fed4/memory/source-0/source.txt`.
- [x] Child lane used read-only Linear issue `CO-302` as the authoritative issue description. Evidence: read-only Linear fetch returned updated issue body; no Linear mutation helpers were called.
- [x] Parent/child ownership split recorded. Evidence: this checklist, the PRD, and the TECH_SPEC readiness gate.

## Parent Implementation Acceptance
- [ ] Released/not-active claim refresh or reconcile logic drops, neutralizes, or explicitly ignores blocker links whose referenced issues are terminal (`Done` / canceled). Evidence: pending parent source diff and focused test.
- [ ] Poll/reconcile logic no longer transitions a live issue to `Blocked` from stale released-claim metadata when no non-terminal blocker remains. Evidence: pending parent regression.
- [ ] Focused regression coverage exists for the `CO-295` / `CO-300 Done` stale-blocker overwrite shape. Evidence: pending parent test run.
- [ ] If full automatic repair cannot happen immediately, stale terminal blocker state surfaces as explicit advisory evidence instead of silently overwriting live issue state. Evidence: pending parent artifact.
- [ ] Released-claim provenance remains auditable, including `provider_issue_released:not_active`, old run id, and unrelated provenance fields. Evidence: pending parent validation.
- [ ] Valid non-terminal blockers still block. Evidence: pending parent focused regression.
- [ ] The fix does not widen `CO-295`'s PR attachment ownership scope or weaken review/merge guardrails. Evidence: pending parent review.

## Validation
- [x] Docs child lane scoped JSON syntax check. Evidence: `jq empty tasks/index.json docs/docs-freshness-registry.json` exits `0`.
- [x] Docs child lane protected-term grep over the packet and mirrors. Evidence: fixed-string `rg` over protected terms across the six packet files, `docs/TASKS.md`, and `tasks/index.json` exits `0`.
- [x] Docs child lane scoped whitespace check. Evidence: `git diff --check -- docs/PRD-linear-f9666beb-58a7-47b2-b1c8-16d309ed1689.md docs/TECH_SPEC-linear-f9666beb-58a7-47b2-b1c8-16d309ed1689.md docs/ACTION_PLAN-linear-f9666beb-58a7-47b2-b1c8-16d309ed1689.md tasks/specs/linear-f9666beb-58a7-47b2-b1c8-16d309ed1689.md tasks/tasks-linear-f9666beb-58a7-47b2-b1c8-16d309ed1689.md .agent/task/linear-f9666beb-58a7-47b2-b1c8-16d309ed1689.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json` exits `0`.
- [ ] Parent focused regression for the stale released blocker overwrite seam. Evidence: pending parent test run.
- [ ] Parent docs-review evidence captured before implementation. Evidence: pending parent docs-review manifest.
- [ ] Parent ordered validation floor completes before PR handoff. Evidence: pending parent validation logs.

## Handoff Status
- [x] Child lane leaves packet and registry/checklist changes in place for patch export. Evidence: dirty working tree in this child workspace.
- [x] Parent acceptance through the helper was invalidated after the Linear workpad updated the issue timestamp; parent incorporated the scoped docs patch content directly and normalized the tasks index docs path to the TECH_SPEC string. Evidence: `.runs/linear-f9666beb-58a7-47b2-b1c8-16d309ed1689-docs-packet/cli/2026-04-22T05-53-20-299Z-b3f6fed4/provider-linear-child-lane.patch`, `tasks/index.json`.
- [ ] Parent updates Linear workpad and PR lifecycle artifacts. Evidence: pending parent lane.

## Progress Log
- 2026-04-22: Created the scoped docs-first packet from the read-only Linear `CO-302` issue body after confirming the shared source-0 payload is metadata-only.
- 2026-04-22: Preserved protected terms `provider-intake-state.json`, `provider_issue_released:not_active`, `issue_blocked_by`, `CO-295`, `CO-300`, `Done`, `Blocked`, released claim, queue truth, and stale blocker metadata.
- 2026-04-22: Preserved issue non-goals, Not Done If clauses, acceptance criteria, and parity/alignment matrix.
- 2026-04-22: Completed requested scoped checks: `jq empty`, protected-term `rg`, and `git diff --check`.
- 2026-04-22: Parent attempted child-lane acceptance; helper invalidated the lane because the issue `updated_at` changed after workpad creation, so parent applied the scoped docs content directly and kept patch provenance recorded here.

## Relevant Files
- `docs/PRD-linear-f9666beb-58a7-47b2-b1c8-16d309ed1689.md`
- `docs/TECH_SPEC-linear-f9666beb-58a7-47b2-b1c8-16d309ed1689.md`
- `docs/ACTION_PLAN-linear-f9666beb-58a7-47b2-b1c8-16d309ed1689.md`
- `tasks/specs/linear-f9666beb-58a7-47b2-b1c8-16d309ed1689.md`
- `tasks/tasks-linear-f9666beb-58a7-47b2-b1c8-16d309ed1689.md`
- `.agent/task/linear-f9666beb-58a7-47b2-b1c8-16d309ed1689.md`
- `tasks/index.json`
- `docs/TASKS.md`
- `docs/docs-freshness-registry.json`

## Notes
- Do not widen `CO-295`'s product-scope PR attachment ownership fix.
- Do not treat a completed blocker issue as a valid reason to keep another issue in `Blocked`.
- Do not paper over the problem with another manual state flip.
- Do not weaken fail-closed provider provenance behavior.

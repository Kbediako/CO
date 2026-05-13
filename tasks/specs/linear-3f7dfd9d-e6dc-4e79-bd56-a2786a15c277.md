---
id: 20260331-linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277
title: CO Strengthen Autonomous Issue Understanding and Intent Capture for Follow-Up Work
status: done
owner: Codex
created: 2026-03-31
last_review: 2026-05-01
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277.md
related_action_plan: docs/ACTION_PLAN-linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277.md
related_tasks:
  - tasks/tasks-linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277.md
review_notes:
  - 2026-05-01: CO-454 live Linear audit confirmed CO-45 is `Done`; this completed-lane spec is reclassified to inactive `done` under canonical owner key `spec-guard:active-specs:last_review=2026-03-31` so historical implementation evidence remains preserved without staying in active-spec freshness. Evidence: `codex-orchestrator linear issue-context --issue-id 3f7dfd9d-e6dc-4e79-bd56-a2786a15c277 --format json`.
  - 2026-03-31: Opened from Linear issue `CO-45` in the provider-worker workspace using the issue id `3f7dfd9d-e6dc-4e79-bd56-a2786a15c277`.
  - 2026-03-31: Live `linear issue-context` confirmed the CO workflow states (`Ready`, `In Progress`, `In Review`, `Merging`, `Rework`), showed no attached PR and no existing workpad, and the issue was transitioned from `Ready` to `In Progress` before active work.
  - 2026-03-31: Root-cause audit confirms the issue text: `CO-7` allowed a web-first interpretation, `CO-26` restored the exact `CO STATUS` name and terminal medium but still narrowed parity to one renderer over existing data, and `CO-44` had to reopen the chain to recover true Symphony terminal parity scope.
  - 2026-03-31: The sanctioned autonomy follow-up seam is `linear create-follow-up`, which currently accepts only title + description + acceptance criteria and therefore does not enforce intent checksum, wrong-interpretation rejection, or immediate repo traceability.
  - 2026-03-31: Current docs-first templates capture generic translation but do not strongly require protected terms, parity matrices, or `Not Done If` readiness failure language.
  - 2026-03-31: Pre-implementation approval: proceed with a bounded workflow/tooling lane touching guidance/templates plus the follow-up helper/tests; do not widen into `CO STATUS` runtime implementation.
  - 2026-03-31: Delegated docs-review evidence landed via `.runs/linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277-co-45-docs-review/cli/2026-03-31T05-38-11-020Z-51bac25e/manifest.json`; the review wrapper hit `review_outcome=failed-boundary` with `termination_boundary.kind=startup-anchor`, so docs approval used the recorded fallback in `out/linear-3f7dfd9d-e6dc-4e79-bd56-a2786a15c277/manual/20260331T165600Z-docs-review-fallback.md`.
  - 2026-03-31: Implementation hardening now requires intent checksum, non-goals, `Not Done If`, and a parity matrix whenever `--parity-lane` marks parity/alignment follow-up work; the helper also appends deterministic `Immediate Traceability` after Linear returns the created issue id/url.
  - 2026-03-31: The shared-root/workspace-root delegation-manifest mismatch uncovered during validation is explicitly out of scope for CO-45 and is tracked in follow-up issue `CO-56` / `fabdf855-dd07-4f8d-8ffa-f02d22cb27be`.
  - 2026-03-31: Post-implementation validation is green (`build`, `lint`, `test`, `docs:check`, `docs:freshness`, `diff-budget`, `pack:smoke`); the forced standalone review wrapper stalled without a terminal verdict, so the recorded manual fallback and elegance pass are the active review evidence.
---

# Technical Specification

## Context

This issue exists because the current autonomy-facing issue path lets a smaller but plausible interpretation survive long enough to become the plan. The `CO STATUS` chain is the concrete evidence. `CO-7` truthfully shipped richer observability but explicitly allowed a web-first read. `CO-26` restored the terminal-first name/surface but still framed the terminal lane as rendering existing data rather than full Symphony terminal parity. By the time `CO-44` reopened the work, the drift was already encoded in issue framing and docs-first artifacts. The hardening seam is therefore earlier than implementation: issue creation, issue readiness, and docs-first packet structure.

## Requirements

1. Define a stronger issue-shaping contract for autonomy-facing issues covering:
   - user-request translation
   - protected terms / exact artifact and surface names
   - explicit non-goals
   - nearby wrong interpretations to reject
   - `Not Done If` readiness failures
2. Define a required parity/alignment matrix for parity or alignment lanes covering:
   - current CO truth
   - reference truth
   - target truth / intended delta
   - explicit out-of-scope differences
3. Harden the sanctioned follow-up creation surface so autonomy-created follow-up issues can capture the stronger contract instead of only freeform prose plus acceptance criteria.
4. Make follow-up issues immediately traceable by recording the created follow-up issue id with exact repo packet paths expected before the issue leaves backlog.
5. Harden docs-first templates so the packet preserves the same safeguards instead of re-narrowing an already good issue.
6. Add a lightweight pre-implementation issue-quality review gate to guidance/checklists so active coding does not start while ambiguity remains.
7. Keep the micro-task shortcut unavailable for parity/alignment or exact-name/exact-surface preservation lanes.
8. Add focused regressions covering the stronger follow-up helper contract and traceability generation.

## Current Truth

- `docs/PRD-linear-e52a7254-f277-4121-b9f9-bf4084c4a473.md` explicitly treated the richer surface as web-first-acceptable and therefore did not protect the requested terminal medium.
- `docs/PRD-linear-a861c0fe-0db2-4c2b-a62a-c2010b5cbed6.md`, `docs/TECH_SPEC-linear-a861c0fe-0db2-4c2b-a62a-c2010b5cbed6.md`, and `docs/ACTION_PLAN-linear-a861c0fe-0db2-4c2b-a62a-c2010b5cbed6.md` restored exact `CO STATUS` naming and terminal medium, but the packet still scoped the lane as one terminal renderer over the existing operator dataset instead of an explicit current/reference/target parity matrix.
- `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts` currently builds follow-up descriptions from only `description` + `Acceptance Criteria`.
- `.agent/task/templates/prd-template.md`, `.agent/task/templates/tech-spec-template.md`, `.agent/task/templates/action-plan-template.md`, and `.agent/task/templates/tasks-template.md` do not yet force protected terms, wrong-interpretation rejection, parity matrices, or `Not Done If` readiness checks strongly enough.
- `docs/micro-task-path.md` currently allows very small wording/guardrail changes but does not explicitly exclude parity/alignment or exact-name/exact-surface preservation lanes.

## Validation Plan

- audited `linear child-stream --pipeline docs-review` before implementation
- focused `LinearCliShell` / `ProviderLinearWorkflowFacade` regressions
- required repo validation floor after implementation
- standalone review plus explicit elegance pass before review handoff

## Manifest Evidence

- Workpad comment: `6ba118dd-1c44-4d54-ab88-017c4cac3b34`
- Key upstream references:
  - `docs/PRD-linear-e52a7254-f277-4121-b9f9-bf4084c4a473.md`
  - `docs/PRD-linear-a861c0fe-0db2-4c2b-a62a-c2010b5cbed6.md`
  - `docs/TECH_SPEC-linear-a861c0fe-0db2-4c2b-a62a-c2010b5cbed6.md`
  - `docs/ACTION_PLAN-linear-a861c0fe-0db2-4c2b-a62a-c2010b5cbed6.md`
  - `AGENTS.md`
  - `docs/micro-task-path.md`

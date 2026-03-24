---
id: 20260324-linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514
title: CO Reduce Review Long Tails and Make Review Evidence Accounting Truthful
relates_to: docs/PRD-linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514.md
risk: high
owners:
  - Codex
last_review: 2026-03-24
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514.md`
- PRD: `docs/PRD-linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514.md`
- Task checklist: `tasks/tasks-linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514.md`

## Traceability
- Linear issue: `CO-16` / `1ea6b7f9-ff6f-42b6-af83-a77dce870514`
- Linear URL: https://linear.app/asabeko/issue/CO-16/co-reduce-review-long-tails-and-make-review-evidence-accounting

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: shorten low-yield bounded diff reviews after the startup anchor while making terminal review evidence truthful and gateable across telemetry, manifest, and run-summary surfaces.
- Scope:
  - docs-first registration and workpad bootstrap for the current Linear worker issue
  - bounded runtime/state changes for post-startup low-yield diff review termination
  - truthful review evidence accounting for docs-review and implementation-gate consumers
  - explicit large-scope uncommitted review gating
  - focused regressions in the review runtime and telemetry seams
- Constraints:
  - preserve deep reviews where concrete progress or broader scope justifies them
  - preserve forced execution behavior in docs-review and implementation-gate
  - record delegation override explicitly because this worker run cannot spawn subagents

## Technical Requirements
- Functional requirements:
  - diff-scoped reviews must recognize post-startup low-yield reread conditions and terminate on the success side rather than drifting for long tails
  - the terminal review evidence model must represent success-side bounded termination when it is the truthful outcome
  - docs-review and implementation-gate must fail or require an explicit waiver when manifest/run-summary consumers would otherwise claim success without fresh matching review telemetry
  - large uncommitted review scope must require `--base`, `--commit`, or an explicit override once configured thresholds trip
  - forced execution flows in docs-review and implementation-gate must still run when operators intentionally request them
- Non-functional requirements (performance, reliability, security):
  - keep the runtime change narrow to existing review-state and review-runtime seams
  - keep evidence accounting deterministic enough for auditing from `.runs/**/manifest.json`, `.runs/**/run-summary.json`, and `.runs/**/review/telemetry.json`
  - keep override paths explicit and operator-auditable
- Interfaces / contracts:
  - standalone review runtime contract: `scripts/run-review.ts`, `scripts/lib/review-execution-runtime.ts`, `scripts/lib/review-execution-state.ts`, `scripts/lib/review-execution-telemetry.ts`
  - large-scope preflight contract: `scripts/lib/review-scope-advisory.ts` plus `scripts/lib/review-execution-boundary-preflight.ts`
  - pipeline/run-summary consumer contract: `orchestrator/src/cli/services/commandRunner.ts`, `orchestrator/src/cli/services/orchestratorLocalPipelineExecutor.ts`, `orchestrator/src/cli/adapters/CommandReviewer.ts`, and current run-summary writer surfaces

## Architecture & Data
- Architecture / design adjustments:
  - preserve the existing review execution model, but allow bounded post-startup low-yield diff termination to surface as a truthful terminal success boundary instead of only as a failure boundary
  - add a review-evidence consistency assessment between the current review run telemetry and downstream manifest/run-summary success reporting for review-gated pipelines
  - tighten large-scope uncommitted review handling from advisory-only to explicit gate-or-override behavior
- Data model changes / migrations:
  - terminal review telemetry may need to preserve a non-null success-side `termination_boundary`
  - manifest and run-summary surfaces may need an explicit evidence-consistency representation or equivalent failure path so downstream consumers stay truthful
- External dependencies / integrations:
  - local review telemetry and manifest artifacts under `.runs/**/review/telemetry.json`
  - standalone review docs and orchestrator config
  - Linear review handoff workflow

## Validation Plan
- Tests / checks:
  - docs-review on the new task packet before code edits
  - focused regressions in `tests/run-review.spec.ts`, `tests/review-execution-state.spec.ts`, `tests/review-execution-telemetry.spec.ts`, and any current large-scope advisory test equivalent
  - required repo validation floor after implementation
- Rollout verification:
  - prove the baseline mismatch with current artifact evidence and ensure the same scenario becomes truthful after the patch
  - confirm large-scope uncommitted review runs now fail fast without scope narrowing or override
  - attach the resulting PR to Linear before moving to `In Review`
- Monitoring / alerts:
  - use the Linear workpad for operator-facing progress
  - use manifest, run-summary, and telemetry artifacts as the primary evidence sources

## Open Questions
- Whether the smallest truthful downstream contract is a hard failure on evidence mismatch alone or a structured review-evidence summary persisted alongside failure/success status.

## Approvals
- Reviewer: docs-review approved
- Date: 2026-03-24

## Manifest Evidence
- Docs-review manifest: `.runs/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514/cli/2026-03-24T08-11-34-245Z-b218e257/manifest.json`
- Baseline audit: `out/linear-1ea6b7f9-ff6f-42b6-af83-a77dce870514/manual/20260324T080455Z-baseline-audit.md`

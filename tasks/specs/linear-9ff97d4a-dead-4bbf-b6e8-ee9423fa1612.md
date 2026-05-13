---
id: 20260330-linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612
title: CO Preserve Scoped Standalone-Review Context Without Inline Prompt
status: done
owner: Codex
created: 2026-03-30
last_review: 2026-04-30
review_cadence_days: 30
risk_level: high
related_prd: docs/PRD-linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612.md
related_action_plan: docs/ACTION_PLAN-linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612.md
related_tasks:
  - tasks/tasks-linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612.md
review_notes:
  - 2026-04-30: CO-428 live Linear audit confirmed CO-43 is `Done`; this completed-lane spec is reclassified to inactive `done` under canonical owner key `spec-guard:active-specs:last_review=2026-03-30` so historical implementation evidence remains preserved without staying in active-spec freshness.
  - 2026-03-30: Opened from Linear issue `CO-43` after rechecking the live CO workflow states with `linear issue-context`; the issue started in `Ready`, had no attached PR or workpad, was transitioned to `In Progress`, and now uses the single active workpad comment `24f742f4-23e5-42a2-81d9-332064744d23`.
  - 2026-03-30: The workspace started detached at `bdf8c648f` and moved onto branch `co-43-preserve-scoped-review-context` before repo edits.
  - 2026-03-30: Pre-implementation review approves the narrow repair path: keep explicit scoped launches promptless, synthesize bounded reviewer-visible scoped title context from resolved `NOTES` plus review surface when `--title` is absent, preserve explicit user titles when present, and if Codex rejects a synthesized scoped title retry the same explicit scope without `--title` so telemetry/docs/tests make that fallback contract explicit.
  - 2026-03-30: Current truth from the issue evidence is consistent: `review/prompt.txt` keeps the full scoped prompt, `scripts/lib/review-launch-attempt.ts` only reports `prompt_delivery: artifact-only`, and the cited `CO-39` output log shows the live reviewer starting from the bare scoped scaffold (`commit <sha>`) instead of the task `NOTES`.
  - 2026-03-30: Local `codex review --help` confirms `--title <TITLE>` support, and a bounded live probe showed `codex review --commit bdf8c648f --title "Goal: sample scoped context | Surface: diff"` renders `commit bdf8c64: Goal: sample scoped context | Surface: diff` in the initial reviewer-visible transcript, so bounded title transport is viable without inline prompt.
  - 2026-03-30: The first audited `linear child-stream` docs-review manifest succeeded and surfaced one concrete P2 finding: preserve the archived 0967 snapshot rather than dropping it while fixing the `docs/TASKS.md` line budget. The follow-up rerun stalled without a concrete terminal verdict, so final docs-review approval uses the successful first manifest plus a manual fallback note after the 0967 archive continuity and absolute-path evidence fixes were rechecked with `spec-guard`, `docs:check`, and `docs:freshness`.
  - 2026-03-30: Pre-implementation standalone review of the docs-first packet recorded no additional blockers beyond the docs-review finding; implementation proceeded only after the issue scope, transport contract, and docs surfaces were rechecked against the accepted task/spec packet.
---

# Technical Specification

## Context

`CO-39` fixed the raw prompt-plus-scope launch incompatibility, but it also left explicit scoped standalone review with no live reviewer-visible task context beyond the raw diff scope. The wrapper still builds and saves the full prompt, yet the actual `codex review --base|--commit|--uncommitted` launch only gets the scope flag set. The next truthful slice is to preserve a bounded reviewer-visible scoped context transport without reintroducing inline prompt delivery.

## Requirements

1. `npm run review -- --base <ref>`, `npm run review -- --commit <sha>`, and `npm run review -- --uncommitted` must continue launching without inline prompt content.
2. Explicit scoped review must preserve a bounded reviewer-visible context transport:
   - use the explicit `--title` when the caller provided one
   - otherwise synthesize a bounded scoped title from resolved `NOTES` plus the active review surface
   - if Codex rejects that synthesized scoped title, retry the same explicit scope without `--title` and fall back to artifact-only reviewer-visible context instead of failing the scope outright
3. Full prompt/context must still be written to `review/prompt.txt` for audit continuity.
4. Persisted telemetry and docs must state the reviewer-visible transport truthfully so scoped review does not silently regress back to bare scope-only context.
5. Focused regressions must cover generated scoped title transport, explicit-title preservation, and telemetry truth for scoped launches.
6. The change must stay bounded to standalone-review transport, docs, and focused wrapper tests.

## Current Truth

- `buildReviewPromptContext(...)` already resolves `NOTES`, review surface, and path-only scope guidance for the saved prompt artifact.
- `buildReviewArgs(...)` in `scripts/lib/review-launch-attempt.ts` omits the prompt argument for explicit scope flags, which preserves the `CO-39` compatibility fix.
- The current `launch_context` only records `scope_flag_mode` and `prompt_delivery`, so persisted evidence does not show any bounded reviewer-visible replacement transport.
- Local `codex review --help` plus the bounded live probe show `--title` is the smallest available scoped transport surface that remains reviewer-visible under explicit diff scope.

## Validation Plan

- Run `docs-review` via the audited `linear child-stream` path before implementation. Status: complete via `.runs/linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612-docs-review/cli/2026-03-30T06-52-40-070Z-7b90108a/manifest.json` and `out/linear-9ff97d4a-dead-4bbf-b6e8-ee9423fa1612/manual/20260330T070418Z-docs-review-fallback.md`.
- Add focused regressions in `tests/review-launch-attempt.spec.ts` and `tests/run-review.spec.ts`.
- Run the required validation floor for the touched wrapper/docs/test surface.
- Run forced manifest-backed standalone review plus an explicit elegance/minimality pass before review handoff.

---
id: 20260311-1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition
title: Coordinator Symphony-Aligned Standalone Review Shell-Probe Stop Condition
status: draft
owners:
  - Codex
created: 2026-03-11
last_review: 2026-03-11
review_cadence_days: 30
related_prd: docs/PRD-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition.md
related_tasks:
  - tasks/tasks-1110-coordinator-symphony-aligned-standalone-review-shell-probe-stop-condition.md
---

# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Shell-Probe Stop Condition

## Summary

Add a bounded shell-probe repetition boundary to standalone review so the first direct external shell verification command can run when needed, but repeated shell-probe commands terminate the run instead of allowing speculative shell experimentation to continue.

## Scope

- Update `scripts/lib/review-execution-state.ts` to classify direct external shell-probe verification commands separately from ordinary inspection commands.
- Add a bounded shell-probe boundary state to the existing review execution telemetry/state model.
- Update `scripts/run-review.ts` to terminate the run when the shell-probe boundary triggers.
- Add focused regressions in `tests/review-execution-state.spec.ts` and `tests/run-review.spec.ts`.
- Update `docs/standalone-review-guide.md` and task mirrors.

## Out of Scope

- Natural-language issue extraction.
- General shell execution prohibition or broader command-policy redesign.
- Native review replacement, prompt retuning, or unrelated Symphony controller work.
- Reopening exported-env startup parsing already completed in `1109`.

## Proposed Design

### 1. Classify bounded shell probes explicitly

Teach `ReviewExecutionState` to recognize direct shell-probe verification commands:

- shell commands with a payload (`bash|sh|zsh|ksh -c/-lc`, `cmd /c`) that do not simply inspect touched files or active audit evidence,
- payloads dominated by shell builtins / env manipulation / `printf` / `echo`-style verification rather than file inspection,
- bounded to the existing review-command parsing surface.

The classifier should stay narrow and deterministic; it should not attempt full shell interpretation.

### 2. Allow one shell-probe cycle, terminate on repetition

Track shell-probe starts in review state. The first shell probe is allowed. A repeated shell probe in the same bounded review run becomes a new boundary violation with an explicit reason.

### 3. Keep allowed review shell activity intact

Do not classify these as repeated shell probes:

- shell-wrapped file reads of touched files,
- valid audit startup-anchor reads from the active manifest or runner log,
- commands already covered by heavy-command or command-intent boundaries.

### 4. Surface the new boundary through existing wrapper flow

`run-review.ts` already polls boundary states and terminates on violations. Extend that flow with the new shell-probe boundary instead of introducing a new wrapper layer.

## Files / Modules

- `scripts/lib/review-execution-state.ts`
- `scripts/run-review.ts`
- `tests/review-execution-state.spec.ts`
- `tests/run-review.spec.ts`
- `docs/standalone-review-guide.md`

## Risks

- Over-broad shell-probe classification could block legitimate shell-wrapped inspection.
- Under-broad classification would leave the current repeated-experiment drift unchanged.
- If the new boundary overlaps awkwardly with command-intent or low-signal drift, the runtime failure reason could become confusing.

## Validation Plan

- Focused state regressions for:
  - non-probe shell-wrapped inspection remaining allowed,
  - first shell probe allowed,
  - repeated shell probe triggering the new boundary.
- Runtime-facing fake-review regression proving `run-review` terminates deterministically on repeated shell-probe activity.
- Docs-first guards before implementation, then the bounded validation lane plus review/pack smoke at closeout.

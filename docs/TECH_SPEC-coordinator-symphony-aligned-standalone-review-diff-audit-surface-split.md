# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Diff/Audit Surface Split

## Goal

Refactor standalone review prompt assembly so the default review surface is diff-local and bounded, while audit/evidence/docs verification moves into an explicit second surface instead of sharing the same prompt contract.

## Scope

- Add an explicit review surface selector in `scripts/run-review.ts`.
- Make `diff` the default surface.
- Keep task/manifest/docs/checklist context out of the default diff review prompt except for the minimal task/diff identity needed to review safely.
- Add an explicit audit-oriented surface that can include manifest, checklist, PRD summary, and evidence mirroring concerns.
- Add targeted `run-review.spec.ts` coverage for:
  - default diff surface prompt shaping
  - audit surface prompt shaping
  - bounded default review finishing without unnecessary audit-context injection

## Out of Scope

- Replacing the wrapper with a native review controller.
- Removing existing low-signal/meta-surface/command-intent guards.
- Broadly redesigning manifest resolution, diff-budget handling, or non-interactive handoff behavior.
- Changing standalone review into an automatic multi-pass supervisor.

## Design

### 1. Explicit review surfaces

Introduce a small explicit surface choice, for example:

- `diff` (default)
- `audit` (opt-in)

The exact CLI/env shape can stay minimal, but the runtime contract must be explicit and testable.

### 2. Diff surface stays code-local

In default `diff` mode, prompt assembly should include only what is needed for bounded code review:

- task id or label
- diff scope / changed-file context
- optional operator notes / code risks
- bounded execution constraints

It should not include:

- manifest path
- checklist header bullets
- PRD summary bullets
- docs/evidence verification bullets

### 3. Audit surface carries broader context

In `audit` mode, prompt assembly may include:

- manifest path
- task checklist context
- PRD summary
- docs/checklist/evidence verification prompts

This makes the current broader behavior explicit instead of default.

### 4. Keep runtime backstops

`ReviewExecutionState` remains the fail-closed backstop for:

- low-signal drift
- meta-surface expansion
- command-intent violations

But those guards should become secondary protections, not the primary way the default review path stays bounded.

## Validation

- targeted `run-review.spec.ts` prompt-contract coverage for diff vs audit surfaces
- targeted runtime-path coverage showing default diff mode does not inject audit context
- standard build/lint/test/docs checks
- `pack:smoke`

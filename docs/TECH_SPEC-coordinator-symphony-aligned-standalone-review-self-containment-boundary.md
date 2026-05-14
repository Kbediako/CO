# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Self-Containment Boundary

## Goal

Tighten default `diff`-mode standalone review so the runtime classifier and prompt/runtime guardrails treat adjacent review-system surfaces as off-task unless the current diff explicitly touches them or a concrete finding requires them.

## Scope

- Extend review-surface classification in `scripts/lib/review-execution-state.ts` for review-system-adjacent targets.
- Wire the new classification into `scripts/run-review.ts` without reopening the `1093` `diff`/`audit` contract.
- Add regression coverage for drift into review docs, review artifacts, and pack-smoke helpers.
- Update operator docs to describe the new self-containment boundary and when `--surface audit` is the right escape hatch.

## Out of Scope

- Native-review controller replacement.
- Broad redesign of prompt assembly outside the self-containment boundary.
- Reclassifying arbitrary documentation or helper files outside the bounded review-system-adjacent set.
- Returning to Symphony controller extraction in the same slice.

## Design

### 1. Distinct review-system-adjacent class

Add a dedicated classification for review-system-adjacent inspection targets in `diff` mode, covering:

- standalone review docs and review-artifact docs
- review artifact files under `<runDir>/review/`
- `scripts/pack-smoke.*`
- closely related `.runs` review plumbing when it is not the explicit evidence surface allowed by `audit`

This class is narrower than generic "meta" and exists specifically to keep `diff` reviews out of the wrapper's own support infrastructure.

### 2. Sustained self-containment guard

Add a bounded runtime guard that trips when a `diff` review repeatedly traverses those adjacent review-system surfaces after the changed wrapper/test/docs files have already been inspected. The guard should remain evidence-first: allow one-hop confirmation when directly needed, fail only on sustained off-task traversal.

### 3. Preserve the `1093` surface contract

- `diff` remains the default bounded code-review path.
- `audit` remains the explicit broader evidence/checklist/manifest review path.
- The selective audit allowlist from `1093` stays intact.

### 4. Validation

Add or update `tests/run-review.spec.ts` coverage for:

- repeated drift into review docs
- repeated drift into review artifact files
- repeated drift into pack-smoke helpers
- continued success for the intended `1093` `diff` and `audit` prompt contracts

Run standard build/lint/test/docs checks plus pack-smoke.

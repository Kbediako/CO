# ACTION_PLAN - CO-405 bounded-review validation command-intent classification

## Summary
- Goal: create the CO-405 docs-first packet for classifying repo-local validation commands as bounded-review command-intent violations.
- Scope: docs packet files, task checklist mirrors, and `tasks/index.json` registration only.
- Assumptions:
  - the parent prompt and source anchor carry the authoritative issue shape for this child lane
  - the referenced source payload path is absent in this child checkout
  - parent owns source inspection, implementation files, focused tests, full validation, Linear state, workpad, PR lifecycle, and merge

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `bounded-review validation command-intent classification`
  - `repo-local validation commands`
  - `bounded-review command-intent violations`
  - `classification/telemetry/retry behavior`
  - `command-intent`
  - `validation-suite`
  - `validation-runner`
  - `failed-boundary`
  - `bounded-success`
  - `termination_boundary`
- Not done if:
  - bounded review executes repo-local validation commands
  - telemetry hides or flattens the command-intent boundary
  - retry behavior drops scope, runs validation, or loses boundary evidence
  - the implementation widens into unrelated review-wrapper, command-probe, meta-surface, Linear, GitHub, or validation-floor work
- Pre-implementation issue-quality review:
  - 2026-04-28: this is narrower than a review-wrapper redesign and broader than a display-only telemetry wording change; correctness depends on classification, telemetry, and retry behavior staying aligned.
  - 2026-04-28: the micro-task path is not appropriate because the lane depends on protected review terms, exact validation-command intent, retry semantics, and telemetry parity.
- Fallback / refactor decision:
  - This task touches the existing bounded command-intent retry seam.
  - Decision: `justify retaining fallback` for the bounded-review command-intent retry as a durable safety contract.
  - Large-refactor check: keep the implementation as the smallest classifier/telemetry/retry update unless parent source inspection proves the boundary is split across multiple review-wrapper ownership seams.

## Milestones & Sequencing
1. Create the PRD, canonical TECH_SPEC, ACTION_PLAN, task checklist, and `.agent` mirror for `linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba`.
2. Register the canonical TECH_SPEC and checklist in `tasks/index.json` under `items[]`.
3. Parent runs docs-review or equivalent review of the packet before implementation.
4. Parent inspects the standalone-review command-intent classifier, telemetry, and retry paths.
5. Parent implements the smallest change that classifies repo-local validation commands as `command-intent` violations with `validation-suite` or `validation-runner` provenance.
6. Parent adds focused regressions for validation command classification, telemetry preservation, and retry behavior.
7. Parent runs focused validation, then normal provider-worker closeout gates, standalone review, elegance pass, PR lifecycle, and Linear handoff.

## Dependencies
- Source anchor: `ctx:sha256:abfa2d4776ef4351126ffc600e3e5d6a6fd85919935405d0589023547317c6a5#chunk:c000001`
- Parent manifest: `.runs/linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba-docs-packet/cli/2026-04-28T12-03-31-458Z-f7277f31/manifest.json`
- Parent-owned review-wrapper classifier, telemetry, retry, and focused test surfaces.

## Validation
- Child-lane checks / tests:
  - `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json', 'utf8'))"`
  - `git diff --check -- docs/PRD-linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba.md docs/ACTION_PLAN-linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba.md tasks/specs/linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba.md tasks/tasks-linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba.md .agent/task/linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba.md tasks/index.json`
  - scoped `git diff --name-only` / `git status --short` review
- Parent-owned checks:
  - docs-review before implementation
  - focused classifier/telemetry/retry regressions
  - standard parent validation floor and PR/review handoff gates
- Rollback plan:
  - revert only the CO-405 packet and `tasks/index.json` entry if live parent issue-context reconciliation changes the scope before implementation

## Risks & Mitigations
- Risk: source payload absence hides narrower acceptance wording.
  - Mitigation: packet records the missing payload and anchors to the parent-provided prompt; parent must reconcile live issue context before implementation.
- Risk: validation command classification is mistaken for permission to run validation inside bounded review.
  - Mitigation: PRD and spec state that execution remains parent-owned and bounded review must terminate on command intent.
- Risk: retry behavior hides a real boundary.
  - Mitigation: require telemetry to preserve `termination_boundary.kind=command-intent`, validation provenance, and retry outcome.

## Approvals
- Docs-first packet: bounded same-issue child lane, 2026-04-28.

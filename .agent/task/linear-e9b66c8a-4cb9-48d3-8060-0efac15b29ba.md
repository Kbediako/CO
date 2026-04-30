# Task Checklist - linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba

- Linear Issue: `CO-405`
- MCP Task ID: `linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba`
- Primary PRD: `docs/PRD-linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba.md`
- TECH_SPEC: `tasks/specs/linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba.md`
- Child lane manifest: `.runs/linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba-docs-packet/cli/2026-04-28T12-03-31-458Z-f7277f31/manifest.json`
- Source anchor: `ctx:sha256:abfa2d4776ef4351126ffc600e3e5d6a6fd85919935405d0589023547317c6a5#chunk:c000001`

## Docs-First
- [x] Source payload availability checked without querying Linear. Evidence: the parent-provided source payload path is absent in this child checkout; packet uses the parent prompt and source anchor only.
- [x] PRD drafted for CO-405 bounded-review validation command-intent classification. Evidence: `docs/PRD-linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba.md`.
- [x] Canonical TECH_SPEC drafted with issue-shaping contract, parity matrix, Not Done If criteria, fallback/refactor decision, and validation plan. Evidence: `tasks/specs/linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba.md`.
- [x] ACTION_PLAN drafted for packet creation and parent-owned implementation follow-on. Evidence: `docs/ACTION_PLAN-linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba.md`.
- [x] Canonical TECH_SPEC registered in `tasks/index.json`. Evidence: `tasks/index.json`.

## Acceptance Criteria
- [x] Packet states that repo-local validation commands inside bounded review are `command-intent` violations. Evidence: PRD and TECH_SPEC.
- [x] Packet names representative CO validation commands and focused validation runners that must not execute inside bounded review. Evidence: PRD and TECH_SPEC.
- [x] Packet requires telemetry to preserve command text, `termination_boundary.kind=command-intent`, `validation-suite` / `validation-runner` provenance, retry count, and final `review_outcome`. Evidence: PRD and TECH_SPEC.
- [x] Packet requires retry to remain scope-preserving, read-only, and fail-closed on repeated validation intent. Evidence: PRD, TECH_SPEC, and ACTION_PLAN.
- [x] Packet keeps parent-owned source inspection, implementation, focused tests, validation, Linear state, workpad, PR lifecycle, and merge out of this child lane. Evidence: PRD, TECH_SPEC, and ACTION_PLAN.

## Validation
- [x] `tasks/index.json` parses after registration. Evidence: `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json', 'utf8')); console.log('tasks/index.json ok')"` returned `tasks/index.json ok`.
- [x] Scoped diff whitespace check over declared files passes. Evidence: `git diff --check -- docs/PRD-linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba.md docs/ACTION_PLAN-linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba.md tasks/specs/linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba.md tasks/tasks-linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba.md .agent/task/linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba.md tasks/index.json` exited clean with no output, and `rg -n '[[:blank:]]$' ...` returned `no trailing whitespace`.
- [x] Scoped diff review confirms no edits outside declared file scope. Evidence: `git status --short` listed only `tasks/index.json` plus the five untracked declared CO-405 packet files.

## Parent-Owned Follow-On
- [x] Parent reconciles live Linear issue context before implementation. Evidence: `linear issue-context --issue-id e9b66c8a-4cb9-48d3-8060-0efac15b29ba --format json` showed `In Progress` and no attached PR.
- [x] Parent runs docs-review or equivalent packet review before implementation. Evidence: recovered docs-packet child lane `.runs/linear-e9b66c8a-4cb9-48d3-8060-0efac15b29ba-docs-packet/cli/2026-04-28T12-03-31-458Z-f7277f31/manifest.json`.
- [x] Parent implements classifier/telemetry/retry changes and focused regressions. Evidence: `scripts/lib/review-command-probe-classification.ts`, `scripts/lib/review-command-intent-classification.ts`, and focused tests; `npm run test:core -- tests/review-command-intent-classification.spec.ts tests/review-command-probe-classification.spec.ts tests/review-execution-state.spec.ts` passed after the final help-only/heavy-blocker fix.
- [x] Parent runs normal validation, standalone review, elegance pass, opens PR, and attaches it to Linear. Evidence: full validation floor passed, standalone review completed with `review_outcome=bounded-success`, and PR #723 is attached to CO-405.
- [ ] Parent drains PR feedback and transitions Linear handoff. Evidence: PR #723 feedback fixes are ready to commit/push; CodeRabbit inline replies and the final `ready-review` drain remain pending.

## Progress Log
- 2026-04-28: bounded same-issue child lane created the docs-first packet and `tasks/index.json` entry only.
- 2026-04-28: parent implemented command-intent classification for `test:*` package scripts and repo-local guard scripts, fixed this packet's docs-freshness registry rows, and stopped before review handoff because repo gates are red on out-of-scope baseline debt.
- 2026-04-29: parent recovered after the out-of-scope blockers were closed, completed the validation floor, standalone review, elegance pass, and opened PR #723.
- 2026-04-29: parent addressed PR review feedback for help-only guard lookups, canonical `tasks/index.json` docs registration, expanded validation-command inventory, and packet/checklist wording; final push/reply/drain remains parent-owned.

## Notes
- The Docs-First and Validation sections above preserve the bounded same-issue docs child-lane evidence; parent-owned implementation and PR lifecycle evidence is tracked separately under Parent-Owned Follow-On.
- Do not run Linear, GitHub, PR, workpad, issue-context, or lifecycle commands from this child lane.
- Do not edit implementation or test files from this child lane.
- Do not run full repo validation suites from this child lane.
